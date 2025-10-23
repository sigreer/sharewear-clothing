# Testing Guide

## Database Configuration
Integration tests use the development database (`shareweardb`).

**⚠️ IMPORTANT**: Always back up the database before running integration tests:
```bash
./scripts/backup-database.sh
```

## Running Tests

### Unit Tests (Safe - No Database)
```bash
bun run test:unit
```

### Integration Tests (Uses Development Database)
```bash
# Back up database first
./scripts/backup-database.sh

# Run HTTP integration tests
bun run test:integration:http

# Run module integration tests
bun run test:integration:modules
```

## Database Backups
- Backups are stored in `apps/server/backups/`
- Run `./scripts/backup-database.sh` before integration tests
- Backups are timestamped: `shareweardb-YYYY-MM-DD-HH-MM-SS.sql`

### Restoring from Backup
```bash
PGPASSWORD=postgres psql -h localhost -p 55432 -U postgres -d shareweardb < backups/shareweardb-YYYY-MM-DD-HH-MM-SS.sql
```

## Test Environment
Tests use the configuration from `.env.test`, which points to the same database as development (`shareweardb`). This approach was chosen to:
- Avoid duplicating data across multiple databases
- Simplify configuration management
- Enable testing against real data

**Trade-offs**: Tests can modify development data, hence the importance of backups.

## Test Organization

### Unit Tests
- **Location**: `src/**/__tests__/**/*.unit.spec.[jt]s`
- **Purpose**: Test individual functions and services in isolation
- **Database**: No database access (mocked)
- **Runtime**: Fast (< 1 minute for full suite)

### Integration Tests
- **HTTP Tests**: `tests/integration/http/*.spec.[jt]s`
  - Test API endpoints end-to-end
  - Require running server instance

- **Module Tests**: `src/modules/*/__tests__/integration/*.[jt]s`
  - Test module functionality with real database
  - Test service interactions and workflows

## Test Environment Variables
The test environment uses `NODE_ENV=test` and loads configuration from `.env.test`. Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT token generation
- `COOKIE_SECRET`: Secret for cookie signing

## Best Practices
1. **Always backup before integration tests**: Use `./scripts/backup-database.sh`
2. **Run unit tests first**: They're faster and catch most issues
3. **Check test output carefully**: Integration tests can modify data
4. **Keep backups**: Store important backups outside the `backups/` directory
5. **Restore if needed**: Use the restore command to rollback changes

## Troubleshooting

### Database Connection Errors
If tests fail with connection errors:
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 55432

# Verify database exists
PGPASSWORD=postgres psql -h localhost -p 55432 -U postgres -l | grep shareweardb
```

### Redis Connection Errors
If tests fail with Redis errors:
```bash
# Check Redis is running
redis-cli -h sharewear.local -p 6379 ping
```

### Clean Test Environment
To reset the test environment:
```bash
# Restore from backup
PGPASSWORD=postgres psql -h localhost -p 55432 -U postgres -d shareweardb < backups/shareweardb-YYYY-MM-DD-HH-MM-SS.sql

# Or run migrations fresh (WARNING: destroys all data)
bunx medusa db:migrate
```
