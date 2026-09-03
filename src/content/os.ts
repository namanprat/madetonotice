/** Placeholder Made to Notice OS content — swap later. */

export type AppId =
  | "about"
  | "projects"
  | "resume"
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
  protected?: boolean;
  url?: string;
};

export type Wallpaper = {
  id: string;
  label: string;
  value: string;
};

/** Desktop texture overlay. */
export type TextureId = "none" | "grain" | "scanlines" | "both";

export const IE_HOME = "https://wearenotice.com";
export const PAINT_URL = "https://jspaint.app";
/** Inbox address shown in Mail and used for mailto. */
export const MAIL_TO = "hello@madetonotice.art";

export const WALLPAPERS: Wallpaper[] = [
  { id: "teal", label: "Teal", value: "var(--os-desktop)" },
  { id: "face", label: "Face", value: "var(--os-face-dark)" },
  { id: "brand", label: "Brand", value: "var(--brand-500)" },
  { id: "dark", label: "Night", value: "var(--dark-900)" },
];

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
    label: "Recycle Bin",
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
  },
  {
    id: "projects",
    label: "Projects",
    icon: "/os/icons/folder.png",
    app: "projects",
    folderId: null,
  },
  {
    id: "resume",
    label: "Resume",
    icon: "/os/icons/resume.png",
    app: "resume",
    folderId: null,
  },
  {
    id: "mail",
    label: "Mail",
    icon: "/os/icons/mail.png",
    app: "mail",
    folderId: null,
  },
  {
    id: "ie",
    label: "Internet",
    icon: "/os/icons/ie.png",
    app: "ie",
    folderId: null,
    url: IE_HOME,
  },
  {
    id: "paint",
    label: "Paint",
    icon: "/os/icons/brush.png",
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
  },

  // Inside Projects
  {
    id: "project-notice",
    label: "wearenotice.com",
    icon: "/os/icons/ie.png",
    app: "ie",
    folderId: "projects",
    url: IE_HOME,
  },
  {
    id: "project-studio",
    label: "Studio site",
    icon: "/os/icons/ie.png",
    app: "ie",
    folderId: "projects",
    url: "https://madetonotice.art",
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

export const CLIPPY_TIPS = [
  "It looks like you're exploring Made to Notice. Double-click an icon to open it.",
  "Made to Notice is an external division of Notice — a limited number of client projects, marketing and product design.",
  "Tip: right-click the desktop for Arrange, New Folder, or Properties.",
];

export const CLIPPY_CONTEXT: Partial<Record<AppId, string>> = {
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
  {
    id: "resume",
    label: "Resume",
    app: "resume",
    icon: "/os/icons/resume.png",
  },
  { id: "mail", label: "Mail", app: "mail", icon: "/os/icons/mail.png" },
  { id: "ie", label: "Internet", app: "ie", icon: "/os/icons/ie.png" },
  { id: "paint", label: "Paint", app: "paint", icon: "/os/icons/brush.png" },
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
