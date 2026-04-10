"""Generic in-memory pub/sub event bus, scoped by tenant + channel."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import AsyncIterator
from uuid import UUID


class EventBus:
    """Tenant+channel scoped pub/sub. Subscribers get their own asyncio.Queue."""

    def __init__(self) -> None:
        self._subscribers: dict[tuple[UUID, str], list[asyncio.Queue]] = defaultdict(list)

    async def publish(self, tenant_id: UUID, channel: str, payload: dict) -> None:
        key = (tenant_id, channel)
        for queue in self._subscribers.get(key, []):
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                pass  # drop if subscriber is slow

    async def subscribe(self, tenant_id: UUID, channel: str) -> AsyncIterator[dict]:
        key = (tenant_id, channel)
        queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=256)
        self._subscribers[key].append(queue)
        try:
            while True:
                yield await queue.get()
        finally:
            self._subscribers[key].remove(queue)
            if not self._subscribers[key]:
                del self._subscribers[key]
