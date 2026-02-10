import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CardLabelsProps {
  cardId: string;
  boardId: string;
  mode: "display" | "edit";
}

interface Label {
  id: string;
  board_id: string;
  name: string;
  color: string;
  created_at: string;
}

export function CardLabels({ cardId, boardId, mode }: CardLabelsProps) {
  const queryClient = useQueryClient();

  const { data: boardLabels = [] } = useQuery<Label[]>({
    queryKey: ["labels", boardId],
    queryFn: async () => {
      const { data, error } = await supabase.from("labels").select("*").eq("board_id", boardId).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!boardId,
  });

  const { data: cardLabelIds = [] } = useQuery<string[]>({
    queryKey: ["card-labels", cardId],
    queryFn: async () => {
      const { data, error } = await supabase.from("card_labels").select("label_id").eq("card_id", cardId);
      if (error) throw error;
      return data.map((cl) => cl.label_id);
    },
    enabled: !!cardId,
  });

  const toggleLabel = useMutation({
    mutationFn: async (labelId: string) => {
      if (cardLabelIds.includes(labelId)) {
        const { error } = await supabase.from("card_labels").delete().eq("card_id", cardId).eq("label_id", labelId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("card_labels").insert({ card_id: cardId, label_id: labelId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-labels", cardId] });
    },
  });

  const assignedLabels = boardLabels.filter((l) => cardLabelIds.includes(l.id));

  if (mode === "display") {
    if (assignedLabels.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {assignedLabels.map((label) => (
          <span key={label.id} className="inline-block h-2 w-6 rounded-full" style={{ backgroundColor: label.color }} title={label.name} />
        ))}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">Labels</p>
      <div className="flex flex-wrap gap-1.5">
        {boardLabels.map((label) => {
          const selected = cardLabelIds.includes(label.id);
          return (
            <button
              key={label.id}
              onClick={() => toggleLabel.mutate(label.id)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white transition-opacity ${selected ? "opacity-100 ring-2 ring-foreground/30" : "opacity-50"}`}
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </button>
          );
        })}
        {boardLabels.length === 0 && <span className="text-xs text-muted-foreground">No labels yet. Manage labels from the board header.</span>}
      </div>
    </div>
  );
}
