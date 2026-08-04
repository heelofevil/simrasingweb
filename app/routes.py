import json

from flask import Blueprint, jsonify, render_template, request

from app.extensions import db
from app.models import Bundle, Category, Lead, Product

bp = Blueprint("main", __name__)


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
    q = Bundle.query.order_by(Bundle.sort_order)
    if tag and tag != "Все":
        q = q.filter_by(filter_tag=tag)
    bundles = q.all()
    return jsonify([b.to_dict() for b in bundles])


@bp.get("/api/bundle-tags")
def list_bundle_tags():
    tags = (
        db.session.query(Bundle.filter_tag)
        .distinct()
        .order_by(Bundle.filter_tag)
        .all()
    )
    return jsonify(["Все"] + [t[0] for t in tags])


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

    if len(name) > 120 or len(contact) > 200 or len(tier) > 80:
        return jsonify({"ok": False, "error": "Слишком длинные поля"}), 400

    try:
        total_price = int(total_price)
    except (TypeError, ValueError):
        total_price = 0

    if isinstance(build, str):
        build_json = build
    else:
        build_json = json.dumps(build, ensure_ascii=False)

    lead = Lead(
        name=name,
        contact=contact,
        tier=tier,
        mode=mode,
        total_price=total_price,
        build_json=build_json,
    )
    db.session.add(lead)
    db.session.commit()

    return jsonify({"ok": True, "id": lead.id}), 201
