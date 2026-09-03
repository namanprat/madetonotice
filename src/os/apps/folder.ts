import type { OsIcon } from "@/content/os.ts";
import type { AppModule } from "@/os/apps/types.ts";
import type { Ctx, MenuItem } from "@/os/context.ts";
import { esc } from "@/os/context.ts";
import { propertiesBox } from "@/os/dialog.ts";
import { emptyBin, restoreFromBin } from "@/os/icons.ts";
import type { WindowState } from "@/os/persist.ts";

/** Which `folderId` a window is showing the contents of. */
export function folderKey(win: WindowState): string {
  switch (win.app) {
    case "recycle-bin":
    case "projects":
      return win.app;
    default:
      return win.folderId ?? win.id;
  }
}

export function folderChildren(ctx: Ctx, win: WindowState): OsIcon[] {
  // Projects is a view across both vertical drives, not a folder of its own.
  if (win.app === "projects") return ctx.state.icons.filter((i) => i.meta);
  return ctx.state.icons.filter((i) => i.folderId === folderKey(win));
}

/** Fields for the Properties sheet on a project file. */
export function showProperties(ctx: Ctx, icon: OsIcon): void {
  const fields: [string, string][] = icon.meta
    ? [
        ["Type", `${icon.meta.vertical} project`],
        ["Client", icon.meta.client],
        ["Year", icon.meta.year],
        ["Status", icon.meta.status],
        ["Deliverables", icon.meta.deliverables.join(", ")],
      ]
    : [
        ["Type", "Shortcut"],
        ["Location", icon.folderId ?? "Desktop"],
      ];

  propertiesBox(ctx, {
    title: `${icon.label} Properties`,
    name: icon.label,
    icon: icon.icon,
    fields,
  });
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

    // The bin gets bulk actions of its own; reaching them through the File
    // menu alone is too well hidden for the one folder people expect to empty.
    const empty = children.length === 0;
    const bin =
      win.app === "recycle-bin"
        ? `<div class="folder_actions">
             <button type="button" class="os_btn" data-bin="restore"${empty ? " disabled" : ""}>Restore All</button>
             <button type="button" class="os_btn" data-bin="empty"${empty ? " disabled" : ""}>Delete All</button>
           </div>`
        : "";

    const body = empty
      ? `<p class="folder_empty">This folder is empty.</p>`
      : `<ul class="folder_list">${children.map(itemHtml).join("")}</ul>`;

    return `${drive}${bin}<div class="folder_view">${body}</div>`;
  },

  menus(ctx, _el, win) {
    const file: MenuItem[] =
      win.app === "recycle-bin"
        ? [
            {
              label: "Restore All",
              action: () => restoreFromBin(ctx),
              disabled: folderChildren(ctx, win).length === 0,
            },
            {
              label: "Delete All",
              action: () => {
                void emptyBin(ctx);
              },
              disabled: folderChildren(ctx, win).length === 0,
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
        items: [{ label: "Refresh", action: () => ctx.refreshOpenFolders() }],
      },
      {
        label: "Help",
        key: 0,
        items: [
          { label: "About Made to Notice", action: () => ctx.openApp("about") },
        ],
      },
    ];
  },

  status(ctx, win) {
    const n = folderChildren(ctx, win).length;
    return [`${n} object(s)`, n === 0 ? "" : `${n * 4} KB`];
  },

  wire(ctx, el) {
    el.querySelectorAll<HTMLButtonElement>("[data-open-icon]").forEach(
      (btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.openIcon;
          if (!id) return;

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

        btn.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const child = ctx.state.icons.find(
            (i) => i.id === btn.dataset.openIcon,
          );
          if (!child) return;
          ctx.showContext(e.clientX, e.clientY, [
            { label: "Open", action: () => ctx.openIcon(child.id) },
            {
              label: "Properties",
              action: () => showProperties(ctx, child),
            },
          ]);
        });
      },
    );

    el.querySelector('[data-bin="restore"]')?.addEventListener("click", () =>
      restoreFromBin(ctx),
    );
    el.querySelector('[data-bin="empty"]')?.addEventListener("click", () => {
      void emptyBin(ctx);
    });
  },
};
