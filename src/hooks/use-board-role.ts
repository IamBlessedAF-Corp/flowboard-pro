import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useBoardRole(boardId: string | undefined) {
  const { user } = useAuth();

  const { data: role } = useQuery({
    queryKey: ["board-role", boardId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_members")
        .select("role")
        .eq("board_id", boardId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role ?? null;
    },
    enabled: !!boardId && !!user?.id,
  });

  return {
    role: role ?? null,
    isAdmin: role === "admin",
    isMember: role === "admin" || role === "member",
  };
}
