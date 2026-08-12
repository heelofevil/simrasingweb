import os
import sys

_HOME = "/home/a1302688"
_PUBLIC = f"{_HOME}/domains/a1302688.xsph.ru/public_html"
sys.path.insert(0, _PUBLIC)
_VENV_ROOT = f"{_HOME}/python"
for sub in ("lib/python3.10/site-packages", "lib64/python3.10/site-packages"):
    pkg_dir = os.path.join(_VENV_ROOT, sub)
    if os.path.isdir(pkg_dir) and pkg_dir not in sys.path:
        sys.path.insert(0, pkg_dir)

from dotenv import load_dotenv

load_dotenv(f"{_HOME}/domains/a1302688.xsph.ru/.env")

from sqlalchemy import inspect

from app import create_app
from app.extensions import db
from app.models import Bundle

app = create_app()
with app.app_context():
    cols = {c["name"] for c in inspect(db.engine).get_columns("bundles")}
    print("has_column", "field_work_price" in cols)
    print("model_attr", hasattr(Bundle, "field_work_price"))
    b = Bundle.query.first()
    if b:
        print("sample", b.slug, b.field_work_price)
        b.field_work_price = 10000
        db.session.commit()
        db.session.refresh(b)
        print("after_set", b.field_work_price)
        b2 = Bundle.query.get(b.id)
        print("after_reload", b2.field_work_price)
