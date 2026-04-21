import { useState, useEffect, useCallback, useRef } from "react";
import { ClassEntry, parseTime, DayOfWeek } from "@/lib/schedule-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationSettings {
  enabled: boolean;
  minutesBefore: number;
}

const DEFAULTS: NotificationSettings = { enabled: false, minutesBefore: 10 };

function getCurrentDayOfWeek(): DayOfWeek | null {
  const jsDay = new Date().getDay();
  const map: Record<number, DayOfWeek> = {
    1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY", 4: "THURSDAY", 5: "FRIDAY", 6: "SATURDAY",
  };
  return map[jsDay] || null;
}

export function useNotifications(classes: ClassEntry[]) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULTS);
  const firedRef = useRef<Set<string>>(new Set());

  // Load settings from cloud
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("notifications_enabled, minutes_before")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setSettings({
        enabled: data.notifications_enabled,
        minutesBefore: data.minutes_before,
      });
    })();
    return () => { cancelled = true; };
  }, [user]);

  const persist = useCallback(async (s: NotificationSettings) => {
    setSettings(s);
    if (!user) return;
    await supabase.from("user_settings").upsert({
      user_id: user.id,
      notifications_enabled: s.enabled,
      minutes_before: s.minutesBefore,
    });
  }, [user]);

  const toggleEnabled = useCallback(async () => {
    if (!settings.enabled) {
      if (!("Notification" in window)) {
        alert("This browser does not support notifications.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await persist({ ...settings, enabled: true });
      } else {
        alert("Notification permission denied. Please enable it in your browser settings.");
      }
    } else {
      await persist({ ...settings, enabled: false });
    }
  }, [settings, persist]);

  const setMinutesBefore = useCallback((mins: number) => {
    persist({ ...settings, minutesBefore: mins });
  }, [settings, persist]);

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
