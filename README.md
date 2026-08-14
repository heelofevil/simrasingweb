# PITLINE

Лендинг + конфигуратор сим-рейсинг сетапов. Flask + PostgreSQL + Docker Compose.

## Быстрый старт

```bash
cp .env.example .env
docker compose up --build
```

Сайт: [http://localhost:8000](http://localhost:8000)  
Админка: [http://localhost:8000/admin](http://localhost:8000/admin)  
Вход: `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

## Флоу конфигуратора

1. **Готовые сборки** — пресеты с фильтрами  
2. **Собрать самому** — категории (руль, база, педали…)  
3. **Запрос расчёта** — лид сохраняется в БД

## Админка

Владелец может создавать/править/удалять товары и заливать фото (`/static/img/products/<SKU>.ext`).

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/categories` | Категории |
| GET | `/api/products?category=base` | Товары |
| GET | `/api/bundles?tag=Гонки` | Готовые сборки |
| GET | `/api/bundle-tags` | Фильтры сборок |
| POST | `/api/leads` | Заявка |

## Каталог

При первом старте сидится тестовый каталог с вымышленными брендами (ApexDrive, PulseSim, RidgeRig…). Это демо-данные, не чужой ассортимент.

| Сущность | Кол-во |
|----------|--------|
| Категории | 8 |
| Товары | 84 |
| Сборки | 18 |
