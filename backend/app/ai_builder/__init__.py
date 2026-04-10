"""AI Builder — generic orchestration layer for LLM-driven configuration generation.

Usage:
    from app.ai_builder import BuilderService, SchemaRegistry, ToolRegistry

    # Register schemas (done once at app startup)
    SchemaRegistry.register("my_surface", { ... json schema ... })

    # Use the service
    service = BuilderService(provider=get_provider())
    result = await service.run_turn(session, user_message)
"""

from app.ai_builder.schema_registry import SchemaRegistry
from app.ai_builder.tool_registry import ToolHandler
from app.ai_builder.service import BuilderService

__all__ = ["BuilderService", "SchemaRegistry", "ToolHandler"]
