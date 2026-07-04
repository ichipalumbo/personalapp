// ============================================
// CALENDAR SYNC MODULE
// Sincronização Google Calendar ↔ Google Sheets
// ============================================

const GOOGLE_CALENDAR_ID = ""; // TODO: Configurar via Settings sheet

/**
 * Handler: POST /api/sync
 * Força sincronização Calendar → Sheets
 */
function handleSync(user) {
  try {
    if (user.tipo !== "PROFESSORA") {
      return { success: false, error: "Unauthorized", statusCode: 403 };
    }

    // Executar sincronização de forma assíncrona
    const startTime = Date.now();
    
    try {
      const result = syncCalendarToSheets();
      const duration = Date.now() - startTime;

      logSyncAttempt("sucesso", result.slotsProcessados, result.agendamentosProcessados, null, duration);
      logAudit("SYNC_COMPLETED", { userId: user.id, duration }, "Sincronização concluída");

      return {
        success: true,
        data: {
          jobId: "sync_" + Date.now(),
          status: "completed",
          result
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logSyncAttempt("erro", 0, 0, error.message, duration);
      
      throw error;
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      statusCode: 500
    };
  }
}

/**
 * Sincronizar todos os eventos do Google Calendar para a Sheet
 */
function syncCalendarToSheets() {
  try {
    const calendarId = getCalendarId();
    if (!calendarId) {
      throw new Error("Calendar ID não configurado");
    }

    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      throw new Error("Calendar não encontrado");
    }

    // Buscar eventos dos próximos 90 dias
    const now = new Date();
    const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const events = calendar.getEvents(now, endDate);

    let slotsProcessados = 0;
    let agendamentosProcessados = 0;

    const sheet = getOrCreateSheet(SHEET_NAMES.SLOTS);

    for (const event of events) {
      try {
        const eventId = event.getId();
        const title = event.getTitle();
        const startTime = event.getStartTime();
        const endTime = event.getEndTime();

        const data = startTime.toISOString().split("T")[0];
        const horaInicio = formatTime(startTime);
        const duracao = Math.round((endTime - startTime) / (1000 * 60));

        // Verificar se já existe na sheet
        const row = findRowInSheet(SHEET_NAMES.SLOTS, "GoogleEventId", eventId);

        if (row) {
          // Atualizar
          const updates = {
            Data: data,
            HoraInicio: horaInicio,
            Duracao: duracao,
            Descricao: event.getDescription() || title,
            AtualizadoEm: new Date().toISOString()
          };
          updateSheetRow(SHEET_NAMES.SLOTS, row.rowNumber, updates);
        } else {
          // Criar novo
          const slotId = generateId("SLOT");
          const slotData = {
            SlotId: slotId,
            Tipo: "AULA", // Padrão para eventos sync
            Data: data,
            HoraInicio: horaInicio,
            Duracao: duracao,
            Endereco: "",
            Descricao: event.getDescription() || title,
            Status: "ocupado",
            AlunoAlocado: "",
            DiasFixos: "",
            PeriodoAlocacaoInicio: "",
            PeriodoAlocacaoFim: "",
            GoogleEventId: eventId,
            SincronizadoDe: "CALENDAR",
            Notas: "",
            CriadoEm: new Date().toISOString(),
            AtualizadoEm: new Date().toISOString()
          };

          const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
          const newRow = objectToRow(headers, slotData);
          sheet.appendRow(newRow);
        }

        slotsProcessados++;
      } catch (error) {
        Logger.log("Erro ao processar evento: " + error.message);
      }
    }

    return {
      slotsProcessados,
      agendamentosProcessados,
      sucesso: true
    };
  } catch (error) {
    throw new Error("Erro na sincronização: " + error.message);
  }
}

/**
 * Sincronizar evento individual para Calendar (ao criar slot)
 */
function syncSlotToCalendar(slotId) {
  try {
    const row = findRowInSheet(SHEET_NAMES.SLOTS, "SlotId", slotId);
    if (!row) {
      throw new Error("Slot não encontrado");
    }

    const calendarId = getCalendarId();
    if (!calendarId) {
      throw new Error("Calendar ID não configurado");
    }

    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      throw new Error("Calendar não encontrado");
    }

    const data = row.data;
    const dataStr = data[2]; // Data
    const horaInicio = data[3]; // HoraInicio
    const duracao = data[4]; // Duracao
    const tipo = data[1]; // Tipo
    const descricao = data[6]; // Descricao

    // Construir datetime
    const [year, month, day] = dataStr.split("-").map(Number);
    const [hours, minutes] = horaInicio.split(":").map(Number);
    
    const startTime = new Date(year, month - 1, day, hours, minutes);
    const endTime = new Date(startTime.getTime() + duracao * 60 * 1000);

    // Criar event
    const event = calendar.createEvent(
      `[${tipo}] ${descricao}`,
      startTime,
      endTime,
      { description: descricao }
    );

    // Salvar GoogleEventId
    const updates = { GoogleEventId: event.getId() };
    updateSheetRow(SHEET_NAMES.SLOTS, row.rowNumber, updates);

    return event.getId();
  } catch (error) {
    throw new Error("Erro ao sincronizar slot: " + error.message);
  }
}

/**
 * Obter Calendar ID da configuração
 */
function getCalendarId() {
  // TODO: Implementar leitura de aba "Settings" ou usar default
  const calendarId = PropertiesService.getUserProperties().getProperty("GOOGLE_CALENDAR_ID");
  return calendarId || CalendarApp.getDefaultCalendar().getId();
}

/**
 * Formatar data/hora para HH:mm
 */
function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Registrar tentativa de sincronização
 */
function logSyncAttempt(status, slotsProcessados, agendamentosProcessados, erro, duracao) {
  const sheet = getOrCreateSheet(SHEET_NAMES.SYNC_LOGS);
  const row = [
    generateId("SYNC"),
    new Date().toISOString(),
    status,
    slotsProcessados,
    agendamentosProcessados,
    erro || "",
    duracao
  ];
  sheet.appendRow(row);
}

/**
 * Handler: GET /api/logs/sync?limit=50
 */
function handleGetSyncLogs(params, user) {
  try {
    if (user.tipo !== "PROFESSORA") {
      return { success: false, error: "Unauthorized", statusCode: 403 };
    }

    const limit = parseInt(params.limit) || 50;
    const logs = readSheetData(SHEET_NAMES.SYNC_LOGS);

    // Retornar últimos N
    const recent = logs.slice(Math.max(0, logs.length - limit));

    return {
      success: true,
      data: recent
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      statusCode: 500
    };
  }
}

/**
 * Handler: GET /api/logs/audit?limit=50
 */
function handleGetAuditLogs(params, user) {
  try {
    if (user.tipo !== "PROFESSORA") {
      return { success: false, error: "Unauthorized", statusCode: 403 };
    }

    const limit = parseInt(params.limit) || 50;
    const logs = readSheetData(SHEET_NAMES.LOGS);

    // Retornar últimos N
    const recent = logs.slice(Math.max(0, logs.length - limit));

    return {
      success: true,
      data: recent
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      statusCode: 500
    };
  }
}
