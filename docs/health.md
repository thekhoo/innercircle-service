# Health Endpoint

## `GET /health`

Returns service health status. Excluded from request logs.

### Response

**200 OK**

```json
{
  "status": "ok",
  "service": "my-service",
  "universe": "development",
  "uptime": 12.345
}
```

| Field      | Type     | Description                                                      |
| ---------- | -------- | ---------------------------------------------------------------- |
| `status`   | `string` | Always `"ok"`                                                    |
| `service`  | `string` | Value of `SERVICE_NAME` env var                                  |
| `universe` | `string` | Value of `UNIVERSE` env var (`development\|staging\|production`) |
| `uptime`   | `number` | Process uptime in seconds                                        |

### Example

```bash
curl -s http://localhost:3002/health
```

```json
{ "status": "ok", "service": "my-service", "universe": "development", "uptime": 5.123 }
```
