import { useCallback, useEffect, useState } from "react";
import {
  getTodayFocus,
  setDailyGoal as setDailyGoalApi,
  type DailyFocus,
} from "@/lib/focusStats";

export function useFocusStats() {
  const [today, setToday] = useState<DailyFocus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getTodayFocus();
    setToday(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setDailyGoal = useCallback(
    async (minutes: number) => {
      setSaving(true);
      await setDailyGoalApi(minutes);
      await refresh();
      setSaving(false);
    },
    [refresh]
  );

  return { today, loading, saving, refresh, setDailyGoal };
}
