# Orbit Lite — The Browser Extension

The data pipeline for **Orbit Lite**, an offline-first student toolkit for the
FAST-NUCES student portal ([flexstudent.nu.edu.pk](https://flexstudent.nu.edu.pk)).

This extension is the **only** part of Orbit Lite that touches the portal. It
silently parses portal pages as you browse them and writes the structured data
to a local SQLite database on your machine

---

## Motivation

I dunno... just wanted to do something about flex before I moved on from this University -\_-

---

## How it works

```
┌─ Portal page (DOM) ─────────────┐
│  content script                 │  reads the page, no system access
│    parsers → page router        │
└───────────────┬─────────────────┘
                │ chrome.runtime.sendMessage
┌───────────────▼─────────────────┐
│  background service worker      │  the only part allowed to talk to native
└───────────────┬─────────────────┘
                │ native messaging (stdio)
┌───────────────▼─────────────────┐
│  native host (Node)             │  the only part that writes the .sqlite file
│    diff check → SQLite          │
└─────────────────────────────────┘
```

### Pages it parses

| Page                | Data extracted                                             |
| ------------------- | ---------------------------------------------------------- |
| Home                | Student info, personal info, academic calendar             |
| Attendance          | Per-course summary + per-session detail                    |
| Marks               | Per-assessment marks (with weightage)                      |
| Transcript          | Full semester/course history with SGPA/CGPA                |
| Course Registration | Registered courses _(only during the registration window)_ |

---

## Prerequisites

- **Google Chrome** (or any Chromium browser: Edge, Brave).
- **Node.js 18+** (developed on Node 22).
- **Windows** for the native-host installer script below. macOS/Linux users can
  register the host manually (see [Other platforms](#other-platforms)).

---

## Setup

There are two things to install: the **extension** (in Chrome) and the
**native host** (a small Node process that writes the database). Do them in order
— the host needs the extension's ID.

### 1. Build the extension

```bash
git clone https://github.com/syed-mohd-fasih/orbit-lite-extension.git
cd orbit-lite-extension
npm install
npm run build        # outputs to dist/
```

### 2. Load it into Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the **`dist/`** folder.
4. Copy the **Extension ID**, you'll need it in the next step

### 3. Install the native messaging host

```bash
cd native-host
npm install
```

Then wire it to your extension:

1. Open `native-host/com.orbitlite.host.json` and replace
   `REPLACE_WITH_YOUR_EXTENSION_ID` with the ID from step 2 — keep the
   `chrome-extension://` prefix and the trailing `/`:

    ```json
    "allowed_origins": ["chrome-extension://YOUR_EXTENSION_ID_HERE/"]
    ```

2. Register the host with Chrome:

Open powershell **inside** the `native-host` folder

    ```powershell
    powershell -ExecutionPolicy Bypass -File install-windows.ps1
    ```

---

## Usage

1. Log into the portal and browse to any parsed page (home, attendance, marks, transcript).
2. Click the **Orbit Lite** toolbar icon → **Sync Now**, or just navigate — the
   extension **parses automatically** on page load.
3. The popup shows the last sync time and status per data type.

**Marks and attendance are per-semester.** To capture more than the current term,
switch the semester dropdown on the portal page and wait — each term is
stored separately instead of overwriting.

The database is created at:

```
%USERPROFILE%\.orbit-lite\orbit.sqlite
```

> If you want to double check, open dev-console on the portal (You know you can...) and watch for the [Orbit Lite] console logs

---

## Inspecting the database

From the `native-host` folder:

```bash
node inspect.js                                   # row counts + last-sync times
node inspect.js marks                             # dump a whole table
node inspect.js "SELECT semester, sgpa, cgpa FROM transcript_semester ORDER BY semester"
```

Or open `%USERPROFILE%\.orbit-lite\orbit.sqlite` in
[DB Browser for SQLite](https://sqlitebrowser.org/) for a GUI.

### Tables

`student` · `profile` · `academic_calendar` · `registered_courses` ·
`attendance` · `attendance_session` · `marks` ·
`transcript_semester` → `transcript_course` (parent/child) ·
`sync_meta` (diff bookkeeping).

---

## Troubleshooting

Open the page console and look for `[Orbit Lite]` logs, and the
`chrome://extensions` → Orbit Lite → **Errors** / **service worker** view.

| Symptom                                                 | Cause & fix                                                                                                                                                                                  |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `... error — Specified native messaging host not found` | Host not registered. Re-run `install-windows.ps1`.                                                                                                                                           |
| `... error — ...forbidden`                              | `allowed_origins` doesn't match your extension ID. Fix the ID in `com.orbitlite.host.json`.                                                                                                  |
| `... error — db-unavailable (dry run)`                  | `better-sqlite3` not installed. Run `npm install` inside `native-host`.                                                                                                                      |
| `... portlet not found` warning                         | You're on a page without that portlet — harmless. If it's on a page that _should_ have it, the portal may have renamed a heading; open an issue with the console's `portlets present:` line. |
| Extension won't load                                    | You probably loaded the repo root — load the **`dist/`** folder.                                                                                                                             |

To start completely fresh, delete the database (the host isn't holding it open between syncs) and re-sync each page:

```bash
del "%USERPROFILE%\.orbit-lite\orbit.sqlite" "%USERPROFILE%\.orbit-lite\orbit.sqlite-wal" "%USERPROFILE%\.orbit-lite\orbit.sqlite-shm"
```

Host debug log (Chrome hides the host's stderr): `%USERPROFILE%\.orbit-lite\host.log`.

---

## Other platforms

The `install-windows.ps1` script is Windows-only. On macOS/Linux, place
`com.orbitlite.host.json` (with `"path"` pointing to an absolute path that runs
`host.js` via Node) into Chrome's native-messaging-hosts directory:

- **macOS:** `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
- **Linux:** `~/.config/google-chrome/NativeMessagingHosts/`

---

## Privacy

All data stays on your machine. The extension makes no network requests; it only
reads pages you have already loaded while logged in. It never reads your
credentials, CNIC, mobile number, or family information.
