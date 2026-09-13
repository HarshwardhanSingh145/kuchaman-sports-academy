# Security Specification: Kuchaman Sports Academy Data Fortress

## 1. Data Invariants
- **Identity Invariant**: Only authenticated and verified administrator (`ishvarkalwa001@gmail.com` or authorized admin in `/admins/{adminId}`) may delete bookings, manage cricket nets, configure academy settings, or approve/issue official certificates.
- **Resource Invariant**: All document IDs must be bounded alphanumeric strings (`^[a-zA-Z0-9_\\-]+$`) under 128 characters to prevent path-traversal and ID-poisoning attacks.
- **Immutability Invariant**: Audit logs (`/audit_logs/{logId}`) are strictly append-only and cannot be updated or deleted by any user or administrator to maintain an immutable compliance log.
- **Certificates State Gate**: A certificate cannot transition backwards from `ISSUED` or `APPROVED` without authorized Director clearance.
- **Volumetric Limits**: Every string is bounded (names <= 128, phone <= 32, descriptions <= 1000, etc.) to prevent Denial-of-Wallet resource exhaustion.
- **Query Enforcer**: Public users may look up their own booking or certificate by verified ID, but bulk scraping of private athlete data is forbidden.

## 2. The "Dirty Dozen" Threat Payloads
1. **Unbounded ID Injection**: Attempt to write a student with a 2000-character ID containing special injection characters `../../../etc/passwd`.
2. **Ghost Field Escalation**: Attempt to update a student record injecting a hidden `isAdmin: true` privilege escalation.
3. **Audit Log Tampering**: Attempt to `deleteDoc` on an existing `/audit_logs/log-123` to cover tracks.
4. **Certificate Self-Issuance**: Attempt by an unauthenticated user to directly write status: `ISSUED` with forged Director approval signatures.
5. **PII Blanket Scraping**: Attempt by an unauthenticated caller to `list` all `/students` records without a scoped query or admin token.
6. **Immutability Violation**: Attempt to update `certificateNumber` or `studentId` on an already issued Certificate.
7. **Negative Player Count**: Attempt to book a net with `playerCount: -5` or `playerCount: 999` on a 4-player net.
8. **Invalid Sport Spoofing**: Attempt to book with `sport: "golf"` or unknown enum values.
9. **Email Spoofing**: Attempt to act as admin with `request.auth.token.email = 'ishvarkalwa001@gmail.com'` but `email_verified = false`.
10. **Mentor Impersonation**: Attempt by an unauthorized user to alter another mentor's password or assigned student IDs.
11. **Attendance Back-Dating Attack**: Attempt to inject fake attendance records with timestamps from years in the past.
12. **Denial-of-Wallet Payload**: Attempt to upload a 5MB payload into a text field without size validation.
