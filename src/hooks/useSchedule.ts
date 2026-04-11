import { useState, useEffect } from "react";
import { ClassEntry, DEFAULT_SCHEDULE } from "@/lib/schedule-data";

const STORAGE_KEY = "uni-schedule";

export function useSchedule() {
  const [classes, setClasses] = useState<ClassEntry[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_SCHEDULE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
  }, [classes]);

  const addClass = (entry: Omit<ClassEntry, "id">) => {
    setClasses((prev) => [...prev, { ...entry, id: crypto.randomUUID() }]);
  };

  const updateClass = (id: string, entry: Omit<ClassEntry, "id">) => {
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...entry, id } : c)));
  };

  const deleteClass = (id: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
  };

  const resetSchedule = () => {
    setClasses(DEFAULT_SCHEDULE);
  };

  const clearSchedule = () => {
    setClasses([]);
  };

  return { classes, addClass, updateClass, deleteClass, resetSchedule, clearSchedule };
}
