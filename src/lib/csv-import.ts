import { ClassEntry, DayOfWeek } from "@/lib/schedule-data";
import { parseTimeRange } from "@/lib/time-format";

export interface ParsedSchedule {
  day: DayOfWeek;
  location: string;
  startTime: string;
  endTime: string;
  rawTime: string;
  rawDay: string;
  rawRoom: string;
}

export interface ParsedClass {
  key: string; // grouping key (course code without trailing L)
  className: string; // auto-generated, editable
  title: string;
  section: string;
  lectureCode: string; // e.g. CCS0043
  labCode?: string; // e.g. CCS0043L
  schedules: Array<ParsedSchedule & { type: "LECTURE" | "LAB" }>;
  warnings: string[];
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(cur); cur = "";
    } else cur += c;
  }
  result.push(cur);
  return result.map((s) => s.trim());
}

const DAY_MAP: Record<string, DayOfWeek> = {
  M: "MONDAY", MON: "MONDAY", MONDAY: "MONDAY",
  T: "TUESDAY", TU: "TUESDAY", TUE: "TUESDAY", TUES: "TUESDAY", TUESDAY: "TUESDAY",
  W: "WEDNESDAY", WED: "WEDNESDAY", WEDNESDAY: "WEDNESDAY",
  TH: "THURSDAY", THU: "THURSDAY", THUR: "THURSDAY", THURS: "THURSDAY", THURSDAY: "THURSDAY", R: "THURSDAY",
  F: "FRIDAY", FR: "FRIDAY", FRI: "FRIDAY", FRIDAY: "FRIDAY",
  S: "SATURDAY", SA: "SATURDAY", SAT: "SATURDAY", SATURDAY: "SATURDAY",
};

function parseDayToken(tok: string): DayOfWeek | null {
  return DAY_MAP[tok.trim().toUpperCase()] || null;
}

const STOPWORDS = new Set(["AND", "OF", "THE", "TO", "FOR", "IN", "ON", "A", "AN", "WITH", "OR"]);

// Best-effort short name from Title. Editable by user in preview.
export function abbreviateTitle(title: string): string {
  let t = title.trim();
  // Strip trailing "(LEC)" / "(LAB)"
  t = t.replace(/\s*\((LEC|LAB)\)\s*$/i, "").trim();

  // If has parenthetical, prefer its content when longer/more descriptive
  const paren = t.match(/\(([^)]+)\)/);
  let source = t;
  if (paren && paren[1].split(/\s+/).length >= 2) source = paren[1];

  // Extract trailing number
  const numMatch = source.match(/\b(\d+)\b\s*$/);
  const trailingNum = numMatch ? numMatch[1] : "";
  source = source.replace(/\b\d+\b\s*$/, "").replace(/[()]/g, "").trim();

  const words = source.split(/\s+/).filter((w) => w && !STOPWORDS.has(w.toUpperCase()));
  if (words.length === 0) return title.slice(0, 12);

  const cap = (w: string, n: number) =>
    w.charAt(0).toUpperCase() + w.slice(1, n).toLowerCase();

  let abbr: string;
  if (words.length === 1) {
    abbr = cap(words[0], 8);
  } else {
    abbr = cap(words[0], 4) + cap(words[1], 4);
  }
  return trailingNum ? `${abbr} ${trailingNum}` : abbr;
}

interface Row {
  courses: string;
  title: string;
  section: string;
  days: string;
  time: string;
  room: string;
  lineNum: number;
}

export interface CsvParseResult {
  classes: ParsedClass[];
  globalWarnings: string[];
}

export function parseScheduleCsv(text: string): CsvParseResult {
  const globalWarnings: string[] = [];
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) return { classes: [], globalWarnings: ["Empty CSV"] };

  const header = parseCsvLine(rawLines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => header.findIndex((h) => h === name);
  const iCourses = idx("courses");
  const iTitle = idx("title");
  const iSection = idx("section");
  const iDays = idx("days");
  const iTime = idx("time");
  const iRoom = idx("room");

  if ([iCourses, iTitle, iDays, iTime, iRoom].some((i) => i < 0)) {
    return { classes: [], globalWarnings: ["Missing required headers: Courses, Title, Days, Time, Room"] };
  }

  const rows: Row[] = [];
  const seenCourses = new Set<string>();
  for (let li = 1; li < rawLines.length; li++) {
    const cols = parseCsvLine(rawLines[li]);
    const courses = (cols[iCourses] || "").trim();
    if (!courses) continue;
    if (seenCourses.has(courses.toUpperCase())) {
      globalWarnings.push(`Duplicate course code skipped: ${courses}`);
      continue;
    }
    seenCourses.add(courses.toUpperCase());
    rows.push({
      courses,
      title: (cols[iTitle] || "").trim(),
      section: (cols[iSection] || "").trim() || "TS21",
      days: (cols[iDays] || "").trim(),
      time: (cols[iTime] || "").trim(),
      room: (cols[iRoom] || "").trim(),
      lineNum: li + 1,
    });
  }

  // Group by course code (strip trailing L)
  const groups = new Map<string, { lec?: Row; lab?: Row }>();
  for (const row of rows) {
    const upper = row.courses.toUpperCase();
    const isLab = /L$/.test(upper) && !/^[A-Z]+0*L$/.test(upper);
    // Heuristic: trailing L means lab, but the code always contains digits — strip a single trailing L
    const base = isLab ? row.courses.replace(/L$/i, "") : row.courses;
    const key = base.toUpperCase();
    if (!groups.has(key)) groups.set(key, {});
    const g = groups.get(key)!;
    if (isLab) g.lab = row; else g.lec = row;
  }

  const classes: ParsedClass[] = [];
  for (const [key, { lec, lab }] of groups) {
    const warnings: string[] = [];
    const primary = lec || lab!;
    const title = primary.title;
    const className = abbreviateTitle(title);
    const section = primary.section;

    const buildSchedules = (
      row: Row | undefined,
      type: "LECTURE" | "LAB"
    ): Array<ParsedSchedule & { type: "LECTURE" | "LAB" }> => {
      if (!row) return [];
      const days = row.days.split(/\s*\/\s*/).filter(Boolean);
      const times = row.time.split(/\s*\/\s*/).filter(Boolean);
      const rooms = row.room.split(/\s*\/\s*/).filter(Boolean);
      const n = Math.max(days.length, times.length, rooms.length);
      if (!(days.length === times.length && times.length === rooms.length)) {
        warnings.push(
          `${row.courses}: mismatched segment counts (days=${days.length}, times=${times.length}, rooms=${rooms.length})`
        );
      }
      const out: Array<ParsedSchedule & { type: "LECTURE" | "LAB" }> = [];
      for (let i = 0; i < n; i++) {
        const dayTok = days[i] || days[0] || "";
        const timeTok = times[i] || times[0] || "";
        const roomTok = rooms[i] || rooms[0] || "";
        const day = parseDayToken(dayTok);
        if (!day) {
          warnings.push(`${row.courses}: unknown day "${dayTok}"`);
          continue;
        }
        const range = parseTimeRange(timeTok);
        if (!range) {
          warnings.push(`${row.courses}: unparseable time "${timeTok}"`);
          continue;
        }
        out.push({
          day, location: roomTok, startTime: range.start, endTime: range.end,
          rawDay: dayTok, rawTime: timeTok, rawRoom: roomTok, type,
        });
      }
      return out;
    };

    const schedules = [...buildSchedules(lec, "LECTURE"), ...buildSchedules(lab, "LAB")];
    if (schedules.length > 2) {
      warnings.push(`This class has ${schedules.length} schedule entries — please review.`);
    }

    classes.push({
      key,
      className,
      title,
      section,
      lectureCode: lec?.courses || key,
      labCode: lab?.courses,
      schedules,
      warnings,
    });
  }

  return { classes, globalWarnings };
}

// Convert final ParsedClass list to ClassEntry inserts.
export function parsedToEntries(list: ParsedClass[]): Array<Omit<ClassEntry, "id">> {
  const entries: Array<Omit<ClassEntry, "id">> = [];
  for (const c of list) {
    for (const s of c.schedules) {
      const isLab = s.type === "LAB";
      const displayName = isLab ? `${c.className} LAB` : c.className;
      const code = isLab ? (c.labCode || `${c.lectureCode}L`) : c.lectureCode;
      entries.push({
        className: displayName,
        classId: code,
        section: c.section || "TS21",
        day: s.day,
        location: s.location,
        startTime: s.startTime,
        endTime: s.endTime,
        meetingLink: "",
      });
    }
  }
  return entries;
}
