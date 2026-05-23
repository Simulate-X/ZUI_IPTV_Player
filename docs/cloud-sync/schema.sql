-- ─────────────────────────────────────────────────────────────────────────────
-- ZUI IPTV Player · Cloud Sync Schema
-- Run this once in your Supabase project's SQL Editor.
--
-- Tables:   devices, playlists
-- Security: Row Level Security (RLS) enforces that a caller must know BOTH
--           the device_id AND the device_key to read or write any row.
--           device_id alone is never sufficient.
--
-- Auth mechanism: the TV app and the web companion create a Supabase client
-- with two custom HTTP headers:
--   x-zui-device-id  — short device identifier (e.g. "A1B2-C3D4")
--   x-zui-device-key — 6-char key derived from the TV's serial number
--
-- PostgREST (≥ v9) exposes incoming headers inside PostgreSQL as
--   current_setting('request.headers', true)::json->>'header-name'
-- The helper functions below read those values so RLS policies can use them.
--
-- NOTE: Functions are created in the public schema (not auth) because
-- Supabase hosted projects restrict writes to the auth schema.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════════
-- 0. Helper functions — read device identity from request headers
-- ═══════════════════════════════════════════════════════════════════════════════

-- Returns the x-zui-device-id header value, or NULL if absent.
CREATE OR REPLACE FUNCTION public.zui_device_id()
  RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT NULLIF(
    (current_setting('request.headers', true)::json)->>'x-zui-device-id',
    ''
  );
$$;

-- Returns the x-zui-device-key header value, or NULL if absent.
CREATE OR REPLACE FUNCTION public.zui_device_key()
  RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT NULLIF(
    (current_setting('request.headers', true)::json)->>'x-zui-device-key',
    ''
  );
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. devices — one row per TV, written by the TV app on first launch
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.devices (
  device_id   TEXT PRIMARY KEY,          -- short id e.g. "A1B2-C3D4"
  device_key  TEXT NOT NULL,             -- 6-char key derived from MAC
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- A TV may register (insert) itself when it knows its own id + key.
CREATE POLICY "devices: self insert"
  ON public.devices FOR INSERT
  WITH CHECK (
    device_id  = public.zui_device_id() AND
    device_key = public.zui_device_key()
  );

-- A TV may update its own row (key rotation, etc.).
CREATE POLICY "devices: self update"
  ON public.devices FOR UPDATE
  USING (
    device_id  = public.zui_device_id() AND
    device_key = public.zui_device_key()
  )
  WITH CHECK (
    device_id  = public.zui_device_id() AND
    device_key = public.zui_device_key()
  );

-- A caller may read only the row whose id AND key both match the headers.
-- This lets the web companion verify credentials without exposing other devices.
CREATE POLICY "devices: self select"
  ON public.devices FOR SELECT
  USING (
    device_id  = public.zui_device_id() AND
    device_key = public.zui_device_key()
  );

-- No DELETE policy — devices are never removed through the app.


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. playlists — URLs pushed from phone/browser to the TV
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.playlists (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id        TEXT        NOT NULL REFERENCES public.devices (device_id) ON DELETE CASCADE,
  device_key       TEXT        DEFAULT NULL, -- legacy column; auth now via devices JOIN (see policies)
  playlist_url     TEXT        NOT NULL,
  playlist_name    TEXT,
  source_type      TEXT        NOT NULL DEFAULT 'm3u', -- 'm3u' | 'xtream'
  xtream_username  TEXT,
  xtream_password  TEXT,
  loaded           BOOLEAN     NOT NULL DEFAULT false,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- ── Auth helper — verifies caller's headers match a registered device ─────────
-- All playlists policies use this JOIN instead of the stored device_key column.
-- Benefit: key rotation (updating devices.device_key) automatically keeps all
-- existing playlist rows accessible — no orphaned rows.

-- ── INSERT — caller must present headers matching a registered device ──────────
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

-- ── SELECT — only rows belonging to the authenticated device ──────────────────
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

-- ── UPDATE — only own rows (TV marks playlist as loaded=true) ─────────────────
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

-- ── DELETE — web companion can remove sent playlists ─────────────────────────
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


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Realtime — enable postgres_changes on the playlists table
-- ═══════════════════════════════════════════════════════════════════════════════

-- In the Supabase dashboard: Database → Replication → enable "playlists" table.
-- Or run:
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Indexes
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS playlists_device_loaded_idx
  ON public.playlists (device_id, loaded, sent_at);


-- ═══════════════════════════════════════════════════════════════════════════════
-- Done!
-- Next step: copy your project URL and anon key into the TV app and web
-- companion as described in README.md § Cloud Sync (Optional Self-Hosted Setup).
-- ═══════════════════════════════════════════════════════════════════════════════
