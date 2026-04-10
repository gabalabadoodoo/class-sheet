import { ClassEntry, DAYS, parseTime, getClassColor } from "@/lib/schedule-data";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM

interface CalendarViewProps {
  classes: ClassEntry[];
  onEdit: (entry: ClassEntry) => void;
}

export function CalendarView({ classes, onEdit }: CalendarViewProps) {
  const getClassesForDay = (day: string) =>
    classes.filter((c) => c.day === day);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-border">
          <div className="p-2 text-sm font-medium text-muted-foreground">Time</div>
          {DAYS.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-foreground border-l border-border">
              {day.charAt(0) + day.slice(1).toLowerCase()}
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="relative grid grid-cols-[80px_repeat(5,1fr)]">
          {/* Time labels */}
          <div>
            {HOURS.map((hour) => (
              <div key={hour} className="h-16 border-b border-border flex items-start px-2 pt-1">
                <span className="text-xs text-muted-foreground">
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
                <div key={hour} className="h-16 border-b border-border" />
              ))}

              {/* Class blocks */}
              {getClassesForDay(day).map((entry) => {
                const start = parseTime(entry.startTime);
                const end = parseTime(entry.endTime);
                const top = (start - 7) * 64; // 64px = h-16
                const height = (end - start) * 64;
                const color = getClassColor(entry.className);

                return (
                  <button
                    key={entry.id}
                    onClick={() => onEdit(entry)}
                    className="absolute left-1 right-1 rounded-md px-2 py-1 text-left overflow-hidden cursor-pointer transition-opacity hover:opacity-90"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: color,
                      color: "white",
                    }}
                  >
                    <p className="text-xs font-bold truncate">{entry.className}</p>
                    <p className="text-[10px] opacity-90 truncate">{entry.location}</p>
                    <p className="text-[10px] opacity-80 truncate">
                      {entry.startTime} – {entry.endTime}
                    </p>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
