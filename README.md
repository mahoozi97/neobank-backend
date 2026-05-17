# NeoBank — Backend API

A secure, production-ready RESTful API for a digital banking platform. Built with Node.js, Express, and MongoDB.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Database | MongoDB + Mongoose |
| Authentication | JWT + bcrypt |
| File Storage | Cloudinary + Multer |
| Security | Helmet, CORS, express-rate-limit |
| Logging | Morgan |
| Dev | Nodemon |

---

## Environment Variables

Create a `.env` file in the root of the server directory:

```env
PORT=
MONGO_URI=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## Installation & Running

```bash
# Install dependencies
npm install

# Development
npm run dev
```

---

## API Reference

### Auth — `/auth`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/sign-up` | Register a new user | No |
| POST | `/sign-in` | Login and receive JWT token | No |

---

### Accounts — `/accounts`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/` | Create a new bank account | Yes |
| GET | `/` | Get all accounts for the logged-in user | Yes |
| POST | /lookup | Look up an account by IBAN or mobile number | Yes |
| PATCH | `/:accountId/activate` | Activate an account | Yes |
| PATCH | `/:accountId/freeze` | Freeze an account | Yes |

---

### Transactions — `/transactions`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/transfer` | Transfer funds between accounts (ACID) | Yes |
| GET | `/:accountId` | Get transactions for a specific account | Yes |

> Transfers are processed using MongoDB Sessions to guarantee atomicity. Either the full transfer completes or it rolls back entirely.

---

### KYC — `/kyc`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/upload` | Upload KYC documents (Cloudinary) | Yes |
| GET | `/` | Get KYC record for the logged-in user | Yes |

**Accepted document types:** `front ID`, `back ID`, `passport`

Upload rules:
- Passport only → 1 document
- Identity Card → `front` + `back` (2 documents)

A user can only re-submit if their previous request was `rejected`.

---

### Admin — `/admin`

> All routes below require the `admin` role.

**Users**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users` | Get all users (excludes admins). Supports `?searchTerm=` to filter by name or CPR |
| PATCH | `/users/:userId/block` | Block a user |
| PATCH | `/users/:userId/active` | Activate a user |

**Accounts**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/account/user/:userId` | Get accounts belonging to a specific user |

**KYC**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/kyc/user/:userId` | Get KYC submission for a specific user |
| PATCH | `/kyc/:kycId/approve` | Approve a KYC request (sets user to `verified`) |
| PATCH | `/kyc/:kycId/reject` | Reject a KYC request with a reason comment |

> Approving a KYC uses a MongoDB Session to update both the `KYC` record and the `User` record atomically.

**Transactions**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/transactions/:accountId` | Get transactions for an account. Supports `?status=` and `?date=` filters |

**Audit Logs**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/audit-logs` | Get audit logs. Supports `?action=`, `?page=`, and `?limit=` |

---

## Security

- **JWT Authentication** — all protected routes require a valid Bearer token
- **Role-based Access Control** — roles: `user`, `admin`
- **Blocked users** — rejected at the middleware level with `403`
- **Helmet** — secures HTTP response headers
- **CORS** — configured with a domain whitelist
- **Rate Limiting** — applied on auth, transfer, and KYC upload endpoints to prevent brute force and abuse
- **Input Validation** — all inputs validated with `validator`
- **Secrets** — all credentials stored in `.env` only; never committed to version control

---

## KYC Transfer Limits

| KYC Status | Max Transfer |
|---|---|
| `unverified` | 100 BHD |
| `verified` | 3000 BHD |

---

## Data Models

| Model | Key Fields |
|---|---|
| User | name, email, cpr, password, role, kycStatus, status |
| Account | userId, nickname, mobile, iban, balance, currency, type, status |
| Transaction | fromAccount, toAccount, amount, currency, type, status |
| KYC | userId, documents, status, comment |
| AuditLog | userId, action, ipAddress, metadata |
| Card | userId, accountId, name, number, cvv, pin (hashed), cardType, validThru, status |

> **Note:** The `Card` model is defined but has no endpoints yet.

---

## Deployment

| Service | Provider |
|---|---|
| Backend | Render / Railway |
| Database | MongoDB Atlas |
| File Storage | Cloudinary |