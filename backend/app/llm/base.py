"""Abstract LLM provider interface."""

from __future__ import annotations

import asyncio
import functools
import json
import logging
import re
from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, ValidationError

from app.llm.errors import LLMError

logger = logging.getLogger(__name__)

_FENCE_RE = re.compile(r"```(?:json)?\s*\n?(.*?)\n?\s*```", re.DOTALL)


def retry_with_backoff(func):
    """Retry an async method with exponential backoff.

    Reads max_retries from the instance's config (falls back to 2).
    On final failure raises LLMError.
    """

    @functools.wraps(func)
    async def wrapper(self, *args, **kwargs):
        from app.config import settings

        max_retries = settings.llm_max_retries
        last_exc: Exception | None = None

        for attempt in range(max_retries + 1):
            try:
                return await func(self, *args, **kwargs)
            except LLMError:
                raise
            except Exception as exc:
                last_exc = exc
                if attempt < max_retries:
                    delay = 2**attempt  # 1s, 2s
                    logger.warning(
                        "LLM call attempt %d/%d failed: %s — retrying in %ds",
                        attempt + 1,
                        max_retries + 1,
                        exc,
                        delay,
                    )
                    await asyncio.sleep(delay)

        raise LLMError(f"LLM call failed after {max_retries + 1} attempts: {last_exc}") from last_exc

    return wrapper


def strip_json_fences(text: str) -> str:
    """Remove markdown code fences from a JSON response."""
    match = _FENCE_RE.search(text)
    return match.group(1).strip() if match else text.strip()


def validate_and_parse(
    raw: str,
    *,
    response_model: type[BaseModel] | None = None,
) -> dict[str, Any]:
    """Parse JSON string and optionally validate against a Pydantic model.

    Returns the parsed dict on success.
    Raises LLMError if JSON parsing fails.
    Logs a warning and returns the raw parsed dict if Pydantic validation fails.
    """
    try:
        data = json.loads(strip_json_fences(raw))
    except (json.JSONDecodeError, TypeError) as exc:
        raise LLMError(f"Failed to parse LLM JSON response: {exc}") from exc

    if response_model is not None:
        try:
            response_model.model_validate(data)
        except ValidationError as exc:
            logger.warning("LLM response failed schema validation: %s", exc)

    return data


class LLMProvider(ABC):
    """Base class for LLM providers."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int = 1024,
        response_schema: dict | None = None,
        parse_json: bool = False,
        response_model: type[BaseModel] | None = None,
    ) -> str | dict:
        """Generate text from a prompt.

        Args:
            prompt: The user prompt.
            system: Optional system instruction.
            max_tokens: Maximum tokens to generate.
            response_schema: JSON schema dict for structured output (provider-native).
            parse_json: If True, parse the response as JSON.
            response_model: Optional Pydantic model to validate parsed JSON against.

        Returns:
            str for text responses, dict for parsed JSON responses.
        """
        ...
