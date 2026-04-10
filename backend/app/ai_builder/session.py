"""Builder Session — holds conversation state for a multi-turn AI builder interaction."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class BuilderMessage:
    """A single message in the builder conversation."""
    role: str  # "user" | "model"
    content: str
    config: dict[str, Any] | None = None  # Attached config when model submits


@dataclass
class BuilderSession:
    """Holds the full state of a builder conversation.

    The session is surface-agnostic — it doesn't know whether it's building
    a cohort program, pathway, or any other configuration.
    """

    surface: str  # e.g. "cohort_program", "pathway"
    system_prompt: str = ""
    messages: list[BuilderMessage] = field(default_factory=list)
    current_config: dict[str, Any] | None = None

    def add_user_message(self, content: str) -> None:
        self.messages.append(BuilderMessage(role="user", content=content))

    def add_model_message(self, content: str, config: dict[str, Any] | None = None) -> None:
        self.messages.append(BuilderMessage(role="model", content=content, config=config))
        if config is not None:
            self.current_config = config

    def to_gemini_contents(self) -> list[dict]:
        """Convert message history to Gemini API contents format.

        System prompt is injected as the first user/model exchange.
        """
        contents: list[dict] = []

        if self.system_prompt:
            contents.append({"role": "user", "parts": [{"text": self.system_prompt}]})
            contents.append({"role": "model", "parts": [{"text": "Understood. I'll help you build this configuration. What would you like to create?"}]})

        for msg in self.messages:
            contents.append({
                "role": msg.role if msg.role == "user" else "model",
                "parts": [{"text": msg.content}],
            })

        return contents

    def to_dict(self) -> dict[str, Any]:
        """Serialize for storage (DB JSON column)."""
        return {
            "surface": self.surface,
            "system_prompt": self.system_prompt,
            "messages": [
                {"role": m.role, "content": m.content, "config": m.config}
                for m in self.messages
            ],
            "current_config": self.current_config,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> BuilderSession:
        """Deserialize from stored dict."""
        session = cls(
            surface=data.get("surface", ""),
            system_prompt=data.get("system_prompt", ""),
            current_config=data.get("current_config"),
        )
        for m in data.get("messages", []):
            session.messages.append(
                BuilderMessage(role=m["role"], content=m["content"], config=m.get("config"))
            )
        return session
