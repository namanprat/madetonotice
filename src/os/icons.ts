import type { OsIcon } from "@/content/os.ts";
import type { Ctx } from "@/os/context.ts";
import { esc } from "@/os/context.ts";
import { confirmBox, promptBox } from "@/os/dialog.ts";
import { onDrag } from "@/os/drag.ts";
import {
  packIcons,
  snapToSurface,
  type Cell,
  type Surface,
} from "@/os/layout.ts";

/** Icon cell pitch in rem, derived from the current icon size. */
function cellFor(ctx: Ctx): Cell {
  const size = ctx.state.iconSize;
  return { w: size + 2.0625, h: size + 2.25 };
}

/** Taskbar height in px, matching `--os-taskbar-height`. */
const TASKBAR_PX = 35;

function surfaceFor(ctx: Ctx): Surface {
  const rem = rootFontSize();
  const rect = ctx.el.desk?.getBoundingClientRect();
  // On the very first boot the stylesheet may not have applied yet, so the
  // surface measures 0x0. Packing against that collapses the grid to a single
  // slot and stacks every icon in the corner — fall back to the viewport.
  const w = rect && rect.width > 0 ? rect.width : window.innerWidth;
  const h =
    rect && rect.height > 0 ? rect.height : window.innerHeight - TASKBAR_PX;
  return { w: w / rem, h: h / rem };
}

function rootFontSize(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

export function desktopIcons(ctx: Ctx): OsIcon[] {
  return ctx.state.icons.filter((i) => i.folderId === null);
}

export function binHasItems(ctx: Ctx): boolean {
  return ctx.state.icons.some((i) => i.folderId === "recycle-bin");
}

/**
 * Give every icon the user has not personally moved a fresh column-first slot.
 * Runs on boot and on resize, which is what keeps icons on screen when the
 * viewport is narrower than their stored coordinates.
 */
export function reflowIcons(ctx: Ctx): void {
  const icons = desktopIcons(ctx);
  const unmoved = icons.filter((i) => !ctx.state.moved[i.id]);
  const slots = packIcons(icons.length, surfaceFor(ctx), cellFor(ctx));

  // Walk the full list so unmoved icons keep their reading order, but only
  // claim the slots that moved icons have not already taken.
  let slot = 0;
  for (const icon of icons) {
    if (!unmoved.includes(icon)) continue;
    ctx.state.positions[icon.id] = slots[slot] ?? { x: 0.5, y: 0.5 };
    slot += 1;
  }
}

/** Reset every icon to the grid, discarding manual placement. */
export function arrangeIcons(ctx: Ctx): void {
  ctx.state.moved = {};
  reflowIcons(ctx);
  ctx.persist();
  ctx.renderIcons();
}

export function renderIcons(ctx: Ctx): void {
  const layer = ctx.el.iconLayer;
  if (!layer) return;
  layer.replaceChildren();

  for (const icon of desktopIcons(ctx)) {
    const pos = ctx.state.positions[icon.id] ?? { x: 0.5, y: 0.5 };
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "desktop_icon";
    btn.dataset.iconId = icon.id;
    if (ctx.selected.has(icon.id)) btn.classList.add("is-active");
    btn.style.left = `${pos.x}rem`;
    btn.style.top = `${pos.y}rem`;

    const src =
      icon.id === "recycle-bin" && binHasItems(ctx)
        ? "/os/icons/bin2.png"
        : icon.icon;

    btn.innerHTML =
      `<img class="desktop_icon_img" src="${esc(src)}" alt="" draggable="false" />` +
      `<span class="desktop_icon_label">${esc(icon.label)}</span>`;

    wireIcon(ctx, btn, icon.id);
    layer.appendChild(btn);
  }
}

export function selectIcons(ctx: Ctx, ids: string[]): void {
  ctx.selected = new Set(ids);
  ctx.el.iconLayer
    ?.querySelectorAll<HTMLElement>(".desktop_icon")
    .forEach((el) => {
      el.classList.toggle(
        "is-active",
        !!el.dataset.iconId && ctx.selected.has(el.dataset.iconId),
      );
    });
}

export function moveToBin(ctx: Ctx, iconId: string): boolean {
  const icon = ctx.state.icons.find((i) => i.id === iconId);
  if (!icon) return false;
  if (icon.protected) {
    // Say why, rather than letting the icon spring back with no explanation.
    ctx.toast(`${icon.label} is a system item and cannot be deleted`);
    return false;
  }
  icon.folderId = "recycle-bin";
  delete ctx.state.positions[iconId];
  delete ctx.state.moved[iconId];
  ctx.persist();
  ctx.renderIcons();
  ctx.refreshOpenFolders();
  ctx.toast(`${icon.label} moved to Recycle Bin`);
  return true;
}

export function restoreFromBin(ctx: Ctx): void {
  for (const icon of ctx.state.icons.filter(
    (i) => i.folderId === "recycle-bin",
  )) {
    icon.folderId = null;
    delete ctx.state.moved[icon.id];
  }
  reflowIcons(ctx);
  ctx.persist();
  ctx.renderIcons();
  ctx.refreshOpenFolders();
  ctx.toast("Restored items to desktop");
}

export async function emptyBin(ctx: Ctx): Promise<void> {
  const ok = await confirmBox(ctx, {
    title: "Confirm File Delete",
    message: "Are you sure you want to permanently delete these items?",
    icon: "/os/icons/warn.png",
  });
  if (!ok) return;
  ctx.state.icons = ctx.state.icons.filter((i) => i.folderId !== "recycle-bin");
  ctx.persist();
  ctx.renderIcons();
  ctx.refreshOpenFolders();
  ctx.toast("Recycle Bin emptied");
}

export async function newFolder(ctx: Ctx): Promise<void> {
  const name = await promptBox(ctx, {
    title: "New Folder",
    message: "Folder name:",
    value: "New Folder",
  });
  if (!name) return;
  const id = `folder-${crypto.randomUUID().slice(0, 6)}`;
  ctx.state.icons.push({
    id,
    label: name.slice(0, 24),
    icon: "/os/icons/regFolder.png",
    app: "folder",
    folderId: null,
  });
  reflowIcons(ctx);
  ctx.persist();
  ctx.renderIcons();
}

function hitRecycleBin(ctx: Ctx, clientX: number, clientY: number): boolean {
  const binBtn = ctx.el.iconLayer?.querySelector<HTMLElement>(
    '[data-icon-id="recycle-bin"]',
  );
  if (!binBtn) return false;
  const r = binBtn.getBoundingClientRect();
  const pad = 8;
  return (
    clientX >= r.left - pad &&
    clientX <= r.right + pad &&
    clientY >= r.top - pad &&
    clientY <= r.bottom + pad
  );
}

export function showIconMenu(
  ctx: Ctx,
  x: number,
  y: number,
  iconId: string,
): void {
  const icon = ctx.state.icons.find((i) => i.id === iconId);
  if (!icon) return;
  ctx.showContext(x, y, [
    { label: "Open", action: () => ctx.openIcon(iconId) },
    {
      label: "Delete",
      disabled: !!icon.protected,
      action: () => {
        moveToBin(ctx, iconId);
      },
    },
  ]);
}

function wireIcon(ctx: Ctx, btn: HTMLElement, iconId: string): void {
  const rem = rootFontSize();
  let deskRect: DOMRect | undefined;

  const select = (e: PointerEvent | MouseEvent) => {
    if (ctx.selected.has(iconId)) return;
    const add = e.ctrlKey || e.metaKey;
    selectIcons(ctx, add ? [...ctx.selected, iconId] : [iconId]);
  };

  onDrag(btn, {
    onStart: (e) => {
      select(e);
      deskRect = ctx.el.desk?.getBoundingClientRect();
      ctx.root.classList.add("is-dragging");
    },

    onMove: (e) => {
      const pos = snapToSurface(
        {
          x: (e.clientX - (deskRect?.left ?? 0)) / rem - 1,
          y: (e.clientY - (deskRect?.top ?? 0)) / rem - 1,
        },
        surfaceFor(ctx),
        cellFor(ctx),
      );
      ctx.state.positions[iconId] = pos;
      btn.style.left = `${pos.x}rem`;
      btn.style.top = `${pos.y}rem`;

      // Only light the bin up for something it will actually accept.
      const icon = ctx.state.icons.find((i) => i.id === iconId);
      ctx.el.iconLayer
        ?.querySelector('[data-icon-id="recycle-bin"]')
        ?.classList.toggle(
          "is-drop-target",
          !icon?.protected && hitRecycleBin(ctx, e.clientX, e.clientY),
        );
    },

    onEnd: (e) => {
      ctx.root.classList.remove("is-dragging");
      ctx.el.iconLayer
        ?.querySelector('[data-icon-id="recycle-bin"]')
        ?.classList.remove("is-drop-target");
      if (hitRecycleBin(ctx, e.clientX, e.clientY) && moveToBin(ctx, iconId)) {
        return;
      }
      ctx.state.moved[iconId] = true;
      ctx.persist();
    },

    /*
     * A finger opens on one tap; a mouse selects and waits for a double-click.
     * Requiring two taps inside a timeout was the single biggest reason taps
     * appeared to do nothing — every phone OS opens on one.
     */
    onTap: (e) => {
      select(e);
      if (e.pointerType !== "mouse") ctx.openIcon(iconId);
    },

    onLongPress: (e) => {
      select(e);
      showIconMenu(ctx, e.clientX, e.clientY, iconId);
    },
  });

  btn.addEventListener("dblclick", (e) => {
    e.preventDefault();
    ctx.openIcon(iconId);
  });

  // Keep a click on an icon from reaching the desktop, which would clear the
  // selection the tap just made.
  btn.addEventListener("click", (e) => e.stopPropagation());

  btn.addEventListener("contextmenu", (e) => {
    if (e.pointerType === "touch" || e.pointerType === "pen") return;
    e.preventDefault();
    e.stopPropagation();
    showIconMenu(ctx, e.clientX, e.clientY, iconId);
  });
}

/** Rubber-band selection across the desktop surface. */
export function wireMarquee(ctx: Ctx): void {
  const desk = ctx.el.desk;
  const layer = ctx.el.iconLayer;
  if (!desk || !layer) return;

  let box: HTMLElement | null = null;
  let origin = { x: 0, y: 0 };

  const clear = () => {
    box?.remove();
    box = null;
  };

  onDrag(desk, {
    // Leave icons and windows to their own handlers; taking the gesture here
    // would steal the pointer capture out from under them.
    shouldStart: (e) =>
      !(e.target as HTMLElement).closest(".desktop_icon, .window_wrap"),

    onStart: (e) => {
      origin = { x: e.clientX, y: e.clientY };
      box = document.createElement("div");
      box.className = "desktop_marquee";
      layer.appendChild(box);
    },

    onMove: (e) => {
      if (!box) return;
      const rect = desk.getBoundingClientRect();
      const left = Math.min(origin.x, e.clientX);
      const top = Math.min(origin.y, e.clientY);
      const width = Math.abs(e.clientX - origin.x);
      const height = Math.abs(e.clientY - origin.y);

      box.style.left = `${left - rect.left}px`;
      box.style.top = `${top - rect.top}px`;
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;

      const hits: string[] = [];
      layer.querySelectorAll<HTMLElement>(".desktop_icon").forEach((el) => {
        const r = el.getBoundingClientRect();
        const inside =
          r.left < left + width &&
          r.right > left &&
          r.top < top + height &&
          r.bottom > top;
        if (inside && el.dataset.iconId) hits.push(el.dataset.iconId);
      });
      selectIcons(ctx, hits);
    },

    // Runs on pointercancel too, so a cancelled marquee cannot strand its box.
    onEnd: clear,

    onTap: () => {
      clear();
      selectIcons(ctx, []);
    },
  });
}

/** Arrow keys move the selection, Enter opens, Delete bins. */
export function wireIconKeys(ctx: Ctx): void {
  document.addEventListener("keydown", (e) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (ctx.windows.size > 0 && e.key !== "Escape") return;

    const icons = desktopIcons(ctx);
    if (icons.length === 0) return;
    const current = [...ctx.selected][0];
    const index = icons.findIndex((i) => i.id === current);

    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight": {
        e.preventDefault();
        const next = icons[(index + 1 + icons.length) % icons.length]!;
        selectIcons(ctx, [next.id]);
        break;
      }
      case "ArrowUp":
      case "ArrowLeft": {
        e.preventDefault();
        const prev = icons[(index - 1 + icons.length) % icons.length]!;
        selectIcons(ctx, [prev.id]);
        break;
      }
      case "Enter":
        if (current) {
          e.preventDefault();
          ctx.openIcon(current);
        }
        break;
      case "Delete":
        if (current) {
          e.preventDefault();
          moveToBin(ctx, current);
        }
        break;
      case "Escape":
        selectIcons(ctx, []);
        ctx.closePopups();
        break;
    }
  });
}
