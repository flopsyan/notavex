# 📝 Notavex

A tiny, self-hosted notes app with Markdown support - your own private stream of
thoughts, tasks and snippets. A **Google Keep-style** board (masonry grid of
colorful cards) with the Markdown power of
[Memos](https://github.com/usememos/memos), built to be dead-simple to run and
to hack on.

- **Single static binary** - written in Go using *only the standard library*.
  No database server, no Node build step, no external services.
- **One file of data** - every note lives in a single JSON file, so backups are
  literally a file copy.
- **Markdown + tables + checklists** - write in Markdown (incl. GFM tables and
  clickable task lists), with instant full-text search.
- **Organize like Keep** - optional **titles**, **labels** (added with a button, not
  `#text`), note **colors**, pinning, **drag-and-drop** reordering, **archive**, a
  **trash**, and "make a copy".
- **Smart checklists** - turn any note into a to-do list; ticked items sink to the
  bottom under a collapsible, remembered "completed" section.
- **Images** - attach pictures from the composer, a card's action row or the editor;
  they are downscaled in the browser and stored inline (no uploads folder to manage).
- **Accounts & login** - an optional **login** with user accounts. The first
  **admin** is bootstrapped from the environment; further accounts are added in the
  app, where **only admins can create or remove users**. Everyone can change their
  own display name and password under **Account**. Once an account exists a login is
  required and **nothing is shown until you sign in**.
- **Settings** - a menu for the **color theme** (System / Light / Dark) and
  **language** (English / German); both default to your system and are remembered
  per browser.
- **Collapsible sidebar** - a Google Keep-style hamburger collapses the sidebar to an
  icon rail; hover to peek the full labels.
- **Tiny footprint** - the Docker image is a few MB and runs happily on a
  Raspberry Pi (`amd64` / `arm64` / `armv7`).
- **Keep-style UI** - a responsive masonry grid of cards, an expanding composer, a
  full-screen note editor, monochrome icons, light & dark mode, and `Ctrl/⌘ + Enter` to save.

## Quick start

### Docker Compose (recommended)

```bash
git clone https://github.com/flopsyan/notavex.git
cd notavex

# optional: configure (e.g. set a password to require a login)
cp .env.example .env

docker compose up -d --build
```

Open <http://localhost:8080>. Notes are stored in the `notavex-data` Docker volume.

To **require a login**, set a password in `.env` before starting (or edit it and
re-run `docker compose up -d --build`):

```bash
NOTAVEX_PASSWORD=your-strong-password
```

On the first start this bootstraps the admin account (user `NOTAVEX_USER`,
default `admin`); afterwards manage users in the app under **Settings**. Re-run
with `--build` to pick up new versions or changed assets.

### Docker (without Compose)

```bash
docker build -t notavex .
docker run -d --name notavex -p 8080:8080 -v notavex-data:/data \
  -e NOTAVEX_PASSWORD=your-strong-password notavex
```

### From source

Requires Go 1.24+ (for the standard-library `crypto/pbkdf2` password hashing).

```bash
go run .                          # serves http://localhost:8080, data in ./data
# …or build a self-contained binary:
go build -o notavex . && ./notavex
```

## Configuration

Everything is configured through environment variables:

| Variable           | Default    | Description |
|--------------------|------------|-------------|
| `NOTAVEX_ADDR`     | `:8080`    | Address/port to listen on. |
| `NOTAVEX_DATA_DIR` | `data`     | Directory for the notes, accounts and session secret. |
| `NOTAVEX_PASSWORD` | *(unset)*  | **Bootstraps** the admin account on first run. After that accounts live in the data dir (`users.json`) and are managed in the app, so this is then ignored. Unset **and** no account → Notavex runs **without authentication**. |
| `NOTAVEX_USER`     | `admin`    | Username for the bootstrapped admin account. |
| `NOTAVEX_SECURE`   | `false`    | Set to `true` when serving over HTTPS so the session cookie is marked `Secure`. |
| `NOTAVEX_SECRET`   | *(auto)*   | Session signing secret. If unset, a random one is generated and stored in the data dir. |

### Accounts

The site requires a login as soon as one account exists. The **first admin** is
bootstrapped from `NOTAVEX_USER`/`NOTAVEX_PASSWORD`; afterwards manage accounts in
the app under **Settings → Users** (admin only). New accounts are normal users:
they use everything but **cannot create or remove accounts**. Everyone can change
their own display name and password under **Account**. The last account, and the
last admin, cannot be removed, so you can never lock yourself out.

## Data & backups

Everything lives in `NOTAVEX_DATA_DIR`:

- `notavex.json` - all your notes (incl. attached images as inline data), as
  human-readable JSON, written atomically.
- `users.json` - the accounts: usernames and **salted PBKDF2 hashes** (never the
  passwords themselves). Only present once an account exists.
- `.secret` - the session signing key.

To back up, copy the data directory somewhere safe. To restore, put it back and
restart. To **start over with logins**, delete `users.json` and set
`NOTAVEX_PASSWORD` (and optionally `NOTAVEX_USER`) again - a fresh admin is
bootstrapped on the next start.

### Storing the data on a NAS

The data directory is just a folder, so point it at your NAS exactly like you
would for any other self-hosted app - **bind-mount** a path from the NAS into the
container instead of using a named Docker volume:

```yaml
services:
  notavex:
    # …
    volumes:
      # host path on the NAS  ->  container data dir
      - /volume1/docker/notavex:/data
```

(`/volume1/...` is the typical Synology layout; use `/mnt/...`, `/share/...`, etc.
for your NAS.) Or with `docker run`:

```bash
docker run -d --name notavex -p 8080:8080 \
  -v /volume1/docker/notavex:/data \
  -e NOTAVEX_PASSWORD=your-strong-password notavex
```

Make sure the mounted folder is writable by the container user, and prefer a
local/iSCSI volume over a flaky SMB/NFS share - the store rewrites a single file
atomically (write-temp-then-rename), which needs a filesystem that supports
`rename`. That is the same approach as the sibling *epulonis* project, which
bind-mounts its `/app/data` (SQLite) folder the same way.

## Security

Notavex has **no authentication until you create an account** (set
`NOTAVEX_PASSWORD`). If you expose it to the internet:

1. Set `NOTAVEX_PASSWORD` (and optionally `NOTAVEX_USER`) to bootstrap the admin.
2. Put it behind HTTPS (a reverse proxy such as Caddy, Traefik or Nginx) and set
   `NOTAVEX_SECURE=true`.

Passwords are kept only as salted PBKDF2 hashes. Sessions are stateless, signed
cookies (HMAC-SHA256) bound to the user's password hash, so changing a password
signs that user's other sessions out. Once an account exists the whole app
requires a login - visitors see only the sign-in screen.

For a home-only setup (LAN, VPN, Tailscale) you can leave it open.

Example with Caddy:

```
notes.example.com {
    reverse_proxy localhost:8080
}
```

## Markdown support

Headings, **bold**, *italic*, ~~strikethrough~~, `inline code`, fenced code
blocks, links, images, blockquotes, ordered/unordered lists, task lists
(`- [ ]` / `- [x]`, clickable to toggle), **GFM tables**, and horizontal rules.

Labels are explicit: add them with the label button on a note (or in the
composer), not by typing `#hashtags` into the text.

Rendering happens safely in the browser: all input is HTML-escaped first and
link/image URLs are sanitized, so notes can never inject scripts.

## Development

```bash
go run .        # run locally
go test ./...   # run the unit tests
go vet ./...    # static checks
gofmt -w .      # format
```

Project layout:

```
main.go         entry point, configuration, graceful shutdown
auth.go         password hashing (PBKDF2) and signed session tokens
users.go        the JSON-backed account store (admin / normal users)
store.go        the JSON-backed, thread-safe note store
server.go       HTTP routing and the JSON API
store_test.go   store unit tests
auth_test.go    auth / session unit tests
web/            embedded single-page UI (HTML/CSS/JS, no build step)
```

The web assets are embedded into the binary with `//go:embed`, so the compiled
`notavex` is fully self-contained.

## API

All endpoints return JSON. Once an account exists they require the session cookie
obtained from `POST /api/login`; the user-management routes require an admin.

| Method   | Path                        | Description                          |
|----------|-----------------------------|--------------------------------------|
| `GET`    | `/api/config`               | `{authEnabled, authed, user}` for the current session. |
| `POST`   | `/api/login`                | Start a session (`{username, password}`). |
| `POST`   | `/api/logout`               | End the session.                     |
| `POST`   | `/api/password`             | Change your own password (`{currentPassword, newPassword}`); re-issues the session. |
| `POST`   | `/api/profile`              | Change your own display name (`{displayName}`). |
| `GET`    | `/api/users`                | List accounts.                       |
| `POST`   | `/api/users`                | Create a (normal) account (`{username, displayName?, password}`). **Admin only.** |
| `DELETE` | `/api/users/{id}`           | Remove an account. **Admin only.**   |
| `GET`    | `/api/memos`                | List notes (`?view=active`/`archived`/`trash`, `?q=`, `?label=`, `?limit=`, `?offset=`). |
| `POST`   | `/api/memos`                | Create a note (`{title?, content?, color?, labels?, checklist?, images?}`; needs a title, content or image). |
| `GET`    | `/api/memos/{id}`           | Fetch one note.                      |
| `PUT`    | `/api/memos/{id}`           | Update fields (`{title?, content?, labels?, checklist?, images?}`). |
| `DELETE` | `/api/memos/{id}`           | Permanently delete a note.           |
| `POST`   | `/api/memos/{id}/pin`       | Pin/unpin (`{pinned}`).              |
| `POST`   | `/api/memos/{id}/color`     | Set color (`{color}`; `""` = default). |
| `POST`   | `/api/memos/{id}/archive`   | Archive/unarchive (`{archived}`).    |
| `POST`   | `/api/memos/{id}/trash`     | Move to trash / restore (`{trashed}`). |
| `POST`   | `/api/memos/{id}/duplicate` | Make a copy.                         |
| `POST`   | `/api/memos/{id}/move`      | Reorder within its group (`{afterId}`, `0` = top). |
| `POST`   | `/api/memos/{id}/collapsed` | Remember a checklist's "completed" collapse (`{collapsed}`). |
| `POST`   | `/api/memos/trash/empty`    | Permanently empty the trash.         |
| `GET`    | `/api/labels`               | Labels with usage counts.            |
| `GET`    | `/api/stats`                | `{ notes, archived, trashed, labels }`. |

## License

Apache-2.0 - see [LICENSE](LICENSE).
