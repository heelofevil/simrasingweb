from flask import Flask

from app.admin import admin_bp
from app.config import Config
from app.extensions import db
from app.routes import bp


def create_app(config_class: type = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    app.register_blueprint(bp)
    app.register_blueprint(admin_bp)

    return app


def init_db() -> None:
    app = create_app()
    with app.app_context():
        from sqlalchemy import inspect, text

        from app import models  # noqa: F401
        from app.seed import seed_catalog

        db.create_all()

        insp = inspect(db.engine)
        if "leads" in insp.get_table_names():
            cols = {c["name"] for c in insp.get_columns("leads")}
            alters = []
            if "mode" not in cols:
                alters.append("ALTER TABLE leads ADD COLUMN mode VARCHAR(40) NOT NULL DEFAULT 'diy'")
            if "total_price" not in cols:
                alters.append("ALTER TABLE leads ADD COLUMN total_price INTEGER NOT NULL DEFAULT 0")
            if "build_json" not in cols:
                alters.append("ALTER TABLE leads ADD COLUMN build_json TEXT NOT NULL DEFAULT '[]'")
            for stmt in alters:
                db.session.execute(text(stmt))
            if alters:
                db.session.commit()

        if "products" in insp.get_table_names():
            cols = {c["name"] for c in insp.get_columns("products")}
            if "image_file" not in cols:
                db.session.execute(text("ALTER TABLE products ADD COLUMN image_file VARCHAR(120)"))
                db.session.commit()

        if "bundles" in insp.get_table_names():
            cols = {c["name"] for c in insp.get_columns("bundles")}
            alters = []
            if "image_file" not in cols:
                alters.append("ALTER TABLE bundles ADD COLUMN image_file VARCHAR(120)")
            if "featured" not in cols:
                alters.append("ALTER TABLE bundles ADD COLUMN featured BOOLEAN NOT NULL DEFAULT FALSE")
            if "featured_order" not in cols:
                alters.append("ALTER TABLE bundles ADD COLUMN featured_order INTEGER NOT NULL DEFAULT 0")
            if "visible" not in cols:
                alters.append("ALTER TABLE bundles ADD COLUMN visible BOOLEAN NOT NULL DEFAULT TRUE")
            for stmt in alters:
                db.session.execute(text(stmt))
            if alters:
                db.session.commit()

            from app.models import Bundle

            if Bundle.query.filter_by(featured=True).count() == 0:
                defaults = [
                    ("legend-pro", 1),
                    ("master-pro", 2),
                    ("immersion-manual", 3),
                ]
                for slug, order in defaults:
                    b = Bundle.query.filter_by(slug=slug).first()
                    if b:
                        b.featured = True
                        b.featured_order = order
                db.session.commit()

        result = seed_catalog()
        print(f"Catalog seed: {result}")
