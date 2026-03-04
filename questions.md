# Questions & Design Decisions

## 1. Should information only be accessible to logged-in users?

Yes. This is sensitive information, so access is restricted to authenticated users only (both `VIEWER` and `ADMIN` roles).

Since a global authentication guard was added, public endpoints must be manually annotated to opt out of it.

---

## 2. Should `taxId` be `@unique`?

A composite uniqueness constraint on `taxId` + `country` was used instead, since the same tax ID number can belong to different entities in different countries.

---

## 3. The spec mentions an endpoint to manually trigger a risk calculation

The decision was made to calculate risk automatically at every relevant step in the flow, rather than requiring an explicit API call. The endpoint described in the spec is still exposed to allow manual recalculation when needed.

---

## 4. The spec mentions a logout endpoint alongside the use of JWT tokens

Implementing logout with JWTs introduces a design tension: tokens are stateless by nature, which reduces database load. Invalidating them requires some server-side state.

A dual-token strategy was adopted:

- **Access token** (short-lived): used to authenticate requests, expires quickly.
- **Refresh token** (long-lived): stored server-side and can be explicitly invalidated on logout.

This enables effective logout without giving up the benefits of JWTs for the normal authentication flow.

---

## 5. Why SSE instead of WebSockets for real-time notifications?

System notifications are unidirectional: the server informs the client about state changes, but the client never needs to send events back to the server over that channel. In that context, WebSockets introduce unnecessary complexity.

SSE is the right tool here because:

- Communication is exclusively server -> client.
- It runs over standard HTTP, with no upgrade handshake or additional protocol.
- The browser handles reconnection automatically if the connection drops.
- It is lighter than WebSockets.
