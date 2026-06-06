# 📝 Jot

A tiny, self-hosted notes app with Markdown support — your own private stream of
thoughts, tasks and snippets. A **Google Keep-style** board (masonry grid of
colorful cards) with the Markdown power of
[Memos](https://github.com/usememos/memos), built to be dead-simple to run and
to hack on.

- **Single static binary** — written in Go using *only the standard library*.
  No database server, no Node build step, no external services.
- **One file of data** — every note lives in a single JSON file, so backups are
  literally a file copy.
- **Markdown + tables + checklists** — write in Markdown (incl. GFM tables and
  clickable task lists), with instant full-text search.
- **Organize like Keep** — optional **titles**, **labels** (added with a button, not
  `#text`), note **colors**, pinning, **drag-and-drop** reordering, **archive**, a
  **trash**, and "make a copy".
- **Smart checklists** — turn any note into a to-do list; ticked items sink to the
  bottom under a collapsible, remembered "completed" section.
- **Tiny footprint** — the Docker image is a few MB and runs happily on a
  Raspberry Pi (`amd64` / `arm64` / `armv7`).
- **Keep-style UI** — a responsive masonry grid of cards, an expanding composer, a
  full-screen note editor, monochrome icons, dark mode, and `Ctrl/⌘ + Enter` to save.

## Quick start

### Docker Compose (recommended)

```bash
git clone https://github.com/flopsyan/jot.git
cd jot
docker compose up -d
```

Open <http://localhost:8080>. Notes are stored in the `jot-data` Docker volume.

To require a login, set a password in `docker-compose.yml`:

```yaml
    environment:
      JOT_PASSWORD: "your-strong-password"
```

### Docker (without Compose)

```bash
docker build -t jot .
docker run -d --name jot -p 8080:8080 -v jot-data:/data \
  -e JOT_PASSWORD=your-strong-password jot
```

### From source

Requires Go 1.22+.

```bash
go run .                          # serves http://localhost:8080, data in ./data
# …or build a self-contained binary:
go build -o jot . && ./jot
```

## Configuration

Everything is configured through environment variables:

| Variable       | Default    | Description |
|----------------|------------|-------------|
| `JOT_ADDR`     | `:8080`    | Address/port to listen on. |
| `JOT_DATA_DIR` | `data`     | Directory for the notes file and session secret. |
| `JOT_PASSWORD` | *(unset)*  | If set, a login with this password is required. If unset, Jot runs **without authentication**. |
| `JOT_SECURE`   | `false`    | Set to `true` when serving over HTTPS so the session cookie is marked `Secure`. |
| `JOT_SECRET`   | *(auto)*   | Session signing secret. If unset, a random one is generated and stored in the data dir. |

## Data & backups

Everything lives in `JOT_DATA_DIR`:

- `jot.json` — all your notes, as human-readable JSON, written atomically.
- `.secret` — the session signing key.

To back up, copy `jot.json` somewhere safe. To restore, put it back and restart.

## Security

Jot has **no authentication unless you set `JOT_PASSWORD`**. If you expose it to
the internet:

1. Set `JOT_PASSWORD` to a strong value.
2. Put it behind HTTPS (a reverse proxy such as Caddy, Traefik or Nginx) and set
   `JOT_SECURE=true`.

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
go test ./...   # run the store tests
go vet ./...    # static checks
gofmt -w .      # format
```

Project layout:

```
main.go         entry point, configuration, graceful shutdown
store.go        the JSON-backed, thread-safe note store
server.go       HTTP routing, JSON API and session auth
store_test.go   store unit tests
web/            embedded single-page UI (HTML/CSS/JS, no build step)
```

The web assets are embedded into the binary with `//go:embed`, so the compiled
`jot` is fully self-contained.

## API

All endpoints return JSON. When `JOT_PASSWORD` is set they require the session
cookie obtained from `POST /api/login`.

| Method   | Path                        | Description                          |
|----------|-----------------------------|--------------------------------------|
| `GET`    | `/api/memos`                | List notes (`?view=active`/`archived`/`trash`, `?q=`, `?label=`, `?limit=`, `?offset=`). |
| `POST`   | `/api/memos`                | Create a note (`{title?, content?, color?, labels?, checklist?}`; needs a title or content). |
| `GET`    | `/api/memos/{id}`           | Fetch one note.                      |
| `PUT`    | `/api/memos/{id}`           | Update fields (`{title?, content?, labels?, checklist?}`). |
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

MIT — see [LICENSE](LICENSE).
