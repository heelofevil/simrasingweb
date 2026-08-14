import os
import sys

_HOME = "/home/a1302688"
_PUBLIC = f"{_HOME}/domains/a1302688.xsph.ru/public_html"
os.chdir(_PUBLIC)
sys.path.insert(0, _PUBLIC)
_VENV_ROOT = f"{_HOME}/python"
for sub in ("lib/python3.10/site-packages", "lib64/python3.10/site-packages"):
    pkg_dir = os.path.join(_VENV_ROOT, sub)
    if os.path.isdir(pkg_dir) and pkg_dir not in sys.path:
        sys.path.insert(0, pkg_dir)

from dotenv import load_dotenv

load_dotenv(f"{_HOME}/domains/a1302688.xsph.ru/.env")

from app import create_app
from app.extensions import db
from app.models import Bundle, BundleItem

app = create_app()
with app.app_context():
    b = Bundle.query.filter_by(slug="drift-start").first() or Bundle.query.first()
    if not b:
        print("no bundle")
        sys.exit(1)
    print("before", b.slug, b.field_work_price)
    pids = [item.product_id for item in b.items]
    data = {
        "slug": b.slug,
        "name": b.name,
        "filter_tag": b.filter_tag,
        "description": b.description,
        "field_work_price": "12345",
        "sort_order": str(b.sort_order),
        "featured_order": str(b.featured_order),
    }
    if b.visible:
        data["visible"] = "on"
    if b.featured:
        data["featured"] = "on"
    for pid in pids:
        data.setdefault("product_ids", [])
    # multipart list
    with app.test_client() as c:
        with c.session_transaction() as s:
            s["admin_ok"] = True
        form = data.copy()
        # product_ids as list for getlist
        resp = c.post(
            f"/admin/bundles/{b.id}/edit",
            data={**form, "product_ids": pids},
            follow_redirects=False,
        )
        print("post_status", resp.status_code, resp.headers.get("Location"))
    db.session.expire_all()
    b2 = db.session.get(Bundle, b.id)
    print("after_post", b2.field_work_price)
