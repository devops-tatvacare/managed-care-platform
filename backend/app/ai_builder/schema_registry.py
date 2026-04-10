"""Schema Registry — stores canonical JSON schemas for builder surfaces.

Each surface (cohort program, pathway, action template, etc.) registers its
schema here. The LLM requests schemas on demand via tool calls instead of
receiving the full schema in every prompt.
"""

from __future__ import annotations

import copy
from typing import Any


class SchemaRegistry:
    """Singleton registry mapping surface keys to JSON schemas and option enums."""

    _schemas: dict[str, dict[str, Any]] = {}
    _options: dict[str, list[dict[str, str]]] = {}

    @classmethod
    def register_schema(cls, key: str, schema: dict[str, Any]) -> None:
        """Register a JSON schema for a component type.

        Args:
            key: Component identifier (e.g. "cohort", "scoring_component", "pathway_block")
            schema: JSON Schema dict describing the component's shape.
        """
        cls._schemas[key] = schema

    @classmethod
    def register_options(cls, key: str, options: list[dict[str, str]]) -> None:
        """Register available options for a field/enum.

        Args:
            key: Option set identifier (e.g. "data_sources", "block_types")
            options: List of {value, label, description?} dicts.
        """
        cls._options[key] = options

    @classmethod
    def get_schema(cls, key: str) -> dict[str, Any] | None:
        """Retrieve a registered schema by key. Returns a deep copy."""
        schema = cls._schemas.get(key)
        return copy.deepcopy(schema) if schema else None

    @classmethod
    def get_options(cls, key: str) -> list[dict[str, str]] | None:
        """Retrieve registered options by key."""
        options = cls._options.get(key)
        return copy.deepcopy(options) if options else None

    @classmethod
    def list_schemas(cls) -> list[str]:
        """Return all registered schema keys."""
        return list(cls._schemas.keys())

    @classmethod
    def list_options(cls) -> list[str]:
        """Return all registered option keys."""
        return list(cls._options.keys())

    @classmethod
    def get_submit_schema(cls, surface: str) -> dict[str, Any] | None:
        """Return the full output schema for a surface (used for Gemini responseJsonSchema).

        The surface schema is registered under the key "{surface}_output".
        """
        return cls.get_schema(f"{surface}_output")

    @classmethod
    def clear(cls) -> None:
        """Clear all registrations. Useful for testing."""
        cls._schemas.clear()
        cls._options.clear()
