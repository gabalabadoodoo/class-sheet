import { useState, useMemo } from "react";
import { ClassEntry, getClassColor } from "@/lib/schedule-data";
import { ClassFormDialog } from "@/components/ClassFormDialog";
import { ScheduleTemplate } from "@/hooks/useTemplates";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Calendar, FlaskConical, ChevronDown, ChevronRight, AlertTriangle, Upload, Save, FolderOpen, FileSpreadsheet } from "lucide-react";
import { ImportScheduleDialog } from "@/components/ImportScheduleDialog";
import { CsvImportDialog } from "@/components/CsvImportDialog";
import { toast } from "sonner";

interface ClassManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassEntry[];
  onAdd: (data: Omit<ClassEntry, "id">) => void;
  onUpdate: (id: string, data: Omit<ClassEntry, "id">) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  templates: ScheduleTemplate[];
  maxTemplates: number;
  onSaveTemplate: (name: string, classes: ClassEntry[]) => boolean;
  onLoadTemplate: (classes: ClassEntry[]) => void;
  onDeleteTemplate: (id: string) => void;
}

interface GroupedClass {
  name: string;
  entries: ClassEntry[];
}

export function ClassManagerDialog({ open, onOpenChange, classes, onAdd, onUpdate, onDelete, onClearAll, templates, maxTemplates, onSaveTemplate, onLoadTemplate, onDeleteTemplate }: ClassManagerDialogProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ClassEntry | null>(null);
  const [prefill, setPrefill] = useState<Partial<Omit<ClassEntry, "id">> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showTemplates, setShowTemplates] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [loadTemplateId, setLoadTemplateId] = useState<string | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const grouped = useMemo<GroupedClass[]>(() => {
    const map = new Map<string, ClassEntry[]>();
    classes.forEach((c) => {
      const key = c.className;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    // Group parent and LAB together
    const result: GroupedClass[] = [];
    const processed = new Set<string>();
    
    for (const [name, entries] of map) {
      if (processed.has(name)) continue;
      // Check if this is a LAB variant
      const baseName = name.replace(/ LAB$/, "");
      const labName = baseName + " LAB";
      
      if (name === labName && map.has(baseName) && !processed.has(baseName)) {
        // Will be handled by parent
        continue;
      }
      
      const combined: ClassEntry[] = [...entries];
      if (map.has(labName) && labName !== name) {
        combined.push(...map.get(labName)!);
        processed.add(labName);
      }
      processed.add(name);
      result.push({ name: baseName, entries: combined });
    }
    
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [classes]);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleAddNew = () => {
    setEditingEntry(null);
    setPrefill(null);
    setFormOpen(true);
  };

  const handleAddSchedule = (group: GroupedClass) => {
    // Pre-fill with group's class info
    const sample = group.entries[0];
    setEditingEntry(null);
    setPrefill({
      className: sample.className,
      classId: sample.classId,
    });
    setFormOpen(true);
  };

  const handleAddLab = (group: GroupedClass) => {
    const sample = group.entries[0];
    const labName = group.name + " LAB";
    setEditingEntry(null);
    setPrefill({
      className: labName,
      classId: sample.classId + "L",
    });
    setFormOpen(true);
  };

  const handleEdit = (entry: ClassEntry) => {
    setEditingEntry(entry);
    setPrefill(null);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: Omit<ClassEntry, "id">) => {
    if (editingEntry) {
      onUpdate(editingEntry.id, data);
    } else {
      onAdd(data);
    }
    setEditingEntry(null);
    setPrefill(null);
  };

  const dayShort = (day: string) => day.slice(0, 3);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Manage Classes</span>
              <div className="flex gap-1.5">
                <Button onClick={() => setImportOpen(true)} variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <Upload className="h-3.5 w-3.5" /> Import
                </Button>
                <Button onClick={() => setCsvImportOpen(true)} variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                </Button>
                <Button onClick={() => setClearAllOpen(true)} variant="destructive" size="sm" className="h-8 text-xs gap-1" disabled={classes.length === 0}>
                  <Trash2 className="h-3.5 w-3.5" /> Clear All
                </Button>
                <Button onClick={handleAddNew} size="sm" className="h-8 text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" /> New Class
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Templates Section */}
          <div className="border border-border rounded-lg p-3 space-y-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="flex-1 text-left">Templates ({templates.length}/{maxTemplates})</span>
              {showTemplates ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>

            {showTemplates && (
              <div className="space-y-2 pt-1">
                {/* Save current */}
                <div className="flex gap-1.5">
                  <Input
                    placeholder="Template name..."
                    value={saveTemplateName}
                    onChange={(e) => setSaveTemplateName(e.target.value)}
                    className="h-8 text-xs flex-1"
                    maxLength={30}
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1 shrink-0"
                    disabled={!saveTemplateName.trim() || classes.length === 0 || templates.length >= maxTemplates}
                    onClick={() => {
                      const ok = onSaveTemplate(saveTemplateName.trim(), classes);
                      if (ok) {
                        toast.success(`Template "${saveTemplateName.trim()}" saved`);
                        setSaveTemplateName("");
                      } else {
                        toast.error(`Max ${maxTemplates} templates reached`);
                      }
                    }}
                  >
                    <Save className="h-3.5 w-3.5" /> Save
                  </Button>
                </div>

                {templates.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-2">No saved templates</p>
                ) : (
                  <div className="space-y-1">
                    {templates.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 bg-muted/50 rounded-md px-2.5 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {t.classes.length} classes · {new Date(t.savedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1 shrink-0"
                          onClick={() => setLoadTemplateId(t.id)}
                        >
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setDeleteTemplateId(t.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-1">
            {grouped.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">No classes yet. Add one!</p>
            )}

            {grouped.map((group) => {
              const isExpanded = expandedGroups.has(group.name);
              const color = getClassColor(group.entries[0].className);
              const hasLab = group.entries.some((e) => e.className.endsWith(" LAB"));
              const lecEntries = group.entries.filter((e) => !e.className.endsWith(" LAB") || e.className === group.name);
              const labEntries = group.entries.filter((e) => e.className.endsWith(" LAB") && e.className !== group.name);

              return (
                <div key={group.name} className="border border-border rounded-lg overflow-hidden">
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className="w-full flex items-center gap-2 p-3 hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-semibold text-sm text-foreground flex-1 truncate">{group.name}</span>
                    <span className="text-[10px] text-muted-foreground mr-1">
                      {group.entries.length} schedule{group.entries.length > 1 ? "s" : ""}
                    </span>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30">
                      {/* Lecture schedules */}
                      {group.entries.filter(e => {
                        // Show entries that belong to the base class name or LEC variant
                        const baseName = group.name;
                        return e.className === baseName || e.className === baseName + " LEC";
                      }).length > 0 && (
                        <div className="px-3 pt-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Lecture</p>
                        </div>
                      )}
                      
                      {group.entries.map((entry) => {
                        const isLab = entry.className.endsWith(" LAB");
                        
                        return (
                          <div key={entry.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                            {isLab && (
                              <span className="text-[9px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded font-medium shrink-0">LAB</span>
                            )}
                            <span className="text-muted-foreground w-8 shrink-0">{dayShort(entry.day)}</span>
                            <span className="text-foreground flex-1 truncate">
                              {entry.startTime} – {entry.endTime}
                            </span>
                            <span className="text-muted-foreground truncate max-w-[80px]">{entry.location}</span>
                            <div className="flex shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(entry)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(entry.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Action buttons */}
                      <div className="flex gap-2 px-3 py-2 border-t border-border">
                        <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 flex-1" onClick={() => handleAddSchedule(group)}>
                          <Calendar className="h-3 w-3" /> Add Schedule
                        </Button>
                        {!hasLab && (
                          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 flex-1" onClick={() => handleAddLab(group)}>
                            <FlaskConical className="h-3 w-3" /> Add Lab
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Form dialog */}
      <ClassFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) { setEditingEntry(null); setPrefill(null); } }}
        onSubmit={handleFormSubmit}
        initialData={editingEntry}
        prefill={prefill}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) onDelete(deleteId); setDeleteId(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all confirmation */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Clear all classes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all {classes.length} classes from your schedule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { onClearAll(); setClearAllOpen(false); }}>
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Load template confirmation */}
      <AlertDialog open={!!loadTemplateId} onOpenChange={(open) => !open && setLoadTemplateId(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" /> Load template?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current schedule with the saved template. Make sure to save your current schedule first if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const t = templates.find((t) => t.id === loadTemplateId);
              if (t) {
                onLoadTemplate(t.classes);
                toast.success(`Template "${t.name}" loaded`);
              }
              setLoadTemplateId(null);
            }}>
              Load
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete template confirmation */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (deleteTemplateId) {
                const t = templates.find((t) => t.id === deleteTemplateId);
                onDeleteTemplate(deleteTemplateId);
                toast.success(`Template "${t?.name}" deleted`);
              }
              setDeleteTemplateId(null);
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import dialog */}
      <ImportScheduleDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={(entries) => entries.forEach((e) => onAdd(e))}
      />

      {/* CSV import dialog */}
      <CsvImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        onImport={(entries) => entries.forEach((e) => onAdd(e))}
      />
    </>
  );
}
