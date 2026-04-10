"""Tool Registry — declares tools for Gemini and handles dispatch with session state.

Tools are declared as google-genai types.Tool objects for the SDK.
ToolHandler dispatches calls against the SchemaRegistry with access to session state.
"""

from __future__ import annotations

from typing import Any

from google.genai import types

from app.ai_builder.schema_registry import SchemaRegistry


# ---------------------------------------------------------------------------
# Tool declarations (SDK format)
# ---------------------------------------------------------------------------

def get_tool_declarations() -> list[types.Tool]:
    """Return tool declarations for the Gemini SDK."""
    return [
        types.Tool(function_declarations=[
            types.FunctionDeclaration(
                name="get_component_schema",
                description=(
                    "Retrieve the JSON schema for a specific component type. "
                    "Use this to understand the exact shape before generating config. "
                    "Available components can be discovered by calling with an invalid name."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "component": types.Schema(
                            type="STRING",
                            description="Component type key",
                        ),
                    },
                    required=["component"],
                ),
            ),
            types.FunctionDeclaration(
                name="get_available_options",
                description=(
                    "Get available enum values for a field. "
                    "Use this to discover valid values for data_sources, block_types, etc."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "field": types.Schema(
                            type="STRING",
                            description="Option set key",
                        ),
                    },
                    required=["field"],
                ),
            ),
            types.FunctionDeclaration(
                name="get_current_config",
                description=(
                    "Get the current working configuration built so far in this session."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={},
                ),
            ),
            types.FunctionDeclaration(
                name="submit_config",
                description=(
                    "Submit the complete generated configuration for user preview. "
                    "The config must be a valid JSON object conforming to the surface schema. "
                    "Call this when you have enough information to generate the full config."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "config": types.Schema(
                            type="OBJECT",
                            description="The complete configuration object",
                        ),
                    },
                    required=["config"],
                ),
            ),
        ])
    ]


# ---------------------------------------------------------------------------
# Tool handler — dispatches calls with session state access
# ---------------------------------------------------------------------------

class ToolHandler:
    """Resolves tool calls against the schema registry and session state."""

    def __init__(self, session_config: dict[str, Any] | None = None, surface: str = ""):
        self._current_config: dict[str, Any] = session_config or {}
        self._surface = surface

    @property
    def current_config(self) -> dict[str, Any]:
        return self._current_config

    def handle(self, tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
        """Dispatch a tool call and return the result."""
        handler = self._handlers.get(tool_name)
        if handler is None:
            return {"error": f"Unknown tool: {tool_name}"}
        return handler(self, args)

    def _handle_get_component_schema(self, args: dict) -> dict:
        component = args.get("component", "")
        schema = SchemaRegistry.get_schema(component)
        if schema is None:
            return {
                "error": f"No schema for '{component}'",
                "available_schemas": SchemaRegistry.list_schemas(),
            }
        return {"component": component, "schema": schema}

    def _handle_get_available_options(self, args: dict) -> dict:
        field = args.get("field", "")
        options = SchemaRegistry.get_options(field)
        if options is None:
            return {
                "error": f"No options for '{field}'",
                "available_option_sets": SchemaRegistry.list_options(),
            }
        return {"field": field, "options": options}

    def _handle_get_current_config(self, _args: dict) -> dict:
        if not self._current_config:
            return {"config": None, "message": "No configuration generated yet."}
        return {"config": self._current_config}

    def _handle_submit_config(self, args: dict) -> dict:
        config = args.get("config")
        if not config or not isinstance(config, dict):
            return {"error": "config must be a non-empty object."}

        # Validate against surface output schema
        output_schema = SchemaRegistry.get_schema(f"{self._surface}_output")
        if output_schema:
            required = output_schema.get("required", [])
            missing = [k for k in required if k not in config]
            if missing:
                return {
                    "error": f"Config missing required fields: {missing}",
                    "required_fields": required,
                    "provided_fields": list(config.keys()),
                }

        self._current_config = config
        return {"status": "accepted", "message": "Configuration submitted for preview."}

    # Dispatch table — avoids getattr magic
    _handlers: dict[str, Any] = {
        "get_component_schema": _handle_get_component_schema,
        "get_available_options": _handle_get_available_options,
        "get_current_config": _handle_get_current_config,
        "submit_config": _handle_submit_config,
    }
