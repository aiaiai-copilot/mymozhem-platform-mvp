---
description: Test REST API endpoints. Run automated tests or manual API requests.
---

# API Testing

Test REST API endpoints for correctness and performance.

## Automated Tests

```bash
# Run all API tests
pnpm test:api

# Run specific endpoint tests
pnpm test src/routes/rooms.test.ts

# Watch mode
pnpm test:watch
```

## Manual Testing Tools

### cURL
```bash
# GET request
curl http://localhost:3000/api/rooms

# POST with JSON
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Test Room"}'
```

### HTTPie (recommended)
```bash
# GET
http :3000/api/rooms

# POST
http POST :3000/api/rooms name="Test Room" Authorization:"Bearer <token>"
```

### Bruno/Postman
- Import API collection from `docs/api-collection.json`
- Environment variables for base URL and tokens
- Pre-request scripts for authentication

## Test Checklist

### Endpoints
- [ ] **Authentication** — Valid/invalid tokens
- [ ] **Authorization** — Permission checks
- [ ] **Validation** — Invalid input rejected
- [ ] **Success cases** — Expected responses
- [ ] **Error cases** — Proper error messages
- [ ] **Pagination** — Limit, offset, total
- [ ] **Filtering** — Query parameters work
- [ ] **Sorting** — Order by fields

### Response Format
- [ ] Consistent `{ data, error, meta }` structure
- [ ] Proper HTTP status codes
- [ ] Correct Content-Type headers
- [ ] CORS headers present

### Performance
- [ ] Response time < 200ms for simple queries
- [ ] Database queries optimized (no N+1)
- [ ] Proper indexing for filters
