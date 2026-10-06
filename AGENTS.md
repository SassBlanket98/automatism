# automatism: agent rules

Static marketing site for Automatism (AI workflows for agencies), served by GitHub Pages at
`https://automatism.co.za`. Global rules in `~/.agents/AGENTS.md` apply too; this file adds what is
specific to this repo.

## Start here
- Automatism's state and work streams live in the hub repo `~/Projects/automatism-demo`: read its
  `docs/STATE.md` (`git -C ~/Projects/automatism-demo show main:docs/STATE.md`) before starting.
  Work in this repo is tracked there as its own stream.

## Rules
- **Pushing `main` publishes the live site.** Never push without David's OK.
- Plain HTML/CSS/JS, no framework and no build step. Keep it that way unless David decides otherwise.
- `live/` is build output of the demo app in `~/Projects/automatism-demo` (hashed Vite assets plus
  `live/recordings/*.json`). Never hand-edit `live/assets/*`; change the app there and rebuild. The
  copy recipe is in `~/Projects/automatism-demo/AGENTS.md` ("Updating the site's live/ copy").
- `live/index.html` points the app at `https://demo.automatism.co.za` (the demo backend).
- Keep `CNAME` and `.nojekyll`; Pages serves the files as they are.

## Check before calling it done
No tests or linters. Serve the folder locally (`python3 -m http.server -d .`) and look at every
page you changed at phone width and desktop width.

## Layout
| Path | What |
|---|---|
| `index.html`, `404.html`, `robots.txt` | Home page, not-found page, robots |
| `client-updates/`, `unbilled-time/` | Workflow demo pages with films |
| `live/` | Built live demo app (from automatism-demo) |
| `assets/` | Shared CSS, favicon and the film player |
| `media/` | Films (`.mp4`) and posters |
