import React, { useState } from "react";
import { Slot, Agendamento } from "../types";
import { Calendar, Plus, MoreVertical, Trash2, Edit2 } from "lucide-react";

interface CalendarViewProps {
  slots: Slot[];
  agendamentos: Agendamento[];
  onCreateSlot: () => void;
  onEditSlot: (slot: Slot) => void;
  onDeleteSlot: (slotId: string) => void;
}

export function CalendarView({ slots, agendamentos, onCreateSlot, onEditSlot, onDeleteSlot }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const getSlotsForDate = (dateStr: string) => {
    return slots.filter((slot) => slot.data === dateStr);
  };

  // Renderizar visualização de mês
  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDay = getFirstDayOfMonth(selectedDate);
    const days = [];

    // Dias vazios no início
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-gray-50"></div>);
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const dateStr = formatDate(date);
      const daySlotsAgendados = getSlotsForDate(dateStr);
      const isToday = dateStr === formatDate(new Date());

      days.push(
        <div
          key={day}
          className={`p-2 min-h-24 border ${isToday ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"}`}
        >
          <div className={`text-sm font-semibold ${isToday ? "text-blue-600" : "text-gray-700"}`}>
            {day}
          </div>
          <div className="mt-1 space-y-1">
            {daySlotsAgendados.slice(0, 2).map((slot) => (
              <div
                key={slot.slotId}
                className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded truncate"
                title={`${slot.horaInicio} - ${slot.tipo}`}
              >
                {slot.horaInicio}
              </div>
            ))}
            {daySlotsAgendados.length > 2 && (
              <div className="text-xs text-gray-500">+{daySlotsAgendados.length - 2} mais</div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const monthName = selectedDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            {monthName}
          </h2>
          <button
            onClick={onCreateSlot}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Novo Slot
          </button>
        </div>

        <div className="flex gap-2">
          {(["month", "week", "day"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded text-sm font-medium capitalize ${
                viewMode === mode ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              {mode === "month" ? "Mês" : mode === "week" ? "Semana" : "Dia"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        {viewMode === "month" && (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div key={day} className="text-center font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 border rounded-lg overflow-hidden">
              {renderMonthView()}
            </div>
          </div>
        )}

        {(viewMode === "week" || viewMode === "day") && (
          <div className="p-4">
            <div className="text-center text-gray-500 py-8">
              Visualização de {viewMode === "week" ? "semana" : "dia"} em desenvolvimento
            </div>
          </div>
        )}
      </div>

      {/* Lista de slots */}
      <div className="border-t">
        <div className="p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Próximos Slots</h3>
          {slots.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum slot agendado</p>
          ) : (
            <div className="space-y-2">
              {slots.slice(0, 5).map((slot) => (
                <div
                  key={slot.slotId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-800">
                      {slot.data} às {slot.horaInicio}
                    </div>
                    <div className="text-sm text-gray-600">
                      {slot.tipo} - {slot.duracao}min
                      {slot.alunoAlocado && ` - Aluno: ${slot.alunoAlocado}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditSlot(slot)}
                      className="p-2 hover:bg-gray-200 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteSlot(slot.slotId)}
                      className="p-2 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
