import { useState, useEffect, useCallback, useRef } from "react";
import { ClassEntry, parseTime, DAYS, DayOfWeek } from "@/lib/schedule-data";

interface NotificationSettings {
  enabled: boolean;
  minutesBefore: number;
}

const STORAGE_KEY = "schedule-notifications";

function getSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { enabled: false, minutesBefore: 10 };
}

function getCurrentDayOfWeek(): DayOfWeek | null {
  const jsDay = new Date().getDay();
  const map: Record<number, DayOfWeek> = {
    1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY", 4: "THURSDAY", 5: "FRIDAY", 6: "SATURDAY",
  };
  return map[jsDay] || null;
}

export function useNotifications(classes: ClassEntry[]) {
  const [settings, setSettings] = useState<NotificationSettings>(getSettings);
  const firedRef = useRef<Set<string>>(new Set());

  const saveSettings = (s: NotificationSettings) => {
    setSettings(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  };

  const toggleEnabled = useCallback(async () => {
    if (!settings.enabled) {
      if (!("Notification" in window)) {
        alert("This browser does not support notifications.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        saveSettings({ ...settings, enabled: true });
      } else {
        alert("Notification permission denied. Please enable it in your browser settings.");
      }
    } else {
      saveSettings({ ...settings, enabled: false });
    }
  }, [settings]);

  const setMinutesBefore = useCallback((mins: number) => {
    saveSettings({ ...settings, minutesBefore: mins });
  }, [settings]);

  useEffect(() => {
    if (!settings.enabled) return;

    const check = () => {
      const today = getCurrentDayOfWeek();
      if (!today) return;

      const now = new Date();
      const nowDecimal = now.getHours() + now.getMinutes() / 60;
      const dateKey = now.toDateString();

      const todayClasses = classes.filter((c) => c.day === today);

      todayClasses.forEach((c) => {
        const start = parseTime(c.startTime);
        const diffMinutes = (start - nowDecimal) * 60;
        const key = `${c.id}-${dateKey}`;

        if (diffMinutes > 0 && diffMinutes <= settings.minutesBefore && !firedRef.current.has(key)) {
          firedRef.current.add(key);
          new Notification(`📚 ${c.className} starts in ${Math.round(diffMinutes)} min`, {
            body: `${c.startTime} — ${c.location}`,
            icon: "📚",
          });
        }
      });
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [settings, classes]);

  return { settings, toggleEnabled, setMinutesBefore };
}
