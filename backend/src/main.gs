// ============================================
// PERSONAL TRAINER APP - Google Apps Script Backend
// ============================================
// Entry Points e Router de APIs

/**
 * Deployment: Apps Script → Deploy as Web App
 * Execute as: Usuário do Script
 * Access: Anyone, even anonymous (revisar permissões depois)
 */

function doPost(e) {
  try {
    const path = e.parameter.path || "";
    const method = e.parameter.method || "POST";
    const payload = JSON.parse(e.postData.contents || "{}");

    const response = routeRequest(path, method, payload, e);
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
      ContentService.MimeType.JSON
    );
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.message
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const path = e.parameter.path || "";
    const response = routeRequest(path, "GET", {}, e);
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
      ContentService.MimeType.JSON
    );
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.message
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function routeRequest(path, method, payload, e) {
  // Rotas públicas
  if (path === "/api/login" && method === "POST") {
    return handleLogin(payload);
  }

  if (path === "/api/health" && method === "GET") {
    return handleHealth();
  }

  // Verificar token para rotas protegidas
  const token = extractToken(e);
  if (!token) {
    return {
      success: false,
      error: "Unauthorized",
      statusCode: 401
    };
  }

  const user = validateToken(token);
  if (!user) {
    return {
      success: false,
      error: "Invalid or expired token",
      statusCode: 401
    };
  }

  // Rotas protegidas
  if (path === "/api/slots" && method === "GET") {
    return handleGetSlots(payload, user);
  }

  if (path === "/api/slots" && method === "POST") {
    return handleCreateSlot(payload, user);
  }

  if (path.match(/^\/api\/slots\/([a-z0-9_]+)$/) && method === "GET") {
    const slotId = path.split("/")[3];
    return handleGetSlot(slotId, user);
  }

  if (path.match(/^\/api\/slots\/([a-z0-9_]+)$/) && method === "PUT") {
    const slotId = path.split("/")[3];
    return handleUpdateSlot(slotId, payload, user);
  }

  if (path.match(/^\/api\/slots\/([a-z0-9_]+)$/) && method === "DELETE") {
    const slotId = path.split("/")[3];
    return handleDeleteSlot(slotId, user);
  }

  if (path === "/api/slots/bulk" && method === "POST") {
    return handleBulkCreateSlots(payload, user);
  }

  if (path === "/api/agendamentos" && method === "GET") {
    return handleGetAgendamentos(payload, user);
  }

  if (path.match(/^\/api\/agendamentos\/([a-z0-9_]+)$/) && method === "DELETE") {
    const agendId = path.split("/")[3];
    return handleCancelAgendamento(agendId, user);
  }

  if (path.match(/^\/api\/agendamentos\/([a-z0-9_]+)\/presenca$/) && method === "PUT") {
    const agendId = path.split("/")[3];
    return handleUpdatePresenca(agendId, payload, user);
  }

  if (path === "/api/sync" && method === "POST") {
    return handleSync(user);
  }

  if (path === "/api/logs/sync" && method === "GET") {
    return handleGetSyncLogs(payload, user);
  }

  if (path === "/api/logs/audit" && method === "GET") {
    return handleGetAuditLogs(payload, user);
  }

  return {
    success: false,
    error: "Not found",
    statusCode: 404
  };
}

function extractToken(e) {
  const auth = e.parameter.Authorization || e.parameter.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return null;
  }
  return auth.substring(7);
}

// Placeholder functions (serão implementadas em outros arquivos)
function handleLogin(payload) { return { success: false, error: "Not implemented" }; }
function handleHealth() { return { success: false, error: "Not implemented" }; }
function handleGetSlots(payload, user) { return { success: false, error: "Not implemented" }; }
function handleCreateSlot(payload, user) { return { success: false, error: "Not implemented" }; }
function handleGetSlot(slotId, user) { return { success: false, error: "Not implemented" }; }
function handleUpdateSlot(slotId, payload, user) { return { success: false, error: "Not implemented" }; }
function handleDeleteSlot(slotId, user) { return { success: false, error: "Not implemented" }; }
function handleBulkCreateSlots(payload, user) { return { success: false, error: "Not implemented" }; }
function handleGetAgendamentos(payload, user) { return { success: false, error: "Not implemented" }; }
function handleCancelAgendamento(agendId, user) { return { success: false, error: "Not implemented" }; }
function handleUpdatePresenca(agendId, payload, user) { return { success: false, error: "Not implemented" }; }
function handleSync(user) { return { success: false, error: "Not implemented" }; }
function handleGetSyncLogs(payload, user) { return { success: false, error: "Not implemented" }; }
function handleGetAuditLogs(payload, user) { return { success: false, error: "Not implemented" }; }
function validateToken(token) { return null; }
