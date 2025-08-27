import { useEffect, useState } from "react";
import type { ItemRow, LessonRow } from "../constants/types";
import { supabase } from "../services/supabase";

export function useLesson(lessonId: string) {
  const [lesson, setLesson] = useState<LessonRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data: lessonData, error: le } = await supabase
          .from("lessons")
          .select("*")
          .eq("id", lessonId)
          .single();
        if (le) throw le;
        const { data: itemData, error: ie } = await supabase
          .from("items")
          .select("*")
          .eq("lesson_id", lessonId)
          .order("id");
        if (ie) throw ie;
        if (!mounted) return;
        setLesson(lessonData as LessonRow);
        setItems((itemData || []) as ItemRow[]);
      } catch (e: any) {
        setErr(e.message ?? "Failed to load lesson");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lessonId]);

  return { lesson, items, loading, err };
}
