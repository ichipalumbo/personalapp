import React, { useState, useEffect } from "react";
import { RefreshCw, LogOut, AlertCircle, CheckCircle } from "lucide-react";
import { useSlots } from "../hooks/useSlots";
import { useAuth } from "../hooks/useAuth";
import { CalendarView } from "../components/CalendarView";
import { AgendamentosList } from "../components/AgendamentosList";
import { Slot, Agendamento, PresencaStatus } from "../types";
import { apiClient } from "../services/apiClient";

export function DashboardPage() {
  const { logout } = useAuth();
  const { slots, isLoading: slotsLoading, refetch } = useSlots();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [agendamentosLoading, setAgendamentosLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [tabAtivo, setTabAtivo] = useState<"calendario" | "agendamentos" | "logs">("calendario");

  // Carregar agendamentos
  useEffect(() => {
    loadAgendamentos();
  }, []);

  const loadAgendamentos = async () => {
    setAgendamentosLoading(true);
    try {
      const data = await apiClient.getAgendamentos();
      setAgendamentos(data);
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
    } finally {
      setAgendamentosLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncStatus("syncing");
    setSyncMessage("Sincronizando...");

    try {
      const result = await apiClient.syncCalendar();
      setSyncStatus("success");
      setSyncMessage("Sincronização concluída com sucesso!");
      await refetch();
      await loadAgendamentos();
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (err) {
      setSyncStatus("error");
      setSyncMessage(err instanceof Error ? err.message : "Erro na sincronização");
      setTimeout(() => setSyncStatus("idle"), 5000);
    }
  };

  const handleCreateSlot = async () => {
    const slotData = {
      tipo: "AULA" as const,
      data: new Date().toISOString().split("T")[0],
      horaInicio: "10:00",
      duracao: 60,
      status: "disponivel" as const,
      sincronizadoDe: "APP" as const
    };

    try {
      await apiClient.createSlot(slotData);
      await refetch();
    } catch (err) {
      alert("Erro ao criar slot: " + (err instanceof Error ? err.message : "erro desconhecido"));
    }
  };

  const handleUpdatePresenca = async (agendId: string, status: PresencaStatus) => {
    try {
      await apiClient.updatePresenca(agendId, status);
      await loadAgendamentos();
    } catch (err) {
      alert("Erro ao atualizar presença: " + (err instanceof Error ? err.message : "erro desconhecido"));
    }
  };

  const handleCancelAgendamento = async (agendId: string) => {
    try {
      await apiClient.cancelAgendamento(agendId);
      await loadAgendamentos();
    } catch (err) {
      alert("Erro ao cancelar: " + (err instanceof Error ? err.message : "erro desconhecido"));
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (confirm("Tem certeza que deseja deletar este slot?")) {
      try {
        await apiClient.deleteSlot(slotId);
        await refetch();
      } catch (err) {
        alert("Erro ao deletar: " + (err instanceof Error ? err.message : "erro desconhecido"));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard - Personal Trainer</h1>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      {/* Status de Sincronização */}
      {syncStatus !== "idle" && (
        <div
          className={`mx-4 mt-4 p-4 rounded-lg flex items-center gap-2 ${
            syncStatus === "syncing"
              ? "bg-blue-50 border border-blue-200 text-blue-700"
              : syncStatus === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {syncStatus === "syncing" && <RefreshCw className="w-5 h-5 animate-spin" />}
          {syncStatus === "success" && <CheckCircle className="w-5 h-5" />}
          {syncStatus === "error" && <AlertCircle className="w-5 h-5" />}
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Painel de Controle */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Sincronização com Google Calendar</h2>
              <p className="text-sm text-gray-600">Última sincronização automática: agora</p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncStatus === "syncing"}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
              Sincronizar Agora
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-4 mb-6 border-b">
          {(["calendario", "agendamentos", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTabAtivo(tab)}
              className={`px-4 py-2 font-medium border-b-2 ${
                tabAtivo === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab === "calendario" && "Calendário"}
              {tab === "agendamentos" && "Agendamentos"}
              {tab === "logs" && "Logs"}
            </button>
          ))}
        </div>

        {/* Conteúdo das Abas */}
        {tabAtivo === "calendario" && (
          <CalendarView
            slots={slots}
            agendamentos={agendamentos}
            onCreateSlot={handleCreateSlot}
            onEditSlot={(slot) => console.log("Edit slot:", slot)}
            onDeleteSlot={handleDeleteSlot}
          />
        )}

        {tabAtivo === "agendamentos" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Agendamentos</h2>
            <AgendamentosList
              agendamentos={agendamentos}
              onUpdatePresenca={handleUpdatePresenca}
              onCancelAgendamento={handleCancelAgendamento}
              isLoading={agendamentosLoading}
            />
          </div>
        )}

        {tabAtivo === "logs" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Logs de Operações</h2>
            <p className="text-gray-600">Logs de sincronização e auditoria (em desenvolvimento)</p>
          </div>
        )}
      </div>
    </div>
  );
}
