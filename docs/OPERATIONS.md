# Operations Guide

## Routine Operations

### Daily

- Confirm application is reachable.
- Review PHP/web server error logs.
- Confirm database backup completed.
- Check disk space.

### Weekly

- Review audit logs.
- Verify no unexpected Super Admin accounts exist.
- Check upload directory contents.
- Review failed login patterns.

### Monthly

- Test backup restore.
- Apply dependency updates in staging.
- Run full test suite.
- Review user accounts and stale forms.

## Logs

Current logging is mostly PHP `error_log` plus application audit logs in the database.

Recommended production logging:

- PHP error logs
- web server access/error logs
- database slow query logs
- audit logs
- frontend error boundary events, if routed to a backend collector in the future

## Backups

Back up:

- MariaDB/MySQL database
- uploaded banner image and any future uploads
- deployment configuration

Suggested schedule:

- daily database backup
- pre-deployment backup
- weekly off-server backup copy

## Restore Drill

At least monthly:

1. Restore latest backup to a non-production database.
2. Point a staging API at the restored database.
3. Log in as test admin.
4. Verify form list, responses, users, and audit logs.

## Monitoring

Minimum checks:

- frontend HTTP 200
- API health endpoint or `check_session.php`
- database connectivity
- disk space
- backup success

Recommended future addition:

- add a dedicated `health.php` endpoint that checks API runtime and DB connectivity without exposing sensitive details.

## Maintenance Windows

For schema changes:

1. Announce maintenance window.
2. Back up database.
3. Deploy backend changes.
4. Apply migrations.
5. Deploy frontend build.
6. Run smoke tests.
7. Monitor logs after release.

## Troubleshooting

### Frontend Loads But API Calls Fail

- Confirm PHP server is running.
- Confirm API base path is correct.
- Check browser network tab for CORS errors.
- Check PHP error logs.

### E2E Tests Fail With ECONNREFUSED

- Start Apache/XAMPP.
- Verify `http://localhost/form-builder-api` is reachable.
- Confirm `form-builder-api/db.local.php` points to a test database.

### Users Cannot Stay Logged In

- Confirm HTTPS settings.
- Confirm session cookie settings.
- Confirm browser is accepting cookies.
- Confirm server time is correct.

