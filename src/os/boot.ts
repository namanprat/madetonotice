import { CLIPPY_TIPS, WALLPAPERS } from "@/content/os.ts";
import type { Ctx, MenuItem } from "@/os/context.ts";
import {
  arrangeIcons,
  emptyBin,
  newFolder,
  reflowIcons,
  renderIcons,
  restoreFromBin,
  selectIcons,
  wireIconKeys,
  wireMarquee,
} from "@/os/icons.ts";
import { loadPersisted, savePersisted } from "@/os/persist.ts";
import {
  closeLauncher,
  openLauncher,
  renderTaskbar,
  wireStartMenu,
  wireTray,
} from "@/os/taskbar.ts";
import {
  focusWindow,
  openApp,
  openIcon,
  paintWindow,
  refreshOpenFolders,
} from "@/os/windows.ts";

/** Context-menu geometry, used to keep a menu inside the viewport. */
const MENU_W = 160;
const MENU_ROW = 26;

export function bootDesktop(root: HTMLElement): void {
  if (root.dataset.scriptInitialized) return;
  root.dataset.scriptInitialized = "true";

  let clippyIndex = 0;

  const ctx: Ctx = {
    root,
    state: loadPersisted(),
    windows: new Map(),
    zTop: 10,
    selected: new Set(),

    el: {
      splash: root.querySelector(".splash_wrap"),
      desk: root.querySelector(".desktop_surface"),
      iconLayer: root.querySelector(".desktop_icons"),
      windowHost: root.querySelector(".desktop_windows"),
      taskTabs: root.querySelector(".taskbar_tabs"),
      startMenu: root.querySelector(".start_menu"),
      startBtn: root.querySelector(".taskbar_start"),
      clock: root.querySelector(".taskbar_clock"),
      calendar: root.querySelector(".taskbar_calendar"),
      tray: root.querySelector(".taskbar_tray"),
      context: root.querySelector(".context_wrap"),
      toastHost: root.querySelector(".toast_host"),
      clippy: root.querySelector(".clippy_wrap"),
      clippyText: root.querySelector(".clippy_text"),
      crt: root.querySelector(".desktop_crt"),
      launcher: root.querySelector(".launcher_wrap"),
      winTemplate: root.querySelector("#os-window-template"),
    },

    persist: () => savePersisted(ctx.state),

    applyChrome: () => {
      const wall =
        WALLPAPERS.find((w) => w.id === ctx.state.wallpaperId) ?? WALLPAPERS[0];
      if (ctx.el.desk && wall) ctx.el.desk.style.backgroundColor = wall.value;
      root.style.setProperty("--os-icon-size", `${ctx.state.iconSize}rem`);
      if (ctx.state.titleColor) {
        root.style.setProperty("--os-title", ctx.state.titleColor);
      } else {
        root.style.removeProperty("--os-title");
      }
      const t = ctx.state.texture;
      root.dataset.texture = t;
      if (ctx.el.crt) {
        ctx.el.crt.classList.toggle("has-grain", t === "grain" || t === "both");
        ctx.el.crt.classList.toggle(
          "has-scanlines",
          t === "scanlines" || t === "both",
        );
      }
    },

    toast: (message) => {
      const host = ctx.el.toastHost;
      if (!host) return;
      const el = document.createElement("div");
      el.className = "toast_item";
      el.textContent = message;
      host.appendChild(el);
      window.setTimeout(() => el.remove(), 4000);
    },

    showClippy: (message) => {
      const { clippy, clippyText } = ctx.el;
      if (!clippy || !clippyText) return;
      clippyText.textContent =
        message ?? CLIPPY_TIPS[clippyIndex % CLIPPY_TIPS.length]!;
      clippyIndex += 1;
      clippy.classList.add("is-active");
    },

    hideContext: () => {
      const menu = ctx.el.context;
      if (!menu) return;
      menu.hidden = true;
      menu.classList.remove("is-active");
      menu.replaceChildren();
    },

    showContext: (x, y, items) => {
      const menu = ctx.el.context;
      if (!menu) return;
      menu.replaceChildren();

      for (const item of items) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "context_item";
        btn.textContent = item.label;
        btn.disabled = !!item.disabled;
        btn.addEventListener("click", () => {
          ctx.hideContext();
          item.action();
        });
        menu.appendChild(btn);
      }

      menu.hidden = false;
      menu.classList.add("is-active");

      // Flip against the viewport edges rather than spilling off-screen.
      const rect = root.getBoundingClientRect();
      const h = items.length * MENU_ROW + 8;
      menu.style.left = `${Math.max(0, Math.min(x - rect.left, rect.width - MENU_W))}px`;
      menu.style.top = `${Math.max(0, Math.min(y - rect.top, rect.height - h))}px`;
    },

    closePopups: () => {
      ctx.hideContext();
      ctx.el.startMenu?.classList.remove("is-active");
      ctx.el.startBtn?.classList.remove("is-active");
      ctx.el.startBtn?.setAttribute("aria-expanded", "false");
      if (ctx.el.calendar) ctx.el.calendar.hidden = true;
      closeLauncher(ctx);
    },

    // Filled below, once every module exists.
    renderIcons: () => {},
    renderTaskbar: () => {},
    openApp: () => {},
    openIcon: () => {},
    paintWindow: () => {},
    focusWindow: () => {},
    refreshOpenFolders: () => {},
  };

  ctx.renderIcons = () => renderIcons(ctx);
  ctx.renderTaskbar = () => renderTaskbar(ctx);
  ctx.openApp = (app, opts) => openApp(ctx, app, opts);
  ctx.openIcon = (id) => openIcon(ctx, id);
  ctx.paintWindow = (win) => paintWindow(ctx, win);
  ctx.focusWindow = (id) => focusWindow(ctx, id);
  ctx.refreshOpenFolders = () => refreshOpenFolders(ctx);

  wireStartMenu(ctx);
  wireTray(ctx);
  wireMarquee(ctx);
  wireIconKeys(ctx);

  const desktopMenu = (): MenuItem[] => [
    { label: "Arrange Icons", action: () => arrangeIcons(ctx) },
    { label: "Refresh", action: () => ctx.renderIcons() },
    {
      label: "New Folder",
      action: () => {
        void newFolder(ctx);
      },
    },
    { label: "Programs…", action: () => openLauncher(ctx) },
    { label: "Properties", action: () => ctx.openApp("settings") },
    {
      label: "Empty Recycle Bin",
      action: () => {
        void emptyBin(ctx);
      },
    },
    { label: "Restore Recycle Bin", action: () => restoreFromBin(ctx) },
  ];

  ctx.el.desk?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest(".desktop_icon, .window_wrap")) return;
    selectIcons(ctx, []);
    ctx.closePopups();
  });

  ctx.el.desk?.addEventListener("contextmenu", (e) => {
    if ((e.target as HTMLElement).closest(".desktop_icon, .window_wrap")) return;
    e.preventDefault();
    ctx.showContext(e.clientX, e.clientY, desktopMenu());
  });

  ctx.el.clippy
    ?.querySelector(".clippy_close")
    ?.addEventListener("click", () => ctx.el.clippy?.classList.remove("is-active"));
  ctx.el.clippy
    ?.querySelector(".clippy_next")
    ?.addEventListener("click", () => ctx.showClippy());

  // Icons the user has not placed themselves re-pack when the viewport changes,
  // so a narrow phone never leaves one stranded off the right edge.
  let resizeTimer: number | undefined;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      reflowIcons(ctx);
      ctx.persist();
      ctx.renderIcons();
    }, 150);
  });

  ctx.applyChrome();
  reflowIcons(ctx);
  ctx.persist();
  ctx.renderIcons();
  ctx.renderTaskbar();

  window.setTimeout(() => {
    ctx.el.splash?.classList.add("is-done");
    window.setTimeout(() => ctx.el.splash?.remove(), 400);
    ctx.toast("Welcome to Made to Notice");
    ctx.showClippy();
  }, 900);
}
