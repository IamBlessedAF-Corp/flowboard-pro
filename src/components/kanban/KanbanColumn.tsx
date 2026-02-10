import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "./KanbanCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

interface KanbanColumnProps {
  list: Tables<"lists">;
  cards: Tables<"cards">[];
  boardId: string;
  isAdmin?: boolean;
}

export function KanbanColumn({ list, cards, boardId, isAdmin = true }: KanbanColumnProps) {
  const queryClient = useQueryClient();
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);

  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { type: "column", list },
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: list.id,
    data: { type: "column", list },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const createCard = useMutation({
    mutationFn: async (title: string) => {
      const maxPos = cards.reduce((max, c) => Math.max(max, c.position), -1);
      const { error } = await supabase.from("cards").insert({ list_id: list.id, title, position: maxPos + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", boardId] });
      setNewCardTitle("");
      setAddingCard(false);
    },
  });

  const renameList = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("lists").update({ title }).eq("id", list.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
      setEditing(false);
    },
  });

  const deleteList = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lists").delete().eq("id", list.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
      toast({ title: "List deleted" });
    },
  });

  return (
    <div ref={setSortableRef} style={style} className="w-72 flex-shrink-0">
      <div ref={setDropRef} className="flex flex-col rounded-xl bg-[hsl(var(--kanban-column))] p-3">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between" {...attributes} {...listeners}>
          {editing ? (
            <form onSubmit={(e) => { e.preventDefault(); renameList.mutate(editTitle); }} className="flex-1">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
                onBlur={() => renameList.mutate(editTitle)}
                className="h-7 text-sm font-semibold"
              />
            </form>
          ) : (
            <h3 className="text-sm font-semibold text-foreground">{list.title}</h3>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setEditing(true); setEditTitle(list.title); }}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem className="text-destructive" onClick={() => deleteList.mutate()}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-2">
          <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <KanbanCard key={card.id} card={card} boardId={boardId} />
            ))}
          </SortableContext>
        </div>

        {/* Add card */}
        <div className="mt-2">
          {addingCard ? (
            <form onSubmit={(e) => { e.preventDefault(); createCard.mutate(newCardTitle || "Untitled Card"); }}>
              <Input
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Card title"
                autoFocus
                className="mb-2"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm">Add</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAddingCard(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setAddingCard(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add card
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
