# Security Policy

## Reporting a Vulnerability

Please do not open a public issue for a security vulnerability.

Report security concerns through GitHub private vulnerability reporting if it is enabled for the repository. If it is not enabled yet, open a minimal public issue asking for a private contact method without including exploit details, personal data, chat logs, database files, or local configuration.

Useful details to include privately:

- Orion version
- Operating system
- Whether the issue affects chat log parsing, local data storage, file access, network requests, or packaged installers
- Steps to reproduce
- Expected behavior and observed behavior
- Any relevant logs with personal data removed

## Scope

In scope:

- Local data exposure
- Unsafe file access
- Unsafe Tauri command permissions
- Installer or update-chain concerns
- Network behavior that leaks private information
- Parser behavior that can corrupt or spoof tracked session data

Out of scope:

- Issues requiring full local machine compromise
- Reports based only on unsupported operating systems
- Vulnerabilities in Entropia Universe itself

## Privacy Notes

Orion parses local Entropia Universe chat logs and stores local session data. Do not attach real chat logs, local databases, or screenshots containing private account or player information to public reports.
