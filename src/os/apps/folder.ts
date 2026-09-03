import type { OsIcon } from "@/content/os.ts";
import type { AppModule } from "@/os/apps/types.ts";
import type { Ctx, MenuItem } from "@/os/context.ts";
import { esc } from "@/os/context.ts";
import { emptyBin, restoreFromBin } from "@/os/icons.ts";
import type { WindowState } from "@/os/persist.ts";

/** The synthetic drive entry My Computer shows above its real children. */
const DISK_C: OsIcon = {
  id: "disk-c",
  label: "Disk (C:)",
  icon: "/os/icons/c.png",
  app: "folder",
  folderId: "my-computer",
};

/** Which `folderId` a window is showing the contents of. */
export function folderKey(win: WindowState): string {
  switch (win.app) {
    case "recycle-bin":
    case "my-computer":
    case "projects":
    case "resume":
      return win.app;
    default:
      return win.folderId ?? win.id;
  }
}

export function folderChildren(ctx: Ctx, win: WindowState): OsIcon[] {
  if (win.app === "my-computer") {
    return [DISK_C, ...ctx.state.icons.filter((i) => i.folderId === "disk-c")];
  }
  return ctx.state.icons.filter((i) => i.folderId === folderKey(win));
}

function itemHtml(icon: OsIcon): string {
  return `<li>
    <button type="button" class="folder_item" data-open-icon="${esc(icon.id)}">
      <img class="folder_item_img" src="${esc(icon.icon)}" alt="" draggable="false" />
      <span class="folder_item_label">${esc(icon.label)}</span>
    </button>
  </li>`;
}

export const folderApp: AppModule = {
  size: { w: 440, h: 340 },

  html(ctx, win) {
    const children = folderChildren(ctx, win);
    const drive =
      win.app === "my-computer"
        ? `<div class="folder_drive">
             <span class="folder_drive_label">Address:</span>
             <div class="folder_drive_box">
               <img src="/os/icons/pcicon.png" alt="" />
               <span>My Computer</span>
               <button type="button" class="folder_drive_btn" aria-label="Open drive list">
                 <span class="folder_caret down"></span>
               </button>
             </div>
           </div>`
        : "";

    const body =
      children.length === 0
        ? `<p class="folder_empty">This folder is empty.</p>`
        : `<ul class="folder_list">${children.map(itemHtml).join("")}</ul>`;

    return `${drive}<div class="folder_view">${body}</div>`;
  },

  menus(ctx, _el, win) {
    const file: MenuItem[] =
      win.app === "recycle-bin"
        ? [
            {
              label: "Restore All",
              action: () => restoreFromBin(ctx),
            },
            {
              label: "Empty Recycle Bin",
              action: () => {
                void emptyBin(ctx);
              },
            },
          ]
        : [
            {
              label: "Open",
              action: () => {
                const first = folderChildren(ctx, win)[0];
                if (first) ctx.openIcon(first.id);
              },
              disabled: folderChildren(ctx, win).length === 0,
            },
          ];

    return [
      { label: "File", key: 0, items: file },
      {
        label: "Edit",
        key: 0,
        items: [{ label: "Select All", action: () => {}, disabled: true }],
      },
      {
        label: "View",
        key: 0,
        items: [
          { label: "Refresh", action: () => ctx.refreshOpenFolders() },
        ],
      },
      {
        label: "Help",
        key: 0,
        items: [{ label: "About Made to Notice", action: () => ctx.openApp("about") }],
      },
    ];
  },

  status(ctx, win) {
    const n = folderChildren(ctx, win).length;
    return [`${n} object(s)`, n === 0 ? "" : `${n * 4} KB`];
  },

  wire(ctx, el) {
    el.querySelectorAll<HTMLButtonElement>("[data-open-icon]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.openIcon;
        if (!id) return;

        if (id === "disk-c") {
          ctx.openApp("folder", {
            folderId: "disk-c",
            title: "Disk (C:)",
            icon: "/os/icons/c.png",
          });
          return;
        }

        // Inside the bin, a click restores rather than opens.
        const child = ctx.state.icons.find((i) => i.id === id);
        if (child?.folderId === "recycle-bin") {
          child.folderId = null;
          delete ctx.state.moved[id];
          ctx.persist();
          ctx.renderIcons();
          ctx.refreshOpenFolders();
          ctx.toast(`${child.label} restored`);
          return;
        }

        ctx.openIcon(id);
      });
    });
  },
};