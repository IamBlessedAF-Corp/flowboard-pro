import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Plus, ArrowLeft, Tags } from "lucide-react";
import { LabelManager } from "@/components/kanban/LabelManager";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { KanbanCard } from "@/components/kanban/KanbanCard";
import type { Tables } from "@/integrations/supabase/types";

type Card = Tables<"cards">;
type List = Tables<"lists">;

export default function BoardView() {
  const { id: boardId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [labelsOpen, setLabelsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const { data: board } = useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const { data, error } = await supabase.from("boards").select("*").eq("id", boardId!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!boardId,
  });

  const { data: lists = [] } = useQuery({
    queryKey: ["lists", boardId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lists").select("*").eq("board_id", boardId!).order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!boardId,
  });

  const { data: cards = [] } = useQuery({
    queryKey: ["cards", boardId],
    queryFn: async () => {
      const listIds = lists.map((l) => l.id);
      if (listIds.length === 0) return [];
      const { data, error } = await supabase.from("cards").select("*").in("list_id", listIds).order("position");
      if (error) throw error;
      return data;
    },
    enabled: lists.length > 0,
  });

  const cardsByList = useMemo(() => {
    const map: Record<string, Card[]> = {};
    lists.forEach((l) => (map[l.id] = []));
    cards.forEach((c) => {
      if (map[c.list_id]) map[c.list_id].push(c);
    });
    return map;
  }, [cards, lists]);

  const createList = useMutation({
    mutationFn: async (title: string) => {
      const maxPos = lists.reduce((max, l) => Math.max(max, l.position), -1);
      const { error } = await supabase.from("lists").insert({ board_id: boardId!, title, position: maxPos + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
      setNewListTitle("");
      setAddingList(false);
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "card") {
      setActiveCard(active.data.current.card as Card);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType !== "card") return;

    // Moving card over another card or over a column
    const activeListId = active.data.current?.card.list_id;
    let overListId: string;

    if (overType === "card") {
      overListId = over.data.current?.card.list_id;
    } else if (overType === "column") {
      overListId = over.id as string;
    } else {
      return;
    }

    if (activeListId === overListId) return;

    // Optimistically move card to new list
    queryClient.setQueryData(["cards", boardId], (old: Card[] | undefined) => {
      if (!old) return old;
      return old.map((c) => (c.id === active.id ? { ...c, list_id: overListId } : c));
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;

    if (activeType === "column") {
      // Reorder lists
      const oldIndex = lists.findIndex((l) => l.id === active.id);
      const newIndex = lists.findIndex((l) => l.id === over.id);
      if (oldIndex === newIndex) return;

      const reordered = arrayMove(lists, oldIndex, newIndex);
      queryClient.setQueryData(["lists", boardId], reordered);

      // Persist
      await Promise.all(
        reordered.map((l, i) => supabase.from("lists").update({ position: i }).eq("id", l.id))
      );
      queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
    } else if (activeType === "card") {
      const card = active.data.current?.card as Card;
      const overType = over.data.current?.type;
      let targetListId = card.list_id;

      // Get current cards state from cache
      const currentCards = queryClient.getQueryData<Card[]>(["cards", boardId]) ?? [];
      const updatedCard = currentCards.find((c) => c.id === card.id);
      if (updatedCard) targetListId = updatedCard.list_id;

      const listCards = currentCards.filter((c) => c.list_id === targetListId);
      const oldIndex = listCards.findIndex((c) => c.id === active.id);
      let newIndex = oldIndex;

      if (overType === "card") {
        newIndex = listCards.findIndex((c) => c.id === over.id);
      }

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(listCards, oldIndex, newIndex);
        await Promise.all(
          reordered.map((c, i) => supabase.from("cards").update({ position: i, list_id: targetListId }).eq("id", c.id))
        );
      } else {
        // Just update list_id and position
        const pos = listCards.length > 0 ? Math.max(...listCards.map((c) => c.position)) + 1 : 0;
        await supabase.from("cards").update({ list_id: targetListId, position: pos }).eq("id", card.id);
      }

      queryClient.invalidateQueries({ queryKey: ["cards", boardId] });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">{board?.title ?? "Board"}</h1>
        <Button variant="outline" size="sm" onClick={() => setLabelsOpen(true)}>
          <Tags className="mr-1 h-3.5 w-3.5" /> Labels
        </Button>
      </div>

      <LabelManager boardId={boardId!} open={labelsOpen} onOpenChange={setLabelsOpen} />

      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4">
            <SortableContext items={lists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
              {lists.map((list) => (
                <KanbanColumn key={list.id} list={list} cards={cardsByList[list.id] ?? []} boardId={boardId!} />
              ))}
            </SortableContext>

            {/* Add list */}
            <div className="w-72 flex-shrink-0">
              {addingList ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); createList.mutate(newListTitle || "Untitled List"); }}
                  className="rounded-xl bg-[hsl(var(--kanban-column))] p-3"
                >
                  <Input
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    placeholder="List title"
                    autoFocus
                    className="mb-2"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Add</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAddingList(false)}>Cancel</Button>
                  </div>
                </form>
              ) : (
                <Button variant="ghost" className="w-full justify-start" onClick={() => setAddingList(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add list
                </Button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeCard ? <KanbanCard card={activeCard} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
