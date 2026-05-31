# Contributing

Thanks for helping improve Orion.

## Development Setup

Install dependencies:

```bash
npm install
```

Run the app in development mode:

```bash
npm run tauri:dev
```

Run the full check suite before opening a pull request:

```bash
npm run check
```

## Pull Request Guidelines

- Keep each pull request focused on one problem or feature.
- Include tests for logic changes.
- Update README or other docs when user-facing behavior changes.
- Avoid committing generated build artifacts from `dist` or `src-tauri/target`.
- Do not include personal chat logs, local database files, screenshots with private account information, or local configuration.

## Code Style

- TypeScript and React are formatted with Prettier.
- Rust is formatted with `cargo fmt`.
- React linting uses ESLint.
- Rust linting uses Clippy with warnings treated as errors.

## Useful Commands

```bash
npm run test:react
npm run test:rust
npm run lint
npm run format
npm run build
```

## Release Builds

Linux release packages:

```bash
npm run tauri:build:linux
```

Windows release packages:

```bash
npm run tauri:build:windows
```
