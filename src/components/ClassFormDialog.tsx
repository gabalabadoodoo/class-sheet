import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ClassEntry, DAYS, DayOfWeek } from "@/lib/schedule-data";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      className: "", classId: "", day: "MONDAY", location: "", startTime: "7:00 AM", endTime: "8:00 AM",
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        className: initialData.className,
        classId: initialData.classId,
        day: initialData.day,
        location: initialData.location,
        startTime: initialData.startTime,
        endTime: initialData.endTime,
      });
    } else if (prefill) {
      reset({
        className: prefill.className || "",
        classId: prefill.classId || "",
        day: prefill.day || "MONDAY",
        location: prefill.location || "",
        startTime: prefill.startTime || "7:00 AM",
        endTime: prefill.endTime || "8:00 AM",
      });
    } else {
      reset({ className: "", classId: "", day: "MONDAY", location: "", startTime: "7:00 AM", endTime: "8:00 AM" });
    }
  }, [initialData, prefill, reset, open]);

  const onFormSubmit = (data: Omit<ClassEntry, "id">) => {
    onSubmit(data);
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input {...register("startTime", { required: true })} placeholder="7:00 AM" />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input {...register("endTime", { required: true })} placeholder="9:00 AM" />
            </div>
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
