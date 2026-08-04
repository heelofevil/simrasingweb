from datetime import datetime, timezone

from app.extensions import db


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(40), unique=True, nullable=False)
    name = db.Column(db.String(80), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    products = db.relationship("Product", back_populates="category", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "slug": self.slug,
            "name": self.name,
            "sort_order": self.sort_order,
        }


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(40), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    brand = db.Column(db.String(80), nullable=False, default="PITLINE")
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    price = db.Column(db.Integer, nullable=False, default=0)
    specs = db.Column(db.String(400), nullable=False, default="")
    description = db.Column(db.Text, nullable=False, default="")
    badge = db.Column(db.String(20), nullable=True)
    visible = db.Column(db.Boolean, nullable=False, default=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    category = db.relationship("Category", back_populates="products")

    def to_dict(self):
        return {
            "id": self.id,
            "sku": self.sku,
            "name": self.name,
            "brand": self.brand,
            "category": self.category.slug if self.category else None,
            "category_name": self.category.name if self.category else None,
            "price": self.price,
            "specs": self.specs,
            "description": self.description,
            "badge": self.badge,
        }


class Bundle(db.Model):
    __tablename__ = "bundles"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(80), unique=True, nullable=False)
    name = db.Column(db.String(160), nullable=False)
    filter_tag = db.Column(db.String(40), nullable=False, default="Все")
    description = db.Column(db.Text, nullable=False, default="")
    price_override = db.Column(db.Integer, nullable=True)
    badge = db.Column(db.String(40), nullable=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    items = db.relationship(
        "BundleItem",
        back_populates="bundle",
        cascade="all, delete-orphan",
        order_by="BundleItem.sort_order",
    )

    def computed_price(self) -> int:
        if self.price_override is not None:
            return self.price_override
        return sum(item.product.price for item in self.items if item.product)

    def to_dict(self):
        products = [
            {
                **item.product.to_dict(),
                "qty": item.qty,
            }
            for item in self.items
            if item.product
        ]
        return {
            "id": self.id,
            "slug": self.slug,
            "name": self.name,
            "filter_tag": self.filter_tag,
            "description": self.description,
            "badge": self.badge,
            "price": self.computed_price(),
            "products": products,
        }


class BundleItem(db.Model):
    __tablename__ = "bundle_items"

    id = db.Column(db.Integer, primary_key=True)
    bundle_id = db.Column(db.Integer, db.ForeignKey("bundles.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    qty = db.Column(db.Integer, nullable=False, default=1)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    bundle = db.relationship("Bundle", back_populates="items")
    product = db.relationship("Product")


class Lead(db.Model):
    __tablename__ = "leads"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    contact = db.Column(db.String(200), nullable=False)
    tier = db.Column(db.String(80), nullable=False, default="Кастом")
    mode = db.Column(db.String(40), nullable=False, default="diy")
    total_price = db.Column(db.Integer, nullable=False, default=0)
    build_json = db.Column(db.Text, nullable=False, default="[]")
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<Lead {self.id} {self.name!r} {self.tier!r}>"
