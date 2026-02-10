import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil } from "lucide-react";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#64748b", "#f43f5e",
];

interface LabelManagerProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LabelManager({ boardId, open, onOpenChange }: LabelManagerProps) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[4]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const { data: labels = [] } = useQuery({
    queryKey: ["labels", boardId],
    queryFn: async () => {
      const { data, error } = await supabase.from("labels").select("*").eq("board_id", boardId).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!boardId,
  });

  const createLabel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("labels").insert({ board_id: boardId, name: newName || "Label", color: newColor });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      setNewName("");
    },
  });

  const updateLabel = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { error } = await supabase.from("labels").update({ name, color }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      setEditingId(null);
    },
  });

  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("labels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      toast({ title: "Label deleted" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Manage Labels</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {labels.map((label) => (
            <div key={label.id} className="flex items-center gap-2">
              {editingId === label.id ? (
                <>
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`h-5 w-5 rounded-full border-2 ${editColor === c ? "border-foreground" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setEditColor(c)}
                      />
                    ))}
                  </div>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 flex-1 text-sm" />
                  <Button size="sm" variant="ghost" onClick={() => updateLabel.mutate({ id: label.id, name: editName, color: editColor })}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <span className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <span className="flex-1 text-sm">{label.name}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(label.id); setEditName(label.name); setEditColor(label.color); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteLabel.mutate(label.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}

          {/* Create new label */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={`h-5 w-5 rounded-full border-2 ${newColor === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Label name" className="h-8 text-sm" />
              <Button size="sm" onClick={() => createLabel.mutate()}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
