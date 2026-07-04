# SPEC_API — API Contract (MVP)

Este documento contém os endpoints mínimos para o MVP.

## Autenticação
POST /api/login
- body: { "id": "prof_sofia", "tipo": "PROFESSORA" }
- 200: { "token": "<token>", "user": { "id":"prof_sofia","tipo":"PROFESSORA"}, "expiresAt":"2026-07-05T12:00:00Z" }
- 404: { "error": "ID not found" }

## Slots
GET /api/slots?month=YYYY-MM&role=ALUNO|PROFESSORA
- Returns: 200: [ Slot ]

POST /api/slots
- (PROFESSORA only)
- body: SlotInput
- 201: { slotId }
- 400: validation error

POST /api/slots/:slotId/agendar
- body: { "alunoId": "ALUNO_001", "emailAluno": "joao@gmail.com" }
- 200: { "agendId": "AGEND_001", "googleEventId":"evt_abc123" }
- 401/403/404/409: see errors

DELETE /api/agendamentos/:agendId
- Deletes/cancels an appointment (validates antecedence)
- 200: { "status": "cancelled" }
- 403: cannot cancel (too late)

## Sync
POST /api/sync
- (PROFESSORA only) Force sync Calendar → Sheets
- 202 Accepted, returns jobId

## Errors (common)
- 400 Bad Request — payload invalid
- 401 Unauthorized — token expired/invalid
- 403 Forbidden — permission denied
- 404 Not Found — resource not found
- 409 Conflict — slot already reserved
- 500 Internal — server error

## Notes
- All timestamps in responses must be ISO-8601 UTC.
- All endpoints require `Authorization: Bearer <token>` header.

