# Operations Guide

## Routine Operations

### Daily

- Confirm application is reachable.
- Review Laravel/PHP/web server error logs.
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

Current logging is mostly Laravel/PHP logs plus application audit logs in the database.

Recommended production logging:

- Laravel logs in `form-builder-api/laravel/storage/logs`
- PHP runtime error logs
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
2. Point a staging Laravel app at the restored database.
3. Log in as test admin.
4. Verify form list, responses, users, and audit logs.

## Monitoring

Minimum checks:

- Laravel app HTTP 200
- `/_fb_laravel_health`
- API session endpoint such as `/check_session.php`
- database connectivity
- disk space
- backup success

Recommended future addition: extend the Laravel health route to check DB connectivity without exposing sensitive details.

## Maintenance Windows

For schema changes:

1. Announce maintenance window.
2. Back up database.
3. Deploy backend changes.
4. Apply migrations.
5. Build and deploy frontend assets into Laravel `public/app`.
6. Run smoke tests.
7. Monitor logs after release.

## Troubleshooting

### Frontend Loads But API Calls Fail

- Confirm Laravel is running and serving the app origin.
- Confirm API base path is correct. Production builds should usually use same-origin root endpoints.
- Check browser network tab for CORS errors.
- Check Laravel and PHP error logs.

### E2E Tests Fail With ECONNREFUSED

- Start the Laravel server configured by `VITE_API_TARGET`, usually `http://127.0.0.1:8001`.
- Verify `http://127.0.0.1:8001/_fb_laravel_health` is reachable.
- Confirm the Laravel testing environment points to a disposable test database.

### Users Cannot Stay Logged In

- Confirm HTTPS settings.
- Confirm session cookie settings.
- Confirm browser is accepting cookies.
- Confirm server time is correct.
