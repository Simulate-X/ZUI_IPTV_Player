# ZUI IPTV Player

An open-source IPTV player for LG webOS TVs (webOS 6.x, NANO81 series).

---

## Installation

### Prerequisites

- NVM for Windows
- Node 16.20.2 (for the webOS CLI) and Node 24 (for building), both managed via NVM

### First-time setup

```powershell
# Install Node versions
nvm install 16.20.2
nvm install 24

# Install the webOS CLI GLOBALLY with Node 16
nvm use 16.20.2
npm install -g @webos-tools/cli

# Install repo dependencies (Node 24 for the build toolchain)
nvm use 24
npm install
```

### Connecting to the TV (one-time)

1. Open the **Developer Mode** app on the TV (install it from the LG Content Store).
2. Enable Dev Mode and note down the **IP address** and **Passphrase**.
3. Register the device on your computer:

```powershell
nvm use 16.20.2
ares-setup-device
```

In the interactive wizard:
- Device name: `tv`
- Host: TV's IP address
- Port: `9922`
- SSH user: `prisoner`
- Authentication: `password`
- Password: the passphrase shown in the TV's Dev Mode app

4. Download the SSH private key:

```powershell
ares-novacom --device tv --getkey
# You will be prompted for the passphrase (from the Dev Mode app again)
```

The key is saved to `~/.ssh/tv_webos`.

5. Verify the connection:

```powershell
ares-device-info --device tv
```

The output should show fields like `modelName`, `productName`, and `sdkVersion`.

---

## Development

```powershell
nvm use 24
npm run dev               # Starts the Vite dev server at localhost:5173
```

---

## Deploying to the TV

```powershell
.\scripts\deploy.ps1      # Build (Node 24) + Install (Node 16) hybrid pipeline
```

On the first run, you may need to allow script execution in PowerShell:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Or run each step manually:

```powershell
nvm use 24
npm run build
npm run package

nvm use 16.20.2
npm run install:tv
npm run launch
```

---

## Scripts

| Command | Node | Description |
|---|---|---|
| `npm run dev` | 24 | Vite dev server (browser preview) |
| `npm run build` | 24 | Production build → `dist/` |
| `npm run package` | 24 | Package as IPK → `dist-ipk/` |
| `npm run install:tv` | **16** | Install the IPK on the TV |
| `npm run launch` | **16** | Launch the app on the TV |
| `npm run inspect` | **16** | Open remote DevTools |
| `.\scripts\deploy.ps1` | automatic | Run all steps in sequence |

---

## Phase 0 Acceptance Criteria

- [ ] `npm install` completes without errors
- [ ] `npm run dev` shows the "ZUI IPTV Player / Ready." screen in the browser
- [ ] `npm run build` → `dist/` contains `appinfo.json`, `icon.png`, `largeIcon.png`
- [ ] `npm run package` → produces `dist-ipk/com.zui.player_0.1.0_all.ipk`
- [ ] "ZUI IPTV Player" appears in the TV launcher with the correct icon
- [ ] The app opens, the "Ready." screen is visible, no errors
- [ ] The BACK button closes the app

---

## Simulator Testing Notes

When testing remote control input in the LG webOS Simulator:

- The **"Touch" button** on the right-side virtual remote must be **inactive** — when active, it switches to pointer mode and disables D-pad navigation.
- The D-pad (arrow keys) fires with slightly different timing in the simulator than on a real TV; debounce settings may feel shorter in the simulator (200 ms is normal).
- **Always perform final testing on a real TV**; the simulator is a supplementary environment.

For focus issues:

- Set `visualDebug: true` in `src/main.tsx` to see a visual indicator of where focus is on screen.
- Watch `keydown` events in the browser console — if simulator keycodes differ from the real TV they will be obvious here.

> Turn `visualDebug` back to **`false`** when done — do not commit it as `true`.

---

## Cloud Sync (Optional Self-Hosted Setup)

Cloud Sync lets you push an M3U or Xtream URL from a phone or browser straight
to the TV instead of typing long URLs with the remote.  
**It is completely optional** — M3U URL and Xtream Codes direct-entry work without it.

### How it works

```
Phone / Browser ──► Web companion (zui-sync-web) ──► Supabase DB ──► TV app (Realtime)
```

1. When the TV app starts, both identifiers are derived synchronously from the serial number
   using **two independent djb2 seeds** — no MAC address look-up, no async wait:
   - **TV ID** (e.g. `A1B2-C3D4`) — `djb2(serial, 0xdeadbeef)` → 8 hex chars → `XXXX-XXXX`.
     Never changes across reinstalls; unique per device.
   - **Device Key** (e.g. `st5q8y`, 6 characters) — `djb2(serial, 0xbeefdead)` → base36 → 6 chars.
     Knowing the TV ID does not reveal the Device Key; djb2 is one-way and the seed differs.
2. The TV registers itself in the `devices` table and subscribes to the `playlists` table
   via Supabase Realtime.
3. The web companion (`zui-sync-web`) verifies the TV ID + Device Key, then inserts a
   playlist row.
4. The TV receives the row instantly (Realtime INSERT event) and loads the source.

### Setup steps

**1. Create a free Supabase project**

Go to <https://supabase.com> → New project. Note your **Project URL** and
**anon / public** API key.

**2. Run the schema**

Open the SQL Editor in your Supabase dashboard and paste the contents of
[`docs/cloud-sync/schema.sql`](docs/cloud-sync/schema.sql).  
This creates the `devices` and `playlists` tables with Row Level Security (RLS)
policies already configured.

**3. Enable Realtime**

In your Supabase dashboard: **Database → Replication** → enable the `playlists` table.
(The schema SQL also does this, but the dashboard toggle must match.)

**4. Configure the TV app**

Option A — build-time (recommended for self-hosted forks):

```
# Copy .env.example → .env.local and fill in your values
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Option B — runtime (no rebuild needed):

On the TV, go to **Settings → Cloud Sync Configuration** and paste the URL
and anon key. The runtime value takes precedence over build-time env vars.

**5. Configure the web companion**

In `zui-sync-web/`, copy `.env.example` to `.env.local` and fill in the same
Supabase URL and anon key:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Deploy the web companion to Vercel or any Next.js host.

**6. Use it**

- Open the TV app → Onboarding → **ZUI Cloud Sync**.
- Note the **TV ID** (e.g. `A1B2-C3D4`) and **Device Key** (e.g. `st5q8y`) shown on screen.
- Open the web companion URL on your phone or laptop.
- Enter the TV ID and Device Key → verify.
- Paste your M3U URL or Xtream credentials → send.
- Back on the TV, press **Reload** (or wait — the playlist arrives via Realtime automatically).

### Security notes

- The **anon key** is safe to embed in client-side code (by Supabase design).
  RLS policies enforce access control at the database level.
- **The TV ID alone is never sufficient.** Every read, write, and insert on `playlists`
  requires both the correct `device_id` **and** `device_key` to be present in the
  request headers (`x-zui-device-id`, `x-zui-device-key`).
- No device can enumerate or access another device's rows or keys.
- The TV ID and Device Key are derived deterministically from the TV's **hardware serial
  number** — not randomly generated, stable across reinstalls, unique per physical device.
  Because they use different djb2 seeds, knowing one does not allow computing the other.

---

## Internationalization (i18n)

The UI supports **5 languages**: Turkish (TR), English (EN), German (DE), French (FR), Spanish (ES).  
Language is changed from **Settings → Change Language** on the TV.

Locale files live in `src/locales/`:

```
src/locales/
  tr.json   ← Turkish (default)
  en.json
  de.json
  fr.json
  es.json
```

**To add a new language:**

1. Copy `src/locales/en.json` → `src/locales/<code>.json` and translate all values.
2. Add the language code to the `Language` type in `src/state/settingsStore.ts`.
3. Add the display name to `LANGUAGE_NAMES` and locale string to `LANGUAGE_LOCALES` in the same file.
4. Add the entry to the `LANGUAGES` array in `src/screens/SettingsScreen.tsx`.

---

## Notes

- The Dev Mode session is limited to **1000 hours** and must be renewed periodically.
- IPK files are excluded from git (`*.ipk`, `dist-ipk/`); use `npm run package` to build.
- The final icon design will be done in Phase 5.
- The webOS CLI (`ares-*`) commands require **Node 16**; the build toolchain requires **Node 24**.
