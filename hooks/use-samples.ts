import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

/**
 * Hook for managing samples (inventory items) with real-time sync across all employees
 * All employees see the same data from the cloud database
 */
export function useSamples() {
  // Fetch all samples - shared across all employees
  const utils = trpc.useContext();
  const {
    data: samples = [],
    isLoading,
    error,
    refetch,
  } = trpc.samples.list.useQuery(undefined, {
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    staleTime: 2000, // Data is considered fresh for 2 seconds
  });

  // Create new sample
  const createMutation = trpc.samples.create.useMutation({
    onSuccess: () => {
      utils.samples.list.invalidate();
    },
  });

  // Update sample
  const updateMutation = trpc.samples.update.useMutation({
    onSuccess: () => {
      utils.samples.list.invalidate();
    },
  });

  // Delete sample
  const deleteMutation = trpc.samples.delete.useMutation({
    onSuccess: () => {
      utils.samples.list.invalidate();
    },
  });

  // Create sample handler
  const createSample = useCallback(
    async (data: {
      id: string;
      code: string;
      name: string;
      species: "TOPAZ" | "PLACCO";
      category: string;
      size: string;
      finish: string;
      location: string;
      quantity?: number;
      minimumQuantity?: number;
      notes?: string;
      photoUri?: string;
    }) => {
      try {
        await createMutation.mutateAsync({
          ...data,
          userId: 0, // Will be set by backend
          quantity: data.quantity ?? 0,
          minimumQuantity: data.minimumQuantity ?? 5,
        });
        return true;
      } catch (err) {
        console.error("[useSamples] Create failed:", err);
        return false;
      }
    },
    [createMutation]
  );

  // Update sample handler
  const updateSample = useCallback(
    async (id: string, updates: Partial<any>) => {
      try {
        await updateMutation.mutateAsync({
          id,
          ...updates,
        });
        return true;
      } catch (err) {
        console.error("[useSamples] Update failed:", err);
        return false;
      }
    },
    [updateMutation]
  );

  // Delete sample handler
  const deleteSample = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync({ id });
        return true;
      } catch (err) {
        console.error("[useSamples] Delete failed:", err);
        return false;
      }
    },
    [deleteMutation]
  );

  return {
    samples,
    isLoading,
    error,
    refetch,
    createSample,
    updateSample,
    deleteSample,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for managing movements (stock tracking)
 */
export function useMovements() {
  const utils = trpc.useContext();
  const {
    data: movements = [],
    isLoading,
    error,
    refetch,
  } = trpc.movements.list.useQuery(undefined, {
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    staleTime: 2000,
  });

  const createMutation = trpc.movements.create.useMutation({
    onSuccess: () => {
      utils.movements.list.invalidate();
    },
  });

  const createMovement = useCallback(
    async (data: {
      id: string;
      sampleId: string;
      sampleName: string;
      type: "in" | "out" | "count" | "gönderim";
      quantityDelta: number;
      resultingQuantity: number;
      note?: string;
    }) => {
      try {
        await createMutation.mutateAsync({
          ...data,
          userId: 0, // Will be set by backend
        });
        return true;
      } catch (err) {
        console.error("[useMovements] Create failed:", err);
        return false;
      }
    },
    [createMutation]
  );

  return {
    movements,
    isLoading,
    error,
    refetch,
    createMovement,
    isCreating: createMutation.isPending,
  };
}

/**
 * Hook for managing shipments
 */
export function useShipments() {
  const utils = trpc.useContext();
  const {
    data: shipments = [],
    isLoading,
    error,
    refetch,
  } = trpc.shipments.list.useQuery(undefined, {
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    staleTime: 2000,
  });

  const createMutation = trpc.shipments.create.useMutation({
    onSuccess: () => {
      utils.shipments.list.invalidate();
    },
  });

  const createShipment = useCallback(
    async (data: {
      id: string;
      sampleIds: string;
      employeeName: string;
      customerName: string;
      quantity: number;
      note?: string;
    }) => {
      try {
        await createMutation.mutateAsync({
          ...data,
          userId: 0, // Will be set by backend
        });
        return true;
      } catch (err) {
        console.error("[useShipments] Create failed:", err);
        return false;
      }
    },
    [createMutation]
  );

  return {
    shipments,
    isLoading,
    error,
    refetch,
    createShipment,
    isCreating: createMutation.isPending,
  };
}
