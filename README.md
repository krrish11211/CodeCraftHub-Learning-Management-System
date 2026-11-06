# CodeCraftHub — Learning Management REST API

A beginner-friendly Node.js + Express application for developers to track courses and personal learning goals. Built to match the IBM CodeCraftHub JavaScript lab specifications.

## Features
- Five REST endpoints: create, list, retrieve by ID, partially update, delete
- Each course stores auto-generated integer `id` (starting at 1), required `name`, `description`, `target_date` (`YYYY-MM-DD`), `status`, and auto-generated `created_at` timestamp
- Valid statuses: `Not Started`, `In Progress`, `Completed`
- File-based persistence in `courses.json`, automatically created on the first run (no database)
- Validation, HTTP 400 / 404 / 500 error responses, comments, and automated tests
- No authentication or user management, as requested by the lab

## Requirements
- Node.js 18 or later
- npm

## Installation & starting
```bash
npm install
npm start
```
The server runs at **http://localhost:5000**. `courses.json` is automatically created in this folder if missing.

## API reference
| Method | Endpoint | Use | Success code |
|---|---|---|---|
| POST | `/api/courses` | Add course | 201 |
| GET | `/api/courses` | List courses | 200 |
| GET | `/api/courses/:id` | Retrieve course | 200 |
| PUT | `/api/courses/:id` | Update supplied fields | 200 |
| DELETE | `/api/courses/:id` | Remove course | 200 |

### Example POST request (PowerShell)
Run in a *second* VS Code PowerShell terminal while the server is running:
```powershell
$body = @{
  name = 'Python Basics'
  description = 'Learn Python fundamentals'
  target_date = '2026-12-31'
  status = 'Not Started'
} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5000/api/courses' -Method POST -ContentType 'application/json' -Body $body
```
The response includes a new course with `id: 1` (if no other courses exist) and `created_at`.

### Other requests (PowerShell)
```powershell
# Get all courses
Invoke-RestMethod http://localhost:5000/api/courses
# Get course ID 1
Invoke-RestMethod http://localhost:5000/api/courses/1
# Update only status
Invoke-RestMethod -Uri http://localhost:5000/api/courses/1 -Method PUT -ContentType 'application/json' -Body '{"status":"In Progress"}'
# Delete course ID 1 (after screenshots / evaluation)
Invoke-RestMethod -Uri http://localhost:5000/api/courses/1 -Method DELETE
```

### curl equivalents (macOS / Linux / bash)
```bash
curl -X POST http://localhost:5000/api/courses -H 'Content-Type: application/json' -d '{"name":"Python Basics","description":"Learn Python fundamentals","target_date":"2026-12-31","status":"Not Started"}'
curl http://localhost:5000/api/courses
curl http://localhost:5000/api/courses/1
curl -X PUT http://localhost:5000/api/courses/1 -H 'Content-Type: application/json' -d '{"status":"In Progress"}'
curl -X DELETE http://localhost:5000/api/courses/1
```

## Course JSON example
```json
{
  "id": 1,
  "name": "Python Basics",
  "description": "Learn Python fundamentals",
  "target_date": "2026-12-31",
  "status": "In Progress",
  "created_at": "2026-11-06T00:00:00.000Z"
}
```
`created_at` above is an example; the real timestamp comes from the server.

## Testing
```bash
npm test
```
Tests use their own temporary JSON file. They do not modify the main `courses.json`.

## Project files
```
app.js              # Express server and all course endpoints
package.json        # Scripts and Express dependency
README.md           # Documentation and examples
.gitignore          # Exclude local dependencies/secrets
tests/api.test.js   # Automated tests
courses.json        # Generated automatically at runtime
```

## Troubleshooting
- **`npm` not recognized:** install Node.js, restart VS Code, and try again.
- **Cannot find module 'express':** run `npm install` in the directory containing `package.json`.
- **Port 5000 in use:** close the other service using it or set `PORT` to another value (the lab expects 5000).
- **HTTP 400:** include all fields for POST, use `target_date` in `YYYY-MM-DD`, and choose one of the three valid statuses.
- **HTTP 404:** check the requested course ID and ensure the course exists.
- **HTTP 500:** check `courses.json` contains a valid JSON array and that the directory is writable.
- **PowerShell curl problems:** use the `Invoke-RestMethod` commands above. Bash-style `curl -d` may not work in Windows PowerShell.

## Design notes
No database or authentication is used per the IBM project requirements. API errors are returned as JSON. File storage is intended for a beginner lab and is not designed for heavy simultaneous writes.
