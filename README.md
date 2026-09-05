# CheddaBoards docs

Source for **[docs.cheddaboards.com](https://docs.cheddaboards.com)** — the documentation for [CheddaBoards](https://cheddaboards.com), open-source leaderboards for any game engine.

Built with [VitePress](https://vitepress.dev), deployed on Netlify.

## Running locally

```bash
npm install
npm run docs:dev
```

The dev server hot-reloads as you edit. To check a production build (and catch dead links, which fail the build):

```bash
npm run docs:build
```

## Structure

Pages are Markdown, grouped by section:

| Folder | Contents |
|--------|----------|
| `quickstart/` | Getting started — REST and per-engine |
| `api/` | HTTP API reference |
| `engines/` | Godot, Unity, and web export guides |
| `concepts/` | How things work — data model, auth, boards, moderation, privacy |
| `self-hosting/` | Running your own canister and proxy |

Sidebar and top nav are defined in `.vitepress/config.mts`. **To add a page:** create the Markdown file, then add its link to the relevant sidebar group in the config — VitePress won't surface a page that isn't in the sidebar.

Theme overrides (brand colours, fonts) live in `.vitepress/theme/`.

## Contributing

Corrections and improvements are welcome — open an issue or a PR. Every page has an "Edit this page on GitHub" link at the bottom that points straight at the source file. If you spot something in the docs that doesn't match how CheddaBoards actually behaves, that's worth a report even without a fix.

## History

The docs used to live in the [CheddaBoards-Godot](https://github.com/cheddatech/cheddaboards-godot) repo. They moved here so the platform docs aren't Godot-specific; that repo now keeps only Godot install instructions and links here.

---

MIT — see [LICENSE](LICENSE).