"""Generic in-memory pub/sub event bus, scoped by tenant + channel."""

from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from typing import AsyncIterator
from uuid import UUID

logger = logging.getLogger(__name__)


class EventBus:
    """Tenant+channel scoped pub/sub. Subscribers get their own asyncio.Queue."""

    def __init__(self) -> None:
        self._subscribers: dict[tuple[UUID, str], list[asyncio.Queue]] = defaultdict(list)

    async def publish(self, tenant_id: UUID, channel: str, payload: dict) -> None:
        key = (tenant_id, channel)
        subs = self._subscribers.get(key, [])
        if not subs:
            print(f"[EventBus] publish({channel}, {payload.get('type')}) — no subscribers", flush=True)
            return
        print(f"[EventBus] publish({channel}, {payload.get('type')}) → {len(subs)} subscriber(s)", flush=True)
        logger.info("publish(%s, %s) → %d subscriber(s)", channel, payload.get("type"), len(subs))
        for queue in subs:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                logger.warning("publish(%s) — queue full, dropping event", channel)

    async def subscribe(self, tenant_id: UUID, channel: str) -> AsyncIterator[dict]:
        key = (tenant_id, channel)
        queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=256)
        self._subscribers[key].append(queue)
        print(f"[EventBus] subscribe({channel}) — now {len(self._subscribers[key])} subscriber(s)", flush=True)
        try:
            while True:
                yield await queue.get()
        finally:
            self._subscribers[key].remove(queue)
            remaining = len(self._subscribers.get(key, []))
            logger.info("unsubscribe(%s) — %d subscriber(s) remaining", channel, remaining)
            if not self._subscribers[key]:
                del self._subscribers[key]
