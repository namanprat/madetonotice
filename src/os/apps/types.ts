import type { Ctx, MenuItem } from "@/os/context.ts";
import type { WindowState } from "@/os/persist.ts";

/** One top-level menu-bar entry and its dropdown. */
export type Menu = {
  label: string;
  /** Index of the mnemonic letter in `label`, underlined in the bar. */
  key?: number;
  items: MenuItem[];
};

export type AppModule = {
  /** Markup for the window's content panel. */
  html: (ctx: Ctx, win: WindowState) => string;
  /** Bind events after the body is written. */
  wire?: (ctx: Ctx, el: HTMLElement, win: WindowState) => void;
  /** Menu bar. Omit for a window with no menus. */
  menus?: (ctx: Ctx, el: HTMLElement, win: WindowState) => Menu[];
  /** Status bar panes: [left, right]. Omit for no status bar. */
  status?: (ctx: Ctx, win: WindowState) => [string, string];
  /** Initial window size in px. */
  size?: { w: number; h: number };
};
