import { useState } from "react";
import { ClassEntry, DayOfWeek, DAYS } from "@/lib/schedule-data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Check, AlertTriangle } from "lucide-react";

interface ImportScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (entries: Omit<ClassEntry, "id">[]) => void;
}

function parseDayString(s: string): DayOfWeek | null {
  const upper = s.toUpperCase().trim();
  for (const d of DAYS) {
    if (d === upper || d.startsWith(upper.slice(0, 3))) return d;
  }
  return null;
}

function parseTimeString(s: string): string | null {
  // Handle "7:00 AM", "7:00AM", "7:00 am", "07:00", "7:00"
  const cleaned = s.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;
  let [, h, m, meridiem] = match;
  if (!meridiem) {
    const hour = parseInt(h);
    meridiem = hour >= 7 && hour < 12 ? "AM" : "PM";
    if (hour >= 1 && hour <= 6) meridiem = "PM";
  }
  return `${parseInt(h)}:${m} ${meridiem}`;
}

function parseLines(text: string): Omit<ClassEntry, "id">[] {
  const results: Omit<ClassEntry, "id">[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Try tab-separated or multi-space separated
    const parts = line.split(/\t+|  +/).map((p) => p.trim()).filter(Boolean);
    
    if (parts.length < 5) continue;

    // Try to identify fields by pattern matching
    let className = "";
    let classId = "";
    let section = "TS21";
    let day: DayOfWeek | null = null;
    let location = "";
    let startTime: string | null = null;
    let endTime: string | null = null;

    // Strategy: look for day and time patterns, infer the rest
    const dayIdx = parts.findIndex((p) => parseDayString(p) !== null);
    const timeIndices: number[] = [];
    parts.forEach((p, i) => {
      if (parseTimeString(p)) timeIndices.push(i);
    });

    if (dayIdx >= 0 && timeIndices.length >= 2) {
      day = parseDayString(parts[dayIdx]);
      startTime = parseTimeString(parts[timeIndices[0]]);
      endTime = parseTimeString(parts[timeIndices[1]]);

      // Fields before day are likely: className, classId, section
      const beforeDay = parts.slice(0, dayIdx);
      if (beforeDay.length >= 1) className = beforeDay[0];
      if (beforeDay.length >= 2) classId = beforeDay[1];
      if (beforeDay.length >= 3) section = beforeDay[2];

      // Location: find a field that's not a time and not the day, between day and times or after
      const usedIndices = new Set([dayIdx, ...timeIndices, ...Array.from({ length: dayIdx }, (_, i) => i)]);
      const remaining = parts.filter((_, i) => !usedIndices.has(i));
      if (remaining.length > 0) location = remaining[0];
    }

    if (className && day && startTime && endTime) {
      results.push({
        className,
        classId: classId || className,
        section,
        day,
        location: location || "TBD",
        startTime,
        endTime,
      });
    }
  }
  return results;
}

export function ImportScheduleDialog({ open, onOpenChange, onImport }: ImportScheduleDialogProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<Omit<ClassEntry, "id">[] | null>(null);

  const handleParse = () => {
    const results = parseLines(text);
    setParsed(results);
  };

  const handleImport = () => {
    if (parsed && parsed.length > 0) {
      onImport(parsed);
      setText("");
      setParsed(null);
      onOpenChange(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setText("");
      setParsed(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" /> Import Schedule from Text
          </DialogTitle>
          <DialogDescription className="text-xs">
            Use your phone's text recognition (Google Lens, Apple Live Text) to copy text from a photo of your schedule, then paste it below. Each line should contain: Class Name, Class ID, Section, Day, Location, Start Time, End Time — separated by tabs or spaces.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          <Textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setParsed(null); }}
            placeholder={`Example:\nAppDev LEC\tCCS0043\tTS21\tFriday\tONLINE\t7:00 AM\t9:40 AM\nTechno\tCCS0103\tTS21\tTuesday\tONLINE\t3:00 PM\t4:50 PM`}
            className="min-h-[120px] text-xs font-mono"
          />

          <Button onClick={handleParse} variant="outline" size="sm" className="w-full text-xs" disabled={!text.trim()}>
            Parse Text
          </Button>

          {parsed !== null && (
            <div className="space-y-2">
              {parsed.length === 0 ? (
                <div className="flex items-center gap-2 text-destructive text-xs p-3 border border-destructive/30 rounded-lg bg-destructive/5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Could not parse any classes. Make sure each line has class name, day, and times separated by tabs or multiple spaces.</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Found {parsed.length} class(es):</p>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-2 py-1.5 font-medium">Class</th>
                            <th className="text-left px-2 py-1.5 font-medium">Day</th>
                            <th className="text-left px-2 py-1.5 font-medium">Time</th>
                            <th className="text-left px-2 py-1.5 font-medium">Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.map((entry, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-2 py-1.5">{entry.className}</td>
                              <td className="px-2 py-1.5">{entry.day.slice(0, 3)}</td>
                              <td className="px-2 py-1.5">{entry.startTime} – {entry.endTime}</td>
                              <td className="px-2 py-1.5">{entry.location}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Button onClick={handleImport} size="sm" className="w-full text-xs gap-1">
                    <Check className="h-3.5 w-3.5" /> Import {parsed.length} Class(es)
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
