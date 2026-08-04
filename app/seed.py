"""Synthetic PITLINE catalog for local/demo use. Fictional brands only."""

from __future__ import annotations

from app.extensions import db
from app.models import Bundle, BundleItem, Category, Product

CATEGORIES = [
    ("wheel", "Руль", 1),
    ("base", "База", 2),
    ("pedals", "Педали", 3),
    ("shifter", "Шифтер", 4),
    ("cockpit", "Кокпит", 5),
    ("monitor", "Монитор", 6),
    ("handbrake", "Ручник", 7),
    ("accessories", "Аксессуары", 8),
]

# sku, category_slug, brand, name, price, specs, badge, description
PRODUCTS: list[tuple] = [
    # Wheels
    ("PL-W-01", "wheel", "ApexDrive", "Apex Rim 28 GT", 18990, "Ø280 мм · 22 кнопки · Alcantara", None, "Круглый руль для GT и дрифта."),
    ("PL-W-02", "wheel", "ApexDrive", "Apex Rim 32 Formula", 24990, "Ø320 мм · Formula grip · QR", "HIT", "Формульный обод с быстрым QR."),
    ("PL-W-03", "wheel", "NovaTorque", "Nova GT Pro Leather", 32990, "Ø300 мм · кожа · RGB", None, "Кожаный GT-обод с подсветкой."),
    ("PL-W-04", "wheel", "NovaTorque", "Nova Rally Open", 27990, "Ø330 мм · open rim · paddles", "NEW", "Открытый обод под ралли."),
    ("PL-W-05", "wheel", "PulseSim", "Pulse GT-X Carbon", 41990, "Карбон · magnetic paddles", "PRO", "Лёгкий карбон для длинных стинтов."),
    ("PL-W-06", "wheel", "PulseSim", "Pulse F1 Replica", 45990, "Formula · LED rev · QR2", None, "Реплика F1-штурвала."),
    ("PL-W-07", "wheel", "GridForce", "Grid Clubsport Round", 55990, "Ø330 мм · Clubsport QR", None, "Универсальный клубный круг."),
    ("PL-W-08", "wheel", "GridForce", "Grid Podium Formula", 78990, "Podium · APM · carbon", "PRO", "Топовый формульный штурвал."),
    ("PL-W-09", "wheel", "TorqueLab", "TL Steering Disc 18", 38990, "Ø457 мм · truck/classic", None, "Большой диск под классику и траки."),
    ("PL-W-10", "wheel", "ThrottleX", "TX Leather Round 28", 15990, "Ø280 мм · кожа · 12 кнопок", None, "Доступный кожаный круг."),
    ("PL-W-11", "wheel", "ApexDrive", "Apex Bundle Rim Lite", 12990, "Ø280 мм · комплектный", None, "Лёгкий обод из стартовых бандлов."),
    ("PL-W-12", "wheel", "ForceCore", "Force Invicta Wheel", 94990, "Invicta · APM · alcantara", "PRO", "Премиум-обод под мощные базы."),

    # Bases
    ("PL-B-01", "base", "ApexDrive", "Apex Base T3", 22990, "FFB 3.9 Н·м · belt", None, "Вход в FFB после геймпада."),
    ("PL-B-02", "base", "ApexDrive", "Apex Base T5", 25990, "FFB 5.5 Н·м · belt", "HIT", "Популярная база среднего входа."),
    ("PL-B-03", "base", "ApexDrive", "Apex Base T5 Kit 26", 37990, "5.5 Н·м · rim+base kit", "HIT", "База с комплектным рулём."),
    ("PL-B-04", "base", "ApexDrive", "Apex Base D9", 27290, "FFB 9 Н·м · DD", None, "Первый direct drive."),
    ("PL-B-05", "base", "ApexDrive", "Apex Base D12", 37490, "FFB 12 Н·м · DD", None, "Универсальный DD для лиг."),
    ("PL-B-06", "base", "ApexDrive", "Apex Base D12 Console Kit", 64990, "12 Н·м · PC/console", "NEW", "DD-кит с консольной совместимостью."),
    ("PL-B-07", "base", "ApexDrive", "Apex Base D16", 57990, "FFB 16 Н·м · DD", None, "Мощная база без компромиссов."),
    ("PL-B-08", "base", "ApexDrive", "Apex Base D16 Ultra", 48990, "FFB 16 Н·м · Ultra firmware", "NEW", "Обновлённая прошивка Ultra."),
    ("PL-B-09", "base", "ApexDrive", "Apex Base D21", 59990, "FFB 21 Н·м · DD", None, "Для тяжёлых ободов и GT."),
    ("PL-B-10", "base", "ApexDrive", "Apex Base D21 Ultra", 65990, "FFB 21 Н·м · Ultra", "NEW", "Максимум линейки Apex."),
    ("PL-B-11", "base", "ApexDrive", "Apex Base D25 TrueTorque", 81990, "FFB 25 Н·м · TrueTorque", "NEW", "Флагман Apex с TrueTorque."),
    ("PL-B-12", "base", "PulseSim", "Pulse Alpha Mini", 47990, "FFB 10 Н·м · DD", None, "Компактный DD Pulse."),
    ("PL-B-13", "base", "PulseSim", "Pulse Alpha Evo Sport", 48990, "FFB 9 Н·м · Evo", None, "Спортивная Evo-серия."),
    ("PL-B-14", "base", "PulseSim", "Pulse Alpha Evo 12", 56990, "FFB 12 Н·м · Evo", None, "Баланс мощности и цены."),
    ("PL-B-15", "base", "PulseSim", "Pulse Alpha Classic", 59990, "FFB 15 Н·м · DD", None, "Классика Pulse Alpha."),
    ("PL-B-16", "base", "PulseSim", "Pulse Alpha Evo Pro", 75990, "FFB 18 Н·м · Evo Pro", "PRO", "Для соревновательных пилотов."),
    ("PL-B-17", "base", "PulseSim", "Pulse Alpha Ultimate", 84990, "FFB 23 Н·м · Ultimate", "PRO", "Топовая база Pulse."),
    ("PL-B-18", "base", "GridForce", "Grid CSL DD 8", 62990, "FFB 8 Н·м · CSL", None, "Вход в экосистему Grid."),
    ("PL-B-19", "base", "GridForce", "Grid DD Pro 12", 89990, "FFB 12 Н·м · console ready", "HIT", "Консольный DD Pro."),
    ("PL-B-20", "base", "TorqueLab", "TL Drive 25", 189990, "FFB 25 Н·м · servo", "PRO", "Сервопривод лабораторного уровня."),
    ("PL-B-21", "base", "ForceCore", "Force Invicta 27", 219990, "FFB 27 Н·м · Invicta", "PRO", "Максимальный момент ForceCore."),
    ("PL-B-22", "base", "ThrottleX", "TX T248 Hybrid", 29990, "Hybrid FFB · console", None, "Гибрид для консолей."),
    ("PL-B-23", "base", "ApexDrive", "Apex Aero Stick Bundle", 34990, "Flight stick kit", "NEW", "Авиа-бандл для симпилотов."),
    ("PL-B-24", "base", "ApexDrive", "Apex Aero Stick Pro", 38990, "Flight · active knobs", "NEW", "Авиа-база с активными рукоятями."),
    ("PL-B-25", "base", "ApexDrive", "Apex Aero Base 12", 54990, "Flight FFB 12 Н·м", None, "Отдельная авиа-база."),

    # Pedals
    ("PL-P-01", "pedals", "ApexDrive", "Apex Pedal Lite", 14990, "2 педали · potentiometer", None, "Стартовый блок без сцепления."),
    ("PL-P-02", "pedals", "ApexDrive", "Apex Pedal Lite Clutch", 18990, "3 педали · clutch add-on", None, "Lite со сцеплением."),
    ("PL-P-03", "pedals", "ApexDrive", "Apex Load Cell Sport", 27990, "Load cell brake · 2 pedal", "HIT", "Тормоз с тензодатчиком."),
    ("PL-P-04", "pedals", "ApexDrive", "Apex Load Cell Pro", 34990, "Load cell · 3 pedal · heel", None, "Полный блок Load Cell."),
    ("PL-P-05", "pedals", "ApexDrive", "Apex Active Booster", 45990, "Active throttle/brake", "NEW", "Активный блок газ/тормоз."),
    ("PL-P-06", "pedals", "PulseSim", "Pulse P1000", 52990, "Hydraulic feel · LC", None, "Гидравлическое ощущение."),
    ("PL-P-07", "pedals", "PulseSim", "Pulse P2000 Ultimate", 78990, "Ultimate LC · haptics", "PRO", "Хаптика и точная настройка."),
    ("PL-P-08", "pedals", "GridForce", "Grid CSL Pedals LC", 39990, "Load cell · CSL", None, "Клубный LC-блок."),
    ("PL-P-09", "pedals", "GridForce", "Grid Clubsport V3", 69990, "V3 · damper kit ready", "HIT", "Эталон клубных педалей."),
    ("PL-P-10", "pedals", "ForceCore", "Force Invicta Pedals", 129990, "Invicta · telemetry", "PRO", "Топовые педали ForceCore."),
    ("PL-P-11", "pedals", "ThrottleX", "TX T3PM Pedals", 12990, "3 pedal · console", None, "Консольный комплект."),
    ("PL-P-12", "pedals", "TorqueLab", "TL Pedal Stack", 99990, "Servo brake · telemetry", "PRO", "Сервотормоз TorqueLab."),

    # Shifters
    ("PL-S-01", "shifter", "ApexDrive", "Apex H-Pattern", 16990, "H-pattern · 6+R", None, "Классическая кулиса."),
    ("PL-S-02", "shifter", "ApexDrive", "Apex Sequential", 18990, "Sequential · short throw", "HIT", "Секвенталка для ралли."),
    ("PL-S-03", "shifter", "PulseSim", "Pulse DS-8X", 28990, "H + sequential dual", None, "Два режима в одном корпусе."),
    ("PL-S-04", "shifter", "GridForce", "Grid SQ Shifter", 34990, "Clubsport sequential", None, "Клубная секвенталка."),
    ("PL-S-05", "shifter", "ThrottleX", "TX TH8S", 14990, "H-pattern · console", None, "Доступная кулиса."),
    ("PL-S-06", "shifter", "NovaTorque", "Nova Gate Pro", 24990, "CNC · magnetic gates", "NEW", "Магнитные ворота."),

    # Cockpits
    ("PL-C-01", "cockpit", "RidgeRig", "Ridge Fold Stand", 24990, "Складная стойка · wheel desk", None, "Компактный вход без рамы."),
    ("PL-C-02", "cockpit", "RidgeRig", "Ridge Start Frame", 54990, "Профиль 4080 · seat ready", "HIT", "Стартовый кокпит PITLINE."),
    ("PL-C-03", "cockpit", "RidgeRig", "Ridge RSS-1", 79990, "RSS-1 · adjustable", None, "Универсальная рама энтузиаста."),
    ("PL-C-04", "cockpit", "RidgeRig", "Ridge Formula Tub", 99990, "F1 seating · low CG", None, "Формульная посадка."),
    ("PL-C-05", "cockpit", "RidgeRig", "Ridge Pro Chassis", 129990, "PRO · triple ready", "PRO", "Рама под тройной монитор."),
    ("PL-C-06", "cockpit", "RidgeRig", "Ridge Ultimate", 189990, "Ultimate · motion ready", "PRO", "Топовая рама под motion."),
    ("PL-C-07", "cockpit", "PitKit", "PitLine Turnkey Cockpit", 114990, "Сборка под ключ · seat", "HIT", "Готовый кокпит с установкой."),
    ("PL-C-08", "cockpit", "RidgeRig", "Ridge Business Dual", 219990, "Dual seat · club layout", None, "Для сим-клубов."),

    # Monitors
    ("PL-M-01", "monitor", "ViewSpan", "ViewSpan 34 Ultrawide", 54990, '34" · 144 Гц · UW', "HIT", "Один широкий экран."),
    ("PL-M-02", "monitor", "ViewSpan", "ViewSpan 49 SuperUW", 109990, '49" · 165 Гц · 32:9', None, "Суперширокий иммерсив."),
    ("PL-M-03", "monitor", "ViewSpan", "ViewSpan Triple 27 Kit", 129990, '3×27" · stands', "PRO", "Тройной комплект с креплениями."),
    ("PL-M-04", "monitor", "ViewSpan", "ViewSpan VR Crystal", 89990, "VR headset · controllers", "NEW", "VR-шлем для иммерсива."),
    ("PL-M-05", "monitor", "ViewSpan", "ViewSpan 32 OLED", 79990, '32" OLED · 240 Гц', None, "OLED для чёткой картинки."),

    # Handbrakes
    ("PL-H-01", "handbrake", "ApexDrive", "Apex HB Progressive", 14990, "Progressive sensor", "HIT", "Прогрессивный ручник."),
    ("PL-H-02", "handbrake", "PulseSim", "Pulse HB-X", 19990, "Load cell · CNC", None, "Точный LC-ручник."),
    ("PL-H-03", "handbrake", "GridForce", "Grid Clubsport HB", 27990, "Clubsport · QR mount", None, "Клубный ручник."),
    ("PL-H-04", "handbrake", "NovaTorque", "Nova Rally HB", 16990, "Rally angle · adjustable", "NEW", "Под раллийный хват."),

    # Accessories
    ("PL-A-01", "accessories", "PitKit", "Коврик PITLINE Standard", 7990, "200×120 · anti-slip", "HIT", "Защита пола и акустика."),
    ("PL-A-02", "accessories", "PitKit", "Коврик PITLINE XL", 11990, "240×140 · XL", None, "Под широкие кокпиты."),
    ("PL-A-03", "accessories", "PitKit", "Держатель кулисы / ручника", 4990, "Clamp · 4080 ready", None, "Крепление периферии."),
    ("PL-A-04", "accessories", "PitKit", "Кабель-менеджмент KIT", 2990, "Braided sleeves · clips", None, "Чистая проводка."),
    ("PL-A-05", "accessories", "PitKit", "QR Adapter Apex↔Pulse", 6990, "Cross-brand QR", None, "Переходник экосистем."),
    ("PL-A-06", "accessories", "PitKit", "Подставка под монитор single", 8990, "VESA · height adjust", None, "Кронштейн одного экрана."),
    ("PL-A-07", "accessories", "PitKit", "Подставка triple mount", 24990, "Triple VESA · 27–32", "PRO", "Рама под три монитора."),
    ("PL-A-08", "accessories", "PitKit", "Сиденье Bucket Sport", 34990, "Bucket · side mount", None, "Спортивное сиденье."),
    ("PL-A-09", "accessories", "PitKit", "Сиденье Formula Low", 42990, "Low seating · F1 feel", None, "Низкая формульная посадка."),
    ("PL-A-10", "accessories", "PitKit", "Настройка FFB + обучение", 14990, "Онлайн / очно · 90 мин", "HIT", "Инженер PITLINE настраивает FFB."),
    ("PL-A-11", "accessories", "PitKit", "Доставка и сборка по городу", 9990, "Выезд инженера", None, "Очная установка."),
    ("PL-A-12", "accessories", "PitKit", "Удалённая сборка по видео", 4990, "Видеосвязь · чек-лист", None, "Пошаговая удалённая сборка."),
]

# slug, name, filter_tag, description, badge, product_skus, price_override|None
BUNDLES: list[tuple] = [
    (
        "drift-start",
        "Drift / Rally Start",
        "Drift / Rally",
        "Стойка, стартовый DD-кит и педаль сцепления — вход в дрифт/ралли.",
        "Start",
        ["PL-C-01", "PL-B-03", "PL-P-02", "PL-H-01", "PL-A-03"],
        75250,
    ),
    (
        "drift-medium",
        "Drift / Rally Medium",
        "Drift / Rally",
        "Рама RSS-1, база 9 Н·м, открытый раллийный обод и секвенталка.",
        "Medium",
        ["PL-C-03", "PL-B-04", "PL-W-04", "PL-P-03", "PL-S-02", "PL-H-01", "PL-A-01"],
        116710,
    ),
    (
        "drift-pro",
        "Drift / Rally Pro",
        "Drift / Rally",
        "Кокпит Start, база 12 Н·м и полный LC-блок — серьёзный раллийный сетап.",
        "Pro",
        ["PL-C-02", "PL-B-05", "PL-W-04", "PL-P-04", "PL-S-02", "PL-H-02", "PL-A-01"],
        249420,
    ),
    (
        "gt-formula",
        "GT / Formula",
        "Гонки",
        "Формульная рама и мощная база 21 Н·м Ultra под GT/F1.",
        None,
        ["PL-C-04", "PL-B-10", "PL-W-06", "PL-P-06", "PL-A-01", "PL-A-09"],
        292950,
    ),
    (
        "immersion-manual",
        "Immersion Manual Pro",
        "Гонки",
        "PRO-кокпит, VR и ручная КПП для полного погружения.",
        "Immersive",
        ["PL-C-05", "PL-B-07", "PL-W-05", "PL-P-07", "PL-S-03", "PL-M-04", "PL-A-01"],
        470380,
    ),
    (
        "master-pro",
        "Master Pro",
        "Максимум",
        "Ultimate-рама и Force Invicta 27 Н·м — максимум без компромиссов.",
        "Master",
        ["PL-C-06", "PL-B-21", "PL-W-12", "PL-P-10", "PL-S-04", "PL-M-03", "PL-A-02", "PL-A-07"],
        1181910,
    ),
    (
        "legend-pro",
        "Legend Pro",
        "Максимум",
        "Ultimate + TorqueLab Drive 25 — лабораторный уровень телеметрии.",
        "Legend",
        ["PL-C-06", "PL-B-20", "PL-W-08", "PL-P-12", "PL-M-02", "PL-A-02", "PL-A-10"],
        1231910,
    ),
    (
        "pilot-sokolov",
        "Setup Пилот Соколов",
        "Персональные",
        "Персональная сборка энтузиаста: Ultimate, D12 и GT-обод.",
        "Personal",
        ["PL-C-06", "PL-B-05", "PL-W-03", "PL-P-04", "PL-A-01", "PL-A-08"],
        267950,
    ),
    (
        "pilot-chekalov",
        "Setup Пилот Чекалов",
        "Персональные",
        "TrueTorque 25, карбоновый обод и активные педали.",
        "Personal",
        ["PL-B-11", "PL-W-05", "PL-P-05", "PL-C-05", "PL-A-01"],
        252560,
    ),
    (
        "pilot-dobro",
        "Setup Пилот Добро",
        "Персональные",
        "D16, большой диск и раллийный ручник.",
        "Personal",
        ["PL-B-07", "PL-W-09", "PL-P-04", "PL-H-04", "PL-C-03", "PL-A-01"],
        259880,
    ),
    (
        "sim-club-start",
        "Sim Club Start",
        "Бизнес",
        "Клубная точка: кокпит Start, T5 kit и коврик — готово к сдаче в аренду.",
        "Business",
        ["PL-C-02", "PL-B-03", "PL-P-02", "PL-A-01", "PL-A-11", "PL-M-01"],
        319230,
    ),
    (
        "sim-club-dual",
        "Sim Club Dual Bay",
        "Бизнес",
        "Двухместная бизнес-рама для сим-клуба.",
        "Business",
        ["PL-C-08", "PL-B-05", "PL-B-05", "PL-W-01", "PL-W-01", "PL-P-03", "PL-P-03", "PL-A-02"],
        489900,
    ),
    (
        "kit-apex-t3",
        "Набор Apex T3",
        "Наборы",
        "Стартовые наборы на базе Apex T3 — доступный вход.",
        "Apex T3",
        ["PL-B-01", "PL-W-11", "PL-P-01"],
        26990,
    ),
    (
        "kit-apex-t5",
        "Набор Apex T5",
        "Наборы",
        "Наборы на базе T5 — от базовых до продвинутых.",
        "Apex T5",
        ["PL-B-03", "PL-P-02", "PL-A-03"],
        37990,
    ),
    (
        "kit-apex-d9",
        "Набор Apex D9",
        "Наборы",
        "Средний уровень: первый DD и LC-тормоз.",
        "Apex D9",
        ["PL-B-04", "PL-W-01", "PL-P-03"],
        56990,
    ),
    (
        "kit-grid-csl",
        "Набор Grid CSL",
        "Наборы",
        "Экосистема Grid для консолей и ПК.",
        "Grid",
        ["PL-B-18", "PL-W-07", "PL-P-08"],
        95990,
    ),
    (
        "kit-throttle-hybrid",
        "Набор ThrottleX Hybrid",
        "Наборы",
        "Проверенная классика для консолей.",
        "ThrottleX",
        ["PL-B-22", "PL-W-10", "PL-P-11"],
        59990,
    ),
    (
        "kit-pulse-evo",
        "Набор Pulse Evo",
        "Наборы",
        "Pulse Evo 12 + P1000 — серьёзный средний сегмент.",
        "Pulse",
        ["PL-B-14", "PL-W-05", "PL-P-06"],
        119990,
    ),
]


def seed_catalog(force: bool = False) -> dict:
    existing = Product.query.count()
    if existing and not force:
        return {"seeded": False, "products": existing, "bundles": Bundle.query.count()}

    if force:
        BundleItem.query.delete()
        Bundle.query.delete()
        Product.query.delete()
        Category.query.delete()
        db.session.commit()

    cats: dict[str, Category] = {}
    for slug, name, order in CATEGORIES:
        cat = Category(slug=slug, name=name, sort_order=order)
        db.session.add(cat)
        cats[slug] = cat
    db.session.flush()

    products: dict[str, Product] = {}
    for i, (sku, cat_slug, brand, name, price, specs, badge, desc) in enumerate(PRODUCTS):
        product = Product(
            sku=sku,
            name=name,
            brand=brand,
            category_id=cats[cat_slug].id,
            price=price,
            specs=specs,
            description=desc,
            badge=badge,
            sort_order=i,
        )
        db.session.add(product)
        products[sku] = product
    db.session.flush()

    for i, (slug, name, tag, desc, badge, skus, price_override) in enumerate(BUNDLES):
        bundle = Bundle(
            slug=slug,
            name=name,
            filter_tag=tag,
            description=desc,
            badge=badge,
            price_override=price_override,
            sort_order=i,
        )
        db.session.add(bundle)
        db.session.flush()
        for j, sku in enumerate(skus):
            db.session.add(
                BundleItem(
                    bundle_id=bundle.id,
                    product_id=products[sku].id,
                    qty=1,
                    sort_order=j,
                )
            )

    db.session.commit()
    return {
        "seeded": True,
        "categories": len(cats),
        "products": len(products),
        "bundles": len(BUNDLES),
    }
