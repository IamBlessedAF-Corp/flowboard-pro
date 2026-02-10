import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Pencil, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CardCommentsProps {
  cardId: string;
  boardId: string;
}

interface CommentWithProfile {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
}

export function CardComments({ cardId, boardId }: CardCommentsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: comments = [] } = useQuery<CommentWithProfile[]>({
    queryKey: ["comments", cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles!comments_user_id_fkey(display_name, avatar_url)")
        .eq("card_id", cardId)
        .order("created_at", { ascending: true });
      if (error) {
        // Fallback without join if FK doesn't exist
        const { data: d2, error: e2 } = await supabase.from("comments").select("*").eq("card_id", cardId).order("created_at");
        if (e2) throw e2;
        return (d2 as any[]).map((c) => ({ ...c, profiles: null }));
      }
      return data as any;
    },
    enabled: !!cardId,
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("comments").insert({ card_id: cardId, user_id: user!.id, content: newComment });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", cardId] });
      setNewComment("");
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from("comments").update({ content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", cardId] });
      setEditingId(null);
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", cardId] });
    },
  });

  const initials = (name: string | null) => (name ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Comments ({comments.length})</p>
      </div>

      {/* Comment list */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2">
            <Avatar className="h-6 w-6 mt-0.5">
              <AvatarImage src={comment.profiles?.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">{initials(comment.profiles?.display_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{comment.profiles?.display_name ?? "User"}</span>
                <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
              </div>
              {editingId === comment.id ? (
                <div className="mt-1 space-y-1">
                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={2} className="text-xs" />
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => updateComment.mutate({ id: comment.id, content: editContent })}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
              )}
              {comment.user_id === user?.id && editingId !== comment.id && (
                <div className="flex gap-1 mt-0.5">
                  <button className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}>
                    <Pencil className="h-2.5 w-2.5 inline mr-0.5" />Edit
                  </button>
                  <button className="text-[10px] text-muted-foreground hover:text-destructive" onClick={() => deleteComment.mutate(comment.id)}>
                    <Trash2 className="h-2.5 w-2.5 inline mr-0.5" />Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New comment */}
      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment…"
          rows={2}
          className="text-xs"
        />
        <Button size="sm" disabled={!newComment.trim() || addComment.isPending} onClick={() => addComment.mutate()} className="self-end">
          Post
        </Button>
      </div>
    </div>
  );
}

export function CommentCount({ cardId }: { cardId: string }) {
  const { data: count = 0 } = useQuery({
    queryKey: ["comment-count", cardId],
    queryFn: async () => {
      const { count, error } = await supabase.from("comments").select("*", { count: "exact", head: true }).eq("card_id", cardId);
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
      <MessageSquare className="h-3 w-3" /> {count}
    </span>
  );
}
