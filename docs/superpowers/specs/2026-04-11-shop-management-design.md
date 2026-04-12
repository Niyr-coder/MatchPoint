# Shop Management — Design Spec
**Date:** 2026-04-11
**Status:** Approved

---

## Overview

Complete the MATCHPOINT shop feature by adding product management (CRUD + approval flow), order management (payment proof + status transitions), user order history UI, and in-app notifications. Approach: direct extension of existing structure without architectural changes.

---

## 1. Architecture

Three access layers:

| Layer | Path | Actors |
|-------|------|--------|
| Admin | `/admin/shop` | ADMIN |
| Club panel | `/dashboard/club/[id]/shop/` | OWNER, MANAGER |
| User | `/dashboard/shop` | All users |

### New API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/shop/products` | Create product |
| `PUT` | `/api/shop/products/[id]` | Edit product |
| `DELETE` | `/api/shop/products/[id]` | Archive product |
| `POST` | `/api/shop/products/[id]/approve` | Approve/reject pending product (ADMIN) |
| `PUT` | `/api/shop/orders/[id]/status` | Transition order status |
| `PUT` | `/api/shop/orders/[id]/proof` | Submit payment proof URL |
| `GET` | `/api/shop/orders` | Extended: full user order history |

### DB Changes

**`orders` table:**
- Add `proof_url TEXT` (nullable) — external URL of payment proof
- Extend `status` check constraint to include `pending_proof`

**`products` table:**
- Extend `status`/`is_active` logic to support `pending_approval` state via a new `approval_status TEXT` column (`approved` | `pending_approval` | `rejected`), defaulting to `approved` for admin/owner/manager/verified users, `pending_approval` for regular users

---

## 2. Product Management

### Publication Rules

| Role | Creates product as |
|------|--------------------|
| ADMIN | Active (published immediately) |
| OWNER | Active (published immediately) |
| MANAGER | Active (published immediately) |
| Verified user | Active (published immediately) |
| Regular user | `pending_approval` (requires admin review) |

A "verified user" is a user that has been manually verified by an ADMIN via the "Verificar usuario" action on the platform.

### New Pages

- **`/admin/shop`** — add "Pendientes" tab: list of products awaiting approval with approve/reject buttons
- **`/dashboard/club/[id]/shop/products`** — product list for the club with create/edit/archive actions
- **`/dashboard/club/[id]/shop/products/new`** — new product form
- **`/dashboard/shop/sell`** — simplified form for regular users; shows "tu producto será revisado" message if not verified

### Product Form Fields

| Field | Type | Required |
|-------|------|----------|
| Nombre | text | yes |
| Descripción | textarea | no |
| Precio | number | yes |
| Categoría | select (equipment/membership/class/other) | yes |
| Stock | number (-1 = unlimited) | yes |
| Imagen URL | text | no |

---

## 3. Order Management

### Status Flow

```
pending → pending_proof → confirmed → delivered
                       ↘ cancelled
pending → cancelled (by OWNER/MANAGER/ADMIN without proof)
```

### Status Transitions by Role

| Role | Allowed transitions |
|------|---------------------|
| USER | `pending` → `pending_proof` (submits proof URL) |
| OWNER/MANAGER | `pending_proof` → `confirmed` or `cancelled` |
| OWNER/MANAGER | `confirmed` → `delivered` |
| ADMIN | Any transition |

### New Pages

- **`/dashboard/shop`** — add "Mis Pedidos" tab: order history with status badges, comprobante upload for `pending` orders
- **`/dashboard/club/[id]/shop/orders`** — order management panel for OWNER/MANAGER: table with user, products, total, proof link, status badge, action buttons
- **`/admin/shop`** — extend existing orders tab with proof URL column and status action buttons

### Status Badge Colors

| Status | Color |
|--------|-------|
| `pending` | gray |
| `pending_proof` | yellow |
| `confirmed` | blue |
| `delivered` | green |
| `cancelled` | red |

---

## 4. User Order History

The existing `GET /api/shop/orders` API already returns user orders. The UI change is:

- Add a "Mis Pedidos" tab to `/dashboard/shop` alongside the existing product catalog
- Show: product names, total, status badge, date, and a "Subir comprobante" button for `pending` orders
- The comprobante upload is a text input for pasting an external image URL (no file upload)

---

## 5. In-App Notifications

All notifications use the existing `broadcast_notification` utility.

| Event | Recipient |
|-------|-----------|
| New order placed | OWNER/MANAGER of the club |
| Payment proof submitted | OWNER/MANAGER of the club |
| Order confirmed | Purchasing user |
| Order cancelled | Purchasing user |
| Order delivered | Purchasing user |
| Product submitted for approval | ADMIN |
| Product approved | User who submitted |
| Product rejected | User who submitted |

Notifications are triggered from within the relevant API route handlers (`/api/shop/orders/[id]/status`, `/api/shop/orders/[id]/proof`, `/api/shop/products/[id]/approve`).

---

## 6. Authorization Summary

Every protected endpoint verifies in order:
1. Authenticated session
2. User exists in `profiles`
3. Is ADMIN? → full access
4. Has access to the club? (`user_roles`)
5. Has required role? (OWNER ≥ 6, MANAGER ≥ 5)
6. Operating on own data? (for user-scoped endpoints)

---

## Out of Scope

- File upload (images and proof) — URL text fields only
- Email notifications — in-app only for now
- Payment gateway (Stripe, etc.)
- Product analytics / sales reports
- Multi-club product visibility
