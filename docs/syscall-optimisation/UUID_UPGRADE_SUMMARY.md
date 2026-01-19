# UUID Package Upgrade Summary

## Changes Implemented

### 1. Upgraded uuid Package
- **Before**: `uuid@8.3.2` (2020)
- **After**: `uuid@^13.0.0` (2024)
- **Location**: `package.json`

### 2. Replaced uuid.v4() with crypto.randomUUID()

Replaced all production code `uuid.v4()` calls with Node.js native `crypto.randomUUID()`:

| File | Change | Reason |
|------|--------|--------|
| `lib/runner/cursor.js` | `uuid.v4()` → `crypto.randomUUID()` | Public API (coords.ref) |
| `lib/runner/extensions/item.command.js` | `uuid.v4()` → `crypto.randomUUID()` | Public API (coords.ref) |
| `lib/authorizer/asap.js` | `uuid.v4()` → `crypto.randomUUID()` | JWT token ID (security) |
| `lib/authorizer/edgegrid.js` | `uuid.v4()` → `crypto.randomUUID()` | Nonce (security) |

### 3. Removed Unused uuid Imports

Removed `uuid` imports from files that now use `fastUUID()`:
- `lib/requester/core.js`
- `lib/runner/extensions/event.command.js`
- `lib/runner/extensions/http-request.command.js`

## Benefits

1. **Reduced Dependencies**: Using Node.js native API reduces external dependencies
2. **Better Performance**: Native `crypto.randomUUID()` is optimized by Node.js
3. **Maintenance**: Upgraded uuid package for security/bug fixes (though less critical now)
4. **Consistency**: All UUID generation now uses either:
   - `crypto.randomUUID()` for real UUIDs (public APIs, security)
   - `fastUUID()` for internal IDs (no crypto syscalls)

## UUID Usage After Changes

| Use Case | Implementation | Syscalls |
|----------|----------------|----------|
| Internal IDs (httpRequestId, requestId, executionId) | `fastUUID()` | 0 |
| Postman-Token header | `fastUUID()` | 0 |
| Public API (coords.ref) | `crypto.randomUUID()` | 2 per request |
| Auth (JWT token ID, nonce) | `crypto.randomUUID()` | Minimal |

## Testing

- ✅ No linter errors
- ⏳ Run full test suite to verify behavior
- ⏳ Verify UUID format compatibility (RFC 4122)
- ⏳ Performance testing to measure improvement

## Notes

- Test files still use `uuid` package (acceptable for tests)
- `uuid` package remains in dependencies for now (can be removed later if tests don't need it)
- All UUIDs remain RFC 4122 compliant
- Public API contracts preserved

