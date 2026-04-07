"""Abstract LLM provider interface."""

from __future__ import annotations

from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Base class for LLM providers."""

    @abstractmethod
    async def generate(self, prompt: str, *, system: str | None = None, max_tokens: int = 1024) -> str:
        """Generate text from a prompt. Returns the generated string."""
        ...
