"""Google Gemini LLM adapter."""

from __future__ import annotations

from collections.abc import AsyncIterator

import httpx
from pydantic import BaseModel

from app.config import settings
from app.llm.base import LLMProvider, retry_with_backoff, validate_and_parse


class GeminiProvider(LLMProvider):
    """Calls Google Gemini REST API (generateContent)."""

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def _build_payload(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int = 65536,
        response_schema: dict | None = None,
    ) -> dict:
        contents = []
        if system:
            contents.append({"role": "user", "parts": [{"text": system}]})
            contents.append({"role": "model", "parts": [{"text": "Understood."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        generation_config: dict = {
            "maxOutputTokens": max_tokens,
            "temperature": 0.7,
        }

        if response_schema is not None:
            generation_config["responseMimeType"] = "application/json"
            generation_config["responseSchema"] = response_schema

        return {"contents": contents, "generationConfig": generation_config}

    @retry_with_backoff
    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int = 65536,
        response_schema: dict | None = None,
        parse_json: bool = False,
        response_model: type[BaseModel] | None = None,
    ) -> str | dict:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY not configured")

        model = settings.llm_default_model
        url = f"{self.BASE_URL}/{model}:generateContent?key={settings.gemini_api_key}"
        payload = self._build_payload(prompt, system=system, max_tokens=max_tokens, response_schema=response_schema)

        async with httpx.AsyncClient(timeout=settings.llm_timeout) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        candidates = data.get("candidates", [])
        if not candidates:
            return {} if (parse_json or response_schema) else ""
        parts = candidates[0].get("content", {}).get("parts", [])
        raw_text = parts[0].get("text", "") if parts else ""

        if parse_json or response_schema is not None:
            if not raw_text.strip():
                return {}
            return validate_and_parse(raw_text, response_model=response_model)

        return raw_text

    async def generate_stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int = 65536,
    ) -> AsyncIterator[str]:
        """Yield text chunks via Gemini streamGenerateContent."""
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY not configured")

        model = settings.llm_default_model
        url = f"{self.BASE_URL}/{model}:streamGenerateContent?alt=sse&key={settings.gemini_api_key}"
        payload = self._build_payload(prompt, system=system, max_tokens=max_tokens)

        import json

        stream_timeout = httpx.Timeout(connect=10.0, read=120.0, write=10.0, pool=10.0)
        async with httpx.AsyncClient(timeout=stream_timeout) as client:
            async with client.stream("POST", url, json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    raw = line[6:]
                    if raw.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(raw)
                    except json.JSONDecodeError:
                        continue
                    candidates = chunk.get("candidates", [])
                    if not candidates:
                        continue
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text = parts[0].get("text", "")
                        if text:
                            yield text
