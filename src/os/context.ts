import type { AppId } from "@/content/os.ts";
import type { Persisted, WindowState } from "@/os/persist.ts";

/** Options accepted when opening a window. */
export type OpenOpts = {
  title?: string;
  url?: string;
  folderId?: string;
  icon?: string;
};

/** One entry in a context or menu-bar dropdown. */
export type MenuItem = {
  label: string;
  action: () => void;
  disabled?: boolean;
};

/**
 * Shared desktop context.
 *
 * The OS modules are mutually recursive — icons open windows, windows list
 * icons — so instead of importing each other they read the callbacks off this
 * object. `boot.ts` builds it and fills the `late` slots once every module has
 * been initialised, which keeps the import graph acyclic.
 *
 * ponytail: a plain mutable object rather than an event bus. Ceiling is that
 * calling a `late` slot before boot finishes throws; boot wires them all
 * synchronously before the first user event can fire, so it cannot happen.
 */
export type Ctx = {
  /** Component root — also the scope for CSS custom properties. */
  root: HTMLElement;
  state: Persisted;
  /** Open windows by id. */
  windows: Map<string, WindowState>;
  /** Monotonic stacking counter; never compacted. */
  zTop: number;
  selected: Set<string>;

  el: {
    splash: HTMLElement | null;
    desk: HTMLElement | null;
    iconLayer: HTMLElement | null;
    windowHost: HTMLElement | null;
    taskTabs: HTMLElement | null;
    startMenu: HTMLElement | null;
    startBtn: HTMLButtonElement | null;
    clock: HTMLElement | null;
    calendar: HTMLElement | null;
    tray: HTMLElement | null;
    context: HTMLElement | null;
    toastHost: HTMLElement | null;
    clippy: HTMLElement | null;
    clippyText: HTMLElement | null;
    crt: HTMLElement | null;
    launcher: HTMLElement | null;
    winTemplate: HTMLTemplateElement | null;
  };

  persist: () => void;
  applyChrome: () => void;
  toast: (message: string) => void;
  showClippy: (message?: string) => void;
  showContext: (x: number, y: number, items: MenuItem[]) => void;
  hideContext: () => void;
  closePopups: () => void;

  /** Filled by `boot.ts` after every module has initialised. */
  renderIcons: () => void;
  renderTaskbar: () => void;
  openApp: (app: AppId, opts?: OpenOpts) => void;
  openIcon: (iconId: string) => void;
  paintWindow: (win: WindowState) => void;
  focusWindow: (id: string) => void;
  refreshOpenFolders: () => void;
};

/** Escape a string for interpolation into an HTML attribute or text node. */
export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
