import React, { useState, useEffect } from "react";
import { Slot, Agendamento, PresencaStatus } from "../types";
import { CheckCircle, XCircle, RefreshCw, Eye, Edit2, Trash2 } from "lucide-react";
import { apiClient } from "../services/apiClient";

interface AgendamentosListProps {
  agendamentos: Agendamento[];
  onUpdatePresenca: (agendId: string, status: PresencaStatus) => Promise<void>;
  onCancelAgendamento: (agendId: string) => Promise<void>;
  isLoading?: boolean;
}

export function AgendamentosList({
  agendamentos,
  onUpdatePresenca,
  onCancelAgendamento,
  isLoading = false
}: AgendamentosListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handlePresenca = async (agendId: string, status: PresencaStatus) => {
    setUpdatingId(agendId);
    try {
      await onUpdatePresenca(agendId, status);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancel = async (agendId: string) => {
    if (confirm("Tem certeza que deseja cancelar este agendamento?")) {
      setUpdatingId(agendId);
      try {
        await onCancelAgendamento(agendId);
      } finally {
        setUpdatingId(null);
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Carregando agendamentos...</div>;
  }

  if (agendamentos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhum agendamento encontrado
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {agendamentos.map((agend) => (
        <div key={agend.agendId} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-semibold text-gray-800">
                {agend.nomeAluno || agend.alunoId}
              </div>
              <div className="text-sm text-gray-600">
                {agend.emailAluno}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ID: {agend.agendId} | Slot: {agend.slotId}
              </div>
            </div>

            <div className="flex gap-2">
              {agend.statusPresenca ? (
                <span
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    agend.statusPresenca === "Compareceu"
                      ? "bg-green-100 text-green-700"
                      : agend.statusPresenca === "Faltou"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {agend.statusPresenca}
                </span>
              ) : (
                <span className="px-3 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                  Pendente
                </span>
              )}

              <button
                onClick={() => setExpandedId(expandedId === agend.agendId ? null : agend.agendId)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>

          {expandedId === agend.agendId && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marcar Presença
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePresenca(agend.agendId, PresencaStatus.COMPARECEU)}
                    disabled={updatingId === agend.agendId}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Compareceu
                  </button>
                  <button
                    onClick={() => handlePresenca(agend.agendId, PresencaStatus.FALTOU)}
                    disabled={updatingId === agend.agendId}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 text-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    Faltou
                  </button>
                </div>
              </div>

              {agend.notas && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <p className="text-sm text-gray-600">{agend.notas}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={() => handleCancel(agend.agendId)}
                  disabled={updatingId === agend.agendId}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:bg-gray-300 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
