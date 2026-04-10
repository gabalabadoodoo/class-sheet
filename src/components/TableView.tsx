import { useState } from "react";
import { ClassEntry, getClassColor } from "@/lib/schedule-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowUpDown } from "lucide-react";

interface TableViewProps {
  classes: ClassEntry[];
  onEdit: (entry: ClassEntry) => void;
  onDelete: (id: string) => void;
}

type SortKey = "className" | "classId" | "day" | "location" | "startTime";

export function TableView({ classes, onEdit, onDelete }: TableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("day");
  const [sortAsc, setSortAsc] = useState(true);

  const dayOrder = { MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3, FRIDAY: 4 };

  const sorted = [...classes].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "day") {
      cmp = dayOrder[a.day] - dayOrder[b.day];
    } else {
      cmp = a[sortKey].localeCompare(b[sortKey]);
    }
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-foreground">
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead><SortHeader label="Class" field="className" /></TableHead>
          <TableHead><SortHeader label="ID" field="classId" /></TableHead>
          <TableHead><SortHeader label="Day" field="day" /></TableHead>
          <TableHead><SortHeader label="Location" field="location" /></TableHead>
          <TableHead><SortHeader label="Start" field="startTime" /></TableHead>
          <TableHead>End</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getClassColor(entry.className) }} />
                {entry.className}
              </span>
            </TableCell>
            <TableCell className="font-mono text-xs">{entry.classId}</TableCell>
            <TableCell>{entry.day.charAt(0) + entry.day.slice(1).toLowerCase()}</TableCell>
            <TableCell>{entry.location}</TableCell>
            <TableCell>{entry.startTime}</TableCell>
            <TableCell>{entry.endTime}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" onClick={() => onEdit(entry)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(entry.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {sorted.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              No classes found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
