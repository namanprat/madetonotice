import type { Ctx } from "@/os/context.ts";
import { esc } from "@/os/context.ts";

type DialogOpts = {
  title: string;
  message: string;
  /** Path under /os/icons/. Omit for a plain message. */
  icon?: string;
  /** Present a text field seeded with this value. */
  value?: string;
  okLabel?: string;
  /** Omit to make the dialog acknowledge-only. */
  cancelLabel?: string | null;
};

/**
 * A modal built from the same chrome as a window. Replaces `window.prompt`
 * and `window.confirm`, which break the illusion by rendering as the host
 * browser's own dialog.
 *
 * Resolves with the field value (prompt), `true`/`false` (confirm), or `null`
 * when dismissed.
 */
function openDialog(ctx: Ctx, opts: DialogOpts): Promise<string | boolean | null> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.className = "dialog_wrap";
    host.setAttribute("role", "dialog");
    host.setAttribute("aria-modal", "true");
    host.setAttribute("aria-label", opts.title);

    const hasField = typeof opts.value === "string";
    host.innerHTML = `
      <div class="dialog_frame">
        <div class="dialog_titlebar">
          <span class="dialog_title">${esc(opts.title)}</span>
          <div class="window_controls">
            <button type="button" class="window_ctrl" data-dialog="cancel" aria-label="Close">
              <span class="window_glyph close"></span>
            </button>
          </div>
        </div>
        <div class="dialog_body">
          ${opts.icon ? `<img class="dialog_icon" src="${esc(opts.icon)}" alt="" />` : ""}
          <div class="dialog_content">
            <p class="dialog_message">${esc(opts.message)}</p>
            ${
              hasField
                ? `<input class="os_input dialog_field" value="${esc(opts.value!)}" />`
                : ""
            }
          </div>
        </div>
        <div class="dialog_actions">
          <button type="button" class="os_btn" data-dialog="ok">${esc(opts.okLabel ?? "OK")}</button>
          ${
            opts.cancelLabel === null
              ? ""
              : `<button type="button" class="os_btn" data-dialog="cancel">${esc(opts.cancelLabel ?? "Cancel")}</button>`
          }
        </div>
      </div>`;

    const field = host.querySelector<HTMLInputElement>(".dialog_field");
    const focusables = () =>
      [...host.querySelectorAll<HTMLElement>("button, input")].filter(
        (el) => !el.hasAttribute("disabled"),
      );

    const done = (value: string | boolean | null) => {
      document.removeEventListener("keydown", onKey, true);
      host.remove();
      resolve(value);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        done(hasField ? null : false);
        return;
      }
      if (e.key === "Enter" && !hasField) {
        e.preventDefault();
        done(true);
        return;
      }
      if (e.key === "Enter" && hasField) {
        e.preventDefault();
        done(field?.value.trim() || null);
        return;
      }
      // Trap focus: a modal that lets Tab escape into the desktop behind it
      // is not modal.
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    host.querySelectorAll<HTMLElement>("[data-dialog]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ok = btn.dataset.dialog === "ok";
        if (!ok) return done(hasField ? null : false);
        done(hasField ? field?.value.trim() || null : true);
      });
    });

    document.addEventListener("keydown", onKey, true);
    ctx.root.appendChild(host);
    (field ?? host.querySelector<HTMLElement>('[data-dialog="ok"]'))?.focus();
    field?.select();
  });
}

export async function promptBox(
  ctx: Ctx,
  opts: Omit<DialogOpts, "value"> & { value: string },
): Promise<string | null> {
  const result = await openDialog(ctx, opts);
  return typeof result === "string" ? result : null;
}

export async function confirmBox(
  ctx: Ctx,
  opts: Omit<DialogOpts, "value">,
): Promise<boolean> {
  return (await openDialog(ctx, opts)) === true;
}

/**
 * A Win95 property sheet: icon, name, a rule, then a definition list of
 * fields. Read-only, dismissed with OK — the same shape as right-clicking a
 * file in Explorer and choosing Properties.
 */
export function propertiesBox(
  ctx: Ctx,
  opts: {
    title: string;
    name: string;
    icon: string;
    fields: [string, string][];
  },
): void {
  const host = document.createElement("div");
  host.className = "dialog_wrap";
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-modal", "true");
  host.setAttribute("aria-label", opts.title);

  const rows = opts.fields
    .map(
      ([k, v]) =>
        `<div class="props_row"><dt>${esc(k)}:</dt><dd>${esc(v)}</dd></div>`,
    )
    .join("");

  host.innerHTML = `
    <div class="dialog_frame props_frame">
      <div class="dialog_titlebar">
        <span class="dialog_title">${esc(opts.title)}</span>
        <div class="window_controls">
          <button type="button" class="window_ctrl" data-dialog="ok" aria-label="Close">
            <span class="window_glyph close"></span>
          </button>
        </div>
      </div>
      <div class="props_head">
        <img class="props_icon" src="${esc(opts.icon)}" alt="" draggable="false" />
        <span class="props_name">${esc(opts.name)}</span>
      </div>
      <hr class="props_rule" />
      <dl class="props_list">${rows}</dl>
      <div class="dialog_actions">
        <button type="button" class="os_btn" data-dialog="ok">OK</button>
      </div>
    </div>`;

  const close = () => {
    document.removeEventListener("keydown", onKey, true);
    host.remove();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Enter") {
      e.preventDefault();
      close();
    }
  };

  host
    .querySelectorAll<HTMLElement>("[data-dialog]")
    .forEach((b) => b.addEventListener("click", close));
  document.addEventListener("keydown", onKey, true);
  ctx.root.appendChild(host);
  host.querySelector<HTMLElement>('.os_btn[data-dialog="ok"]')?.focus();
}
