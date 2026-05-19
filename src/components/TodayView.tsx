import { useState, useEffect } from "react";
import { ClassEntry, DAYS, DayOfWeek, parseTime, getClassColor } from "@/lib/schedule-data";
import { MapPin, Clock, Wifi, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountdownCard } from "@/components/CountdownCard";

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

function getTomorrowDayOfWeek(): DayOfWeek | null {
  const jsDay = (new Date().getDay() + 1) % 7;
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
  const tomorrow = getTomorrowDayOfWeek();

  useEffect(() => {
    const interval = setInterval(() => setNow(getCurrentTimeDecimal()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const todayClasses = classes
    .filter((c) => c.day === today)
    .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

  const tomorrowClasses = classes
    .filter((c) => c.day === tomorrow)
    .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

  const getStatus = (entry: ClassEntry) => {
    const start = parseTime(entry.startTime);
    const end = parseTime(entry.endTime);
    if (now < start) return "upcoming";
    if (now >= start && now < end) return "active";
    return "done";
  };

  const formatNow = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

  const renderClassCard = (entry: ClassEntry, opts: { preview?: boolean } = {}) => {
    const status = opts.preview ? "upcoming" : getStatus(entry);
    const color = getClassColor(entry.className);
    const isOnline = entry.location === "ONLINE";

    return (
      <div
        key={entry.id}
        onClick={() => editMode && onEdit(entry)}
        className={`w-full text-left rounded-xl p-3 transition-all border ${
          editMode ? "cursor-pointer" : "cursor-default"
        } ${
          opts.preview
            ? "border-dashed border-border bg-muted/20"
            : status === "active"
            ? "border-primary/40 bg-primary/5 shadow-md ring-2 ring-primary/20"
            : status === "done"
            ? "border-border bg-muted/40 opacity-60"
            : "border-border bg-card hover:bg-accent/50"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
            style={{ backgroundColor: color, opacity: opts.preview ? 0.5 : 1 }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm text-foreground truncate">
                  {entry.className}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {entry.classId} - {entry.section || "TS21"}
                </span>
              </div>
              {!opts.preview && status === "active" && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                  Now
                </span>
              )}
              {!opts.preview && status === "done" && (
                <span className="text-[10px] text-muted-foreground shrink-0">Done</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {entry.startTime} – {entry.endTime}
              </span>
              <span className="flex items-center gap-1">
                {isOnline ? <Wifi className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                {entry.location}
              </span>
            </div>

            {!opts.preview && isOnline && (
              <div className="mt-2">
                {entry.meetingLink ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 px-2.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(entry.meetingLink, "_blank");
                    }}
                  >
                    <ExternalLink className="h-3 w-3" /> Join Link
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 px-2.5 opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <ExternalLink className="h-3 w-3" /> Link Unavailable
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Countdown card */}
      <CountdownCard classes={classes} />

      {/* Today section */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-foreground">
          {today ? titleCase(today) : "Today"}
        </h2>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" /> {formatNow()}
        </span>
      </div>

      {!today ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-sm font-semibold text-foreground">No classes today!</p>
          <p className="text-xs text-muted-foreground mt-1">Enjoy your weekend.</p>
        </div>
      ) : todayClasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-3xl mb-2">✨</p>
          <p className="text-sm font-semibold text-foreground">Free day!</p>
          <p className="text-xs text-muted-foreground mt-1">
            No classes scheduled for {titleCase(today)}.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {todayClasses.map((entry) => renderClassCard(entry))}
        </div>
      )}

      {/* Tomorrow preview */}
      {tomorrow && (
        <div className="pt-2">
          <div className="flex items-center justify-between px-1 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tomorrow · {titleCase(tomorrow)}
            </h3>
            <span className="text-[10px] text-muted-foreground">
              {tomorrowClasses.length} {tomorrowClasses.length === 1 ? "class" : "classes"}
            </span>
          </div>
          {tomorrowClasses.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-3 text-center border border-dashed border-border rounded-xl bg-muted/10">
              No classes scheduled.
            </p>
          ) : (
            <div className="space-y-2">
              {tomorrowClasses.map((entry) => renderClassCard(entry, { preview: true }))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

