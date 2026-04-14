import { useState, useEffect } from "react";
import { ClassEntry, parseTime, getClassColor, DayOfWeek } from "@/lib/schedule-data";
import { Clock, MapPin, Wifi, Timer } from "lucide-react";

interface CountdownCardProps {
  classes: ClassEntry[];
}

function getCurrentDayOfWeek(): DayOfWeek | null {
  const jsDay = new Date().getDay();
  const map: Record<number, DayOfWeek> = {
    1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY", 4: "THURSDAY", 5: "FRIDAY", 6: "SATURDAY",
  };
  return map[jsDay] || null;
}

function getSecondsUntil(targetDecimal: number): number {
  const now = new Date();
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const targetSeconds = targetDecimal * 3600;
  return Math.max(0, Math.floor(targetSeconds - nowSeconds));
}

function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function CountdownCard({ classes }: CountdownCardProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const today = getCurrentDayOfWeek();
  if (!today) return null;

  const now = new Date();
  const nowDecimal = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

  const todayClasses = classes
    .filter((c) => c.day === today)
    .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

  if (todayClasses.length === 0) return null;

  // Find current or next class
  const activeClass = todayClasses.find((c) => {
    const start = parseTime(c.startTime);
    const end = parseTime(c.endTime);
    return nowDecimal >= start && nowDecimal < end;
  });

  const nextClass = todayClasses.find((c) => parseTime(c.startTime) > nowDecimal);

  if (!activeClass && !nextClass) {
    // All classes done
    return (
      <div className="rounded-xl border border-border bg-card p-3 text-center">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Timer className="h-3.5 w-3.5" /> All classes done for today! 🎉
        </p>
      </div>
    );
  }

  if (activeClass) {
    const end = parseTime(activeClass.endTime);
    const remainingSeconds = getSecondsUntil(end);
    const color = getClassColor(activeClass.className);
    const isOnline = activeClass.location === "ONLINE";

    return (
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">In Progress</span>
          <span className="text-sm font-bold text-primary font-mono">{formatCountdown(remainingSeconds)} left</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: color }} />
          <div>
            <p className="text-sm font-semibold text-foreground">{activeClass.className}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {isOnline ? <Wifi className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
              {activeClass.location} · {activeClass.section} · {activeClass.startTime} – {activeClass.endTime}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Next class countdown
  const start = parseTime(nextClass!.startTime);
  const secondsUntil = getSecondsUntil(start);
  const color = getClassColor(nextClass!.className);
  const isOnline = nextClass!.location === "ONLINE";

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Next Class</span>
        <span className="text-sm font-bold text-foreground font-mono">{formatCountdown(secondsUntil)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: color }} />
        <div>
          <p className="text-sm font-semibold text-foreground">{nextClass!.className}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
            {nextClass!.location} · {nextClass!.section} · {nextClass!.startTime} – {nextClass!.endTime}
          </p>
        </div>
      </div>
    </div>
  );
}
