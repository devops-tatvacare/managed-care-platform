"""Google Gemini LLM adapter."""

from __future__ import annotations

import httpx

from app.config import settings
from app.llm.base import LLMProvider


class GeminiProvider(LLMProvider):
    """Calls Google Gemini REST API (generateContent)."""

    MODEL = "gemini-2.0-flash"
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    async def generate(self, prompt: str, *, system: str | None = None, max_tokens: int = 1024) -> str:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY not configured")

        url = f"{self.BASE_URL}/{self.MODEL}:generateContent?key={settings.gemini_api_key}"
        contents = []
        if system:
            contents.append({"role": "user", "parts": [{"text": system}]})
            contents.append({"role": "model", "parts": [{"text": "Understood."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.7},
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        candidates = data.get("candidates", [])
        if not candidates:
            return ""
        parts = candidates[0].get("content", {}).get("parts", [])
        return parts[0].get("text", "") if parts else ""
