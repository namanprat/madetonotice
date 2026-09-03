import type { AppId, OsIcon, TextureId } from "@/content/os.ts";
import { DEFAULT_ICONS, NOTEPAD_DEFAULT, WALLPAPERS } from "@/content/os.ts";

export const STORAGE_KEY = "mtn-os-v3";

export type WindowState = {
  id: string;
  app: AppId;
  title: string;
  icon: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  url?: string;
  folderId?: string;
};

export type Persisted = {
  icons: OsIcon[];
  iconSize: number;
  wallpaperId: string;
  titleColor: string;
  texture: TextureId;
  positions: Record<string, { x: number; y: number }>;
  /** Icons the user has dragged; these survive a viewport reflow. */
  moved: Record<string, boolean>;
  notepad: string;
  wordWrap: boolean;
  bestTime: number | null;
};

export function defaultPersisted(): Persisted {
  return {
    icons: structuredClone(DEFAULT_ICONS),
    iconSize: 2.1875,
    wallpaperId: WALLPAPERS[0]?.id ?? "teal",
    titleColor: "",
    texture: "none",
    positions: {},
    moved: {},
    notepad: NOTEPAD_DEFAULT,
    wordWrap: true,
    bestTime: null,
  };
}

/**
 * Reconcile a saved icon list against the current defaults.
 *
 * Content edits — a renamed label, a swapped icon file, a new app — have to
 * reach people who already have a saved desktop, but their own changes must
 * survive. So authored fields come from `DEFAULT_ICONS` and user-owned state
 * (which folder an icon sits in) comes from what was saved. Icons the user
 * created themselves are kept as-is; defaults they have never seen are added.
 */
function mergeIcons(saved: OsIcon[]): OsIcon[] {
  const defaults = new Map(DEFAULT_ICONS.map((i) => [i.id, i]));
  const seen = new Set<string>();

  const merged = saved.map((icon) => {
    const base = defaults.get(icon.id);
    if (!base) return icon;
    seen.add(icon.id);
    return { ...base, folderId: icon.folderId };
  });

  return [
    ...merged,
    ...DEFAULT_ICONS.filter((i) => !seen.has(i.id)).map((i) => ({ ...i })),
  ];
}

export function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPersisted();
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const base = defaultPersisted();
    return {
      ...base,
      ...parsed,
      icons: Array.isArray(parsed.icons)
        ? mergeIcons(parsed.icons)
        : base.icons,
      positions: parsed.positions ?? base.positions,
      moved: parsed.moved ?? base.moved,
    };
  } catch {
    return defaultPersisted();
  }
}

export function savePersisted(data: Persisted): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Private browsing or a full quota — the desktop still works, it just
    // won't survive a reload. Not worth interrupting the user for.
  }
}
