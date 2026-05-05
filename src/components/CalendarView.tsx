import { ClassEntry, DAYS, DayOfWeek, parseTime, getClassColor } from "@/lib/schedule-data";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM

const DAY_MAP: Record<number, DayOfWeek> = {
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

interface CalendarViewProps {
  classes: ClassEntry[];
  onEdit: (entry: ClassEntry) => void;
  editMode: boolean;
}

export function CalendarView({ classes, onEdit, editMode }: CalendarViewProps) {
  const today = DAY_MAP[new Date().getDay()] || null;

  const getClassesForDay = (day: string) =>
    classes.filter((c) => c.day === day);

  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0 touch-pan-x">
      <div className="min-w-[600px] sm:min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(6,1fr)] sm:grid-cols-[80px_repeat(6,1fr)] border-b border-border sticky top-0 bg-card z-[1]">
          <div className="p-1.5 sm:p-2 text-xs sm:text-sm font-medium text-muted-foreground">Time</div>
          {DAYS.map((day) => {
            const isToday = day === today;
            return (
              <div
                key={day}
                className={`p-1.5 sm:p-2 text-center text-xs sm:text-sm font-semibold border-l border-border transition-colors ${
                  isToday
                    ? "text-primary bg-primary/5"
                    : "text-foreground"
                }`}
              >
                <span className="sm:hidden">{day.slice(0, 3)}</span>
                <span className="hidden sm:inline">{day.charAt(0) + day.slice(1).toLowerCase()}</span>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative grid grid-cols-[60px_repeat(6,1fr)] sm:grid-cols-[80px_repeat(6,1fr)]">
          {/* Time labels */}
          <div>
            {HOURS.map((hour) => (
              <div key={hour} className="h-12 sm:h-16 border-b border-border flex items-start px-1 sm:px-2 pt-0.5 sm:pt-1">
                <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                  {hour > 12 ? hour - 12 : hour} {hour >= 12 ? "PM" : "AM"}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((day) => {
            const isToday = day === today;
            return (
              <div
                key={day}
                className={`relative border-l border-border transition-colors ${
                  isToday ? "bg-primary/[0.03]" : ""
                }`}
              >
                {/* Today indicator line */}
                {isToday && (
                  <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-primary/30 z-[0]" />
                )}

                {/* Grid lines */}
                {HOURS.map((hour) => (
                  <div key={hour} className="h-12 sm:h-16 border-b border-border" />
                ))}

                {/* Class blocks */}
                {getClassesForDay(day).map((entry) => {
                  const start = parseTime(entry.startTime);
                  const end = parseTime(entry.endTime);
                  const totalHours = HOURS.length; // 13
                  const topPercent = ((start - 7) / totalHours) * 100;
                  const heightPercent = ((end - start) / totalHours) * 100;
                  const color = getClassColor(entry.className);

                  return (
                    <div
                      key={entry.id}
                      onClick={() => editMode && onEdit(entry)}
                      className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md px-1 sm:px-2 py-0.5 sm:py-1 text-left overflow-hidden transition-opacity ${editMode ? "cursor-pointer hover:opacity-90 active:opacity-80" : "cursor-default"}`}
                      style={{
                        top: `${topPercent}%`,
                        height: `${heightPercent}%`,
                        backgroundColor: color,
                        color: "white",
                        minHeight: "20px",
                      }}
                    >
                      <p className="text-[9px] sm:text-xs font-bold truncate leading-tight">{entry.className}</p>
                      <p className="text-[8px] sm:text-[10px] opacity-90 truncate leading-tight font-mono">{entry.classId}</p>
                      <p className="text-[8px] sm:text-[10px] opacity-80 truncate leading-tight">{entry.section || "TS21"}</p>
                      <p className="text-[8px] sm:text-[10px] opacity-80 truncate leading-tight">{entry.location}</p>
                      <p className="text-[8px] sm:text-[10px] opacity-80 truncate leading-tight">
                        {entry.startTime} – {entry.endTime}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
