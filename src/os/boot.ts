import { MASCOT_TIPS, WALLPAPERS } from "@/content/os.ts";
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
import { wireScreensaver } from "@/os/screensaver.ts";
import { playSound, setSoundEnabled } from "@/os/sound.ts";
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

/** How long the POST screen holds before the desktop appears. */
const POST_MS = 2200;

export function bootDesktop(root: HTMLElement): void {
  if (root.dataset.scriptInitialized) return;
  root.dataset.scriptInitialized = "true";

  let mascotIndex = 0;

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
      mascot: root.querySelector(".mascot_wrap"),
      mascotText: root.querySelector(".mascot_text"),
      saver: root.querySelector(".saver_wrap"),
      crt: root.querySelector(".desktop_crt"),
      launcher: root.querySelector(".launcher_wrap"),
      winTemplate: root.querySelector("#os-window-template"),
    },

    persist: () => savePersisted(ctx.state),

    applyChrome: () => {
      const wall =
        WALLPAPERS.find((w) => w.id === ctx.state.wallpaperId) ?? WALLPAPERS[0];
      const desk = ctx.el.desk;
      if (desk && wall) {
        // Flat colours set a background-color; the tiled patterns are
        // gradients, so they need an image plus a repeat size.
        const isPattern = wall.value.includes("gradient");
        desk.style.backgroundColor = isPattern
          ? "var(--os-desktop)"
          : wall.value;
        desk.style.backgroundImage = isPattern ? wall.value : "none";
        desk.style.backgroundSize = wall.size ?? "auto";
      }

      root.style.setProperty("--os-icon-size", `${ctx.state.iconSize}rem`);
      if (ctx.state.titleColor) {
        root.style.setProperty("--os-title", ctx.state.titleColor);
      } else {
        root.style.removeProperty("--os-title");
      }

      const t = ctx.state.texture;
      if (ctx.el.crt) {
        ctx.el.crt.classList.toggle("has-grain", t === "grain" || t === "both");
        ctx.el.crt.classList.toggle(
          "has-scanlines",
          t === "scanlines" || t === "both",
        );
      }

      setSoundEnabled(ctx.state.sound);
      ctx.el.tray
        ?.querySelector("[data-sound-btn]")
        ?.classList.toggle("is-muted", !ctx.state.sound);
    },

    toast: (message) => {
      const host = ctx.el.toastHost;
      if (!host) return;
      const el = document.createElement("div");
      el.className = "toast_item";
      const label = document.createElement("span");
      label.className = "toast_label";
      label.textContent = "Notice";
      const body = document.createElement("span");
      body.className = "toast_text";
      body.textContent = message;
      el.append(label, body);
      host.appendChild(el);
      playSound("notice");
      window.setTimeout(() => el.remove(), 4000);
    },

    showMascot: (message) => {
      const { mascot, mascotText } = ctx.el;
      if (!mascot || !mascotText) return;
      mascotText.textContent =
        message ?? MASCOT_TIPS[mascotIndex % MASCOT_TIPS.length]!;
      mascotIndex += 1;
      mascot.classList.add("is-active");
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
          playSound("click");
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
    rearmScreensaver: () => {},
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
  wireScreensaver(ctx);

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
      label: "Delete All in Unnoticed",
      action: () => {
        void emptyBin(ctx);
      },
    },
    { label: "Restore All from Unnoticed", action: () => restoreFromBin(ctx) },
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

  ctx.el.mascot
    ?.querySelector(".mascot_close")
    ?.addEventListener("click", () =>
      ctx.el.mascot?.classList.remove("is-active"),
    );
  ctx.el.mascot
    ?.querySelector(".mascot_next")
    ?.addEventListener("click", () => ctx.showMascot());

  // The eye tracks the pointer. It is the whole character of the thing: you
  // notice it noticing you.
  const pupil = ctx.el.mascot?.querySelector<HTMLElement>(".mascot_pupil");
  if (pupil) {
    window.addEventListener(
      "pointermove",
      (e) => {
        const eye = ctx.el.mascot?.querySelector(".mascot_eye");
        if (!eye) return;
        const r = eye.getBoundingClientRect();
        if (r.width === 0) return;
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const angle = Math.atan2(dy, dx);
        const reach = Math.min(Math.hypot(dx, dy) / 40, 1) * (r.width * 0.15);
        pupil.style.transform = `translate(${Math.cos(angle) * reach}px, ${Math.sin(angle) * reach}px)`;
      },
      { passive: true },
    );
  }

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

  // The POST screen is skippable: nobody should be made to sit through a boot
  // sequence twice.
  const finishBoot = () => {
    const splash = ctx.el.splash;
    if (!splash || splash.classList.contains("is-done")) return;
    splash.classList.add("is-done");
    window.setTimeout(() => splash.remove(), 400);
    playSound("startup");
    ctx.toast("Welcome to Made to Notice");
    ctx.showMascot();
  };

  ctx.el.splash?.addEventListener("click", finishBoot);
  window.setTimeout(finishBoot, POST_MS);
}
