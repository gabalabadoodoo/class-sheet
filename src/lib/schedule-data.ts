export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";

export interface ClassEntry {
  id: string;
  className: string;
  classId: string;
  section: string;
  day: DayOfWeek;
  location: string;
  startTime: string; // "7:00 AM"
  endTime: string;
  meetingLink?: string;
}

export const CLASS_COLORS: Record<string, string> = {
  "AppDev": "hsl(210, 70%, 50%)",
  "Techno": "hsl(340, 65%, 50%)",
  "NetComm 1": "hsl(160, 60%, 40%)",
  "Automata": "hsl(270, 55%, 50%)",
  "DataVis": "hsl(30, 80%, 50%)",
  "Python": "hsl(50, 75%, 45%)",
  "PurComm": "hsl(0, 65%, 50%)",
};

// Strip trailing " LEC" / " LAB" (case-insensitive) so lec & lab share the same color.
function normalizeClassName(name: string): string {
  return name.replace(/\s+(LEC|LAB)\s*$/i, "").trim();
}

// Stable hash → HSL fallback so unknown subjects also get a consistent color
// (and both their LEC/LAB variants match each other).
function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 65%, 48%)`;
}

export const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export const DEFAULT_SCHEDULE: ClassEntry[] = [
  { id: "1", className: "AppDev LEC", classId: "CCS0043", section: "TS21", day: "FRIDAY", location: "ONLINE", startTime: "7:00 AM", endTime: "9:40 AM" },
  { id: "2", className: "AppDev LAB", classId: "CCS0043L", section: "TS21", day: "WEDNESDAY", location: "E608", startTime: "7:00 AM", endTime: "9:50 AM" },
  { id: "3", className: "Techno", classId: "CCS0103", section: "TS21", day: "TUESDAY", location: "ONLINE", startTime: "3:00 PM", endTime: "4:50 PM" },
  { id: "4", className: "Techno", classId: "CCS0103", section: "TS21", day: "WEDNESDAY", location: "FTIC Project Room", startTime: "3:00 PM", endTime: "4:50 PM" },
  { id: "5", className: "NetComm 1", classId: "CS0013", section: "TS21", day: "THURSDAY", location: "F1204", startTime: "7:00 AM", endTime: "9:50 AM" },
  { id: "6", className: "NetComm 1", classId: "CS0013", section: "TS21", day: "WEDNESDAY", location: "F609", startTime: "1:00 PM", endTime: "2:50 PM" },
  { id: "7", className: "Automata", classId: "CS0023", section: "TS21", day: "TUESDAY", location: "ONLINE", startTime: "5:00 PM", endTime: "6:50 PM" },
  { id: "8", className: "Automata", classId: "CS0023", section: "TS21", day: "THURSDAY", location: "F710", startTime: "5:00 PM", endTime: "6:50 PM" },
  { id: "9", className: "DataVis", classId: "CS0071", section: "TS21", day: "FRIDAY", location: "ONLINE", startTime: "10:00 AM", endTime: "12:40 PM" },
  { id: "10", className: "DataVis", classId: "CS0071", section: "TS21", day: "MONDAY", location: "E401", startTime: "10:00 AM", endTime: "12:50 PM" },
  { id: "11", className: "Python", classId: "CS0079", section: "TS21", day: "TUESDAY", location: "ONLINE", startTime: "11:00 AM", endTime: "12:50 PM" },
  { id: "12", className: "Python", classId: "CS0079", section: "TS21", day: "THURSDAY", location: "E401", startTime: "11:00 AM", endTime: "12:50 PM" },
  { id: "13", className: "PurComm", classId: "GED0031", section: "TS21", day: "MONDAY", location: "F608", startTime: "3:00 PM", endTime: "4:50 PM" },
  { id: "14", className: "PurComm", classId: "GED0031", section: "TS21", day: "THURSDAY", location: "F608", startTime: "3:00 PM", endTime: "4:50 PM" },
];

export function parseTime(time: string): number {
  const [timePart, meridiem] = time.split(" ");
  let [hours, minutes] = timePart.split(":").map(Number);
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours + minutes / 60;
}

export function getClassColor(className: string): string {
  const base = normalizeClassName(className);
  return CLASS_COLORS[base] || CLASS_COLORS[className] || hashColor(base);
}
