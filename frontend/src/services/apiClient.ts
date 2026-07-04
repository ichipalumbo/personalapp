import { Slot, Agendamento, SyncLog, AuthToken, ApiResponse } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercontent";

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("authToken");
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: Record<string, any>
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // ===== AUTENTICAÇÃO =====
  async login(id: string, senha: string): Promise<AuthToken> {
    const response = await this.request<AuthToken>("/api/login", "POST", {
      id,
      senha,
      tipo: "PROFESSORA"
    });

    this.token = response.token;
    localStorage.setItem("authToken", response.token);
    localStorage.setItem("user", JSON.stringify(response.user));

    return response;
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  }

  // ===== SLOTS =====
  async getSlots(month?: string): Promise<Slot[]> {
    return this.request<Slot[]>(`/api/slots?month=${month || ""}&role=PROFESSORA`);
  }

  async getSlot(slotId: string): Promise<Slot> {
    return this.request<Slot>(`/api/slots/${slotId}`);
  }

  async createSlot(slot: Omit<Slot, "slotId" | "criadoEm" | "atualizadoEm">): Promise<{ slotId: string }> {
    return this.request<{ slotId: string }>("/api/slots", "POST", slot);
  }

  async updateSlot(slotId: string, updates: Partial<Slot>): Promise<Slot> {
    return this.request<Slot>(`/api/slots/${slotId}`, "PUT", updates);
  }

  async deleteSlot(slotId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/api/slots/${slotId}`, "DELETE");
  }

  async createBulkSlots(slots: Omit<Slot, "slotId" | "criadoEm" | "atualizadoEm">[]): Promise<{ created: string[]; errors: string[] }> {
    return this.request<{ created: string[]; errors: string[] }>("/api/slots/bulk", "POST", { slots });
  }

  // ===== AGENDAMENTOS =====
  async getAgendamentos(month?: string): Promise<Agendamento[]> {
    return this.request<Agendamento[]>(`/api/agendamentos?month=${month || ""}`);
  }

  async cancelAgendamento(agendId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/api/agendamentos/${agendId}`, "DELETE");
  }

  async updatePresenca(
    agendId: string,
    statusPresenca: string,
    notas?: string
  ): Promise<Agendamento> {
    return this.request<Agendamento>(`/api/agendamentos/${agendId}/presenca`, "PUT", {
      statusPresenca,
      notas
    });
  }

  // ===== SINCRONIZAÇÃO =====
  async syncCalendar(): Promise<{ jobId: string; status: string }> {
    return this.request<{ jobId: string; status: string }>("/api/sync", "POST");
  }

  async getSyncLogs(limit: number = 50): Promise<SyncLog[]> {
    return this.request<SyncLog[]>(`/api/logs/sync?limit=${limit}`);
  }

  async getAuditLogs(limit: number = 50): Promise<any[]> {
    return this.request<any[]>(`/api/logs/audit?limit=${limit}`);
  }

  // ===== HEALTH CHECK =====
  async health(): Promise<{ status: string; calendar: boolean; sheets: boolean }> {
    return this.request<{ status: string; calendar: boolean; sheets: boolean }>("/api/health");
  }
}

export const apiClient = new ApiClient();
