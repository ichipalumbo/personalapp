// ============================================
// AUTH MODULE
// Autenticação com ID + Senha
// ============================================

const SESSION_TIMEOUT_HOURS = 2;
const REFRESH_TOKEN_DAYS = 7;

/**
 * Gera token JWT simples (não crípto-seguro, mas suficiente para MVP)
 */
function generateToken(userId, tipo) {
  const payload = {
    userId: userId,
    tipo: tipo,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (SESSION_TIMEOUT_HOURS * 3600)
  };

  // Simples serialização (em produção usar biblioteca crypto)
  const token = Utilities.base64Encode(JSON.stringify(payload));
  return token;
}

/**
 * Valida token e retorna user data ou null
 */
function validateToken(token) {
  try {
    const payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString());
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      return null; // Token expirado
    }

    return {
      id: payload.userId,
      tipo: payload.tipo
    };
  } catch (error) {
    return null;
  }
}

/**
 * Handler: POST /api/login
 * Body: { id: "prof_sofia", senha: "demo123", tipo: "PROFESSORA" }
 */
function handleLogin(payload) {
  const { id, senha, tipo } = payload;

  // Validações
  if (!id || !senha) {
    return {
      success: false,
      error: "ID e senha são obrigatórios",
      statusCode: 400
    };
  }

  // Verificar credenciais na Sheet "Usuarios"
  const sheet = getSheet("Usuarios");
  if (!sheet) {
    return {
      success: false,
      error: "Erro ao acessar dados de usuários",
      statusCode: 500
    };
  }

  const data = sheet.getDataRange().getValues();
  let userFound = null;

  // Header: [ID, Senha, Nome, Email, Tipo]
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id && data[i][1] === senha) {
      userFound = {
        id: data[i][0],
        nome: data[i][2],
        email: data[i][3],
        tipo: data[i][4]
      };
      break;
    }
  }

  if (!userFound) {
    logAudit("LOGIN_FAILED", { userId: id }, "Credenciais inválidas");
    return {
      success: false,
      error: "ID ou senha incorretos",
      statusCode: 401
    };
  }

  // Gerar token
  const token = generateToken(userFound.id, userFound.tipo);
  const expiresAt = new Date(Date.now() + SESSION_TIMEOUT_HOURS * 3600 * 1000).toISOString();

  logAudit("LOGIN_SUCCESS", { userId: userFound.id }, "Login bem-sucedido");

  return {
    success: true,
    data: {
      token: token,
      user: {
        id: userFound.id,
        nome: userFound.nome,
        email: userFound.email,
        tipo: userFound.tipo
      },
      expiresAt: expiresAt
    }
  };
}

/**
 * Handler: GET /api/health
 * Verificar conectividade
 */
function handleHealth() {
  try {
    const sheet = getSheet("Slots");
    const calendar = CalendarApp.getDefaultCalendar();

    return {
      success: true,
      data: {
        status: "ok",
        sheets: !!sheet,
        calendar: !!calendar,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      data: {
        status: "error",
        error: error.message
      }
    };
  }
}

/**
 * Registrar ação em audit log
 */
function logAudit(action, metadata, details) {
  const sheet = getOrCreateSheet("Logs");
  if (!sheet) return;

  const row = [
    new Date().toISOString(),
    action,
    JSON.stringify(metadata),
    details || "",
    ""
  ];

  sheet.appendRow(row);
}
