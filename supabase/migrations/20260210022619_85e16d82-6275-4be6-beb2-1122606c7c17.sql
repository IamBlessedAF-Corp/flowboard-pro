
-- Grant permissions to authenticated and anon roles on all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.labels TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.card_labels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;

-- Anon needs no access (auth required)
GRANT SELECT ON public.profiles TO anon;
