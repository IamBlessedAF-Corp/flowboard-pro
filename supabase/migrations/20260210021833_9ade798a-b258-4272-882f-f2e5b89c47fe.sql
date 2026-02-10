
-- Fix restrictive policies on boards to be permissive
DROP POLICY "Authenticated users can create boards" ON public.boards;
CREATE POLICY "Authenticated users can create boards" ON public.boards FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY "Board admins can update boards" ON public.boards;
CREATE POLICY "Board admins can update boards" ON public.boards FOR UPDATE
  USING (EXISTS (SELECT 1 FROM board_members WHERE board_members.board_id = boards.id AND board_members.user_id = auth.uid() AND board_members.role = 'admin'::board_role));

DROP POLICY "Board members can view boards" ON public.boards;
CREATE POLICY "Board members can view boards" ON public.boards FOR SELECT
  USING (is_board_member(auth.uid(), id));

DROP POLICY "Board owner can delete boards" ON public.boards;
CREATE POLICY "Board owner can delete boards" ON public.boards FOR DELETE
  USING (auth.uid() = owner_id);

-- Fix restrictive policies on board_members
DROP POLICY "Board admins can add members" ON public.board_members;
CREATE POLICY "Board admins can add members" ON public.board_members FOR INSERT
  WITH CHECK ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = board_members.board_id AND bm.user_id = auth.uid() AND bm.role = 'admin'::board_role)));

DROP POLICY "Board admins can remove members" ON public.board_members;
CREATE POLICY "Board admins can remove members" ON public.board_members FOR DELETE
  USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM board_members bm WHERE bm.board_id = board_members.board_id AND bm.user_id = auth.uid() AND bm.role = 'admin'::board_role)));

DROP POLICY "Board members can view members" ON public.board_members;
CREATE POLICY "Board members can view members" ON public.board_members FOR SELECT
  USING (is_board_member(auth.uid(), board_id));

-- Fix restrictive policies on cards
DROP POLICY "Board members can create cards" ON public.cards;
CREATE POLICY "Board members can create cards" ON public.cards FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM lists l WHERE l.id = cards.list_id AND is_board_member(auth.uid(), l.board_id)));

DROP POLICY "Board members can delete cards" ON public.cards;
CREATE POLICY "Board members can delete cards" ON public.cards FOR DELETE
  USING (EXISTS (SELECT 1 FROM lists l WHERE l.id = cards.list_id AND is_board_member(auth.uid(), l.board_id)));

DROP POLICY "Board members can update cards" ON public.cards;
CREATE POLICY "Board members can update cards" ON public.cards FOR UPDATE
  USING (EXISTS (SELECT 1 FROM lists l WHERE l.id = cards.list_id AND is_board_member(auth.uid(), l.board_id)));

DROP POLICY "Board members can view cards" ON public.cards;
CREATE POLICY "Board members can view cards" ON public.cards FOR SELECT
  USING (EXISTS (SELECT 1 FROM lists l WHERE l.id = cards.list_id AND is_board_member(auth.uid(), l.board_id)));

-- Fix restrictive policies on lists
DROP POLICY "Board members can create lists" ON public.lists;
CREATE POLICY "Board members can create lists" ON public.lists FOR INSERT
  WITH CHECK (is_board_member(auth.uid(), board_id));

DROP POLICY "Board members can delete lists" ON public.lists;
CREATE POLICY "Board members can delete lists" ON public.lists FOR DELETE
  USING (is_board_member(auth.uid(), board_id));

DROP POLICY "Board members can update lists" ON public.lists;
CREATE POLICY "Board members can update lists" ON public.lists FOR UPDATE
  USING (is_board_member(auth.uid(), board_id));

DROP POLICY "Board members can view lists" ON public.lists;
CREATE POLICY "Board members can view lists" ON public.lists FOR SELECT
  USING (is_board_member(auth.uid(), board_id));

-- Fix restrictive policies on profiles
DROP POLICY "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT
  USING (true);

-- Fix restrictive policy on user_roles
DROP POLICY "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);
