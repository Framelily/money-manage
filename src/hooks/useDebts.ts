import { useState, useEffect, useCallback } from 'react';
import type { PersonDebt } from '@/types';
import { debtService } from '@/services/debtService';

export function useDebts() {
  const [debts, setDebts] = useState<PersonDebt[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await debtService.getAll();
    setDebts(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(
    async (data: Parameters<typeof debtService.create>[0]) => {
      await debtService.create(data);
      await refresh();
    },
    [refresh]
  );

  const update = useCallback(
    async (id: string, data: Partial<PersonDebt>) => {
      await debtService.update(id, data);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await debtService.delete(id);
      await refresh();
    },
    [refresh]
  );

  const recordPayment = useCallback(
    async (debtId: string, amount: number, note?: string) => {
      await debtService.recordPayment(debtId, amount, note);
      await refresh();
    },
    [refresh]
  );

  return { debts, loading, refresh, create, update, remove, recordPayment };
}
