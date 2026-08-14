import os, sys
_HOME = "/home/a1302688"
sys.path.insert(0, f"{_HOME}/domains/a1302688.xsph.ru/public_html")
for sub in ("lib/python3.10/site-packages", "lib64/python3.10/site-packages"):
    p = os.path.join(f"{_HOME}/python", sub)
    if os.path.isdir(p): sys.path.insert(0, p)
from dotenv import load_dotenv
load_dotenv(f"{_HOME}/domains/a1302688.xsph.ru/.env")
from app import create_app
from app.models import Bundle
app = create_app()
with app.app_context():
    for b in Bundle.query.order_by(Bundle.id).all():
        print(b.id, b.slug, b.field_work_price)
