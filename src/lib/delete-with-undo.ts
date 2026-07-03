import { toast } from "sonner";
import { ClassEntry } from "@/lib/schedule-data";

/**
 * Delete a class immediately and offer an Undo toast for ~5s.
 * On undo, re-insert the original entry (new id, same field values).
 * Only one undo toast is "live" at a time — a new delete auto-dismisses
 * the previous toast; the previous delete has already been committed.
 */
let activeToastId: string | number | null = null;

export function deleteWithUndo(
  entry: ClassEntry,
  deleteClass: (id: string) => Promise<void> | void,
  addClass: (data: Omit<ClassEntry, "id">) => Promise<void> | void,
) {
  if (activeToastId !== null) {
    toast.dismiss(activeToastId);
    activeToastId = null;
  }
  // Preserve original data for restore.
  const restore: Omit<ClassEntry, "id"> = {
    className: entry.className,
    classId: entry.classId,
    section: entry.section,
    day: entry.day,
    location: entry.location,
    startTime: entry.startTime,
    endTime: entry.endTime,
    meetingLink: entry.meetingLink,
  };

  void Promise.resolve(deleteClass(entry.id));

  const id = toast(`Deleted "${entry.className}"`, {
    duration: 5000,
    action: {
      label: "Undo",
      onClick: () => {
        void Promise.resolve(addClass(restore));
        if (activeToastId === id) activeToastId = null;
      },
    },
    onDismiss: () => { if (activeToastId === id) activeToastId = null; },
    onAutoClose: () => { if (activeToastId === id) activeToastId = null; },
  });
  activeToastId = id;
}
