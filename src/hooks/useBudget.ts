import { useState, useEffect, useCallback } from 'react';
import type { BudgetItem, MonthBE, Baht } from '@/types';
import { budgetService } from '@/services/budgetService';

const CURRENT_YEAR_BE = new Date().getFullYear() + 543;

export function useBudget() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(CURRENT_YEAR_BE);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await budgetService.getAll(year);
    setItems(data);
    setLoading(false);
  }, [year]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(
    async (data: Omit<BudgetItem, 'id'>) => {
      await budgetService.create(data, year);
      await refresh();
    },
    [refresh, year]
  );

  const update = useCallback(
    async (id: string, data: Partial<BudgetItem>) => {
      await budgetService.update(id, data, year);
      await refresh();
    },
    [refresh, year]
  );

  const updateMonthlyValue = useCallback(
    async (id: string, month: MonthBE, value: Baht) => {
      await budgetService.updateMonthlyValue(id, month, value, year);
      await refresh();
    },
    [refresh, year]
  );

  const remove = useCallback(
    async (id: string) => {
      await budgetService.delete(id);
      await refresh();
    },
    [refresh]
  );

  return { items, loading, year, setYear, refresh, create, update, updateMonthlyValue, remove };
}
