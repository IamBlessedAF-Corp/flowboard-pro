import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Crown } from "lucide-react";

interface MemberManagerProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

interface MemberWithProfile {
  id: string;
  user_id: string;
  role: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
}

export function MemberManager({ boardId, open, onOpenChange, isAdmin }: MemberManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: members = [] } = useQuery<MemberWithProfile[]>({
    queryKey: ["board-members", boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_members")
        .select("id, user_id, role, profiles!board_members_user_id_fkey(display_name, avatar_url)")
        .eq("board_id", boardId);
      if (error) {
        // Fallback without join
        const { data: d2, error: e2 } = await supabase.from("board_members").select("*").eq("board_id", boardId);
        if (e2) throw e2;
        return (d2 as any[]).map((m) => ({ ...m, profiles: null }));
      }
      return data as any;
    },
    enabled: !!boardId && open,
  });

  const inviteMember = useMutation({
    mutationFn: async (email: string) => {
      // Find user by email in profiles (we can't query auth.users)
      // Look up by matching profiles display_name or try a broader approach
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .limit(100);
      if (profileError) throw profileError;

      // We need to find by email — check auth via a lookup
      // Since we can't query auth.users, we'll use a workaround:
      // The user must have signed up already. We'll try to find them by checking
      // if their profile display_name matches the email (set during signup).
      const match = profileData?.find((p) => p.display_name?.toLowerCase() === email.toLowerCase());
      if (!match) throw new Error("User not found. They must sign up first.");

      // Check if already a member
      const existing = members.find((m) => m.user_id === match.user_id);
      if (existing) throw new Error("User is already a member of this board.");

      const { error } = await supabase.from("board_members").insert({
        board_id: boardId,
        user_id: match.user_id,
        role: "member",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-members", boardId] });
      setInviteEmail("");
      toast({ title: "Member added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("board_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-members", boardId] });
      toast({ title: "Member removed" });
    },
  });

  const toggleRole = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await supabase.from("board_members").update({ role: newRole } as any).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-members", boardId] });
      toast({ title: "Role updated" });
    },
  });

  const initials = (name: string | null) => (name ?? "?").slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Board Members</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {/* Member list */}
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.profiles?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">{initials(member.profiles?.display_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.profiles?.display_name ?? "User"}</p>
              </div>
              <Badge variant={member.role === "admin" ? "default" : "secondary"} className="text-[10px]">
                {member.role === "admin" && <Crown className="mr-1 h-2.5 w-2.5" />}
                {member.role}
              </Badge>
              {isAdmin && member.user_id !== user?.id && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title={member.role === "admin" ? "Demote to member" : "Promote to admin"}
                    onClick={() => toggleRole.mutate({
                      memberId: member.id,
                      newRole: member.role === "admin" ? "member" : "admin",
                    })}
                  >
                    <Crown className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeMember.mutate(member.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Invite */}
          {isAdmin && (
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-2">Invite by display name or email</p>
              <div className="flex gap-2">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="User email or display name"
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  disabled={!inviteEmail.trim() || inviteMember.isPending}
                  onClick={() => inviteMember.mutate(inviteEmail.trim())}
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" /> Invite
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
