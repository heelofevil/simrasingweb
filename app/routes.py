import json
import logging

from flask import Blueprint, current_app, jsonify, render_template, request

from app.bitrix import push_lead_to_bitrix
from app.extensions import db
from app.models import Bundle, Category, Lead, Product
from app.ratelimit import check_lead_limits

bp = Blueprint("main", __name__)
logger = logging.getLogger(__name__)


def _bundle_publicly_available(bundle: Bundle) -> bool:
    return bundle.is_publicly_available()


@bp.get("/")
def index():
    return render_template("index.html")


@bp.get("/api/categories")
def list_categories():
    cats = Category.query.order_by(Category.sort_order).all()
    return jsonify([c.to_dict() for c in cats])


@bp.get("/api/products")
def list_products():
    category = (request.args.get("category") or "").strip()
    q = Product.query.filter_by(visible=True)
    if category:
        cat = Category.query.filter_by(slug=category).first()
        if not cat:
            return jsonify([])
        q = q.filter_by(category_id=cat.id)
    products = q.order_by(Product.sort_order, Product.price).all()
    return jsonify([p.to_dict() for p in products])


@bp.get("/api/bundles")
def list_bundles():
    tag = (request.args.get("tag") or "").strip()
    featured_only = (request.args.get("featured") or "").strip() in {"1", "true", "yes"}
    q = Bundle.query.filter_by(visible=True)
    if featured_only:
        q = q.filter_by(featured=True).order_by(Bundle.featured_order, Bundle.sort_order, Bundle.name)
    else:
        q = q.order_by(Bundle.sort_order)
        if tag and tag != "Все":
            q = q.filter_by(filter_tag=tag)
    bundles = [b for b in q.all() if _bundle_publicly_available(b)]
    return jsonify([b.to_dict() for b in bundles])


@bp.get("/api/featured-bundles")
def list_featured_bundles():
    bundles = (
        Bundle.query.filter_by(featured=True, visible=True)
        .order_by(Bundle.featured_order, Bundle.sort_order, Bundle.name)
        .all()
    )
    bundles = [b for b in bundles if _bundle_publicly_available(b)]
    return jsonify([b.to_dict() for b in bundles])


@bp.get("/api/bundle-tags")
def list_bundle_tags():
    visible = [b for b in Bundle.query.filter_by(visible=True).all() if _bundle_publicly_available(b)]
    tags = sorted({b.filter_tag for b in visible if b.filter_tag})
    return jsonify(["Все"] + tags)


def _normalize_build(build) -> tuple[str | None, str | None]:
    max_items = int(current_app.config.get("LEAD_BUILD_MAX_ITEMS", 40))
    max_chars = int(current_app.config.get("LEAD_BUILD_MAX_CHARS", 12000))

    if isinstance(build, str):
        if len(build) > max_chars:
            return None, "Слишком большой состав сборки"
        try:
            parsed = json.loads(build)
        except json.JSONDecodeError:
            return None, "Некорректный состав сборки"
        build = parsed

    if build is None:
        build = []
    if not isinstance(build, list):
        return None, "Некорректный состав сборки"
    if len(build) > max_items:
        return None, "Слишком много позиций в сборке"

    cleaned = []
    for item in build:
        if not isinstance(item, dict):
            continue
        cleaned.append(
            {
                "id": item.get("id"),
                "sku": str(item.get("sku") or "")[:40],
                "name": str(item.get("name") or "")[:200],
                "price": item.get("price") if isinstance(item.get("price"), int) else 0,
                "category": str(item.get("category") or "")[:40],
            }
        )
        if len(cleaned) > max_items:
            return None, "Слишком много позиций в сборке"

    payload = json.dumps(cleaned, ensure_ascii=False)
    if len(payload) > max_chars:
        return None, "Слишком большой состав сборки"
    return payload, None


@bp.post("/api/leads")
def create_lead():
    data = request.get_json(silent=True) or request.form
    name = (data.get("name") or "").strip()
    contact = (data.get("contact") or "").strip()
    tier = (data.get("tier") or "Кастом").strip()
    mode = (data.get("mode") or "diy").strip()
    total_price = data.get("total_price") or 0
    build = data.get("build") or []

    if not name or not contact:
        return jsonify({"ok": False, "error": "Укажи имя и контакт"}), 400

    if len(name) > 120 or len(contact) > 200 or len(tier) > 80 or len(mode) > 40:
        return jsonify({"ok": False, "error": "Слишком длинные поля"}), 400

    allowed, limit_msg, retry_after = check_lead_limits(request, contact)
    if not allowed:
        resp = jsonify({"ok": False, "error": limit_msg})
        resp.status_code = 429
        resp.headers["Retry-After"] = str(max(1, retry_after))
        return resp

    try:
        total_price = int(total_price)
    except (TypeError, ValueError):
        total_price = 0
    total_price = max(0, min(total_price, 50_000_000))

    build_json, build_err = _normalize_build(build)
    if build_err:
        return jsonify({"ok": False, "error": build_err}), 400

    lead = Lead(
        name=name,
        contact=contact,
        tier=tier,
        mode=mode,
        total_price=total_price,
        build_json=build_json or "[]",
    )
    db.session.add(lead)
    db.session.commit()

    bitrix = None
    try:
        bitrix = push_lead_to_bitrix(lead)
    except Exception:
        logger.exception("Bitrix push failed for lead %s", lead.id)

    return jsonify({"ok": True, "id": lead.id, "bitrix": bool(bitrix)}), 201
