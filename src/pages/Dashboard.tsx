import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ["boards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("boards").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createBoard = useMutation({
    mutationFn: async (title: string) => {
      // Create board
      const { data: board, error } = await supabase
        .from("boards")
        .insert({ title, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      // Add creator as admin member
      const { error: memberError } = await supabase
        .from("board_members")
        .insert({ board_id: board.id, user_id: user!.id, role: "admin" });
      if (memberError) throw memberError;
      return board;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      setCreateOpen(false);
      setNewTitle("");
      toast({ title: "Board created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const renameBoard = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("boards").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      setRenameId(null);
      toast({ title: "Board renamed" });
    },
  });

  const deleteBoard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast({ title: "Board deleted" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Your Boards</h1>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Board
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-muted-foreground">No boards yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Card
                key={board.id}
                className="group cursor-pointer transition-shadow hover:shadow-md"
                style={{ borderLeftColor: board.background_color, borderLeftWidth: 4 }}
                onClick={() => navigate(`/board/${board.id}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between p-4">
                  <CardTitle className="text-base font-medium">{board.title}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => { setRenameId(board.id); setRenameTitle(board.title); }}>
                        <Pencil className="mr-2 h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteBoard.mutate(board.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Board</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createBoard.mutate(newTitle || "Untitled Board"); }}>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Board title" autoFocus className="mb-4" />
            <DialogFooter>
              <Button type="submit" disabled={createBoard.isPending}>{createBoard.isPending ? "Creating…" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameId} onOpenChange={() => setRenameId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Board</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (renameId) renameBoard.mutate({ id: renameId, title: renameTitle }); }}>
            <Input value={renameTitle} onChange={(e) => setRenameTitle(e.target.value)} autoFocus className="mb-4" />
            <DialogFooter>
              <Button type="submit" disabled={renameBoard.isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
