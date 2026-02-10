import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

interface PresenceState {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useBoardPresence(boardId: string | undefined) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!boardId || !user) return;

    const channel = supabase.channel(`presence-${boardId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const users: PresenceState[] = [];
        const seen = new Set<string>();
        for (const key of Object.keys(state)) {
          const presences = state[key];
          if (presences && presences.length > 0 && !seen.has(presences[0].user_id)) {
            seen.add(presences[0].user_id);
            users.push(presences[0]);
          }
        }
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            display_name: profile?.display_name ?? user.email ?? "User",
            avatar_url: profile?.avatar_url ?? null,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, user, profile]);

  return onlineUsers;
}
