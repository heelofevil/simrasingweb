"""Owner admin: product CRUD + image upload."""

from __future__ import annotations

import re
from functools import wraps
from pathlib import Path

from flask import (
    Blueprint,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models import Bundle, BundleItem, Category, FaqItem, Product

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
# Unicode letters (incl. Cyrillic), digits, separators
SKU_RE = re.compile(r"^[\w.\-]{2,40}$", re.UNICODE)
SLUG_RE = re.compile(r"^[\w]+(?:-[\w]+)*$", re.UNICODE)


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin_ok"):
            return redirect(url_for("admin.login", next=request.path))
        return view(*args, **kwargs)

    return wrapped


def _media_dir(kind: str) -> Path:
    return Path(current_app.root_path) / "static" / "img" / kind


def _save_image(file_storage, basename: str, kind: str = "products") -> str | None:
    if not file_storage or not file_storage.filename:
        return None
    raw = secure_filename(file_storage.filename)
    ext = Path(raw).suffix.lower()
    if ext == ".jpeg":
        ext = ".jpg"
    if ext not in ALLOWED_EXT:
        raise ValueError("Допустимы JPG, PNG, WEBP, GIF")
    dest_name = f"{basename}{ext}"
    folder = _media_dir(kind)
    folder.mkdir(parents=True, exist_ok=True)
    file_storage.save(folder / dest_name)
    return dest_name


def _parse_product_form(form, product: Product | None = None) -> tuple[Product | None, str | None]:
    sku = (form.get("sku") or "").strip()
    name = (form.get("name") or "").strip()
    brand = (form.get("brand") or "PITLINE").strip() or "PITLINE"
    category_id = form.get("category_id")
    specs = (form.get("specs") or "").strip()
    description = (form.get("description") or "").strip()
    badge = (form.get("badge") or "").strip() or None
    visible = form.get("visible") == "on"

    if not sku or not SKU_RE.match(sku):
        return None, "SKU: 2–40 символов (буквы, цифры, . _ -)"
    if not name:
        return None, "Укажи название"
    try:
        price = int(form.get("price") or 0)
        sort_order = int(form.get("sort_order") or 0)
        category_id = int(category_id)
    except (TypeError, ValueError):
        return None, "Цена / категория / порядок — числа"

    cat = Category.query.get(category_id)
    if not cat:
        return None, "Категория не найдена"

    conflict = Product.query.filter_by(sku=sku).first()
    if conflict and (product is None or conflict.id != product.id):
        return None, f"SKU {sku} уже занят"

    if product is None:
        product = Product(sku=sku)
        db.session.add(product)

    product.sku = sku
    product.name = name
    product.brand = brand
    product.category_id = category_id
    product.price = max(0, price)
    product.specs = specs
    product.description = description
    product.badge = badge
    product.visible = visible
    product.sort_order = sort_order
    return product, None


def _hide_bundles_for_product(product_id: int) -> int:
    """Hide (and unfeature) every bundle that includes this product."""
    bundle_ids = [
        row[0]
        for row in db.session.query(BundleItem.bundle_id)
        .filter_by(product_id=product_id)
        .distinct()
        .all()
    ]
    if not bundle_ids:
        return 0
    hidden = 0
    for bundle in Bundle.query.filter(Bundle.id.in_(bundle_ids)).all():
        if bundle.visible or bundle.featured:
            bundle.visible = False
            bundle.featured = False
            hidden += 1
    return hidden


def _catalog_products():
    return (
        Product.query.join(Category)
        .order_by(Category.sort_order, Product.sort_order, Product.name)
        .all()
    )


def _products_grouped():
    grouped: list[tuple[str, str, list[Product]]] = []
    current_name = None
    current_slug = ""
    bucket: list[Product] = []
    for product in _catalog_products():
        name = product.category.name if product.category else "—"
        slug = product.category.slug if product.category else ""
        if name != current_name:
            if bucket:
                grouped.append((current_name, current_slug, bucket))
            current_name = name
            current_slug = slug
            bucket = [product]
        else:
            bucket.append(product)
    if bucket:
        grouped.append((current_name, current_slug, bucket))
    return grouped


def _selected_product_ids(form) -> list[int]:
    raw = form.getlist("product_ids")
    ids: list[int] = []
    for value in raw:
        try:
            pid = int(value)
        except (TypeError, ValueError):
            continue
        if pid not in ids:
            ids.append(pid)
    return ids


def _parse_bundle_form(form, bundle: Bundle | None = None) -> tuple[Bundle | None, list[int], str | None]:
    slug = (form.get("slug") or "").strip().lower()
    # Keep Cyrillic as-is for lower(); strip spaces to hyphen for friendlier input
    slug = re.sub(r"\s+", "-", slug)
    name = (form.get("name") or "").strip()
    filter_tag = (form.get("filter_tag") or "").strip() or "Все"
    description = (form.get("description") or "").strip()
    badge = (form.get("badge") or "").strip() or None
    price_raw = (form.get("price_override") or "").strip()
    field_work_raw = (form.get("field_work_price") or "").strip()
    product_ids = _selected_product_ids(form)

    if not slug or not SLUG_RE.match(slug):
        return None, product_ids, "Slug: 2–80 символов (буквы, цифры, дефис)"
    if not name:
        return None, product_ids, "Укажи название сборки"
    if not product_ids:
        return None, product_ids, "Выбери хотя бы один товар в составе"

    try:
        sort_order = int(form.get("sort_order") or 0)
        featured_order = int(form.get("featured_order") or 0)
    except (TypeError, ValueError):
        return None, product_ids, "Порядок — число"

    price_override = None
    if price_raw:
        try:
            price_override = max(0, int(price_raw))
        except (TypeError, ValueError):
            return None, product_ids, "Цена сборки — целое число или пусто"

    try:
        field_work_price = max(0, int(field_work_raw or 0))
    except (TypeError, ValueError):
        return None, product_ids, "Выездные работы — целое число или 0"

    featured = form.get("featured") == "on"
    visible = form.get("visible") == "on"
    if not visible:
        featured = False

    existing = Product.query.filter(Product.id.in_(product_ids)).all()
    found = {p.id for p in existing}
    if len(found) != len(product_ids):
        return None, product_ids, "В составе есть несуществующий товар"

    conflict = Bundle.query.filter_by(slug=slug).first()
    if conflict and (bundle is None or conflict.id != bundle.id):
        return None, product_ids, f"Slug {slug} уже занят"

    if bundle is None:
        bundle = Bundle(slug=slug)
        db.session.add(bundle)

    bundle.slug = slug
    bundle.name = name
    bundle.filter_tag = filter_tag
    bundle.description = description
    bundle.badge = badge
    bundle.price_override = price_override
    bundle.field_work_price = field_work_price
    bundle.sort_order = sort_order
    bundle.featured = featured
    bundle.featured_order = featured_order
    bundle.visible = visible
    return bundle, product_ids, None


def _sync_bundle_items(bundle: Bundle, product_ids: list[int]) -> None:
    bundle.items.clear()
    db.session.flush()
    for i, pid in enumerate(product_ids):
        qty_raw = request.form.get(f"qty_{pid}") or "1"
        try:
            qty = max(1, int(qty_raw))
        except (TypeError, ValueError):
            qty = 1
        bundle.items.append(BundleItem(product_id=pid, qty=qty, sort_order=i))


def _safe_next(default: str | None = None) -> str:
    nxt = request.args.get("next") or default or url_for("admin.products")
    if not str(nxt).startswith("/admin"):
        return url_for("admin.products")
    return str(nxt)


@admin_bp.get("/login")
def login():
    if session.get("admin_ok"):
        return redirect(url_for("admin.products"))
    return render_template("admin/login.html")


@admin_bp.post("/login")
def login_post():
    username = (request.form.get("username") or "").strip()
    password = request.form.get("password") or ""
    ok_user = username == current_app.config["ADMIN_USERNAME"]
    ok_pass = password == current_app.config["ADMIN_PASSWORD"]
    if not (ok_user and ok_pass):
        flash("Неверный логин или пароль", "error")
        return render_template("admin/login.html"), 401
    session["admin_ok"] = True
    session.permanent = True
    return redirect(_safe_next())


@admin_bp.post("/logout")
@login_required
def logout():
    session.pop("admin_ok", None)
    return redirect(url_for("admin.login"))


@admin_bp.get("/")
@login_required
def dashboard():
    return redirect(url_for("admin.products"))


@admin_bp.get("/products")
@login_required
def products():
    q = (request.args.get("q") or "").strip()
    cat_slug = (request.args.get("category") or "").strip()
    query = Product.query.join(Category)
    if q:
        like = f"%{q}%"
        query = query.filter(
            db.or_(
                Product.name.ilike(like),
                Product.sku.ilike(like),
                Product.brand.ilike(like),
            )
        )
    if cat_slug:
        query = query.filter(Category.slug == cat_slug)
    items = query.order_by(Category.sort_order, Product.sort_order, Product.name).all()
    cats = Category.query.order_by(Category.sort_order).all()
    return render_template(
        "admin/products.html",
        products=items,
        categories=cats,
        q=q,
        category=cat_slug,
    )


@admin_bp.get("/products/new")
@login_required
def product_new():
    cats = Category.query.order_by(Category.sort_order).all()
    return render_template("admin/product_form.html", product=None, categories=cats)


@admin_bp.post("/products/new")
@login_required
def product_create():
    cats = Category.query.order_by(Category.sort_order).all()
    product, err = _parse_product_form(request.form)
    if err:
        flash(err, "error")
        return render_template("admin/product_form.html", product=None, categories=cats), 400
    try:
        image_name = _save_image(request.files.get("image"), product.sku)
        if image_name:
            product.image_file = image_name
    except ValueError as exc:
        flash(str(exc), "error")
        return render_template("admin/product_form.html", product=None, categories=cats), 400
    db.session.commit()
    flash("Товар создан", "ok")
    return redirect(url_for("admin.products"))


@admin_bp.get("/products/<int:product_id>/edit")
@login_required
def product_edit(product_id: int):
    product = Product.query.get_or_404(product_id)
    cats = Category.query.order_by(Category.sort_order).all()
    return render_template("admin/product_form.html", product=product, categories=cats)


@admin_bp.post("/products/<int:product_id>/edit")
@login_required
def product_update(product_id: int):
    product = Product.query.get_or_404(product_id)
    cats = Category.query.order_by(Category.sort_order).all()
    product, err = _parse_product_form(request.form, product)
    if err:
        flash(err, "error")
        return render_template("admin/product_form.html", product=product, categories=cats), 400
    try:
        image_name = _save_image(request.files.get("image"), product.sku)
        if image_name:
            product.image_file = image_name
    except ValueError as exc:
        flash(str(exc), "error")
        return render_template("admin/product_form.html", product=product, categories=cats), 400
    hidden_bundles = 0
    if not product.visible:
        hidden_bundles = _hide_bundles_for_product(product.id)
    db.session.commit()
    if hidden_bundles:
        flash(f"Сохранено · скрыто сборок: {hidden_bundles}", "ok")
    else:
        flash("Сохранено", "ok")
    return redirect(url_for("admin.products"))


@admin_bp.post("/products/<int:product_id>/delete")
@login_required
def product_delete(product_id: int):
    product = Product.query.get_or_404(product_id)
    sku = product.sku
    linked = BundleItem.query.filter_by(product_id=product.id).count()
    try:
        hidden_bundles = _hide_bundles_for_product(product.id)
        BundleItem.query.filter_by(product_id=product.id).delete(synchronize_session=False)
        db.session.delete(product)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        flash(f"Не удалось удалить {sku}: товар используется", "error")
        return redirect(url_for("admin.products"))
    parts = [f"Удалён {sku}"]
    if linked:
        parts.append(f"убран из {linked} позиций сборок")
    if hidden_bundles:
        parts.append(f"скрыто сборок: {hidden_bundles}")
    flash(" · ".join(parts), "ok")
    return redirect(url_for("admin.products"))


@admin_bp.get("/products/<int:product_id>/delete")
@login_required
def product_delete_get(product_id: int):
    flash("Удаление только через кнопку в списке", "error")
    return redirect(url_for("admin.products"))


@admin_bp.get("/bundles")
@login_required
def bundles():
    q = (request.args.get("q") or "").strip()
    tag = (request.args.get("tag") or "").strip()
    query = Bundle.query
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(Bundle.name.ilike(like), Bundle.slug.ilike(like)))
    if tag:
        query = query.filter_by(filter_tag=tag)
    items = query.order_by(Bundle.sort_order, Bundle.name).all()
    tags = [
        t[0]
        for t in db.session.query(Bundle.filter_tag).distinct().order_by(Bundle.filter_tag).all()
    ]
    return render_template("admin/bundles.html", bundles=items, tags=tags, q=q, tag=tag)


@admin_bp.get("/bundles/new")
@login_required
def bundle_new():
    return render_template(
        "admin/bundle_form.html",
        bundle=None,
        product_groups=_products_grouped(),
        selected_ids=[],
        selected_qty={},
    )


@admin_bp.post("/bundles/new")
@login_required
def bundle_create():
    bundle, product_ids, err = _parse_bundle_form(request.form)
    selected_qty = {pid: request.form.get(f"qty_{pid}", "1") for pid in product_ids}
    if err:
        flash(err, "error")
        return (
            render_template(
                "admin/bundle_form.html",
                bundle=None,
                product_groups=_products_grouped(),
                selected_ids=product_ids,
                selected_qty=selected_qty,
            ),
            400,
        )
    _sync_bundle_items(bundle, product_ids)
    try:
        image_name = _save_image(request.files.get("image"), bundle.slug, kind="bundles")
        if image_name:
            bundle.image_file = image_name
    except ValueError as exc:
        flash(str(exc), "error")
        return (
            render_template(
                "admin/bundle_form.html",
                bundle=None,
                product_groups=_products_grouped(),
                selected_ids=product_ids,
                selected_qty=selected_qty,
            ),
            400,
        )
    db.session.commit()
    flash("Сборка создана", "ok")
    return redirect(url_for("admin.bundle_edit", bundle_id=bundle.id))


@admin_bp.get("/bundles/<int:bundle_id>/edit")
@login_required
def bundle_edit(bundle_id: int):
    bundle = Bundle.query.get_or_404(bundle_id)
    selected_ids = [item.product_id for item in bundle.items]
    selected_qty = {item.product_id: item.qty for item in bundle.items}
    return render_template(
        "admin/bundle_form.html",
        bundle=bundle,
        product_groups=_products_grouped(),
        selected_ids=selected_ids,
        selected_qty=selected_qty,
    )


@admin_bp.post("/bundles/<int:bundle_id>/edit")
@login_required
def bundle_update(bundle_id: int):
    bundle = Bundle.query.get_or_404(bundle_id)
    bundle, product_ids, err = _parse_bundle_form(request.form, bundle)
    selected_qty = {pid: request.form.get(f"qty_{pid}", "1") for pid in product_ids}
    if err:
        flash(err, "error")
        return (
            render_template(
                "admin/bundle_form.html",
                bundle=bundle,
                product_groups=_products_grouped(),
                selected_ids=product_ids,
                selected_qty=selected_qty,
            ),
            400,
        )
    _sync_bundle_items(bundle, product_ids)
    try:
        image_name = _save_image(request.files.get("image"), bundle.slug, kind="bundles")
        if image_name:
            bundle.image_file = image_name
    except ValueError as exc:
        flash(str(exc), "error")
        return (
            render_template(
                "admin/bundle_form.html",
                bundle=bundle,
                product_groups=_products_grouped(),
                selected_ids=product_ids,
                selected_qty=selected_qty,
            ),
            400,
        )
    db.session.commit()
    flash("Сборка сохранена", "ok")
    return redirect(url_for("admin.bundle_edit", bundle_id=bundle.id))


@admin_bp.post("/bundles/<int:bundle_id>/delete")
@login_required
def bundle_delete(bundle_id: int):
    bundle = Bundle.query.get_or_404(bundle_id)
    name = bundle.name
    db.session.delete(bundle)
    db.session.commit()
    flash(f"Удалена «{name}»", "ok")
    return redirect(url_for("admin.bundles"))


def _parse_faq_form(form, item: FaqItem | None = None) -> tuple[FaqItem | None, str | None]:
    question = (form.get("question") or "").strip()
    answer = (form.get("answer") or "").strip()
    visible = form.get("visible") == "on"

    if not question:
        return None, "Укажи вопрос"
    if len(question) > 300:
        return None, "Вопрос — не длиннее 300 символов"
    if not answer:
        return None, "Укажи ответ"

    try:
        sort_order = int(form.get("sort_order") or 0)
    except (TypeError, ValueError):
        return None, "Порядок — число"

    if item is None:
        item = FaqItem()
        db.session.add(item)

    item.question = question
    item.answer = answer
    item.sort_order = sort_order
    item.visible = visible
    return item, None


@admin_bp.get("/faq")
@login_required
def faq_list():
    items = FaqItem.query.order_by(FaqItem.sort_order, FaqItem.id).all()
    return render_template("admin/faq.html", items=items)


@admin_bp.get("/faq/new")
@login_required
def faq_new():
    return render_template("admin/faq_form.html", item=None)


@admin_bp.post("/faq/new")
@login_required
def faq_create():
    item, err = _parse_faq_form(request.form)
    if err:
        flash(err, "error")
        return render_template("admin/faq_form.html", item=None), 400
    db.session.commit()
    flash("Вопрос добавлен", "ok")
    return redirect(url_for("admin.faq_edit", item_id=item.id))


@admin_bp.get("/faq/<int:item_id>/edit")
@login_required
def faq_edit(item_id: int):
    item = FaqItem.query.get_or_404(item_id)
    return render_template("admin/faq_form.html", item=item)


@admin_bp.post("/faq/<int:item_id>/edit")
@login_required
def faq_update(item_id: int):
    item = FaqItem.query.get_or_404(item_id)
    item, err = _parse_faq_form(request.form, item)
    if err:
        flash(err, "error")
        return render_template("admin/faq_form.html", item=item), 400
    db.session.commit()
    flash("Сохранено", "ok")
    return redirect(url_for("admin.faq_edit", item_id=item.id))


@admin_bp.post("/faq/<int:item_id>/delete")
@login_required
def faq_delete(item_id: int):
    item = FaqItem.query.get_or_404(item_id)
    question = item.question
    db.session.delete(item)
    db.session.commit()
    flash(f"Удалён вопрос «{question[:60]}»", "ok")
    return redirect(url_for("admin.faq_list"))
