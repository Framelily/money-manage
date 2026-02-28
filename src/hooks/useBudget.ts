import { useState, useEffect, useCallback } from 'react';
import type { BudgetItem, MonthBE, Baht } from '@/types';
import { budgetService } from '@/services/budgetService';

export function useBudget() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await budgetService.getAll();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(
    async (data: Omit<BudgetItem, 'id'>) => {
      await budgetService.create(data);
      await refresh();
    },
    [refresh]
  );

  const update = useCallback(
    async (id: string, data: Partial<BudgetItem>) => {
      await budgetService.update(id, data);
      await refresh();
    },
    [refresh]
  );

  const updateMonthlyValue = useCallback(
    async (id: string, month: MonthBE, value: Baht) => {
      await budgetService.updateMonthlyValue(id, month, value);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await budgetService.delete(id);
      await refresh();
    },
    [refresh]
  );

  return { items, loading, refresh, create, update, updateMonthlyValue, remove };
}
