import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ClassEntry, DAYS, DayOfWeek } from "@/lib/schedule-data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseFlexibleTime, parseTimeRange, toRangeString } from "@/lib/time-format";
import { toast } from "sonner";

interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<ClassEntry, "id">) => void;
  initialData?: ClassEntry | null;
  prefill?: Partial<Omit<ClassEntry, "id">> | null;
}

export function ClassFormDialog({ open, onOpenChange, onSubmit, initialData, prefill }: ClassFormDialogProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<Omit<ClassEntry, "id">>({
    defaultValues: {
      className: "", classId: "", section: "TS21", day: "MONDAY", location: "", startTime: "7:00 AM", endTime: "8:00 AM", meetingLink: "",
    },
  });

  const watchLocation = watch("location");
  const [rangeInput, setRangeInput] = useState("");

  useEffect(() => {
    if (initialData) {
      reset({
        className: initialData.className,
        classId: initialData.classId,
        section: initialData.section || "TS21",
        day: initialData.day,
        location: initialData.location,
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        meetingLink: initialData.meetingLink || "",
      });
      setRangeInput(toRangeString(initialData.startTime, initialData.endTime) || "");
    } else if (prefill) {
      reset({
        className: prefill.className || "",
        classId: prefill.classId || "",
        section: prefill.section || "TS21",
        day: prefill.day || "MONDAY",
        location: prefill.location || "",
        startTime: prefill.startTime || "7:00 AM",
        endTime: prefill.endTime || "8:00 AM",
        meetingLink: prefill.meetingLink || "",
      });
      setRangeInput(toRangeString(prefill.startTime || "7:00 AM", prefill.endTime || "8:00 AM") || "");
    } else {
      reset({ className: "", classId: "", section: "TS21", day: "MONDAY", location: "", startTime: "7:00 AM", endTime: "8:00 AM", meetingLink: "" });
      setRangeInput("");
    }
  }, [initialData, prefill, reset, open]);

  const onFormSubmit = (data: Omit<ClassEntry, "id">) => {
    const range = parseTimeRange(rangeInput);
    if (!range) {
      toast.error("Invalid time range. Try 17:00:00-18:50:00 or 9am-10:30am");
      return;
    }

    const submitted = {
      ...data,
      startTime: range.start,
      endTime: range.end,
      section: data.section || "TS21",
    };
    if (submitted.location !== "ONLINE") {
      submitted.meetingLink = "";
    }
    onSubmit(submitted);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Class" : "Add Class"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Class Name</Label>
              <Input {...register("className", { required: true })} placeholder="e.g. Python" />
            </div>
            <div className="space-y-2">
              <Label>Class ID</Label>
              <Input {...register("classId", { required: true })} placeholder="e.g. CS0079" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Input {...register("section")} placeholder="TS21 (default)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={watch("day")} onValueChange={(v) => setValue("day", v as DayOfWeek)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input {...register("location", { required: true })} placeholder="e.g. ONLINE or E401" />
            </div>
          </div>
          {watchLocation?.toUpperCase() === "ONLINE" && (
            <div className="space-y-2">
              <Label>Meeting Link <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input {...register("meetingLink")} placeholder="https://zoom.us/j/..." />
            </div>
          )}

          <div className="space-y-2">
            <Label>Time Range</Label>
            <Input
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="17:00:00-18:50:00"
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Accepts <span className="font-mono">17:00:00-18:50:00</span>, <span className="font-mono">9am-10:30am</span>, <span className="font-mono">0700-0950</span>, <span className="font-mono">7pm-9:50pm</span>
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{initialData ? "Save Changes" : "Add Class"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
