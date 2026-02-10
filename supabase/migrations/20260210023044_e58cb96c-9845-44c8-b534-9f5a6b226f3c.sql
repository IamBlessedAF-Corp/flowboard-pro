
-- Fix: boards SELECT policy must also allow owner (for INSERT RETURNING to work)
DROP POLICY "Board members can view boards" ON public.boards;
CREATE POLICY "Board members can view boards" ON public.boards FOR SELECT
  USING (auth.uid() = owner_id OR is_board_member(auth.uid(), id));
