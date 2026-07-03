import { useState, useMemo } from "react";
import { useSchedule } from "@/hooks/useSchedule";
import { ClassEntry, DAYS, DayOfWeek } from "@/lib/schedule-data";
import { CalendarView } from "@/components/CalendarView";
import { TableView } from "@/components/TableView";
import { TodayView } from "@/components/TodayView";
import { ClassManagerDialog } from "@/components/ClassManagerDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CalendarDays, List, RotateCcw, Sun, Settings, Monitor, Smartphone, Eye, Pencil, LogOut } from "lucide-react";
import { ClassFormDialog } from "@/components/ClassFormDialog";
import { useTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { deleteWithUndo } from "@/lib/delete-with-undo";

const VIEW_MODE_COOKIE = "viewMode";

function readViewModeCookie(): "mobile" | "desktop" {
  if (typeof document === "undefined") return "mobile";
  const match = document.cookie.match(new RegExp(`(?:^|; )${VIEW_MODE_COOKIE}=([^;]*)`));
  const val = match?.[1];
  return val === "desktop" || val === "mobile" ? val : "mobile";
}

function writeViewModeCookie(value: "mobile" | "desktop") {
  if (typeof document === "undefined") return;
  // 1 year
  document.cookie = `${VIEW_MODE_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

const Index = () => {
  const { classes, addClass, updateClass, deleteClass, resetSchedule, clearSchedule } = useSchedule();
  const { signOut } = useAuth();
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState<string>("ALL");
  const [locationFilter, setLocationFilter] = useState<string>("ALL");
  const [managerOpen, setManagerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"mobile" | "desktop">(readViewModeCookie);
  const [editMode, setEditMode] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ClassEntry | null>(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const { templates, saveTemplate, deleteTemplate, maxTemplates } = useTemplates();

  const handleViewModeToggle = () => {
    const next = viewMode === "mobile" ? "desktop" : "mobile";
    setViewMode(next);
    writeViewModeCookie(next);
  };

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
    setEditingEntry(entry);
    setQuickEditOpen(true);
  };

  const handleCalendarEdit = (entry: ClassEntry) => {
    setEditingEntry(entry);
    setQuickEditOpen(true);
  };

  const handleDeleteWithUndo = (id: string) => {
    const entry = classes.find((c) => c.id === id);
    if (!entry) return;
    deleteWithUndo(entry, deleteClass, addClass);
  };

  const containerClass = viewMode === "desktop" ? "max-w-5xl" : "max-w-lg";

  return (
    <div className="min-h-screen bg-background safe-area-insets">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className={`${containerClass} mx-auto px-4 py-3`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground tracking-tight">📚 Class Schedule</h1>
              <p className="text-[11px] text-muted-foreground">{classes.length} classes this semester</p>
            </div>
            <div className="flex gap-1.5 shrink-0 items-center">
              {/* Edit mode toggle */}
              <Button
                onClick={() => setEditMode(!editMode)}
                variant={editMode ? "default" : "outline"}
                size="sm"
                className="h-8 px-2.5 text-xs gap-1"
                title={editMode ? "Switch to view mode" : "Switch to edit mode"}
              >
                {editMode ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {editMode ? "Editing" : "Viewing"}
              </Button>
              {/* View mode toggle */}
              <Button
                onClick={handleViewModeToggle}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                title={viewMode === "mobile" ? "Switch to desktop view" : "Switch to mobile view"}
              >
                {viewMode === "mobile" ? <Monitor className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
              </Button>
              <Button onClick={() => setManagerOpen(true)} size="sm" className="h-8 px-2.5 text-xs">
                <Settings className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button onClick={resetSchedule} variant="outline" size="sm" className="h-8 w-8 p-0" title="Reset to default schedule">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={signOut} variant="outline" size="sm" className="h-8 w-8 p-0" title="Sign out">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className={`${containerClass} mx-auto px-4 py-3 space-y-3`}>
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
            <TodayView classes={classes} onEdit={handleEdit} editMode={editMode} />
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
              <CalendarView classes={filtered} onEdit={handleCalendarEdit} editMode={editMode} />
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
              <TableView classes={filtered} onEdit={handleEdit} onDelete={handleDeleteWithUndo} editMode={editMode} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Class Manager Dialog */}
      <ClassManagerDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
        classes={classes}
        onAdd={addClass}
        onUpdate={updateClass}
        onDelete={handleDeleteWithUndo}
        onDeleteImmediate={deleteClass}
        onClearAll={clearSchedule}
        templates={templates}
        maxTemplates={maxTemplates}
        onSaveTemplate={saveTemplate}
        onLoadTemplate={async (entries) => {
          await clearSchedule();
          for (const c of entries) {
            const { id, ...rest } = c;
            await addClass(rest);
          }
        }}
        onDeleteTemplate={deleteTemplate}
      />

      <ClassFormDialog
        open={quickEditOpen}
        onOpenChange={(open) => { setQuickEditOpen(open); if (!open) setEditingEntry(null); }}
        onSubmit={(data) => { if (editingEntry) updateClass(editingEntry.id, data); }}
        initialData={editingEntry}
      />
    </div>
  );
};

export default Index;
