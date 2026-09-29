# Device code login

Sign players in with Google or Apple on **any** platform — desktop, mobile, web, even consoles — with no bundled OAuth SDK and no in-game browser popup. The player authorises on their phone; your game polls and picks up the session automatically.

This is the hands-on companion to [Authentication](/api/authentication), which covers the wider picture (anonymous play, account linking, the raw REST endpoints). Here we build the **login screen** itself, in Godot.

- On the **Drop-in** and **Template** paths, the screen ships inside the addon (since v2.3.0) — skip to [Fastest path](#fastest-path).
- Want your own look? [Build your own](#build-your-own-screen) shows the pattern.
- On **REST / other engines**, the two endpoints behind all of this are in [Authentication → device code](/api/authentication#sign-in-with-google-apple-device-code).

## How it works (30 seconds)

1. You call `login_with_device_code()`.
2. The SDK emits `device_code_received` with a short code, a verification URL, and a QR image.
3. You show those to the player. They scan the QR (or open the link) on their phone and sign in with Google or Apple.
4. The SDK polls in the background and emits `device_code_approved(nickname)` when they're done — or `device_code_expired` after 5 minutes. If the player was anonymous, their progress then merges into the account in the background — see [After approval](#after-approval-account-upgrade-signals).

Players do this **once** (since v2.2.3): the session persists to `user://` and is restored on startup, so this screen only reappears after a logout or a server-side expiry — see [Authentication → sessions](/api/authentication#sessions).

The in-flight code survives too (since v2.3.0): a pending device code is saved to `user://` the moment it's issued, so a page reload or app restart mid-link resumes polling on the **same** code instead of minting a new one — see [Pending codes](#pending-codes-reload-and-restart).

## Fastest path

The addon ships a reusable popup scene + script at `addons/cheddaboards/ui/DeviceCodeLogin.tscn` that wires every signal and cleans itself up. (The Template instantiates this same copy — it no longer carries its own.) Instantiate it and start the flow:

```gdscript
var popup = preload("res://addons/cheddaboards/ui/DeviceCodeLogin.tscn").instantiate()
add_child(popup)
popup.start_sign_in()

popup.signed_in.connect(func(nickname): print("Welcome, %s!" % nickname))
popup.cancelled.connect(func(): print("Sign-in dismissed"))
```

It emits `signed_in(nickname)` on success and `cancelled()` on an explicit cancel or expiry, then frees itself. Closing the popup is a **soft dismiss**: the SDK keeps polling in the background and `signed_in` still fires if the player finishes on their phone — see [Dismiss vs cancel](#dismiss-vs-cancel). (The script also exposes a `show_sign_in(parent)` static helper for a true one-liner — see the note at the end.)

## The signal lifecycle

Whether you use the prebuilt popup or roll your own, these four SDK signals drive the entire flow:

| Signal | Fires when | Your UI should… |
|--------|------------|-----------------|
| `device_code_received(user_code, verification_url, qr_data_url)` | The code is ready | Show the QR + raw code + link, start the countdown |
| `device_code_approved(nickname)` | Player finished on their phone | Show success, then continue into the game |
| `device_code_expired()` | The 5-minute window elapsed | Offer "try again" |
| `device_code_error(reason)` | Something went wrong | Show the reason, offer retry |

Connect them in `_ready()`, and disconnect on teardown so a second attempt starts clean.

## After approval: account upgrade signals

`device_code_approved` isn't always the end of the story. If the player was **anonymous** before linking, the SDK automatically migrates their progress (scores, streaks, achievements, play counts) into the account in the background, and exactly one of these follows:

| Signal | Fires when |
|--------|------------|
| `account_upgraded(profile, migration)` | The merge landed — `migration` carries `migratedGames` and `migratedScoreboards` counts |
| `account_upgrade_failed(reason)` | The merge couldn't run — the `reason` string comes from the server |

Two things worth knowing:

- **"Anonymous account not found" is harmless.** It means the player linked before ever submitting a score, so there was nothing to migrate. Safe to ignore in your UX.
- **A fresh player who links with no anonymous history gets neither signal** — no migration is attempted, and `device_code_approved` is the whole flow.

Your login screen doesn't need to handle these (the popup closes on `device_code_approved`), but connect them if you show a "progress transferred!" message or gate anything on the merge. The full linking picture, including the per-field merge rules, is in [Authentication](/api/authentication#upgrading-anonymous-verified-account-linking).

::: warning Nicknames can settle a beat after approval
When linking *creates* the account, it's born with the player's in-game name — but if their anonymous profile still holds that name at creation time, the account briefly gets a suffixed one (`Jegg_1`) and the SDK reclaims the exact name right after the merge, emitting `nickname_changed`. If you display the player's name anywhere persistent, connect `nickname_changed` rather than caching the string from `device_code_approved`.
:::

## Dismiss vs cancel

These are different things, and the prebuilt popup treats them differently. Do the same in your own screen.

- **Dismiss** (player closes the popup, taps outside, backs out to the menu): hide the UI and do nothing else. The SDK carries on polling, and `device_code_approved` fires whenever the player finishes on their phone — so a player who scans the QR, pockets their phone, and gets back to the game still ends up signed in.
- **Cancel** (an explicit "Cancel" / "Don't sign in" action): call `CheddaBoards.cancel_device_code()`. This stops polling and clears the pending code, so the next attempt mints a fresh one.

Only call `cancel_device_code()` on the explicit action. Calling it on every close means a player who dismissed the popup a second early loses the sign-in they'd already completed.

## Pending codes: reload and restart

Since v2.3.0 the SDK writes the pending device code to `user://` as soon as it's issued, and clears it on approval, expiry, or cancel. This matters most on web builds, where a tab reload used to throw the code away while the player was mid-sign-in on their phone.

- `login_with_device_code()` reuses a pending code if one exists — `device_code_received` fires again with the same code, URL, and QR, and polling resumes. Pass `force_new = true` to discard it and mint a fresh one.
- `has_pending_device_code()` tells you whether one is waiting, so you can reopen the login screen on startup rather than asking the player to scan again.

```gdscript
func _ready():
    if CheddaBoards.has_pending_device_code() and not CheddaBoards.is_authenticated():
        _show_login_screen()   # resumes the same code
```

## Build your own screen

A minimal version, distilled from the reference implementation:

```gdscript
extends CanvasLayer

func _ready():
    CheddaBoards.device_code_received.connect(_on_received)
    CheddaBoards.device_code_approved.connect(_on_approved)
    CheddaBoards.device_code_expired.connect(_on_expired)
    CheddaBoards.device_code_error.connect(_on_error)
    CheddaBoards.login_with_device_code()

func _on_received(user_code: String, verification_url: String, qr_data_url: String):
    $CodeLabel.text = user_code                 # raw code (always show as fallback)
    _set_qr_from_data_url(qr_data_url)          # the QR image — see below
    $Status.text = "Waiting for you to sign in..."

func _on_approved(nickname: String):
    print("Signed in as %s" % nickname)
    queue_free()

func _on_expired():
    $Status.text = "Code expired — try again."

func _on_error(reason: String):
    $Status.text = "Error: %s" % reason
```

## Rendering the QR code

This is the part that trips everyone up. `device_code_received` hands you `qr_data_url` as a base64 PNG **data URL** — a string like `data:image/png;base64,iVBORw0KGgo...`. Godot can't apply that to a `TextureRect` directly; strip the prefix, base64-decode it, load it as a PNG, and wrap it in a texture:

```gdscript
## Decode a base64 PNG data URL onto a TextureRect. Returns true on success.
func _set_qr_from_data_url(data_url: String) -> bool:
    var comma = data_url.find(",")            # strip the "data:image/png;base64," prefix
    if comma == -1:
        push_warning("Invalid QR data URL (no comma found)")
        return false

    var b64 = data_url.substr(comma + 1)
    var raw: PackedByteArray = Marshalls.base64_to_raw(b64)
    if raw.is_empty():
        return false

    var img = Image.new()
    if img.load_png_from_buffer(raw) != OK:
        return false

    $QRCode.texture = ImageTexture.create_from_image(img)
    return true
```

::: tip
Always show the raw `user_code` as well. `qr_data_url` can come back null (the SDK falls back to the raw code), and plenty of players don't have a second camera device handy.
:::

## The expiry countdown

The code is valid for 5 minutes. Record the deadline when it arrives and tick it down in `_process`:

```gdscript
var _expires_at := 0.0

func _on_received(_user_code, _url, _qr):
    _expires_at = Time.get_unix_time_from_system() + 300  # 5 minutes

func _process(_delta):
    if _expires_at <= 0.0:
        return
    var remaining = _expires_at - Time.get_unix_time_from_system()
    if remaining <= 0:
        $TimerLabel.text = "Expired"
        return
    $TimerLabel.text = "Expires in %d:%02d" % [int(remaining) / 60, int(remaining) % 60]
```

## Opening the link (desktop / no camera)

For players who can't scan, make the verification URL clickable. `OS.shell_open` works everywhere — on web it routes through the browser's `window.open`, on desktop/mobile it hands off to the OS handler:

```gdscript
func _on_link_pressed():
    if _verification_url.is_empty():
        return
    OS.shell_open(_verification_url)
```

The verification URL already has the code pre-filled, so the player just taps a provider button on the page.

## Cleaning up

When the flow ends — approved, expired, or cancelled — disconnect the signals and free the node. If you tear down on a plain dismiss, leave the SDK polling; only stop it on an explicit cancel (see [Dismiss vs cancel](#dismiss-vs-cancel)):

```gdscript
func _close(explicit_cancel: bool = false):
    if explicit_cancel and _still_waiting:
        CheddaBoards.cancel_device_code()
    # disconnect device_code_* signals here
    queue_free()
```

If you free the screen on a dismiss, connect `device_code_approved` somewhere longer-lived (your main menu, an autoload) so the sign-in still lands when it completes.

## The one-liner helper

The reference script exposes a static `show_sign_in(parent)` that instantiates, adds, and starts the flow in a single call. To use it as `DeviceCodeLogin.show_sign_in(self)`, the script needs a `class_name` and the popup scene must sit at the path the helper loads (`res://addons/cheddaboards/ui/DeviceCodeLogin.tscn`). If you've renamed either, update both to match. The explicit `preload(...).instantiate()` form above always works regardless.

**See also:** [Authentication](/api/authentication) · [Signals reference](/engines/godot-signals) · [Godot quick start](/quickstart/godot)