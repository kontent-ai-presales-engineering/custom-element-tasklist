# Publish checklist custom element

A [Kontent.ai custom element](https://kontent.ai/learn/docs/custom-elements) that renders a
task list ("things to do before this item can be published"). Editors can add and remove tasks
and check them off. Every change is saved to the element's value, together with a timestamped
history per task, so the task list is shared between users and every version of the item in
Version history shows the list as it was at that time.

A small companion "publish gate" element (the same hosted code, in a different mode) is marked as
**Required** and blocks publishing until every task is done.

Built from the structure of [`kontent-ai/custom-element-starter-react`](https://github.com/kontent-ai/custom-element-starter-react).

## How it works

Kontent.ai's Required validation only checks whether an element's value is `null` (empty) or not;
any non-null value counts as filled in. A task list that always stores its tasks can't use that
directly, so the work is split over two custom elements that use the same hosted code:

- **Task list** (default mode, not Required): stores the full list as JSON on every change.
  Removed tasks are kept as hidden tombstones so their history isn't lost. Each task carries a
  list of events (`added`, `completed`, `reopened`, `removed`) with an ISO-8601 timestamp taken
  from the editor's browser clock. The element shows when each task was added and completed, and
  a "Show history" view lists all events, including those of removed tasks.
- **Publish gate** (`"mode": "gate"`, Required): reads the task list element with
  `getElementValue` / `observeElementChanges` and sets its own value to `"All tasks done"` only
  while every task that hasn't been removed is done, otherwise `null`. An empty task list counts
  as done. If the task list value can't be parsed, publishing stays blocked.

### Who made a change

The custom elements API doesn't tell the element who the current user is, so the stored history
only has timestamps. Who made a change comes from Kontent.ai itself: in **Version history**, hover
over a highlighted change to see who made it. Kontent.ai groups changes into versions (a new
version starts when another user edits, the workflow step changes, or after 30 minutes of
inactivity), so several quick changes by one person end up in the same version.

### Stored value

```json
[
  {
    "id": "5b0c…",
    "text": "Check image rights",
    "done": true,
    "removed": false,
    "events": [
      { "type": "added", "at": "2026-09-29T08:12:31.000Z" },
      { "type": "completed", "at": "2026-09-29T09:40:02.000Z" }
    ]
  }
]
```

Values written by earlier versions of this element (tasks without `removed`/`events`) are still
read. Earlier versions also kept unfinished lists in the browser's `localStorage`; the first time
such an item is opened for editing in that browser, the draft is moved into the element's value.

## Project layout

```
src/
  main.tsx                          bootstraps React, wraps the app in the custom element context
  App.tsx                           picks task list or publish gate mode from the element config
  TaskListApp.tsx                   the task list UI (add/remove/check tasks, history)
  PublishGateApp.tsx                the Required companion element that blocks publishing
  TaskListApp.css
  customElement/
    CustomElementContext.tsx        wraps CustomElement.init and exposes value/config/isDisabled/etc. via hooks
    EnsureKontentAsParent.tsx       guards against opening the page outside of an iframe
    value.ts                        Task/Value types, parsing, and the isFulfilled() check
  types/
    custom-element-api.d.ts        ambient typing for the global `CustomElement` API
    vite-env.d.ts
```

## Developing locally

```
npm install
npm run dev
```

This starts a local HTTPS dev server (via `@vitejs/plugin-basic-ssl`) — Kontent.ai requires
custom elements to be served over HTTPS, even in development. Accept the self-signed certificate
warning in your browser once, then add the printed `https://localhost:...` URL as the custom
element's hosted code URL for a content type in your Kontent.ai environment.

## Building & deploying

```
npm run build
```

Deploy the contents of `dist/` to any static HTTPS host (e.g. Netlify, Vercel, Azure Static Web
Apps, GitHub Pages), then point the custom element's hosted code URL at it.

## Setting it up in Kontent.ai

1. In **Content model**, open the content type this checklist belongs to.
2. Add a **Custom element** for the task list (for example codename `tasks`) and set its hosted
   code URL to your deployed `index.html`. No JSON configuration is needed. Do **not** mark it as
   Required: it has a value as soon as a task is added, so Required would no longer block
   publishing.
3. Add a second **Custom element** for the publish gate, in the **same content group** as the
   task list, with the same hosted code URL and this JSON configuration:
   ```json
   { "mode": "gate", "taskListElement": "tasks" }
   ```
   Under *Allow the custom element to read values of specific elements*, select the task list
   element, and turn on **Required**.

### Upgrading from the single-element version

- Turn **Required** off on the existing task list element and add the gate element as described
  above.
- The gate sets its value when an item is opened in the editor. Existing items get it the first
  time someone opens them, so an item can't be published before it has been opened once.
