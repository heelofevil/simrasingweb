"""Bitrix24 CRM: push site leads via incoming webhook."""

from __future__ import annotations

import json
import logging
from typing import Any

import requests
from flask import current_app

logger = logging.getLogger(__name__)


def _webhook_base() -> str:
    url = (current_app.config.get("BITRIX24_WEBHOOK_URL") or "").strip()
    if not url:
        return ""
    return url if url.endswith("/") else url + "/"


def push_lead_to_bitrix(lead) -> dict[str, Any] | None:
    """Create a CRM lead in Bitrix24. Returns API result or None if disabled/failed."""
    base = _webhook_base()
    if not base:
        logger.debug("Bitrix webhook not configured — skip")
        return None

    try:
        build = json.loads(lead.build_json or "[]")
    except json.JSONDecodeError:
        build = []

    lines = []
    if isinstance(build, list):
        for item in build:
            if not isinstance(item, dict):
                continue
            name = item.get("name") or item.get("sku") or "—"
            price = item.get("price")
            cat = item.get("category") or ""
            price_s = f" — {price:,} ₽".replace(",", " ") if isinstance(price, int) else ""
            lines.append(f"• [{cat}] {name}{price_s}")

    comment_parts = [
        f"Источник: сайт PITLINE",
        f"Режим: {lead.mode}",
        f"Тир / сборка: {lead.tier}",
        f"Сумма: {lead.total_price:,} ₽".replace(",", " "),
        f"Контакт: {lead.contact}",
    ]
    if lines:
        comment_parts.append("Состав:")
        comment_parts.extend(lines)
    comments = "\n".join(comment_parts)

    contact = (lead.contact or "").strip()
    phone = contact if contact.startswith("+") or contact[:1].isdigit() else ""
    fields: dict[str, Any] = {
        "TITLE": f"PITLINE · {lead.tier} · {lead.name}",
        "NAME": lead.name,
        "COMMENTS": comments,
        "SOURCE_ID": current_app.config.get("BITRIX24_SOURCE_ID") or "WEB",
        "OPENED": "Y",
        "CURRENCY_ID": "RUB",
        "OPPORTUNITY": lead.total_price or 0,
    }
    if phone:
        fields["PHONE"] = [{"VALUE": phone, "VALUE_TYPE": "WORK"}]
    elif contact.startswith("@"):
        fields["IM"] = [{"VALUE": f"telegram|{contact.lstrip('@')}", "VALUE_TYPE": "TELEGRAM"}]
    else:
        fields["COMMENTS"] = f"Контакт: {contact}\n\n" + comments

    assigned = current_app.config.get("BITRIX24_ASSIGNED_BY_ID")
    if assigned:
        try:
            fields["ASSIGNED_BY_ID"] = int(assigned)
        except (TypeError, ValueError):
            pass

    endpoint = base + "crm.lead.add.json"
    try:
        resp = requests.post(
            endpoint,
            json={"fields": fields},
            timeout=float(current_app.config.get("BITRIX24_TIMEOUT") or 8),
        )
        data = resp.json()
        if resp.status_code >= 400 or data.get("error"):
            logger.warning("Bitrix lead failed: %s %s", resp.status_code, data)
            return None
        logger.info("Bitrix lead created: %s", data.get("result"))
        return data
    except requests.RequestException as exc:
        logger.warning("Bitrix request error: %s", exc)
        return None
