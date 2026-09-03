/** Placeholder Made to Notice OS content — swap later. */

export type AppId =
  | "about"
  | "projects"
  | "mail"
  | "ie"
  | "paint"
  | "notepad"
  | "minesweeper"
  | "settings"
  | "my-computer"
  | "recycle-bin"
  | "folder";

export type OsIcon = {
  id: string;
  label: string;
  /** Path under /os/icons/ */
  icon: string;
  app: AppId;
  /** Desktop only when folderId is null. */
  folderId: string | null;
  /** Cannot be renamed, deleted, or dragged to the Recycle Bin. */
  protected?: boolean;
  url?: string;
  /** Present on project items; drives the Properties sheet. */
  meta?: ProjectMeta;
};

export type Wallpaper = {
  id: string;
  label: string;
  /** A flat colour, or a CSS gradient standing in for a tiled pattern. */
  value: string;
  /** Set for the tiled patterns so they repeat rather than stretch. */
  size?: string;
};

/** A drive in My Computer. The two verticals are drives, not folders. */
export type Drive = {
  id: string;
  letter: string;
  label: string;
  icon: string;
  /** Fraction of the capacity bar that reads as used. */
  used: number;
};

export type ProjectMeta = {
  client: string;
  vertical: string;
  year: string;
  deliverables: string[];
  status: string;
};

/** Desktop texture overlay. */
export type TextureId = "none" | "grain" | "scanlines" | "both";

/** Screensaver style. */
export type SaverId = "off" | "marquee" | "stars";

export const IE_HOME = "https://wearenotice.com";
export const PAINT_URL = "https://jspaint.app";
/** Inbox address shown in Mail and used for mailto. */
export const MAIL_TO = "hello@madetonotice.art";

/**
 * Flat colours plus tiled patterns, the way Win95 shipped Bricks and
 * Houndstooth. The patterns are gradients, so they cost nothing to ship.
 */
export const WALLPAPERS: Wallpaper[] = [
  { id: "teal", label: "Teal", value: "var(--os-desktop)" },
  { id: "brand", label: "Notice", value: "var(--brand-500)" },
  { id: "dark", label: "Night", value: "var(--dark-900)" },
  {
    id: "dots",
    label: "Attention",
    value:
      "radial-gradient(circle at 50% 50%, var(--brand-500) 0 1px, transparent 1px)",
    size: "0.75rem 0.75rem",
  },
  {
    id: "rule",
    label: "Ruled",
    value:
      "repeating-linear-gradient(0deg, color-mix(in srgb, var(--brand-500) 22%, transparent) 0 1px, transparent 1px 0.75rem)",
    size: "auto",
  },
  {
    id: "weave",
    label: "Weave",
    value:
      "repeating-linear-gradient(45deg, color-mix(in srgb, var(--brand-500) 16%, transparent) 0 2px, transparent 2px 6px)",
    size: "auto",
  },
];

/** Studio capacity, surfaced in My Computer as a disk-space gauge. */
export const CAPACITY = { total: 4, taken: 3 };

export const DRIVES: Drive[] = [
  {
    id: "disk-c",
    letter: "C:",
    label: "Studio",
    icon: "/os/icons/c.png",
    used: 0.62,
  },
  {
    id: "marketing",
    letter: "M:",
    label: "Marketing",
    icon: "/os/icons/rom.png",
    used: 0.78,
  },
  {
    id: "product",
    letter: "P:",
    label: "Product Design",
    icon: "/os/icons/rom.png",
    used: 0.54,
  },
];

export const SAVERS: { id: SaverId; label: string }[] = [
  { id: "off", label: "(None)" },
  { id: "marquee", label: "Scrolling Marquee" },
  { id: "stars", label: "Flying Notices" },
];

export const SAVER_DELAYS = [15, 30, 60, 300];

export const TEXTURES: { id: TextureId; label: string }[] = [
  { id: "none", label: "(None)" },
  { id: "grain", label: "Grain" },
  { id: "scanlines", label: "Scanlines" },
  { id: "both", label: "Grain + Scanlines" },
];

/**
 * Icon size steps, after the reference project's five-step table. Larger icons
 * simply wrap into fewer rows per column, so nothing else has to change.
 */
export const ICON_SIZES: { label: string; value: number }[] = [
  { label: "Largest", value: 3.4375 },
  { label: "Larger", value: 3.125 },
  { label: "Normal", value: 2.8125 },
  { label: "Smaller", value: 2.5 },
  { label: "Smallest", value: 2.1875 },
];

export const DEFAULT_ICONS: OsIcon[] = [
  {
    id: "my-computer",
    label: "My Computer",
    icon: "/os/icons/pcicon.png",
    app: "my-computer",
    folderId: null,
    protected: true,
  },
  {
    id: "recycle-bin",
    label: "Unnoticed",
    icon: "/os/icons/bin.png",
    app: "recycle-bin",
    folderId: null,
    protected: true,
  },
  {
    id: "about",
    label: "About",
    icon: "/os/icons/bio_pc.png",
    app: "about",
    folderId: null,
    protected: true,
  },
  {
    id: "projects",
    label: "Projects",
    icon: "/os/icons/folder.png",
    app: "projects",
    folderId: null,
    protected: true,
  },
  {
    id: "mail",
    label: "Mail",
    icon: "/os/icons/mail.png",
    app: "mail",
    folderId: null,
    protected: true,
  },
  {
    id: "ie",
    label: "Internet",
    icon: "/os/icons/ie.png",
    app: "ie",
    folderId: null,
    url: IE_HOME,
    protected: true,
  },
  {
    id: "paint",
    label: "Paint",
    icon: "/os/icons/paint.png",
    app: "paint",
    folderId: null,
  },
  {
    id: "notepad",
    label: "Notepad",
    icon: "/os/icons/notepad.png",
    app: "notepad",
    folderId: null,
  },
  {
    id: "minesweeper",
    label: "Minesweeper",
    icon: "/os/icons/minesweeper.png",
    app: "minesweeper",
    folderId: null,
  },
  {
    id: "settings",
    label: "Settings",
    icon: "/os/icons/display.png",
    app: "settings",
    folderId: null,
    protected: true,
  },

  // Filed under the vertical drives
  {
    id: "proj-launch",
    label: "Signal Launch",
    icon: "/os/icons/doc1.png",
    app: "ie",
    folderId: "marketing",
    url: IE_HOME,
    meta: {
      client: "Confidential",
      vertical: "Marketing",
      year: "2026",
      deliverables: ["Positioning", "Campaign", "Go-to-market"],
      status: "Shipped",
    },
  },
  {
    id: "proj-rebrand",
    label: "Counterweight",
    icon: "/os/icons/doc1.png",
    app: "ie",
    folderId: "marketing",
    url: IE_HOME,
    meta: {
      client: "Confidential",
      vertical: "Marketing",
      year: "2025",
      deliverables: ["Brand identity", "Launch film"],
      status: "Shipped",
    },
  },
  {
    id: "proj-console",
    label: "Console",
    icon: "/os/icons/file3.png",
    app: "ie",
    folderId: "product",
    url: IE_HOME,
    meta: {
      client: "Confidential",
      vertical: "Product Design",
      year: "2026",
      deliverables: ["Design system", "Web app", "Handoff"],
      status: "In progress",
    },
  },
  {
    id: "proj-atlas",
    label: "Atlas",
    icon: "/os/icons/file3.png",
    app: "ie",
    folderId: "product",
    url: "https://madetonotice.art",
    meta: {
      client: "Confidential",
      vertical: "Product Design",
      year: "2025",
      deliverables: ["Research", "End-to-end product"],
      status: "Shipped",
    },
  },

  // Inside Disk (C:)
  {
    id: "disk-notepad",
    label: "Readme.txt",
    icon: "/os/icons/doc1.png",
    app: "notepad",
    folderId: "disk-c",
  },
  {
    id: "disk-minesweeper",
    label: "Minesweeper",
    icon: "/os/icons/minesweeper.png",
    app: "minesweeper",
    folderId: "disk-c",
  },
  {
    id: "disk-paint",
    label: "Paint",
    icon: "/os/icons/paint.png",
    app: "paint",
    folderId: "disk-c",
  },
];

export const ABOUT = {
  title: "About Made to Notice",
  parent: "An external division of Notice",
  general:
    "Made to Notice is an external division created by Notice. We take on a limited number of client projects at a time, so the ones we do take get the whole studio.",
  verticals:
    "Two verticals: marketing and product design. Marketing covers campaign, brand and go-to-market work. Product design covers interface, design systems and end-to-end product work.",
  technology:
    "This desktop is native Astro, TypeScript and Lumos for Astro. No framework. Windows, icons and persistence run as plain client scripts.",
};

export const NOTEPAD_DEFAULT = `Made to Notice
===============

An external division created by Notice.

A limited number of client projects at a time,
across two verticals:

  1. Marketing      campaign, brand, go-to-market
  2. Product design interface, systems, end-to-end

Say hello: ${MAIL_TO}
`;

export const MASCOT_TIPS = [
  "It looks like you're looking. Double-click anything to open it.",
  "Made to Notice is an external division of Notice — a limited number of client projects, marketing and product design.",
  "Right-click the desktop for Arrange, New Folder, or Properties.",
  "Nothing here is decoration. Every window does what it says.",
];

export const MASCOT_CONTEXT: Partial<Record<AppId, string>> = {
  mail: "Starting a project? Tell us which vertical and we'll take it from there.",
  ie: "Browsing the web inside the OS. Home is wearenotice.com.",
  paint: "Paint is running in an iframe. Make something Notice-worthy.",
  settings: "Wallpaper, title bar colour, and desktop texture live here.",
  minesweeper: "Left-click to clear, right-click to flag. Good luck.",
};

export const START_ITEMS: {
  id: string;
  label: string;
  app: AppId;
  icon: string;
}[] = [
  { id: "about", label: "About", app: "about", icon: "/os/icons/bio_pc.png" },
  {
    id: "projects",
    label: "Projects",
    app: "projects",
    icon: "/os/icons/folder.png",
  },
  { id: "mail", label: "Mail", app: "mail", icon: "/os/icons/mail.png" },
  { id: "ie", label: "Internet", app: "ie", icon: "/os/icons/ie.png" },
  { id: "paint", label: "Paint", app: "paint", icon: "/os/icons/paint.png" },
  {
    id: "notepad",
    label: "Notepad",
    app: "notepad",
    icon: "/os/icons/notepad.png",
  },
  {
    id: "minesweeper",
    label: "Minesweeper",
    app: "minesweeper",
    icon: "/os/icons/minesweeper.png",
  },
  {
    id: "settings",
    label: "Settings",
    app: "settings",
    icon: "/os/icons/display.png",
  },
];
