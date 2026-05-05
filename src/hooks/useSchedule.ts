import { useState, useEffect, useCallback } from "react";
import { ClassEntry, DayOfWeek, DEFAULT_SCHEDULE } from "@/lib/schedule-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface DbClass {
  id: string;
  user_id: string;
  class_name: string;
  class_id: string;
  section: string;
  day: string;
  start_time: string;
  end_time: string;
  location: string;
  meeting_link: string | null;
  color: string | null;
}

const SEEDED_KEY = "uni-schedule-seeded";

function rowToEntry(row: DbClass): ClassEntry {
  return {
    id: row.id,
    className: row.class_name,
    classId: row.class_id,
    section: row.section ?? "",
    day: row.day as DayOfWeek,
    location: row.location,
    startTime: row.start_time,
    endTime: row.end_time,
    meetingLink: row.meeting_link ?? undefined,
  };
}

function entryToRow(entry: Omit<ClassEntry, "id">, userId: string) {
  return {
    user_id: userId,
    class_name: entry.className,
    class_id: entry.classId,
    section: entry.section || "TS21",
    day: entry.day,
    start_time: entry.startTime,
    end_time: entry.endTime,
    location: entry.location,
    meeting_link: entry.meetingLink ?? null,
  };
}

export function useSchedule() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Failed to load schedule");
      return;
    }
    setClasses((data as DbClass[]).map(rowToEntry));
  }, [user]);

  // Initial load + first-time seed
  useEffect(() => {
    if (!user) {
      setClasses([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load schedule");
        setLoading(false);
        return;
      }
      const rows = data as DbClass[];
      const seedKey = `${SEEDED_KEY}-${user.id}`;
      if (rows.length === 0 && !localStorage.getItem(seedKey)) {
        // Seed defaults for this user once
        const payload = DEFAULT_SCHEDULE.map((c) => entryToRow(c, user.id));
        const { data: inserted, error: insErr } = await supabase
          .from("classes")
          .insert(payload)
          .select("*");
        if (!insErr && inserted) {
          setClasses((inserted as DbClass[]).map(rowToEntry));
          localStorage.setItem(seedKey, "1");
        }
      } else {
        setClasses(rows.map(rowToEntry));
        if (rows.length > 0) localStorage.setItem(seedKey, "1");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const addClass = useCallback(async (entry: Omit<ClassEntry, "id">) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("classes")
      .insert(entryToRow(entry, user.id))
      .select("*")
      .single();
    if (error) {
      toast.error("Failed to add class");
      return;
    }
    setClasses((prev) => [...prev, rowToEntry(data as DbClass)]);
  }, [user]);

  const updateClass = useCallback(async (id: string, entry: Omit<ClassEntry, "id">) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("classes")
      .update(entryToRow(entry, user.id))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      toast.error("Failed to update class");
      return;
    }
    setClasses((prev) => prev.map((c) => (c.id === id ? rowToEntry(data as DbClass) : c)));
  }, [user]);

  const deleteClass = useCallback(async (id: string) => {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete class");
      return;
    }
    setClasses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearSchedule = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from("classes").delete().eq("user_id", user.id);
    if (error) {
      toast.error("Failed to clear schedule");
      return;
    }
    setClasses([]);
  }, [user]);

  const resetSchedule = useCallback(async () => {
    if (!user) return;
    await supabase.from("classes").delete().eq("user_id", user.id);
    const payload = DEFAULT_SCHEDULE.map((c) => entryToRow(c, user.id));
    const { data, error } = await supabase.from("classes").insert(payload).select("*");
    if (error) {
      toast.error("Failed to reset schedule");
      return;
    }
    setClasses((data as DbClass[]).map(rowToEntry));
  }, [user]);

  return { classes, loading, addClass, updateClass, deleteClass, resetSchedule, clearSchedule, refresh: fetchClasses };
}
