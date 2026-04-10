import { useState, useMemo } from "react";
import { useSchedule } from "@/hooks/useSchedule";
import { ClassEntry, DAYS, DayOfWeek } from "@/lib/schedule-data";
import { CalendarView } from "@/components/CalendarView";
import { TableView } from "@/components/TableView";
import { ClassFormDialog } from "@/components/ClassFormDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, CalendarDays, List, RotateCcw } from "lucide-react";

const Index = () => {
  const { classes, addClass, updateClass, deleteClass, resetSchedule } = useSchedule();
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return classes.filter((c) => {
      const matchesSearch =
        !search ||
        c.className.toLowerCase().includes(search.toLowerCase()) ||
        c.classId.toLowerCase().includes(search.toLowerCase());
      const matchesDay = dayFilter === "ALL" || c.day === dayFilter;
      const matchesLocation =
        locationFilter === "ALL" ||
        (locationFilter === "ONLINE" ? c.location === "ONLINE" : c.location !== "ONLINE");
      return matchesSearch && matchesDay && matchesLocation;
    });
  }, [classes, search, dayFilter, locationFilter]);

  const handleEdit = (entry: ClassEntry) => {
    setEditingClass(entry);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: Omit<ClassEntry, "id">) => {
    if (editingClass) {
      updateClass(editingClass.id, data);
    } else {
      addClass(data);
    }
    setEditingClass(null);
  };

  const handleAdd = () => {
    setEditingClass(null);
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-background safe-area-insets">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight truncate">📚 Class Schedule</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{classes.length} classes this semester</p>
            </div>
            <div className="flex gap-1.5 sm:gap-2 shrink-0">
              <Button onClick={handleAdd} size="sm" className="h-9 px-3 text-xs sm:text-sm">
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Add Class</span>
              </Button>
              <Button onClick={resetSchedule} variant="outline" size="sm" className="h-9 px-3 text-xs sm:text-sm">
                <RotateCcw className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search class name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={dayFilter} onValueChange={setDayFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-10"><SelectValue placeholder="Day" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Days</SelectItem>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-10"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Locations</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="ONSITE">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Views */}
        <Tabs defaultValue="calendar">
          <TabsList className="h-10">
            <TabsTrigger value="calendar" className="gap-1.5 h-8 px-3 text-xs sm:text-sm">
              <CalendarDays className="h-4 w-4" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5 h-8 px-3 text-xs sm:text-sm">
              <List className="h-4 w-4" /> Table
            </TabsTrigger>
          </TabsList>
          <TabsContent value="calendar" className="mt-3 sm:mt-4 rounded-lg border border-border bg-card p-2 sm:p-4">
            <CalendarView classes={filtered} onEdit={handleEdit} />
          </TabsContent>
          <TabsContent value="table" className="mt-3 sm:mt-4 rounded-lg border border-border bg-card">
            <TableView classes={filtered} onEdit={handleEdit} onDelete={(id) => setDeleteId(id)} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Add/Edit Dialog */}
      <ClassFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingClass(null); }}
        onSubmit={handleFormSubmit}
        initialData={editingClass}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this class?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteClass(deleteId); setDeleteId(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
