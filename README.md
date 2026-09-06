# Publish checklist custom element

A [Kontent.ai custom element](https://kontent.ai/learn/docs/custom-elements) that renders a
task list ("things to do before this item can be published"). Editors can add and remove tasks
and check them off; the element only reports a value back to Kontent.ai once **every** task is
checked, so adding the built-in **Required** validation to this element blocks publishing until
the checklist is complete.

Built from the structure of [`kontent-ai/custom-element-starter-react`](https://github.com/kontent-ai/custom-element-starter-react).

## How the "Required" trick works

Kontent.ai's Required validation only cares whether an element's value is `null` (empty) or not
— any non-null value counts as filled in. So this element:

- keeps the working task list (text + done/not-done) in local component state while you edit,
- calls `CustomElement.setValue(null)` (empty) whenever there are no tasks, or any task is still
  unchecked,
- calls `CustomElement.setValue(json)` with the full list only once every task is checked off.

One consequence: because the "real" value is empty until the list is complete, an unfinished
checklist can't be read back from it after a full page reload. To avoid losing an in-progress
checklist, this element also caches the working list in the browser's `localStorage` (keyed by
environment/item/variant), and reads that cache back if the official value is still empty. This
means an unfinished checklist survives reloads in the same browser, but won't sync across
different browsers/devices until it's completed. If everyone completing the checklist works from
the same browser session this is invisible; for stricter multi-device guarantees the list would
need to be backed by an actual API instead of `setValue`/`localStorage`.

## Project layout

```
src/
  main.tsx                          bootstraps React, wraps the app in the custom element context
  TaskListApp.tsx                   the task list UI (add/remove/check tasks)
  TaskListApp.css
  customElement/
    CustomElementContext.tsx        wraps CustomElement.init and exposes value/isDisabled/etc. via hooks
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
2. Add a **Custom element**, and set its hosted code URL to your deployed `index.html`.
3. Turn on **Required** for the element — this is what blocks publishing until every task is
   checked off.
4. No JSON configuration is needed; content editors add their own tasks per item.
