# Users API

All endpoints require a valid Google ID token in the `Authorization: Bearer <token>` header. The token is verified against Google's public keys using the configured `GOOGLE_CLIENT_ID`.

---

## POST /users

Creates a new user from the authenticated Google identity. All profile fields are extracted directly from the verified token — no request body needed.

New users are created with `PENDING_VERIFICATION` status and must be approved by an admin before they can access the application.

Returns `409` if a user with the same Google ID already exists — the caller should `GET /users/:googleId` first.

**Response `201`**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "googleId": "1234567890",
  "email": "user@example.com",
  "displayName": "Jane Smith",
  "avatarUrl": "https://lh3.googleusercontent.com/...",
  "username": null,
  "bio": null,
  "phoneNumber": null,
  "status": "PENDING_VERIFICATION",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error responses**

| Status | Code                  | Reason                                    |
| ------ | --------------------- | ----------------------------------------- |
| 401    | `UNAUTHORIZED`        | Missing, expired, or invalid Google token |
| 409    | `USER_ALREADY_EXISTS` | A user with this Google ID already exists |

```bash
curl -X POST http://localhost:3002/users \
  -H "Authorization: Bearer <google-id-token>"
```

---

## GET /users/:googleId

Fetches a user by their Google ID (`sub` claim). Returns the full user object including status, regardless of the user's current status.

**Path parameters**

| Parameter  | Type   | Description                                        |
| ---------- | ------ | -------------------------------------------------- |
| `googleId` | string | The Google user ID (`sub` claim from the ID token) |

**Response `200`**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "googleId": "1234567890",
  "email": "user@example.com",
  "displayName": "Jane Smith",
  "avatarUrl": "https://lh3.googleusercontent.com/...",
  "username": "janesmith",
  "bio": "Hello world",
  "phoneNumber": null,
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z"
}
```

**Error responses**

| Status | Code             | Reason                                    |
| ------ | ---------------- | ----------------------------------------- |
| 401    | `UNAUTHORIZED`   | Missing, expired, or invalid Google token |
| 404    | `USER_NOT_FOUND` | No user found with that Google ID         |

```bash
curl http://localhost:3002/users/1234567890 \
  -H "Authorization: Bearer <google-id-token>"
```

---

## PATCH /users/:id

Updates the authenticated user's profile fields. At least one field must be provided. Users can only update their own account — the token's `sub` claim must match the user record's `googleId`.

**Path parameters**

| Parameter | Type | Description            |
| --------- | ---- | ---------------------- |
| `id`      | UUID | The user's internal ID |

**Request body** (all fields optional, at least one required)

| Field         | Type   | Constraints                          |
| ------------- | ------ | ------------------------------------ |
| `displayName` | string | 1–100 characters                     |
| `avatarUrl`   | string | Non-empty string                     |
| `username`    | string | 3–30 characters, `[a-zA-Z0-9_]` only |
| `bio`         | string | Max 500 characters                   |
| `phoneNumber` | string | 7–20 characters                      |

**Response `200`** — returns the full updated user object (same shape as above).

**Error responses**

| Status | Code               | Reason                                    |
| ------ | ------------------ | ----------------------------------------- |
| 400    | `VALIDATION_ERROR` | Body fails validation or is empty         |
| 401    | `UNAUTHORIZED`     | Missing, expired, or invalid Google token |
| 403    | `FORBIDDEN`        | Token user does not own this account      |
| 404    | `USER_NOT_FOUND`   | No user found with that ID                |

```bash
curl -X PATCH http://localhost:3002/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <google-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "janesmith", "bio": "Hello world"}'
```

---

## User status lifecycle

```
PENDING_VERIFICATION  →  ACTIVE    (admin approves)
ACTIVE                →  LOCKED    (admin locks)
LOCKED                →  ACTIVE    (admin unlocks)
```

Status transitions are performed by admins (not yet implemented — see scopes feature).
