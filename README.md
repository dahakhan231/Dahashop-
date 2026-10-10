# DahaShop Real Backend Starter

## Requirements
Node.js 18+ recommended.

## Run
1. Open terminal in this folder.
2. Run: npm install
3. Run: npm start
4. Open: http://localhost:3000

The SQLite database `dahashop.db` is created automatically.

## API
POST /api/register
POST /api/login
GET /api/me
GET /api/products
POST /api/products (seller token)
POST /api/orders (customer token)
GET /api/my-orders
GET /api/seller/orders
GET /api/admin/users (admin token)

IMPORTANT: This is a real local database/auth starter, but it is not production-ready. Before public launch, set a strong JWT_SECRET, use HTTPS, add rate limiting, validation, backups, password reset/email verification, admin provisioning, and official EasyPaisa/JazzCash merchant APIs.
