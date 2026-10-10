# DahaShop — Production Database Edition

This edition uses PostgreSQL instead of SQLite. Customer, seller, product and order data is stored in PostgreSQL.

## Render
1. Push this folder to a GitHub repository.
2. In Render choose **New -> Blueprint** and select the repository.
3. Render reads `render.yaml` and creates the web service plus PostgreSQL database.
4. Set/confirm `JWT_SECRET` (the Blueprint can generate it).
5. Deploy. The health URL is `/api/health`.

## Default accounts
Admin: admin@dahashop.com / Admin@123
Demo seller: demo.seller@dahashop.com / Seller@123

Change these credentials before public launch.

## Important
Payment methods in the UI are order-method selections. Live EasyPaisa/JazzCash transfers still require official merchant/API credentials and a payment callback/webhook implementation.
