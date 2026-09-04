# Harbor Privacy

Harbor is a local-first Chrome extension. It does not use a Harbor backend, require an account, serve advertising, or include analytics or telemetry.

## Browser data

Harbor uses the permissions declared in `public/manifest.json` to provide the features visible in the extension.

- **Tabs and tab groups:** Harbor reads page titles, URLs, favicons, window and tab positions, pinned state, and native tab-group metadata. It uses this data to display, activate, close, and save regular tabs. Incognito tabs are excluded from persisted workspaces.
- **Chrome bookmarks:** Harbor reads the Chrome bookmark tree. When the user edits, reorders, moves, or imports bookmarks, Harbor writes those changes through `chrome.bookmarks`. Chrome remains the source of truth for bookmark data.
- **Favicons:** Harbor displays site icons using Chrome's extension favicon capability.
- **Side panel:** Harbor exposes its application as a Chrome side panel.

Harbor does not read page body content, cookies, passwords, form values, screenshots, downloads, or the Chrome browsing-history database.

## Local storage

Harbor stores the following data in `chrome.storage.local`:

- saved workspaces and the URL/display metadata needed to restore them;
- user-created quick links;
- todos.

Theme selection and bookmark explorer preferences, such as the selected folder and expanded folders, are stored locally in the extension page's `localStorage`.

The browser development preview uses local demo data because extension APIs are unavailable there. Preview bookmark changes are kept in memory until the page is reloaded. Preview workspaces, quick links, and todos use the development origin's `localStorage`; they are separate from data stored by the installed extension.

## Bookmark files

Bookmark import reads only the HTML file selected by the user. The file is parsed locally, and imported items are created in Chrome bookmarks under a dated import folder. If an import fails, Harbor attempts to remove the incomplete import folder.

Bookmark export creates an HTML file locally from the current Chrome bookmark tree and downloads it through the browser. Harbor does not upload imported or exported bookmark files.

## Opening websites

Opening a tab, bookmark, quick link, or restored workspace navigates Chrome to that URL. The destination website receives the normal browser request; the navigation is not proxied through a Harbor service.

## Removing data

Users can remove saved workspaces, quick links, and todos from Harbor. Clearing the extension's site data or uninstalling the extension removes Harbor's local settings and stored application data. Changes already made to Chrome bookmarks remain part of the user's Chrome bookmark store and can be managed in Chrome's bookmark manager.

## Source

Harbor is open source at <https://github.com/xu756/tab-harbor>.
