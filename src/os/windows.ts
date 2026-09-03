import { MASCOT_CONTEXT, IE_HOME, type AppId } from "@/content/os.ts";
import { APPS, appTitle } from "@/os/apps/registry.ts";
import type { Menu } from "@/os/apps/types.ts";
import type { Ctx, OpenOpts } from "@/os/context.ts";
import { esc } from "@/os/context.ts";
import { onDrag } from "@/os/drag.ts";
import { clamp } from "@/os/layout.ts";
import type { WindowState } from "@/os/persist.ts";

/** Below this width a window opens maximized; a phone has no room to float. */
const MOBILE_MAX = 480;
const MIN_W = 240;
const MIN_H = 160;

function isMobile(): boolean {
  return window.innerWidth < MOBILE_MAX;
}

function winEl(ctx: Ctx, id: string): HTMLElement | null {
  return (
    ctx.el.windowHost?.querySelector<HTMLElement>(
      `.window_wrap[data-window-id="${id}"]`,
    ) ?? null
  );
}

/** Underline the mnemonic letter, the way a real Win95 menu bar does. */
function menuLabel(menu: Menu): string {
  const at = menu.key ?? 0;
  const before = esc(menu.label.slice(0, at));
  const letter = esc(menu.label.slice(at, at + 1));
  const after = esc(menu.label.slice(at + 1));
  return `${before}<u>${letter}</u>${after}`;
}

function renderMenuBar(ctx: Ctx, el: HTMLElement, win: WindowState): void {
  const bar = el.querySelector<HTMLElement>(".window_menubar");
  if (!bar) return;
  const app = APPS[win.app];
  const menus = app.menus?.(ctx, el, win) ?? [];

  if (menus.length === 0) {
    bar.hidden = true;
    return;
  }

  bar.hidden = false;
  bar.replaceChildren();

  menus.forEach((menu) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "window_menu";
    btn.innerHTML = menuLabel(menu);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const r = btn.getBoundingClientRect();
      // Rebuild on open so labels that reflect state (Word Wrap, best time)
      // are current rather than frozen at first paint.
      const live = APPS[win.app].menus?.(ctx, el, win) ?? menus;
      const fresh = live.find((m) => m.label === menu.label) ?? menu;
      ctx.showContext(r.left, r.bottom, fresh.items);
    });
    bar.appendChild(btn);
  });
}

function renderStatusBar(ctx: Ctx, el: HTMLElement, win: WindowState): void {
  const bar = el.querySelector<HTMLElement>(".window_statusbar");
  if (!bar) return;
  const status = APPS[win.app].status?.(ctx, win);
  if (!status) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  const [main, side] = status;
  const mainEl = bar.querySelector<HTMLElement>(".window_status_main");
  const sideEl = bar.querySelector<HTMLElement>(".window_status_side");
  if (mainEl) mainEl.textContent = main;
  if (sideEl) sideEl.textContent = side;
}

export function paintWindow(ctx: Ctx, win: WindowState): void {
  const host = ctx.el.windowHost;
  const template = ctx.el.winTemplate;
  if (!host || !template) return;

  let el = winEl(ctx, win.id);
  if (!el) {
    const node = template.content.firstElementChild?.cloneNode(
      true,
    ) as HTMLElement;
    node.dataset.windowId = win.id;
    host.appendChild(node);
    el = node;
    wireWindow(ctx, el, win);
  }

  el.style.zIndex = String(win.z);
  el.classList.toggle("is-minimized", win.minimized);
  el.classList.toggle("is-maximized", win.maximized);

  if (!win.maximized) {
    el.style.left = `${win.x}px`;
    el.style.top = `${win.y}px`;
    el.style.width = `${win.w}px`;
    el.style.height = `${win.h}px`;
  }

  const title = el.querySelector(".window_title");
  if (title) title.textContent = win.title;
  const iconEl = el.querySelector<HTMLImageElement>("[data-win-icon]");
  if (iconEl) iconEl.src = win.icon;

  // The maximize button shows the restore glyph once maximized.
  el.querySelector("[data-win=max] .window_glyph")?.classList.toggle(
    "restore",
    win.maximized,
  );

  const body = el.querySelector<HTMLElement>(".window_body");
  if (body && !body.dataset.filled) {
    body.innerHTML = APPS[win.app].html(ctx, win);
    body.dataset.filled = "true";
    renderMenuBar(ctx, el, win);
    renderStatusBar(ctx, el, win);
    APPS[win.app].wire?.(ctx, el, win);
  }
}

export function refreshWindowBody(ctx: Ctx, win: WindowState): void {
  const el = winEl(ctx, win.id);
  const body = el?.querySelector<HTMLElement>(".window_body");
  if (!el || !body) return;
  body.innerHTML = APPS[win.app].html(ctx, win);
  body.dataset.filled = "true";
  renderMenuBar(ctx, el, win);
  renderStatusBar(ctx, el, win);
  APPS[win.app].wire?.(ctx, el, win);
}

/** Re-read every open folder window after the icon tree changes. */
export function refreshOpenFolders(ctx: Ctx): void {
  for (const win of ctx.windows.values()) {
    if (APPS[win.app] === APPS.folder) refreshWindowBody(ctx, win);
  }
}

export function focusWindow(ctx: Ctx, id: string): void {
  const win = ctx.windows.get(id);
  if (!win) return;
  ctx.zTop += 1;
  win.z = ctx.zTop;
  win.minimized = false;

  paintWindow(ctx, win);
  for (const el of ctx.el.windowHost?.querySelectorAll(".window_wrap") ?? []) {
    el.classList.toggle(
      "is-active",
      (el as HTMLElement).dataset.windowId === id,
    );
  }

  ctx.renderTaskbar();
}

export function closeWindow(ctx: Ctx, id: string): void {
  ctx.windows.delete(id);
  winEl(ctx, id)?.remove();
  ctx.renderTaskbar();

  // Hand focus to whatever is now on top, so the desktop is never left with
  // every window greyed out.
  const top = [...ctx.windows.values()].sort((a, b) => b.z - a.z)[0];
  if (top) focusWindow(ctx, top.id);
}

export function openApp(ctx: Ctx, app: AppId, opts: OpenOpts = {}): void {
  // Folders and browser windows can be opened more than once; everything else
  // focuses its existing instance.
  const singleton = app !== "folder" && app !== "ie";
  if (singleton) {
    const existing = [...ctx.windows.values()].find((w) => w.app === app);
    if (existing) {
      focusWindow(ctx, existing.id);
      return;
    }
  }

  const size = APPS[app].size ?? { w: 420, h: 320 };
  const offset = ctx.windows.size * 16;
  const id = `${app}-${crypto.randomUUID().slice(0, 8)}`;

  const win: WindowState = {
    id,
    app,
    title: opts.title ?? appTitle(app, opts.folderId),
    icon: opts.icon ?? "/os/icons/file1.png",
    x: 48 + offset,
    y: 32 + offset,
    w: Math.min(size.w, window.innerWidth - 32),
    h: Math.min(size.h, window.innerHeight - 96),
    z: (ctx.zTop += 1),
    minimized: false,
    maximized: isMobile(),
    url: opts.url ?? (app === "ie" ? IE_HOME : undefined),
    folderId: opts.folderId,
  };

  ctx.windows.set(id, win);
  paintWindow(ctx, win);
  focusWindow(ctx, id);

  // Tip on open, not on every focus — re-summoning it put the mascot on top of
  // the window the user had just touched.
  const tip = MASCOT_CONTEXT[app];
  if (tip) ctx.showMascot(tip);
}

export function openIcon(ctx: Ctx, iconId: string): void {
  const icon = ctx.state.icons.find((i) => i.id === iconId);
  if (!icon) return;

  if (icon.app === "folder") {
    openApp(ctx, "folder", {
      folderId: icon.id,
      title: icon.label,
      icon: icon.icon,
    });
    return;
  }

  openApp(ctx, icon.app, {
    icon: icon.icon,
    title: icon.label,
    url: icon.url ?? (icon.app === "ie" ? IE_HOME : undefined),
  });
}

function wireWindow(ctx: Ctx, el: HTMLElement, win: WindowState): void {
  el.addEventListener("pointerdown", () => focusWindow(ctx, win.id));

  el.querySelector("[data-win=min]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    win.minimized = true;
    paintWindow(ctx, win);
    ctx.renderTaskbar();
  });

  const toggleMax = () => {
    win.maximized = !win.maximized;
    paintWindow(ctx, win);
  };

  el.querySelector("[data-win=max]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMax();
  });

  el.querySelector("[data-win=close]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeWindow(ctx, win.id);
  });

  wireDrag(ctx, el, win, toggleMax);
  wireResize(ctx, el, win);
}

function wireDrag(
  ctx: Ctx,
  el: HTMLElement,
  win: WindowState,
  toggleMax: () => void,
): void {
  const bar = el.querySelector<HTMLElement>(".window_titlebar");
  if (!bar) return;

  bar.addEventListener("dblclick", (e) => {
    if ((e.target as HTMLElement).closest("[data-win]")) return;
    toggleMax();
  });

  let offset = { x: 0, y: 0 };

  onDrag(bar, {
    shouldStart: (e) =>
      !win.maximized && !(e.target as HTMLElement).closest("[data-win]"),

    onStart: (e) => {
      offset = { x: e.clientX - win.x, y: e.clientY - win.y };
      ctx.root.classList.add("is-dragging");
    },

    onMove: (e) => {
      if (win.maximized) return;
      const host = ctx.el.windowHost?.getBoundingClientRect();
      // Clamp so a window can never be dragged past an edge and stranded.
      // A sliver of title bar must stay grabbable on every side.
      const maxX = (host?.width ?? window.innerWidth) - 64;
      const maxY = (host?.height ?? window.innerHeight) - 32;
      win.x = clamp(e.clientX - offset.x, 64 - win.w, maxX);
      win.y = clamp(e.clientY - offset.y, 0, maxY);
      el.style.left = `${win.x}px`;
      el.style.top = `${win.y}px`;
    },

    onEnd: () => ctx.root.classList.remove("is-dragging"),
  });
}

/**
 * Pointer-driven resize grips. The CSS `resize: both` this replaces never wrote
 * its result back to the window state, so any repaint snapped the size back.
 */
function wireResize(ctx: Ctx, el: HTMLElement, win: WindowState): void {
  el.querySelectorAll<HTMLElement>("[data-resize]").forEach((grip) => {
    const edge = grip.dataset.resize ?? "se";
    let from = { x: 0, y: 0 };
    let start = { x: 0, y: 0, w: 0, h: 0 };

    onDrag(grip, {
      shouldStart: () => !win.maximized,

      onStart: (e) => {
        from = { x: e.clientX, y: e.clientY };
        start = { x: win.x, y: win.y, w: win.w, h: win.h };
      },

      onMove: (e) => {
        if (win.maximized) return;
        const dx = e.clientX - from.x;
        const dy = e.clientY - from.y;

        if (edge.includes("e")) win.w = Math.max(MIN_W, start.w + dx);
        if (edge.includes("s")) win.h = Math.max(MIN_H, start.h + dy);
        if (edge.includes("w")) {
          win.w = Math.max(MIN_W, start.w - dx);
          win.x = start.x + (start.w - win.w);
        }
        if (edge.includes("n")) {
          win.h = Math.max(MIN_H, start.h - dy);
          win.y = start.y + (start.h - win.h);
        }

        el.style.left = `${win.x}px`;
        el.style.top = `${win.y}px`;
        el.style.width = `${win.w}px`;
        el.style.height = `${win.h}px`;
      },

      onEnd: () => paintWindow(ctx, win),
    });
  });
}
