# Orion

Orion is a local-first desktop tracker for Entropia Universe hunting sessions. It monitors your chat log, tracks loot and costs, manages equipment loadouts, and turns completed sessions into analytics for returns, efficiency, skills, healing, globals, HoFs, and kill performance.

The app is built with Tauri 2, Rust, React, TypeScript, Vite, Tailwind CSS, Recharts, and Zustand.

## Status

- Current version: 1.2.5
- Repository: https://github.com/Nepherius/orion
- License: MIT
- Supported desktop targets: Linux and Windows

## Main Features

### Session Tracking

- Create, pause, resume, and complete hunting sessions.
- Track creature, maturity, location, notes, tags, and linked loadout.
- Keep active session timing and completed duration stable for analytics.
- Record ammo, weapon decay, armor decay, healing, and other costs.
- Review session summaries, cost breakdowns, loot totals, return rate, and profit or loss.

### Chat Log Monitoring

- Watch the Entropia Universe `chat.log` file in real time.
- Detect globals, HoFs, rare items, skill gains, damage, healing, system pickup lines, and combat events.
- Filter events to the configured player name.
- Support the current English and Romanian patterns used by the parser.
- Keep chat-log-derived data local on your machine.

### Loot Tracking

- Add loot manually or from detected chat log events.
- Track item name, TT value, quantity, markup, fixed item value, and total value.
- Maintain item templates for repeated loot entries.
- Associate loot entries with kill events when kill tracking is enabled.
- Edit item options and defaults from the item database.

### Loadouts

- Create reusable equipment loadouts for weapons, amplifiers, scopes, sights, absorbers, armor, and medical tools.
- Calculate expected cost per shot, damage, efficiency, range, healing cost, and total loadout economy.
- Mark a primary loadout and switch loadouts during active play.
- Load bundled asset data and refresh external equipment data monthly when the API is available.
- Validate loaded asset data before it reaches the loadout form.

### Analytics

- Overview charts for return rate, profit, cost, loot, globals, and session trends.
- Equipment, creature, location, time, loot, skill, healing, and kill-tracking panels.
- Return rate and profit calculations based on completed sessions.
- Hourly and per-minute rates for loot, cost, profit, kills, globals, and skill gains.
- Correlation and projection panels for long-term tracking.
- Data quality warnings for sessions that may skew analytics.
- Built-in metric notes describing formulas and assumptions.

### Overlay and Settings

- Optional overlay window for compact live session information.
- Configurable player name, chat log path, default markup, overlay position, and kill tracking behavior.
- Local persistence through the app database and settings storage.

## Privacy

Orion is local-first. Session data, loot, settings, and chat log parsing stay on your machine.

The app can contact `https://api.entropianexus.com` to refresh equipment and creature data. That refresh is monthly, and Orion falls back to bundled assets when the API is unavailable. The app does not need an account or cloud sync.

## Requirements

### Development

- Node.js 20.19 or newer, preferably Node.js 22 LTS
- npm
- Rust 1.77.2 or newer
- Tauri 2 prerequisites for your operating system

### Linux Build Dependencies

On Debian or Ubuntu based systems:

```bash
sudo apt-get update
sudo apt-get install -y \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  rpm
```

AppImage bundling may need outbound access to GitHub so `linuxdeploy` can download the AppImage runtime. In environments without FUSE, the build scripts set `APPIMAGE_EXTRACT_AND_RUN=1`.

## Installation From Source

```bash
git clone https://github.com/Nepherius/orion.git
cd orion
npm install
```

Run the app in development mode:

```bash
npm run tauri:dev
```

Optional anonymous usage analytics are sent to PostHog only after the user consents in-app. The
public PostHog capture token is configured in `public/analytics.config.json`.

Run the full local check suite:

```bash
npm run check
```

Build the frontend only:

```bash
npm run build
```

## Release Builds

Linux packages:

```bash
npm run tauri:build:linux
```

This builds:

- `src-tauri/target/release/bundle/deb/*.deb`
- `src-tauri/target/release/bundle/rpm/*.rpm`
- `src-tauri/target/release/bundle/appimage/*.AppImage`

Windows packages:

```bash
npm run tauri:build:windows
```

This builds:

- `src-tauri/target/release/bundle/msi/*.msi`
- `src-tauri/target/release/bundle/nsis/*.exe`

Build only the AppImage:

```bash
npm run build:appimg
```

## First Run

1. Launch Orion.
2. Set your player name in Settings.
3. Select your Entropia Universe chat log if it is not detected automatically.
   - Windows: `C:\Users\<YourName>\Documents\Entropia Universe\chat.log`
   - Linux with Wine: `~/.wine/drive_c/users/<YourName>/Documents/Entropia Universe/chat.log`
4. Create at least one loadout.
5. Start a hunting session.
6. Hunt normally while Orion monitors the chat log.
7. Complete the session and review analytics.

## Common Workflows

### Create a Session

1. Open Sessions.
2. Select New Session.
3. Choose creature, location, loadout, and optional notes or tags.
4. Start the session.

### Add Loot Manually

1. Open the session details.
2. Select Add Loot.
3. Enter item name, quantity, TT value, markup, or fixed value.
4. Save the entry.

### Record a Global or HoF Manually

1. Open the session details.
2. Select Add Global.
3. Enter creature and value.
4. Mark the entry as HoF when appropriate.

### Create a Loadout

1. Open Loadouts.
2. Select New Loadout.
3. Choose equipment and medical tools.
4. Review calculated economy and healing costs.
5. Save the loadout.

### Review Analytics

1. Complete one or more sessions.
2. Open Analytics.
3. Review overview, sessions, equipment, loot, creatures, projections, and advanced panels.
4. Check Data Quality if a warning appears.

## GitHub Releases

Release workflows are intended to publish Linux and Windows desktop installers from version tags.

Recommended release flow:

```bash
npm version patch
git push
git push --tags
```

Tag names should use the `v` prefix, for example `v1.2.5`.

The GitHub release workflow builds:

- Linux Debian package
- Linux RPM package
- Linux AppImage
- Windows MSI installer
- Windows NSIS executable installer
- Signed updater artifacts and `latest.json`

Release builds require these GitHub Actions repository secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Orion checks the latest GitHub release after startup. AppImage and Windows installations can
download and install updates in-app; Debian and RPM installations should continue to be upgraded
through their package manager or a newly downloaded package.

## Project Scripts

- `npm run dev`: start Vite.
- `npm run tauri:dev`: run tests, then start Tauri development mode.
- `npm run test`: run React and Rust tests.
- `npm run lint`: run React, Rust, and Clippy checks.
- `npm run format`: check React and Rust formatting.
- `npm run check`: run tests, linting, and formatting checks.
- `npm run tauri:build:linux`: build Linux `deb`, `rpm`, and `AppImage` packages.
- `npm run tauri:build:windows`: build Windows `msi` and `exe` installers.

## Contributing

Issues and pull requests are welcome through GitHub.

Before opening a pull request, run:

```bash
npm run check
```

Keep changes focused, include tests for logic changes, and update documentation when behavior changes.

## Security

Please report security issues privately when possible. Do not include personal chat logs, local database files, or private account information in public issues.

## Disclaimer

Orion is an independent project and is not affiliated with MindArk PE AB or Entropia Universe. All trademarks are property of their respective owners.

## Acknowledgments

- Inspired by Entropia Tally: https://github.com/EntropiaTally/entropia-tally-app/
- Inspired by Artemis: https://www.thedeltaproject.net/artemis
