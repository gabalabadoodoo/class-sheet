import { useState, useMemo } from "react";
import { useSchedule } from "@/hooks/useSchedule";
import { ClassEntry, DAYS, DayOfWeek } from "@/lib/schedule-data";
import { CalendarView } from "@/components/CalendarView";
import { TableView } from "@/components/TableView";
import { TodayView } from "@/components/TodayView";
import { ClassFormDialog } from "@/components/ClassFormDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, CalendarDays, List, RotateCcw, Sun } from "lucide-react";

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
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground tracking-tight">📚 Class Schedule</h1>
              <p className="text-[11px] text-muted-foreground">{classes.length} classes this semester</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button onClick={handleAdd} size="sm" className="h-8 px-2.5 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
              <Button onClick={resetSchedule} variant="outline" size="sm" className="h-8 w-8 p-0">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-3 space-y-3">
        {/* Views */}
        <Tabs defaultValue="today">
          <TabsList className="w-full h-10 grid grid-cols-3">
            <TabsTrigger value="today" className="gap-1 text-xs">
              <Sun className="h-3.5 w-3.5" /> Today
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1 text-xs">
              <CalendarDays className="h-3.5 w-3.5" /> Week
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1 text-xs">
              <List className="h-3.5 w-3.5" /> Table
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-3">
            <TodayView classes={classes} onEdit={handleEdit} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-3">
            {/* Filters */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <Select value={dayFilter} onValueChange={setDayFilter}>
                <SelectTrigger className="w-[110px] h-9 text-xs">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Days</SelectItem>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>{d.slice(0, 3)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-border bg-card p-2">
              <CalendarView classes={filtered} onEdit={handleEdit} />
            </div>
          </TabsContent>

          <TabsContent value="table" className="mt-3">
            {/* Filters */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[110px] h-9 text-xs">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="ONSITE">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-border bg-card overflow-x-auto">
              <TableView classes={filtered} onEdit={handleEdit} onDelete={(id) => setDeleteId(id)} />
            </div>
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
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
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
