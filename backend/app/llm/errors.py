"""LLM-specific exceptions."""

from __future__ import annotations


class LLMError(Exception):
    """Raised when an LLM call fails after all retries are exhausted."""
