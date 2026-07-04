// ============================================
// SLOTS MODULE
// CRUD de Slots (Aulas e Pessoais)
// ============================================

/**
 * Handler: GET /api/slots?month=YYYY-MM&role=PROFESSORA
 */
function handleGetSlots(params, user) {
  try {
    const slots = readSheetData(SHEET_NAMES.SLOTS);
    
    // Filtrar por role (PROFESSORA vê tudo)
    if (user.tipo !== "PROFESSORA") {
      return { success: false, error: "Unauthorized", statusCode: 403 };
    }

    // Filtrar por mês se especificado
    if (params.month) {
      const monthPrefix = params.month; // YYYY-MM
      const filtered = slots.filter(slot => slot.Data && slot.Data.startsWith(monthPrefix));
      return {
        success: true,
        data: formatSlots(filtered)
      };
    }

    return {
      success: true,
      data: formatSlots(slots)
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
 * Handler: GET /api/slots/:slotId
 */
function handleGetSlot(slotId, user) {
  try {
    if (user.tipo !== "PROFESSORA") {
      return { success: false, error: "Unauthorized", statusCode: 403 };
    }

    const row = findRowInSheet(SHEET_NAMES.SLOTS, "SlotId", slotId);
    if (!row) {
      return { success: false, error: "Slot not found", statusCode: 404 };
    }

    return {
      success: true,
      data: formatSlot(row.data)
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
 * Handler: POST /api/slots
 * Body: { tipo, data, horaInicio, duracao, endereco?, descricao?, ... }
 */
function handleCreateSlot(payload, user) {
  try {
    if (user.tipo !== "PROFESSORA") {
      return { success: false, error: "Unauthorized", statusCode: 403 };
    }

    // Validações
    const { tipo, data, horaInicio, duracao } = payload;
    
    if (!tipo || !data || !horaInicio || !duracao) {
      return { success: false, error: "Missing required fields", statusCode: 400 };
    }

    if (!["AULA", "PESSOAL"].includes(tipo)) {
      return { success: false, error: "Invalid tipo", statusCode: 400 };
    }

    if (!isValidDate(data)) {
      return { success: false, error: "Invalid data format", statusCode: 400 };
    }

    if (!isValidTime(horaInicio)) {
      return { success: false, error: "Invalid horaInicio format", statusCode: 400 };
    }

    if (typeof duracao !== "number" || duracao < 15) {
      return { success: false, error: "Duracao deve ser >= 15 minutos", statusCode: 400 };
    }

    // Gerar ID
    const slotId = generateId("SLOT");
    const now = new Date().toISOString();

    // Preparar dados
    const slotData = {
      SlotId: slotId,
      Tipo: tipo,
      Data: data,
      HoraInicio: horaInicio,
      Duracao: duracao,
      Endereco: payload.endereco || "",
      Descricao: payload.descricao || "",
      Status: "disponivel",
      AlunoAlocado: payload.alunoAlocado || "",
      DiasFixos: payload.diasFixos ? JSON.stringify(payload.diasFixos) : "",
      PeriodoAlocacaoInicio: payload.periodoAlocacaoInicio || "",
      PeriodoAlocacaoFim: payload.periodoAlocacaoFim || "",
      GoogleEventId: "",
      SincronizadoDe: "APP",
      Notas: payload.notas || "",
      CriadoEm: now,
      AtualizadoEm: now
    };

    // Inserir na sheet
    const sheet = getOrCreateSheet(SHEET_NAMES.SLOTS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = objectToRow(headers, slotData);
    sheet.appendRow(row);

    logAudit("SLOT_CREATED", { slotId, userId: user.id }, "Slot criado");

    return {
      success: true,
      data: { slotId }
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
 * Handler: PUT /api/slots/:slotId
 */
function handleUpdateSlot(slotId, payload, user) {
  try {
    if (user.tipo !== "PROFESSORA") {
      return { success: false, error: "Unauthorized", statusCode: 403 };
    }

    const row = findRowInSheet(SHEET_NAMES.SLOTS, "SlotId", slotId);
    if (!row) {
      return { success: false, error: "Slot not found", statusCode: 404 };
    }

    // Validações se necessário
    if (payload.data && !isValidDate(payload.data)) {
      return { success: false, error: "Invalid data format", statusCode: 400 };
    }

    if (payload.horaInicio && !isValidTime(payload.horaInicio)) {
      return { success: false, error: "Invalid horaInicio format", statusCode: 400 };
    }

    // Converter camelCase → TitleCase para sheet
    const updates = {};
    for (const key in payload) {
      const titleKey = key.charAt(0).toUpperCase() + key.slice(1);
      updates[titleKey] = payload[key];
    }
    updates.AtualizadoEm = new Date().toISOString();

    updateSheetRow(SHEET_NAMES.SLOTS, row.rowNumber, updates);

    logAudit("SLOT_UPDATED", { slotId, userId: user.id }, "Slot atualizado");

    return {
      success: true,
      data: { slotId }
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
 * Handler: DELETE /api/slots/:slotId
 */
function handleDeleteSlot(slotId, user) {
  try {
    if (user.tipo !== "PROFESSORA") {
      return { success: false, error: "Unauthorized", statusCode: 403 };
    }

    const row = findRowInSheet(SHEET_NAMES.SLOTS, "SlotId", slotId);
    if (!row) {
      return { success: false, error: "Slot not found", statusCode: 404 };
    }

    // TODO: Verificar se há agendamentos neste slot antes de deletar

    deleteSheetRow(SHEET_NAMES.SLOTS, row.rowNumber);

    logAudit("SLOT_DELETED", { slotId, userId: user.id }, "Slot deletado");

    return {
      success: true,
      data: { status: "deleted" }
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
 * Handler: POST /api/slots/bulk
 * Body: { slots: [...] }
 */
function handleBulkCreateSlots(payload, user) {
  try {
    if (user.tipo !== "PROFESSORA") {
      return { success: false, error: "Unauthorized", statusCode: 403 };
    }

    const { slots } = payload;
    if (!Array.isArray(slots)) {
      return { success: false, error: "slots deve ser um array", statusCode: 400 };
    }

    const created = [];
    const errors = [];

    const sheet = getOrCreateSheet(SHEET_NAMES.SLOTS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const now = new Date().toISOString();

    for (let i = 0; i < slots.length; i++) {
      try {
        const slot = slots[i];

        // Validações
        if (!slot.tipo || !slot.data || !slot.horaInicio || !slot.duracao) {
          errors.push(`Slot ${i}: Missing required fields`);
          continue;
        }

        const slotId = generateId("SLOT");
        const slotData = {
          SlotId: slotId,
          Tipo: slot.tipo,
          Data: slot.data,
          HoraInicio: slot.horaInicio,
          Duracao: slot.duracao,
          Endereco: slot.endereco || "",
          Descricao: slot.descricao || "",
          Status: "disponivel",
          AlunoAlocado: slot.alunoAlocado || "",
          DiasFixos: slot.diasFixos ? JSON.stringify(slot.diasFixos) : "",
          PeriodoAlocacaoInicio: slot.periodoAlocacaoInicio || "",
          PeriodoAlocacaoFim: slot.periodoAlocacaoFim || "",
          GoogleEventId: "",
          SincronizadoDe: "APP",
          Notas: slot.notas || "",
          CriadoEm: now,
          AtualizadoEm: now
        };

        const row = objectToRow(headers, slotData);
        sheet.appendRow(row);
        created.push(slotId);
      } catch (error) {
        errors.push(`Slot ${i}: ${error.message}`);
      }
    }

    logAudit("BULK_SLOTS_CREATED", { count: created.length, userId: user.id }, "Slots criados em bulk");

    return {
      success: true,
      data: { created, errors }
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
 * Formatar dados de slot para resposta API
 */
function formatSlot(row) {
  return {
    slotId: row[0],
    tipo: row[1],
    data: row[2],
    horaInicio: row[3],
    duracao: row[4],
    endereco: row[5] || null,
    descricao: row[6] || null,
    status: row[7],
    alunoAlocado: row[8] || null,
    diasFixos: row[9] ? JSON.parse(row[9]) : [],
    periodoAlocacaoInicio: row[10] || null,
    periodoAlocacaoFim: row[11] || null,
    googleEventId: row[12] || null,
    sincronizadoDe: row[13],
    notas: row[14] || "",
    criadoEm: row[15],
    atualizadoEm: row[16]
  };
}

/**
 * Formatar múltiplos slots
 */
function formatSlots(rows) {
  return rows.map(row => {
    const headers = ["SlotId", "Tipo", "Data", "HoraInicio", "Duracao", "Endereco", "Descricao", "Status", "AlunoAlocado", "DiasFixos", "PeriodoAlocacaoInicio", "PeriodoAlocacaoFim", "GoogleEventId", "SincronizadoDe", "Notas", "CriadoEm", "AtualizadoEm"];
    const data = [];
    for (let i = 0; i < headers.length; i++) {
      data.push(row[headers[i]] || "");
    }
    return formatSlot(data);
  });
}
