import { useState, useEffect } from "react";
import { ClassEntry } from "@/lib/schedule-data";

const STORAGE_KEY = "uni-schedule-templates";
const MAX_TEMPLATES = 3;

export interface ScheduleTemplate {
  id: string;
  name: string;
  classes: ClassEntry[];
  savedAt: string;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }, [templates]);

  const saveTemplate = (name: string, classes: ClassEntry[]): boolean => {
    if (templates.length >= MAX_TEMPLATES) return false;
    const template: ScheduleTemplate = {
      id: crypto.randomUUID(),
      name,
      classes: JSON.parse(JSON.stringify(classes)),
      savedAt: new Date().toISOString(),
    };
    setTemplates((prev) => [...prev, template]);
    return true;
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return { templates, saveTemplate, deleteTemplate, maxTemplates: MAX_TEMPLATES };
}
