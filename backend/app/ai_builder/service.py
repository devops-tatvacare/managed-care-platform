"""Builder Service — orchestrates multi-turn LLM conversation with manual tool dispatch.

Uses google-genai SDK for the API call but handles tool calling manually so that
tool functions have access to session state (current config, submitted config).

Flow per turn:
1. Build contents from session history
2. Call Gemini with tool declarations
3. If response has function calls → dispatch via ToolHandler → append results → loop
4. If response has text → return as final message
5. If submit_config was called → extract and return the config
"""

from __future__ import annotations

import json
import logging
from typing import Any

from google import genai
from google.genai import types

from app.config import settings
from app.ai_builder.session import BuilderSession
from app.ai_builder.tool_registry import ToolHandler, get_tool_declarations

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 10


class BuilderService:
    """Generic AI builder orchestration with manual tool dispatch."""

    def __init__(self) -> None:
        self._client: genai.Client | None = None

    def _get_client(self) -> genai.Client:
        if self._client is None:
            self._client = genai.Client(api_key=settings.gemini_api_key)
        return self._client

    async def run_turn(
        self,
        session: BuilderSession,
        user_message: str,
    ) -> dict[str, Any]:
        """Execute one user turn in the builder conversation.

        Returns:
            {"message": str, "config": dict | None}
        """
        session.add_user_message(user_message)

        tool_handler = ToolHandler(session.current_config, surface=session.surface)
        contents = session.to_gemini_contents()

        submitted_config: dict[str, Any] | None = None
        final_message = ""

        for round_idx in range(MAX_TOOL_ROUNDS):
            try:
                response = await self._call_gemini(contents)
            except Exception as e:
                logger.error(f"Gemini call failed (round {round_idx}): {e}")
                final_message = "I encountered an error. Please try again."
                break

            candidates = response.candidates or []
            if not candidates:
                final_message = "No response generated. Please try again."
                break

            parts = candidates[0].content.parts if candidates[0].content else []

            # Separate function calls from text
            function_calls = [p for p in parts if p.function_call]
            text_parts = [p.text for p in parts if p.text]

            if not function_calls:
                # No tool calls — final text response
                final_message = " ".join(text_parts).strip()
                break

            # Process tool calls
            tool_response_parts = []
            for part in function_calls:
                fc = part.function_call
                tool_name = fc.name
                tool_args = dict(fc.args) if fc.args else {}

                logger.info(f"Tool call [{round_idx}]: {tool_name}({json.dumps(tool_args, default=str)[:200]})")

                result = tool_handler.handle(tool_name, tool_args)

                # Track submitted config
                if tool_name == "submit_config" and result.get("status") == "accepted":
                    submitted_config = tool_handler.current_config

                tool_response_parts.append(
                    types.Part.from_function_response(
                        name=tool_name,
                        response=result,
                    )
                )

            # Append model's turn (with function calls) to history
            contents.append(candidates[0].content)

            # Append tool results as next user turn
            contents.append(types.Content(role="user", parts=tool_response_parts))

            # Also capture any text the model produced alongside tool calls
            if text_parts:
                final_message = " ".join(text_parts).strip()

            # Loop — Gemini processes tool results and either calls more tools or responds

        # If config was submitted but no final message, generate a summary
        if submitted_config and not final_message:
            name = submitted_config.get("program_name") or submitted_config.get("name", "Configuration")
            if session.surface == "pathway":
                block_count = len(submitted_config.get("blocks", []))
                edge_count = len(submitted_config.get("edges", []))
                final_message = (
                    f"Pathway designed: **{name}** with "
                    f"{block_count} blocks and {edge_count} connections. "
                    f"Review the preview and click **Accept & Edit** to refine on the canvas."
                )
            else:
                cohort_count = len(submitted_config.get("cohorts", []))
                comp_count = len(submitted_config.get("scoring_engine", {}).get("components", []))
                rule_count = len(submitted_config.get("override_rules", []))
                final_message = (
                    f"Configuration updated: **{name}** with "
                    f"{cohort_count} cohorts, {comp_count} scoring components, and {rule_count} override rules. "
                    f"Review the preview and click **Apply to Program** when ready."
                )

        # Update session
        session.add_model_message(final_message, config=submitted_config)
        if submitted_config:
            session.current_config = submitted_config

        return {
            "message": final_message,
            "config": submitted_config,
        }

    async def _call_gemini(self, contents: list) -> Any:
        """Make a single async Gemini API call with tool declarations (no auto-dispatch)."""
        client = self._get_client()

        config = types.GenerateContentConfig(
            tools=get_tool_declarations(),
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            max_output_tokens=65536,
            temperature=0.7,
        )

        response = await client.aio.models.generate_content(
            model=settings.llm_default_model,
            contents=contents,
            config=config,
        )
        return response
