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
import { CardLabels } from "./CardLabels";
import { CardDueDate } from "./CardDueDate";
import { CardComments, CommentCount } from "./CardComments";
import type { Tables } from "@/integrations/supabase/types";

interface KanbanCardProps {
  card: Tables<"cards"> & { due_date?: string | null };
  boardId?: string;
  isDragging?: boolean;
}

export function KanbanCard({ card, boardId, isDragging: isOverlayDragging }: KanbanCardProps) {
  const queryClient = useQueryClient();
  const [detailOpen, setDetailOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDescription, setEditDescription] = useState(card.description ?? "");
  const [editDueDate, setEditDueDate] = useState<Date | null>(card.due_date ? new Date(card.due_date) : null);

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
        .update({
          title: editTitle,
          description: editDescription || null,
          due_date: editDueDate?.toISOString() ?? null,
        } as any)
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

  const openDetail = () => {
    setEditTitle(card.title);
    setEditDescription(card.description ?? "");
    setEditDueDate(card.due_date ? new Date(card.due_date) : null);
    setDetailOpen(true);
  };

  if (isOverlayDragging) {
    return (
      <Card className="cursor-grabbing rounded-lg border bg-card p-3 shadow-lg ring-2 ring-primary/30">
        <CardLabels cardId={card.id} boardId={boardId ?? ""} mode="display" />
        <p className="text-sm font-medium">{card.title}</p>
        {card.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{card.description}</p>}
      </Card>
    );
  }

  return (
    <>
      <div ref={setNodeRef} style={style}>
        <Card className="group cursor-pointer rounded-lg border bg-card p-3 transition-shadow hover:shadow-md" onClick={openDetail}>
          <CardLabels cardId={card.id} boardId={boardId ?? ""} mode="display" />
          <div className="flex items-start gap-2">
            <button {...attributes} {...listeners} className="mt-0.5 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100">
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{card.title}</p>
              {card.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{card.description}</p>}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <CardDueDate dueDate={card.due_date ?? null} onDateChange={() => {}} mode="display" />
            <CommentCount cardId={card.id} />
          </div>
        </Card>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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

            <CardLabels cardId={card.id} boardId={boardId ?? ""} mode="edit" />
            <CardDueDate dueDate={editDueDate?.toISOString() ?? null} onDateChange={setEditDueDate} mode="edit" />

            <DialogFooter className="flex justify-between">
              <Button type="button" variant="destructive" size="sm" onClick={() => deleteCard.mutate()}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </Button>
              <Button type="submit" disabled={updateCard.isPending}>Save</Button>
            </DialogFooter>
          </form>

          <div className="border-t pt-4">
            <CardComments cardId={card.id} boardId={boardId ?? ""} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
