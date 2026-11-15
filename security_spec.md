# Security Specification — Harmonia Student Rankings

## 1. Data Invariants
- Every document in `/rankings/{userId}` MUST have a valid ID (`^[a-zA-Z0-9_\-]+$`, `<= 128` chars) matching `request.auth.uid` and `data.uid`.
- No PII (`email`, `phone`, `address`) may ever be stored in `/rankings/{userId}` because the leaderboard is publicly readable.
- All numeric metrics (`correctCount`, `totalHits`, `attemptsCount`, `accuracy`, `bestStreak`) MUST be bounded integers.
- `completedIds` MUST be a list of `<= 20` integers.
- `createdAt` is immutable and MUST equal `request.time` on creation.
- `updatedAt` MUST equal `request.time` on both creation and updates.
- Only verified authenticated owners (`request.auth.token.email_verified == true && request.auth.uid == userId`) can create or update their ranking entry.
- Admins (`wander.sarmentosantos@gmail.com` with `email_verified == true`, or `/admins/{uid}`) or the owner can delete an entry.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Write**: `create /rankings/user1` with `auth: null` -> DENIED.
2. **Unverified Email Write**: `create /rankings/user1` with `email_verified: false` -> DENIED.
3. **Identity Spoofing**: `create /rankings/user2` while authenticated as `user1` -> DENIED.
4. **UID Mismatch in Payload**: `create /rankings/user1` with `data.uid: "user2"` -> DENIED.
5. **Shadow / Ghost Field Injection**: `update /rankings/user1` adding `{ isAdmin: true }` -> DENIED (`hasOnly` & `affectedKeys` block).
6. **Negative / Overflow Score**: `create /rankings/user1` with `correctCount: 999999` -> DENIED (`correctCount <= 20`).
7. **Resource Poisoning (Giant Display Name)**: `create /rankings/user1` with 2000-char `displayName` -> DENIED (`size() <= 40`).
8. **Invalid ID Poisoning**: `create /rankings/bad$id..slash` -> DENIED (`isValidId` regex).
9. **Client-Spoofed Timestamp**: `create /rankings/user1` with `createdAt` in the past -> DENIED (`== request.time`).
10. **Immutable Field Tampering**: `update /rankings/user1` changing `createdAt` or `uid` -> DENIED.
11. **Unbounded Array Injection**: `update /rankings/user1` with `completedIds` of length 25 -> DENIED (`size() <= 20`).
12. **Non-Owner Delete**: `delete /rankings/user2` while authenticated as non-admin `user1` -> DENIED.
