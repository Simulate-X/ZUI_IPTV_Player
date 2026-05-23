-- ─────────────────────────────────────────────────────────────────────────────
-- ZUI IPTV Player · Cloud Sync — Migration v1.0 → v1.1
--
-- Run this in your Supabase SQL Editor ONLY if you already ran schema.sql
-- before 2026-05-23. New installs should use schema.sql directly.
--
-- What changed:
--   • playlists.device_key column: NOT NULL → nullable (legacy; no longer used
--     for auth — kept for backward compatibility with older web companion builds)
--   • All 4 playlists RLS policies rewritten to verify caller via JOIN to the
--     devices table instead of the stored device_key column.
--
-- Why: the old approach stored device_key in every playlist row. If the TV's
-- key rotated (serial change, reinstall), old rows became permanently
-- inaccessible because the SELECT policy compared the stale stored key against
-- the new header value. The JOIN approach fixes this: authentication always
-- reads from devices.device_key, so a single UPDATE to that row covers all
-- existing playlists automatically.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Relax the playlists.device_key column constraint ──────────────────────
ALTER TABLE public.playlists
  ALTER COLUMN device_key DROP NOT NULL,
  ALTER COLUMN device_key SET DEFAULT NULL;

-- ── 2. Drop the four old playlists policies ───────────────────────────────────
DROP POLICY IF EXISTS "playlists: insert own" ON public.playlists;
DROP POLICY IF EXISTS "playlists: select own" ON public.playlists;
DROP POLICY IF EXISTS "playlists: update own" ON public.playlists;
DROP POLICY IF EXISTS "playlists: delete own" ON public.playlists;

-- ── 3. Recreate policies using devices JOIN ───────────────────────────────────

CREATE POLICY "playlists: insert own"
  ON public.playlists FOR INSERT
  WITH CHECK (
    device_id = public.zui_device_id() AND
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.device_id  = public.zui_device_id()
        AND d.device_key = public.zui_device_key()
    )
  );

CREATE POLICY "playlists: select own"
  ON public.playlists FOR SELECT
  USING (
    device_id = public.zui_device_id() AND
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.device_id  = public.zui_device_id()
        AND d.device_key = public.zui_device_key()
    )
  );

CREATE POLICY "playlists: update own"
  ON public.playlists FOR UPDATE
  USING (
    device_id = public.zui_device_id() AND
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.device_id  = public.zui_device_id()
        AND d.device_key = public.zui_device_key()
    )
  )
  WITH CHECK (
    device_id = public.zui_device_id() AND
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.device_id  = public.zui_device_id()
        AND d.device_key = public.zui_device_key()
    )
  );

CREATE POLICY "playlists: delete own"
  ON public.playlists FOR DELETE
  USING (
    device_id = public.zui_device_id() AND
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.device_id  = public.zui_device_id()
        AND d.device_key = public.zui_device_key()
    )
  );

-- ── Done ──────────────────────────────────────────────────────────────────────
-- Verify with: SELECT policyname, cmd FROM pg_policies WHERE tablename = 'playlists';
