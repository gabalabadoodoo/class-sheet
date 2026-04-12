import { ClassEntry, DAYS, parseTime, getClassColor } from "@/lib/schedule-data";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM

interface CalendarViewProps {
  classes: ClassEntry[];
  onEdit: (entry: ClassEntry) => void;
  editMode: boolean;
}

export function CalendarView({ classes, onEdit, editMode }: CalendarViewProps) {
  const getClassesForDay = (day: string) =>
    classes.filter((c) => c.day === day);

  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0 touch-pan-x">
      <div className="min-w-[600px] sm:min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(6,1fr)] sm:grid-cols-[80px_repeat(6,1fr)] border-b border-border sticky top-0 bg-card z-[1]">
          <div className="p-1.5 sm:p-2 text-xs sm:text-sm font-medium text-muted-foreground">Time</div>
          {DAYS.map((day) => (
            <div key={day} className="p-1.5 sm:p-2 text-center text-xs sm:text-sm font-semibold text-foreground border-l border-border">
              <span className="sm:hidden">{day.slice(0, 3)}</span>
              <span className="hidden sm:inline">{day.charAt(0) + day.slice(1).toLowerCase()}</span>
            </div>
          ))}
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
          {DAYS.map((day) => (
            <div key={day} className="relative border-l border-border">
              {/* Grid lines */}
              {HOURS.map((hour) => (
                <div key={hour} className="h-12 sm:h-16 border-b border-border" />
              ))}

              {/* Class blocks */}
              {getClassesForDay(day).map((entry) => {
                const start = parseTime(entry.startTime);
                const end = parseTime(entry.endTime);
                const cellH = 48; // h-12 = 48px on mobile
                const cellHSm = 64; // h-16 = 64px on desktop
                // We use CSS for responsiveness but JS needs one value; use 48 as base
                const top = (start - 7) * cellH;
                const height = (end - start) * cellH;
                const color = getClassColor(entry.className);

                return (
                  <div
                    key={entry.id}
                    onClick={() => editMode && onEdit(entry)}
                    className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md px-1 sm:px-2 py-0.5 sm:py-1 text-left overflow-hidden transition-opacity ${editMode ? "cursor-pointer hover:opacity-90 active:opacity-80" : "cursor-default"}`}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: color,
                      color: "white",
                      minHeight: "20px",
                    }}
                  >
                    <p className="text-[9px] sm:text-xs font-bold truncate leading-tight">{entry.className}</p>
                    <p className="text-[8px] sm:text-[10px] opacity-90 truncate leading-tight font-mono">{entry.classId}</p>
                    <p className="text-[8px] sm:text-[10px] opacity-80 truncate leading-tight">{entry.location}</p>
                    <p className="text-[8px] sm:text-[10px] opacity-80 truncate leading-tight hidden xs:block">
                      {entry.startTime} – {entry.endTime}
                    </p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
