// ============================================
// SHEET UTILITIES
// Utilitários para trabalhar com Google Sheets
// ============================================

const SHEET_NAMES = {
  USUARIOS: "Usuarios",
  SLOTS: "Slots",
  AGENDAMENTOS: "Agendamentos",
  LOGS: "Logs",
  SYNC_LOGS: "SyncLogs"
};

/**
 * SETUP: Chamar esta função UMA VEZ para inicializar tudo
 * Execute no Console do Apps Script: setupDatabase()
 */
function setupDatabase() {
  Logger.log("Inicializando banco de dados...");
  
  const sheetNames = ["Usuarios", "Slots", "Agendamentos", "Logs", "SyncLogs"];
  
  for (const sheetName of sheetNames) {
    try {
      const sheet = getOrCreateSheet(sheetName);
      Logger.log(`✅ Aba '${sheetName}' criada/inicializada`);
    } catch (error) {
      Logger.log(`❌ Erro ao criar '${sheetName}': ${error.message}`);
    }
  }
  
  Logger.log("✅ Setup concluído! Agora adicione o usuário demo na aba 'Usuarios'");
}

/**
 * Obter referência a uma sheet pelo nome
 */
function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(sheetName);
}

/**
 * Obter ou criar uma sheet
 */
function getOrCreateSheet(sheetName) {
  let sheet = getSheet(sheetName);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }
  return sheet;
}

/**
 * Inicializar sheet com headers
 */
function initializeSheet(sheet, sheetName) {
  const headers = {
    [SHEET_NAMES.USUARIOS]: ["ID", "Senha", "Nome", "Email", "Tipo", "CriadoEm"],
    [SHEET_NAMES.SLOTS]: [
      "SlotId", "Tipo", "Data", "HoraInicio", "Duracao", "Endereco", "Descricao",
      "Status", "AlunoAlocado", "DiasFixos", "PeriodoAlocacaoInicio", "PeriodoAlocacaoFim",
      "GoogleEventId", "SincronizadoDe", "Notas", "CriadoEm", "AtualizadoEm"
    ],
    [SHEET_NAMES.AGENDAMENTOS]: [
      "AgendId", "SlotId", "AlunoId", "NomeAluno", "EmailAluno", "DataAgendamento",
      "GoogleEventId", "StatusPresenca", "Notas", "CriadoEm"
    ],
    [SHEET_NAMES.LOGS]: [
      "Timestamp", "Acao", "Metadata", "Detalhes", "UserId"
    ],
    [SHEET_NAMES.SYNC_LOGS]: [
      "Id", "DataSync", "Status", "SlotsProcessados", "AgendamentosProcessados",
      "Erro", "Duracao"
    ]
  };

  const headerRow = headers[sheetName];
  if (headerRow) {
    sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
  }
}

/**
 * Ler dados de uma sheet e converter para objetos
 */
function readSheetData(sheetName, startRow = 2) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // Apenas header

  const headers = data[0];
  const result = [];

  for (let i = startRow - 1; i < data.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }

  return result;
}

/**
 * Obter linha de uma sheet pelo ID
 */
function findRowInSheet(sheetName, idColumn, idValue) {
  const sheet = getSheet(sheetName);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf(idColumn);

  if (idIndex === -1) return null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === idValue) {
      return { rowNumber: i + 1, data: data[i] };
    }
  }

  return null;
}

/**
 * Atualizar linha na sheet
 */
function updateSheetRow(sheetName, rowNumber, updates) {
  const sheet = getSheet(sheetName);
  if (!sheet) return false;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const currentData = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];

  const newData = currentData.map((val, idx) => {
    const header = headers[idx];
    return updates[header] !== undefined ? updates[header] : val;
  });

  sheet.getRange(rowNumber, 1, 1, newData.length).setValues([newData]);
  return true;
}

/**
 * Deletar linha na sheet
 */
function deleteSheetRow(sheetName, rowNumber) {
  const sheet = getSheet(sheetName);
  if (!sheet) return false;

  sheet.deleteRow(rowNumber);
  return true;
}

/**
 * Gerar ID único (simples)
 */
function generateId(prefix) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
}

/**
 * Converter objeto para row de sheet
 */
function objectToRow(headers, obj) {
  return headers.map(header => {
    const key = header.charAt(0).toLowerCase() + header.slice(1); // camelCase
    return obj[key] || obj[header] || "";
  });
}

/**
 * Validar email (simples)
 */
function isValidEmail(email) {
  return /^[^@]+@gmail\.com$/.test(email);
}

/**
 * Validar data (YYYY-MM-DD)
 */
function isValidDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
}

/**
 * Validar hora (HH:mm)
 */
function isValidTime(timeStr) {
  return /^\d{2}:\d{2}$/.test(timeStr);
}
