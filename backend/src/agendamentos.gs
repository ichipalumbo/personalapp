// ============================================
// AGENDAMENTOS MODULE
// CRUD de Agendamentos (Aluno x Slot)
// ============================================

/**
 * Handler: GET /api/agendamentos?month=YYYY-MM
 */
function handleGetAgendamentos(params, user) {
  try {
    if (user.tipo !== "PROFESSORA") {
      return { success: false, error: "Unauthorized", statusCode: 403 };
    }

    const agendamentos = readSheetData(SHEET_NAMES.AGENDAMENTOS);

    if (params.month) {
      const monthPrefix = params.month;
      const filtered = agendamentos.filter(a => a.DataAgendamento && a.DataAgendamento.startsWith(monthPrefix));
      return {
        success: true,
        data: formatAgendamentos(filtered)
      };
    }

    return {
      success: true,
      data: formatAgendamentos(agendamentos)
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
 * Handler: PUT /api/agendamentos/:agendId/presenca
 * Body: { statusPresenca: "Compareceu|Faltou|Reagendado", notas?: "..." }
 */
function handleUpdatePresenca(agendId, payload, user) {
  try {
    if (user.tipo !== "PROFESSORA") {
      return { success: false, error: "Unauthorized", statusCode: 403 };
    }

    const { statusPresenca, notas } = payload;

    if (!statusPresenca || !["Compareceu", "Faltou", "Reagendado", "Cancelado"].includes(statusPresenca)) {
      return { success: false, error: "Invalid statusPresenca", statusCode: 400 };
    }

    const row = findRowInSheet(SHEET_NAMES.AGENDAMENTOS, "AgendId", agendId);
    if (!row) {
      return { success: false, error: "Agendamento not found", statusCode: 404 };
    }

    const updates = {
      StatusPresenca: statusPresenca,
      Notas: notas || ""
    };

    updateSheetRow(SHEET_NAMES.AGENDAMENTOS, row.rowNumber, updates);
    logAudit("PRESENCA_UPDATED", { agendId, userId: user.id, status: statusPresenca }, "Presença marcada");

    return {
      success: true,
      data: { agendId, statusPresenca }
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
 * Handler: DELETE /api/agendamentos/:agendId
 * Cancelar agendamento (com validação de antecedência)
 */
function handleCancelAgendamento(agendId, user) {
  try {
    if (user.tipo !== "PROFESSORA") {
      return { success: false, error: "Unauthorized", statusCode: 403 };
    }

    const row = findRowInSheet(SHEET_NAMES.AGENDAMENTOS, "AgendId", agendId);
    if (!row) {
      return { success: false, error: "Agendamento not found", statusCode: 404 };
    }

    const data = row.data;
    const dataAgendamento = new Date(data[5]); // DataAgendamento
    const now = new Date();
    const horasRestantes = (dataAgendamento - now) / (1000 * 60 * 60);

    // Validar se faltam menos de 24h (para MVP, permitir cancelamento sempre)
    // if (horasRestantes < 24) {
    //   return { success: false, error: "Não pode cancelar com menos de 24h de antecedência", statusCode: 403 };
    // }

    deleteSheetRow(SHEET_NAMES.AGENDAMENTOS, row.rowNumber);

    // TODO: Deletar event no Google Calendar se existir

    logAudit("AGENDAMENTO_CANCELLED", { agendId, userId: user.id }, "Agendamento cancelado");

    return {
      success: true,
      data: { status: "cancelled" }
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
 * Criar agendamento (interno - chamado pelo frontend ao agendar)
 */
function createAgendamento(slotId, alunoId, nomeAluno, emailAluno) {
  try {
    if (!isValidEmail(emailAluno)) {
      throw new Error("Email inválido (apenas Gmail)");
    }

    const agendId = generateId("AGEND");
    const now = new Date().toISOString();

    const agendData = {
      AgendId: agendId,
      SlotId: slotId,
      AlunoId: alunoId,
      NomeAluno: nomeAluno,
      EmailAluno: emailAluno,
      DataAgendamento: now,
      GoogleEventId: "",
      StatusPresenca: "",
      Notas: "",
      CriadoEm: now
    };

    const sheet = getOrCreateSheet(SHEET_NAMES.AGENDAMENTOS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = objectToRow(headers, agendData);
    sheet.appendRow(row);

    return { agendId, success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Formatar agendamento para resposta API
 */
function formatAgendamento(row) {
  return {
    agendId: row[0],
    slotId: row[1],
    alunoId: row[2],
    nomeAluno: row[3] || null,
    emailAluno: row[4],
    dataAgendamento: row[5],
    googleEventId: row[6] || null,
    statusPresenca: row[7] || null,
    notas: row[8] || ""
  };
}

/**
 * Formatar múltiplos agendamentos
 */
function formatAgendamentos(rows) {
  return rows.map(row => {
    const headers = ["AgendId", "SlotId", "AlunoId", "NomeAluno", "EmailAluno", "DataAgendamento", "GoogleEventId", "StatusPresenca", "Notas"];
    const data = [];
    for (let i = 0; i < headers.length; i++) {
      data.push(row[headers[i]] || "");
    }
    return formatAgendamento(data);
  });
}
