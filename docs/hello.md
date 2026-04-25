# Hello Endpoints

## `GET /hello/world`

Returns a static greeting.

### Response

**200 OK**

```json
{ "message": "Hello, world!" }
```

### Example

```bash
curl -s http://localhost:3002/hello/world
```

```json
{ "message": "Hello, world!" }
```

---

## `GET /hello/:name`

Returns a personalised greeting.

### Path Parameters

| Parameter | Type     | Constraints                                    | Description   |
| --------- | -------- | ---------------------------------------------- | ------------- |
| `name`    | `string` | 1–50 chars, alphanumeric only (`[a-zA-Z0-9]+`) | Name to greet |

### Response

**200 OK**

```json
{ "message": "Hello, Ada!" }
```

**400 Bad Request** — when `:name` fails validation

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "requestId": "uuid",
    "details": {
      "issues": [{ "code": "invalid_string", "path": ["name"], "message": "Invalid" }]
    }
  }
}
```

### Examples

```bash
# Valid
curl -s http://localhost:3002/hello/Ada
# {"message":"Hello, Ada!"}

# Invalid — contains hyphen
curl -s http://localhost:3002/hello/bad-name
# {"error":{"code":"VALIDATION_ERROR",...}}
```
