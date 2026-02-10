
-- Labels
CREATE TABLE public.labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Label',
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can manage labels" ON public.labels FOR ALL USING (is_board_member(auth.uid(), board_id)) WITH CHECK (is_board_member(auth.uid(), board_id));

-- Card-Label join
CREATE TABLE public.card_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  UNIQUE(card_id, label_id)
);
ALTER TABLE public.card_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can manage card labels" ON public.card_labels FOR ALL
  USING (EXISTS (SELECT 1 FROM cards c JOIN lists l ON c.list_id = l.id WHERE c.id = card_id AND is_board_member(auth.uid(), l.board_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM cards c JOIN lists l ON c.list_id = l.id WHERE c.id = card_id AND is_board_member(auth.uid(), l.board_id)));

-- Due date on cards
ALTER TABLE public.cards ADD COLUMN due_date timestamptz;

-- Comments
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board members can view comments" ON public.comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM cards c JOIN lists l ON c.list_id = l.id WHERE c.id = card_id AND is_board_member(auth.uid(), l.board_id)));
CREATE POLICY "Board members can create comments" ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM cards c JOIN lists l ON c.list_id = l.id WHERE c.id = card_id AND is_board_member(auth.uid(), l.board_id)));
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger for comments
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
