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
    """Wrap an event iterator in SSE format with periodic heartbeats.

    Uses a drain task + internal queue to avoid calling wait_for on
    the async generator's __anext__(), which would cancel/finalize it on timeout.
    """
    buffer: asyncio.Queue[dict] = asyncio.Queue()

    async def _drain():
        async for item in events:
            buffer.put_nowait(item)

    drain_task = asyncio.create_task(_drain())

    try:
        while not drain_task.done() or not buffer.empty():
            try:
                event = await asyncio.wait_for(buffer.get(), timeout=heartbeat_interval)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                yield ":ping\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        drain_task.cancel()
        try:
            await drain_task
        except asyncio.CancelledError:
            pass


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
