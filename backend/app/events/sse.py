"""Generic SSE helper — converts an async event iterator to a StreamingResponse."""

from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from starlette.responses import StreamingResponse


async def _sse_generator(
    events: AsyncIterator[dict],
    heartbeat_interval: int = 15,
) -> AsyncIterator[str]:
    """Wrap an event iterator in SSE format with periodic heartbeats."""
    try:
        while True:
            try:
                event = await asyncio.wait_for(
                    events.__anext__(), timeout=heartbeat_interval
                )
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                yield ":ping\n\n"
            except StopAsyncIteration:
                break
    except asyncio.CancelledError:
        return


def sse_response(
    events: AsyncIterator[dict],
    heartbeat_interval: int = 15,
) -> StreamingResponse:
    """Create a StreamingResponse from an async event iterator."""
    return StreamingResponse(
        _sse_generator(events, heartbeat_interval),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
