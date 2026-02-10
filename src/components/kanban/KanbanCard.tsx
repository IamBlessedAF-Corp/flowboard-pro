import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, GripVertical } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface KanbanCardProps {
  card: Tables<"cards">;
  boardId?: string;
  isDragging?: boolean;
}

export function KanbanCard({ card, boardId, isDragging: isOverlayDragging }: KanbanCardProps) {
  const queryClient = useQueryClient();
  const [detailOpen, setDetailOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDescription, setEditDescription] = useState(card.description ?? "");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const updateCard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("cards")
        .update({ title: editTitle, description: editDescription || null })
        .eq("id", card.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", boardId] });
      setDetailOpen(false);
      toast({ title: "Card updated" });
    },
  });

  const deleteCard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cards").delete().eq("id", card.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", boardId] });
      setDetailOpen(false);
      toast({ title: "Card deleted" });
    },
  });

  if (isOverlayDragging) {
    return (
      <Card className="cursor-grabbing rounded-lg border bg-card p-3 shadow-lg ring-2 ring-primary/30">
        <p className="text-sm font-medium">{card.title}</p>
        {card.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{card.description}</p>}
      </Card>
    );
  }

  return (
    <>
      <div ref={setNodeRef} style={style}>
        <Card
          className="group cursor-pointer rounded-lg border bg-card p-3 transition-shadow hover:shadow-md"
          onClick={() => { setEditTitle(card.title); setEditDescription(card.description ?? ""); setDetailOpen(true); }}
        >
          <div className="flex items-start gap-2">
            <button {...attributes} {...listeners} className="mt-0.5 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100">
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{card.title}</p>
              {card.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{card.description}</p>}
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Card</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateCard.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} placeholder="Add a description…" />
            </div>
            <DialogFooter className="flex justify-between">
              <Button type="button" variant="destructive" size="sm" onClick={() => deleteCard.mutate()}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </Button>
              <Button type="submit" disabled={updateCard.isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
