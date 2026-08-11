"""In-memory rate limits for public lead submissions."""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Deque

from flask import Request, current_app


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._hits: dict[str, Deque[float]] = defaultdict(deque)

    def allow(self, key: str, limit: int, window_sec: float) -> tuple[bool, int]:
        """Return (allowed, retry_after_seconds)."""
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            cutoff = now - window_sec
            while q and q[0] <= cutoff:
                q.popleft()
            if len(q) >= limit:
                retry = max(1, int(window_sec - (now - q[0])) + 1)
                return False, retry
            q.append(now)
            return True, 0

    def prune(self, max_keys: int = 5000) -> None:
        with self._lock:
            if len(self._hits) <= max_keys:
                return
            # Drop emptiest / oldest buckets when map grows too large
            stale = sorted(self._hits.items(), key=lambda kv: kv[1][0] if kv[1] else 0)
            for key, _ in stale[: max(0, len(self._hits) - max_keys // 2)]:
                self._hits.pop(key, None)


_limiter = SlidingWindowLimiter()


def client_ip(req: Request) -> str:
    forwarded = (req.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
    if forwarded:
        return forwarded[:64]
    return (req.remote_addr or "unknown")[:64]


def check_lead_limits(req: Request, contact: str) -> tuple[bool, str, int]:
    """
    Multi-layer guard:
    - per IP
    - per contact
    - short cooldown for identical bursts
    """
    cfg = current_app.config
    ip = client_ip(req)
    contact_key = (contact or "").strip().lower()[:200]

    ip_limit = int(cfg.get("LEAD_RATE_IP_LIMIT", 8))
    ip_window = float(cfg.get("LEAD_RATE_IP_WINDOW", 600))
    contact_limit = int(cfg.get("LEAD_RATE_CONTACT_LIMIT", 4))
    contact_window = float(cfg.get("LEAD_RATE_CONTACT_WINDOW", 600))
    burst_limit = int(cfg.get("LEAD_RATE_BURST_LIMIT", 2))
    burst_window = float(cfg.get("LEAD_RATE_BURST_WINDOW", 20))

    _limiter.prune()

    ok, retry = _limiter.allow(f"burst:{ip}", burst_limit, burst_window)
    if not ok:
        return False, "Слишком часто. Подожди пару секунд и попробуй снова.", retry

    ok, retry = _limiter.allow(f"ip:{ip}", ip_limit, ip_window)
    if not ok:
        return False, "Лимит заявок с этого адреса. Попробуй позже.", retry

    if contact_key:
        ok, retry = _limiter.allow(f"contact:{contact_key}", contact_limit, contact_window)
        if not ok:
            return False, "С этого контакта уже много заявок. Попробуй позже.", retry

    return True, "", 0
