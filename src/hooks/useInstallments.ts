import { useState, useEffect, useCallback } from 'react';
import type { InstallmentPlan, Installment, CardProvider } from '@/types';
import { installmentService } from '@/services/installmentService';

export function useInstallments() {
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const data = await installmentService.getAll();
    setPlans(data);
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const getByProvider = useCallback(
    (provider: CardProvider) => plans.filter((p) => p.provider === provider),
    [plans]
  );

  const create = useCallback(
    async (data: Parameters<typeof installmentService.create>[0]) => {
      await installmentService.create(data);
      await refresh();
    },
    [refresh]
  );

  const update = useCallback(
    async (
      id: string,
      data: Partial<Omit<InstallmentPlan, 'installments'>> & { installments?: Omit<Installment, 'id'>[] },
    ) => {
      await installmentService.update(id, data);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await installmentService.delete(id);
      await refresh();
    },
    [refresh]
  );

  const toggleInstallment = useCallback(
    async (planId: string, installmentId: string) => {
      await installmentService.toggleInstallment(planId, installmentId);
      await refresh(true);
    },
    [refresh]
  );

  return { plans, loading, refresh, getByProvider, create, update, remove, toggleInstallment };
}
