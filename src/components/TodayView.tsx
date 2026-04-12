import { useState, useEffect } from "react";
import { ClassEntry, DAYS, DayOfWeek, parseTime, getClassColor } from "@/lib/schedule-data";
import { MapPin, Clock, Wifi } from "lucide-react";

interface TodayViewProps {
  classes: ClassEntry[];
  onEdit: (entry: ClassEntry) => void;
  editMode: boolean;
}

function getCurrentDayOfWeek(): DayOfWeek | null {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon...
  const map: Record<number, DayOfWeek> = {
    1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY", 4: "THURSDAY", 5: "FRIDAY", 6: "SATURDAY",
  };
  return map[jsDay] || null;
}

function getCurrentTimeDecimal(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

export function TodayView({ classes, onEdit, editMode }: TodayViewProps) {
  const [now, setNow] = useState(getCurrentTimeDecimal);
  const today = getCurrentDayOfWeek();

  useEffect(() => {
    const interval = setInterval(() => setNow(getCurrentTimeDecimal()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const todayClasses = classes
    .filter((c) => c.day === today)
    .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

  const getStatus = (entry: ClassEntry) => {
    const start = parseTime(entry.startTime);
    const end = parseTime(entry.endTime);
    if (now < start) return "upcoming";
    if (now >= start && now < end) return "active";
    return "done";
  };

  if (!today) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-4xl mb-3">🎉</p>
        <p className="text-lg font-semibold text-foreground">No classes today!</p>
        <p className="text-sm text-muted-foreground mt-1">Enjoy your weekend.</p>
      </div>
    );
  }

  if (todayClasses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-4xl mb-3">✨</p>
        <p className="text-lg font-semibold text-foreground">Free day!</p>
        <p className="text-sm text-muted-foreground mt-1">
          No classes scheduled for {today.charAt(0) + today.slice(1).toLowerCase()}.
        </p>
      </div>
    );
  }

  const formatNow = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="space-y-3">
      {/* Day header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-foreground">
          {today.charAt(0) + today.slice(1).toLowerCase()}
        </h2>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> {formatNow()}
        </span>
      </div>

      {/* Class cards */}
      <div className="space-y-2">
        {todayClasses.map((entry) => {
          const status = getStatus(entry);
          const color = getClassColor(entry.className);
          const isOnline = entry.location === "ONLINE";

          return (
            <div
              key={entry.id}
              onClick={() => editMode && onEdit(entry)}
              className={`w-full text-left rounded-xl p-3 transition-all border ${
                editMode ? "cursor-pointer" : "cursor-default"
              } ${
                status === "active"
                  ? "border-primary/40 bg-primary/5 shadow-md ring-2 ring-primary/20"
                  : status === "done"
                  ? "border-border bg-muted/40 opacity-60"
                  : "border-border bg-card hover:bg-accent/50"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Color bar */}
                <div
                  className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
                  style={{ backgroundColor: color }}
                />

                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {entry.className}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {entry.classId}
                      </span>
                    </div>
                    {status === "active" && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                        Now
                      </span>
                    )}
                    {status === "done" && (
                      <span className="text-[10px] text-muted-foreground shrink-0">Done</span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {entry.startTime} – {entry.endTime}
                    </span>
                    <span className="flex items-center gap-1">
                      {isOnline ? <Wifi className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                      {entry.location}
                    </span>
                    <span className="text-[10px] font-mono">{entry.section}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
