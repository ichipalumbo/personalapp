import { useState, useEffect, useCallback } from "react";
import { Slot, SlotStatus } from "../types";
import { apiClient } from "../services/apiClient";

interface UseSlotsReturn {
  slots: Slot[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSlot: (slot: Omit<Slot, "slotId" | "criadoEm" | "atualizadoEm">) => Promise<string>;
  updateSlot: (slotId: string, updates: Partial<Slot>) => Promise<void>;
  deleteSlot: (slotId: string) => Promise<void>;
}

export function useSlots(month?: string): UseSlotsReturn {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.getSlots(month);
      setSlots(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar slots";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createSlot = useCallback(
    async (slot: Omit<Slot, "slotId" | "criadoEm" | "atualizadoEm">) => {
      try {
        const result = await apiClient.createSlot(slot);
        await refetch();
        return result.slotId;
      } catch (err) {
        throw err;
      }
    },
    [refetch]
  );

  const updateSlot = useCallback(
    async (slotId: string, updates: Partial<Slot>) => {
      try {
        await apiClient.updateSlot(slotId, updates);
        await refetch();
      } catch (err) {
        throw err;
      }
    },
    [refetch]
  );

  const deleteSlot = useCallback(
    async (slotId: string) => {
      try {
        await apiClient.deleteSlot(slotId);
        await refetch();
      } catch (err) {
        throw err;
      }
    },
    [refetch]
  );

  return {
    slots,
    isLoading,
    error,
    refetch,
    createSlot,
    updateSlot,
    deleteSlot
  };
}
