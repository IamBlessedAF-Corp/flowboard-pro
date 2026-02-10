
-- Add comments FK (may already exist, use IF NOT EXISTS workaround)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_user_id_fkey') THEN
    ALTER TABLE public.comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add UPDATE policy for board_members (for role changes by admins)
CREATE POLICY "Board admins can update members" ON public.board_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = board_members.board_id AND bm.user_id = auth.uid() AND bm.role = 'admin'::board_role));

-- Grant UPDATE on board_members
GRANT UPDATE ON public.board_members TO authenticated;
