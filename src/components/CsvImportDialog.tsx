import { useRef, useState } from "react";
import { ClassEntry, DAYS, DayOfWeek, getClassColor } from "@/lib/schedule-data";
import { parseScheduleCsv, parsedToEntries, ParsedClass } from "@/lib/csv-import";
import { parseTimeRange, toRangeString } from "@/lib/time-format";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUp, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EditableSchedule {
  type: "LECTURE" | "LAB";
  day: DayOfWeek;
  location: string;
  rangeInput: string; // combined time range text
}

interface EditableClass {
  key: string;
  className: string;
  section: string;
  lectureCode: string;
  labCode: string;
  schedules: EditableSchedule[];
  warnings: string[];
}

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (entries: Array<Omit<ClassEntry, "id">>) => void;
}

function toEditable(p: ParsedClass): EditableClass {
  return {
    key: p.key,
    className: p.className,
    section: p.section,
    lectureCode: p.lectureCode,
    labCode: p.labCode || "",
    warnings: [...p.warnings],
    schedules: p.schedules.map((s) => ({
      type: s.type,
      day: s.day,
      location: s.location,
      rangeInput: toRangeString(s.startTime, s.endTime),
    })),
  };
}

export function CsvImportDialog({ open, onOpenChange, onImport }: CsvImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<EditableClass[] | null>(null);
  const [globalWarnings, setGlobalWarnings] = useState<string[]>([]);

  const reset = () => { setDrafts(null); setGlobalWarnings([]); if (fileRef.current) fileRef.current.value = ""; };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const { classes, globalWarnings } = parseScheduleCsv(text);
    if (classes.length === 0) {
      toast.error(globalWarnings[0] || "Could not parse CSV");
      return;
    }
    setDrafts(classes.map(toEditable));
    setGlobalWarnings(globalWarnings);
  };

  const updateClass = (i: number, patch: Partial<EditableClass>) => {
    setDrafts((prev) => prev && prev.map((c, ci) => ci === i ? { ...c, ...patch } : c));
  };
  const updateSchedule = (ci: number, si: number, patch: Partial<EditableSchedule>) => {
    setDrafts((prev) => prev && prev.map((c, i) => i !== ci ? c : {
      ...c,
      schedules: c.schedules.map((s, j) => j === si ? { ...s, ...patch } : s),
    }));
  };
  const removeClass = (i: number) => {
    setDrafts((prev) => prev && prev.filter((_, ci) => ci !== i));
  };

  const handleConfirm = () => {
    if (!drafts) return;
    // Convert back to ParsedClass shape, validating each rangeInput
    const parsed: ParsedClass[] = [];
    const errors: string[] = [];
    for (const c of drafts) {
      const schedules: ParsedClass["schedules"] = [];
      for (const s of c.schedules) {
        const range = parseTimeRange(s.rangeInput);
        if (!range) {
          errors.push(`${c.className}: invalid time range "${s.rangeInput}"`);
          continue;
        }
        if (!c.className.trim()) {
          errors.push(`Class name is required`);
          continue;
        }
        schedules.push({
          type: s.type,
          day: s.day,
          location: s.location,
          startTime: range.start,
          endTime: range.end,
          rawDay: s.day, rawTime: s.rangeInput, rawRoom: s.location,
        });
      }
      parsed.push({
        key: c.key,
        className: c.className.trim(),
        title: c.className,
        section: c.section.trim() || "TS21",
        lectureCode: c.lectureCode.trim(),
        labCode: c.labCode.trim() || undefined,
        schedules,
        warnings: [],
      });
    }
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    const entries = parsedToEntries(parsed);
    onImport(entries);
    toast.success(`Imported ${entries.length} schedule${entries.length === 1 ? "" : "s"} across ${parsed.length} class${parsed.length === 1 ? "" : "es"}`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import from CSV</DialogTitle>
        </DialogHeader>

        {!drafts ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV with headers:{" "}
              <span className="font-mono text-xs">Courses,Title,Section,Units,Days,Time,Room</span>
            </p>
            <Button
              variant="outline"
              className="w-full h-24 border-dashed gap-2"
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="h-5 w-5" /> Choose CSV file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 space-y-1">
              <p className="font-medium">Notes</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Multi-slot fields split on " / " (Days, Time, Room must have matching counts).</li>
                <li>Course codes ending in "L" are grouped as the LAB of the same class.</li>
                <li>Class names are auto-generated — you'll be able to edit before confirming.</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            {globalWarnings.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs rounded-md p-2 space-y-0.5">
                {globalWarnings.map((w, i) => (
                  <div key={i} className="flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{w}</span></div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 -mr-1">
              {drafts.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-6">No classes to import.</p>
              )}
              {drafts.map((c, ci) => (
                <div key={ci} className="border border-border rounded-lg p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 mt-1.5"
                      style={{ backgroundColor: getClassColor(c.className || "unknown") }}
                    />
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Class Name</Label>
                        <Input
                          value={c.className}
                          onChange={(e) => updateClass(ci, { className: e.target.value })}
                          className="h-8 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground truncate" title={c.key}>
                          From: {c.key}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Lecture ID</Label>
                        <Input
                          value={c.lectureCode}
                          onChange={(e) => updateClass(ci, { lectureCode: e.target.value })}
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Lab ID {c.labCode ? "" : "(none)"}
                        </Label>
                        <Input
                          value={c.labCode}
                          onChange={(e) => updateClass(ci, { labCode: e.target.value })}
                          className="h-8 text-sm font-mono"
                          placeholder="—"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Section</Label>
                        <Input
                          value={c.section}
                          onChange={(e) => updateClass(ci, { section: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeClass(ci)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>

                  {c.warnings.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] rounded-md p-2 space-y-0.5">
                      {c.warnings.map((w, i) => (
                        <div key={i} className="flex gap-1.5"><AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /><span>{w}</span></div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {c.schedules.map((s, si) => (
                      <div key={si} className="bg-muted/40 rounded-md p-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${s.type === "LAB" ? "bg-accent text-accent-foreground" : "bg-primary/15 text-primary"}`}>
                            {s.type}
                          </span>
                          <div className="flex-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Day</Label>
                            <Select value={s.day} onValueChange={(v) => updateSchedule(ci, si, { day: v as DayOfWeek })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {DAYS.map((d) => (
                                  <SelectItem key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Location</Label>
                            <Input
                              value={s.location}
                              onChange={(e) => updateSchedule(ci, si, { location: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Time Range</Label>
                            <Input
                              value={s.rangeInput}
                              onChange={(e) => updateSchedule(ci, si, { rangeInput: e.target.value })}
                              className="h-8 text-xs font-mono"
                              placeholder="17:00:00-18:50:00"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={drafts.length === 0}>
                Confirm Import ({drafts.reduce((n, c) => n + c.schedules.length, 0)} schedules)
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
