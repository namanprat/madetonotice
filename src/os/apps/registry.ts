import { PAINT_URL, type AppId } from "@/content/os.ts";
import { aboutApp } from "@/os/apps/about.ts";
import { folderApp } from "@/os/apps/folder.ts";
import { ieApp } from "@/os/apps/ie.ts";
import { mailApp } from "@/os/apps/mail.ts";
import { minesweeperApp } from "@/os/apps/minesweeper.ts";
import { notepadApp } from "@/os/apps/notepad.ts";
import { settingsApp } from "@/os/apps/settings.ts";
import type { AppModule } from "@/os/apps/types.ts";

const paintApp: AppModule = {
  size: { w: 720, h: 480 },
  html() {
    return `<div class="app_iframe_wrap">
      <iframe class="app_iframe" title="Paint" src="${PAINT_URL}"
        sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"></iframe>
    </div>`;
  },
};

export const APPS: Record<AppId, AppModule> = {
  about: aboutApp,
  mail: mailApp,
  ie: ieApp,
  paint: paintApp,
  notepad: notepadApp,
  minesweeper: minesweeperApp,
  settings: settingsApp,
  projects: folderApp,
  "my-computer": folderApp,
  "recycle-bin": folderApp,
  folder: folderApp,
};

export function appTitle(app: AppId, folderId?: string): string {
  switch (app) {
    case "about":
      return "About Made to Notice";
    case "projects":
      return "Projects";
    case "mail":
      return "Mail";
    case "ie":
      return "Internet";
    case "paint":
      return "Paint";
    case "notepad":
      return "Notepad";
    case "minesweeper":
      return "Minesweeper";
    case "settings":
      return "Display Properties";
    case "my-computer":
      return "My Computer";
    case "recycle-bin":
      return "Recycle Bin";
    case "folder":
      return folderId ?? "Folder";
    default: {
      const exhaustive: never = app;
      return exhaustive;
    }
  }
}
