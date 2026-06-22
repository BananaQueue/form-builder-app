# Security Guide

## Security Model

- PHP sessions authenticate users.
- CSRF tokens protect authenticated mutating requests.
- Regular users can manage their own forms.
- Super Admins can manage all forms, users, settings, and audit logs.
- Public respondents can only fetch public forms and submit responses.

## Existing Controls

- Password verification uses `password_verify`.
- Password storage uses `password_hash`.
- CSRF is required for authenticated mutating endpoints.
- Session cookies are HttpOnly and SameSite=Lax.
- File upload accepts PNG only and validates MIME and image content.
- SQL access uses prepared statements broadly.
- Audit logs record sensitive actions.
- Login attempts are rate limited by username and client IP.

## Production Security Checklist

- [ ] Use HTTPS.
- [ ] Set secure database credentials through environment variables.
- [ ] Disable test guard endpoints.
- [ ] Restrict API CORS to production frontend origins.
- [ ] Confirm PHP error display is disabled.
- [ ] Verify web server denies directory listing.
- [ ] Protect `db.local.php` from web access.
- [ ] Protect `rate_limits/` from web access.
- [ ] Restrict write permissions on API folders.
- [ ] Back up database and uploads.
- [ ] Review audit logs regularly.

## Known Security Gaps

### Password Policy

Backend password creation and reset now use the shared server policy in `auth_helper.php`:

- minimum 12 characters by default
- at least one uppercase letter
- at least one lowercase letter
- at least one number
- optional `FB_MIN_PASSWORD_LENGTH` can raise the minimum further

Recommended next steps:

- block common passwords
- require password reset on first login for generated credentials
- consider MFA for Super Admins


### Public Submission Abuse

Public response submission is rate limited by form and client IP. This reduces accidental or simple spam bursts, but it is not a full bot defense.

Recommended:

- tune the rate limit after production traffic is observed
- optional CAPTCHA for public forms
- server-side maximum answer size remains enforced

### CORS Configuration

CORS origin handling is centralized in `form-builder-api/cors_helper.php`. Production should set `FB_ALLOWED_ORIGINS` to the exact frontend origin list and avoid relying on local-development defaults.

### Test Endpoints

Test endpoints are guarded by config but still present in the API directory.

Recommended:

- disable `allow_test_guard` in production
- block `test_*.php` at the web server level
- consider excluding test endpoints from production artifact

## Audit Logging

The audit log currently captures:

- user login/logout
- user create/delete/password change
- form create/update/delete
- response export
- banner upload/remove

Recommended:

- define retention period
- restrict export access
- monitor failed login spikes
- avoid storing unnecessary personal data in metadata

## Incident Response Basics

If compromise is suspected:

1. Disable affected accounts.
2. Rotate database credentials.
3. Preserve audit logs.
4. Export PHP/web server logs.
5. Restore from known-good backup if data integrity is uncertain.
6. Force password resets after containment.

