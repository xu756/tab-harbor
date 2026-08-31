# Tab Harbor Privacy

Tab Harbor v2 is designed as a local-first Chrome extension.

## Current data handling

The current implementation does not use a Tab Harbor backend and does not transmit browsing data to a Tab Harbor server.

To provide tab-management features, the extension reads Chrome tab metadata available through the permissions declared in `manifest.json`, including page title, URL, favicon, window/tab position, pinned state, and native tab-group metadata.

Tab Harbor does not need page body content, cookies, passwords, form values, browsing history, downloads, or screenshots for the current feature set.

## Local storage

User-created workspaces are stored locally with `chrome.storage.local`. A saved workspace contains the URLs and display metadata required to show and restore that workspace.

Incognito tabs are excluded from the workspace data model by default.

## Accounts and synchronization

The Devices/Login interface in the v2 local-only build is a placeholder for a future phase. Google, GitHub, email login, multi-device synchronization, remote sessions, Send to Device, and Inbox are not connected in the current implementation.

Before cloud synchronization is introduced, its data model, security behavior, account deletion/export flow, privacy controls, and privacy notice must be implemented and reviewed separately.

## Data ownership

Local extension data can be removed by deleting workspaces in Tab Harbor, clearing the extension's local storage, or uninstalling the extension.

## Source

Tab Harbor is open source at https://github.com/xu756/tab-harbor.
