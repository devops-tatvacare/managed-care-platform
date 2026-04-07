"""LLM provider registry."""

from __future__ import annotations

from app.llm.base import LLMProvider
from app.llm.gemini import GeminiProvider

_PROVIDERS: dict[str, type[LLMProvider]] = {
    "gemini": GeminiProvider,
}

_instances: dict[str, LLMProvider] = {}


def get_provider(name: str = "gemini") -> LLMProvider:
    """Return a singleton LLM provider instance by name."""
    if name not in _instances:
        cls = _PROVIDERS.get(name)
        if cls is None:
            raise ValueError(f"Unknown LLM provider: {name}. Available: {list(_PROVIDERS.keys())}")
        _instances[name] = cls()
    return _instances[name]
