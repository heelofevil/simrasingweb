from flask import Flask

from app.config import Config
from app.extensions import db
from app.routes import bp


def create_app(config_class: type = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    app.register_blueprint(bp)

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

        result = seed_catalog()
        print(f"Catalog seed: {result}")
