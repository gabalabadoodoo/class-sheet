import { useState, useEffect, useCallback } from "react";
import { ClassEntry } from "@/lib/schedule-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MAX_TEMPLATES = 3;

export interface ScheduleTemplate {
  id: string;
  name: string;
  classes: ClassEntry[];
  savedAt: string;
}

interface DbTemplate {
  id: string;
  name: string;
  classes: ClassEntry[];
  saved_at: string;
}

export function useTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);

  useEffect(() => {
    if (!user) {
      setTemplates([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("schedule_templates")
        .select("*")
        .order("saved_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load templates");
        return;
      }
      setTemplates((data as unknown as DbTemplate[]).map((t) => ({
        id: t.id,
        name: t.name,
        classes: t.classes,
        savedAt: t.saved_at,
      })));
    })();
    return () => { cancelled = true; };
  }, [user]);

  const saveTemplate = useCallback((name: string, classes: ClassEntry[]): boolean => {
    if (!user) return false;
    if (templates.length >= MAX_TEMPLATES) return false;

    // Fire-and-forget so the UI feels snappy; show errors via toast if it fails
    (async () => {
      const { data, error } = await supabase
        .from("schedule_templates")
        .insert({
          user_id: user.id,
          name,
          classes: JSON.parse(JSON.stringify(classes)) as any,
        })
        .select("*")
        .single();
      if (error) {
        toast.error("Failed to save template");
        return;
      }
      const t = data as unknown as DbTemplate;
      setTemplates((prev) => [...prev, { id: t.id, name: t.name, classes: t.classes, savedAt: t.saved_at }]);
    })();
    return true;
  }, [user, templates.length]);

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase.from("schedule_templates").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete template");
      return;
    }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { templates, saveTemplate, deleteTemplate, maxTemplates: MAX_TEMPLATES };
}
