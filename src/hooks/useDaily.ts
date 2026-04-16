import { useCallback, useEffect, useState } from 'react';
import type { DailyCategoryStat, DailyEntry } from '@/types';
import { dailyService, type CreateDailyInput } from '@/services/dailyService';

export function useDaily() {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [categories, setCategories] = useState<DailyCategoryStat[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [list, cats] = await Promise.all([dailyService.list(), dailyService.categories()]);
    setEntries(list);
    setCategories(cats);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateDailyInput) => {
      await dailyService.create(input);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await dailyService.remove(id);
      await refresh();
    },
    [refresh],
  );

  return { entries, categories, loading, create, remove, refresh };
}
