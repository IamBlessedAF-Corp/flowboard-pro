
# Phase 2: Labels, Due Dates, and Comments ✅ COMPLETE

Enhance cards with richer metadata -- color-coded labels, due dates with visual indicators, and a comment thread per card.

---

# Phase 3: Real-time Collaboration & Advanced Permissions ✅ COMPLETE

## 1. Real-time Sync
- Enabled Supabase Realtime on `cards`, `lists`, `comments`, `card_labels`, `labels`, `board_members`
- `useBoardRealtime` hook auto-invalidates queries when any collaborator makes changes

## 2. Member Management
- "Members" dialog in board header
- View all members with roles (admin/member)
- Admins can invite members by email/display name
- Admins can remove members and toggle roles
- UPDATE policy added for board_members

## 3. Role-based UI Guards
- `useBoardRole` hook provides `isAdmin` / `isMember` flags
- Delete list action hidden for non-admins
- Member management invite/remove restricted to admins
- Role toggle restricted to admins

## 4. Presence Indicators
- `useBoardPresence` hook tracks online users via Supabase Realtime Presence
- Avatars shown in board header with tooltips
- Online status indicator (green dot)

---

## New Files (Phase 3)
- `src/hooks/use-board-realtime.ts` — realtime subscription hook
- `src/hooks/use-board-presence.ts` — presence tracking hook
- `src/hooks/use-board-role.ts` — role checking hook
- `src/components/kanban/MemberManager.tsx` — member CRUD dialog
- `src/components/kanban/BoardPresence.tsx` — online user avatars

## Modified Files (Phase 3)
- `src/pages/BoardView.tsx` — integrated all Phase 3 hooks and components
- `src/components/kanban/KanbanColumn.tsx` — added `isAdmin` prop for role guards
