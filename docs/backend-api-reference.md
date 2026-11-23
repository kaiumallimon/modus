# Modus Backend API Reference

**Document Version:** 1.0  
**Backend Source:** `C:\Users\kalim\Desktop\pharmbrew\pharmbrew-backend`  
**Base URL:** `http://localhost:8000/api/v1` (or configured `NEXT_PUBLIC_API_URL`)  
**Swagger UI:** `http://localhost:8000/api/docs`  
**Authentication Type:** Bearer JWT (Access Token in `Authorization: Bearer <token>`, Refresh Token rotated via `/auth/refresh`)

---

## 1. Health & Infrastructure

### 1.1 Process Liveness
- **Method:** `GET`
- **Path:** `/health`
- **Auth:** Public
- **Response (200 OK):**
```json
{
  "status": "ok",
  "application": "Modus"
}
```

### 1.2 System & Database Readiness
- **Method:** `GET`
- **Path:** `/health/ready`
- **Auth:** Public
- **Response (200 OK):**
```json
{
  "status": "ok",
  "statusCode": 200,
  "application": "Modus",
  "timestamp": "2026-11-23T05:30:00.000Z",
  "uptime": 1234.56,
  "dependencies": {
    "database": {
      "status": "connected"
    }
  }
}
```

---

## 2. Installation & Setup

### 2.1 Check Installation Status
- **Method:** `GET`
- **Path:** `/installation/status`
- **Auth:** Public
- **Response (200 OK):**
```json
{
  "initialized": true,
  "setupRequired": false,
  "isInitialized": true,
  "initializedAt": "2026-11-23T05:26:17.440Z",
  "version": "1.0.0"
}
```

### 2.2 Initial Installation Setup Wizard
- **Method:** `POST`
- **Path:** `/installation/setup`
- **Auth:** Public (Prohibited once installation is initialized; returns 403)
- **Request Body:**
```json
{
  "administrator": {
    "firstName": "Super",
    "lastName": "Admin",
    "email": "admin@modus.local",
    "password": "SuperAdminPassword123!"
  },
  "organization": {
    "name": "Acme Global",
    "legalName": "Acme Global Corp Ltd.",
    "email": "info@acme.com",
    "phone": "+1-555-0199",
    "website": "https://acme.com",
    "address": {
      "street": "123 Business Way",
      "city": "Metropolis",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA"
    },
    "currency": "USD",
    "timezone": "UTC",
    "locale": "en-US"
  }
}
```

---

## 3. Authentication & Sessions

### 3.1 User Login
- **Method:** `POST`
- **Path:** `/auth/login`
- **Auth:** Public
- **Request Body:**
```json
{
  "identifier": "admin@modus.local",
  "password": "SuperAdminPassword123!"
}
```

### 3.2 Token Refresh
- **Method:** `POST`
- **Path:** `/auth/refresh`
- **Auth:** Public
- **Request Body:**
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

### 3.3 Current User Profile
- **Method:** `GET`
- **Path:** `/auth/me`
- **Auth:** Bearer Token

### 3.4 Logout
- **Method:** `POST`
- **Path:** `/auth/logout`
- **Auth:** Bearer Token

---

## 4. Users Management

### 4.1 List Users (Paginated)
- **Method:** `GET`
- **Path:** `/users?page=1&limit=10&search=&role=&isActive=`
- **Auth:** Bearer Token (Roles: `SUPER_ADMIN`, `ADMIN`)

### 4.2 Create User
- **Method:** `POST`
- **Path:** `/users`
- **Auth:** Bearer Token (Roles: `SUPER_ADMIN`, `ADMIN`)
- **Request Body:**
```json
{
  "email": "jane@acme.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "MANAGER"
}
```

### 4.3 Update User
- **Method:** `PATCH`
- **Path:** `/users/:id`

### 4.4 Toggle User Active Status
- **Method:** `PATCH`
- **Path:** `/users/:id/status`

---

## 5. Access Control & RBAC

### 5.1 Permissions Registry
- **Method:** `GET`
- **Path:** `/permissions`
- **Auth:** Bearer Token (Permission: `roles.read`)

### 5.2 List Roles
- **Method:** `GET`
- **Path:** `/roles`
- **Auth:** Bearer Token (Permission: `roles.read`)

### 5.3 Create Custom Role
- **Method:** `POST`
- **Path:** `/roles`
- **Auth:** Bearer Token (Permission: `roles.create`, strictly `SUPER_ADMIN`)

### 5.4 Update Role
- **Method:** `PATCH`
- **Path:** `/roles/:id`
- **Auth:** Bearer Token (Permission: `roles.update`, strictly `SUPER_ADMIN`)

### 5.5 Delete Role
- **Method:** `DELETE`
- **Path:** `/roles/:id`

---

## 6. Organization Settings
- `GET /organization`: Get singleton profile
- `PATCH /organization`: Update singleton profile

---

## 7. System Settings
- `GET /settings`: Get application settings
- `PATCH /settings`: Update application settings (strictly `SUPER_ADMIN`)

---

## 8. Module Registry
- `GET /modules`: List modules and activation status
- `GET /modules/:id`: Get single module
- `PATCH /modules/:id/activation`: Set module activation status (Core protected)

---

## 9. Audit Logs
- `GET /audit-logs`: Paginated audit logs
- `GET /audit-logs/:id`: Single audit log details
