import { CAPACITY, DRIVES } from "@/content/os.ts";
import type { AppModule } from "@/os/apps/types.ts";
import { esc } from "@/os/context.ts";

/**
 * My Computer, where the studio's shape is the file system: the two verticals
 * are drives rather than folders, and the capacity gauge states the
 * limited-slots positioning as a disk-space reading.
 */
export const myComputerApp: AppModule = {
  size: { w: 480, h: 380 },

  html(ctx) {
    const free = CAPACITY.total - CAPACITY.taken;
    const pct = Math.round((CAPACITY.taken / CAPACITY.total) * 100);

    const drives = DRIVES.map((d) => {
      const count = ctx.state.icons.filter((i) => i.folderId === d.id).length;
      return `<button type="button" class="drive_item" data-open-drive="${esc(d.id)}">
        <img class="drive_item_img" src="${esc(d.icon)}" alt="" draggable="false" />
        <span class="drive_item_label">${esc(d.label)} (${esc(d.letter)})</span>
        <span class="drive_meter" aria-hidden="true">
          <span class="drive_meter_fill" style="--used:${d.used}"></span>
        </span>
        <span class="drive_item_note">${count} item${count === 1 ? "" : "s"}</span>
      </button>`;
    }).join("");

    return `<div class="folder_drive">
        <span class="folder_drive_label">Address:</span>
        <div class="folder_drive_box">
          <img src="/os/icons/pcicon.png" alt="" />
          <span>My Computer</span>
          <button type="button" class="folder_drive_btn" aria-label="Open drive list">
            <span class="folder_caret down"></span>
          </button>
        </div>
      </div>
      <div class="drive_list">${drives}</div>
      <div class="capacity">
        <p class="capacity_title">Studio capacity</p>
        <div class="capacity_row">
          <span class="capacity_pie" style="--pct:${pct}" aria-hidden="true"></span>
          <dl class="capacity_legend">
            <div><dt><i class="capacity_key used"></i>Committed</dt><dd>${CAPACITY.taken} slots</dd></div>
            <div><dt><i class="capacity_key free"></i>Available</dt><dd>${free} slot${free === 1 ? "" : "s"}</dd></div>
            <div><dt>Capacity</dt><dd>${CAPACITY.total} slots</dd></div>
          </dl>
        </div>
        <p class="capacity_note">${
          free > 0
            ? `Taking ${free} more project${free === 1 ? "" : "s"} this cycle.`
            : "Fully committed this cycle. Ask about the next one."
        }</p>
      </div>`;
  },

  menus(ctx) {
    return [
      {
        label: "File",
        key: 0,
        items: [
          { label: "Enquire…", action: () => ctx.openApp("mail") },
          { label: "About Made to Notice", action: () => ctx.openApp("about") },
        ],
      },
      {
        label: "View",
        key: 0,
        items: [{ label: "Refresh", action: () => ctx.refreshOpenFolders() }],
      },
      {
        label: "Help",
        key: 0,
        items: [{ label: "Visit Notice", action: () => ctx.openApp("ie") }],
      },
    ];
  },

  status() {
    const free = CAPACITY.total - CAPACITY.taken;
    return [`${DRIVES.length} drive(s)`, `${free} slot(s) free`];
  },

  wire(ctx, el) {
    el.querySelectorAll<HTMLButtonElement>("[data-open-drive]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.openDrive;
        const drive = DRIVES.find((d) => d.id === id);
        if (!drive) return;
        ctx.openApp("folder", {
          folderId: drive.id,
          title: `${drive.label} (${drive.letter})`,
          icon: drive.icon,
        });
      });
    });
  },
};
