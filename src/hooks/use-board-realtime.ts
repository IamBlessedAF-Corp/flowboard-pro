import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes for a board's data.
 * Invalidates relevant queries when changes are detected.
 */
export function useBoardRealtime(boardId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!boardId) return;

    const channel = supabase
      .channel(`board-${boardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lists", filter: `board_id=eq.${boardId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["lists", boardId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, () => {
        queryClient.invalidateQueries({ queryKey: ["cards", boardId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        // Invalidate all comment queries (count + detail)
        queryClient.invalidateQueries({ queryKey: ["comments"] });
        queryClient.invalidateQueries({ queryKey: ["comment-count"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "card_labels" }, () => {
        queryClient.invalidateQueries({ queryKey: ["card-labels"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "labels", filter: `board_id=eq.${boardId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["labels", boardId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "board_members", filter: `board_id=eq.${boardId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["board-members", boardId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, queryClient]);
}
