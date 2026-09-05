# Web / HTML5 export

Exporting a CheddaBoards game for the web has a few platform-specific requirements. Get these right and the same code that runs on desktop and mobile runs in the browser — anonymous play, device code sign-in, leaderboards, and achievements all work.

Most projects need **only the steps in "Web export setup" below.** Device code sign-in works on web out of the box with zero configuration.

## Web export setup

**1. Set the HTML shell (optional).** Project → Export → Add → Web. Under the **HTML** section:

```
Custom HTML Shell:  res://template.html
```

This is optional — it just gives you the branded loading screen. Auth, scores, and leaderboards all run from GDScript over HTTP, so they work with Godot's default shell too. If you *do* use the included `template.html`, export as `index.html` (it loads `index.js`).

**2. Export as `index.html`.** Project → Export → Web → Export Project, and save it as **`index.html`** — not `MyGame.html`. Other filenames break relative paths and auth redirects, and produce the "Engine not defined" error.

**3. Serve over HTTP, not `file://`.** Web builds won't run from a local file path. Use any static server:

```bash
python3 -m http.server 8000     # Python
npx serve .                     # Node
```

Then open `http://localhost:8000`.

That's the whole web checklist. Everything below is optional.

## Web authentication

Web builds support every auth method the rest of the SDK does — anonymous, Google and Apple via device code, and account upgrade — with no web-specific setup. Device code sign-in is the recommended path on web exactly as everywhere else: no OAuth credentials, no browser popups, no platform branching. See [Authentication](/api/authentication).

**Sessions persist on web too** (since v2.2.3): the session is saved to `user://`, which the browser keeps in IndexedDB, so players sign in once per site. Two environments can't hold it:

- **Safari blocks storage inside third-party iframes**, so a game embedded cross-origin re-auths each visit.
- **itch.io serves each new upload from a new path**, orphaning the previous upload's storage — so itch players re-auth once per build you push.

Neither breaks the game; players just sign in again.

## The exit button on web

`get_tree().quit()` does nothing useful in a browser — it just freezes the canvas. The right move is to navigate somewhere, and *how* depends on whether your game is embedded in an iframe (itch.io serves web games inside one).

**Template (since v2.1.7): it's a setting, not code.** Select the `MainMenu` node and set **Web Exit Url** in the Inspector to your game's website or itch page:

- **Empty (the default):** all Exit buttons are hidden on web builds — no dead-end button.
- **Set, running full-window:** Exit does a same-tab redirect to the URL.
- **Set, running in an iframe (itch.io):** Exit opens the URL in a **new tab**, leaving the host page intact — a same-tab redirect would load your whole website inside the game embed. If a popup blocker eats the new tab, the button shows the URL instead.

Native builds always show Exit and quit normally, whatever the setting.

**Drop-in SDK: roll the same logic yourself.** The iframe check matters — don't blind-redirect:

```gdscript
func _on_exit_pressed():
    if OS.has_feature("web"):
        var in_iframe = JavaScriptBridge.eval("window.self !== window.top", true)
        if in_iframe:
            # itch.io etc. — new tab keeps the host page intact
            JavaScriptBridge.eval("window.open('https://yourdomain.com', '_blank')", true)
        else:
            JavaScriptBridge.eval("window.location.href = 'https://yourdomain.com'", true)
        return
    get_tree().quit()
```

## Mobile name entry

Godot's in-engine `LineEdit` can't receive typed characters on mobile browsers, so on web the template swaps in an **HTML name-entry overlay** instead. This is why `template.html` carries two small helper functions — `window.chedda_prompt_name(...)` and `window.chedda_poll_name()` — that `MainMenu.gd` opens and polls via `JavaScriptBridge`.

If you use the included `template.html`, this works out of the box. If you supply your **own** HTML shell for a web build that needs name entry on mobile, carry those two helpers across, or mobile players won't be able to type a name. Desktop web works without them either way.

The overlay validates the nickname client-side against the same rule the server enforces — **3–16 characters, letters, digits, and underscores** — so a bad name is caught before the round trip.

## template.html

`template.html` is **just** the loading screen, the Godot engine bootstrap, and the mobile name-entry helper above — no SDK, no OAuth scripts, no v1 JavaScript bridge. Authentication and scores run from GDScript over the HTTP API, so the shell carries none of that.

Those `chedda_prompt_name` / `chedda_poll_name` helpers are a small self-contained name prompt — **not** the legacy v1 `cheddaboards_v1` bridge. If your `template.html` has that script, a large `CONFIG` block, or `window.chedda_*` OAuth bridge functions, it's an old v1.x shell — replace it with the lean current one from the template.

## Checklist

- [ ] *(Optional)* Custom HTML Shell set to `res://template.html` for the branded loader
- [ ] Exported as `index.html`
- [ ] Served over HTTP (not `file://`)
- [ ] `web_exit_url` set on MainMenu (or deliberately left empty to hide Exit on web); drop-in projects use the iframe-aware redirect above
- [ ] Login and leaderboards tested in the browser

**See also:** [Godot quick start](/quickstart/godot) · [Godot 4 guide](/engines/godot-4) · [Authentication](/api/authentication) · [REST API](/quickstart/rest)