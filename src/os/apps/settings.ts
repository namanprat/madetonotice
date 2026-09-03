import { ICON_SIZES, PAINT_URL, TEXTURES, WALLPAPERS } from "@/content/os.ts";
import type { TextureId } from "@/content/os.ts";
import type { AppModule } from "@/os/apps/types.ts";
import { esc } from "@/os/context.ts";

/** Title-bar swatches, replacing the browser's native colour picker. */
const TITLE_COLOURS = [
  { label: "Navy", value: "#14045c" },
  { label: "Classic", value: "#000080" },
  { label: "Teal", value: "#0a5f5c" },
  { label: "Plum", value: "#4b0f3f" },
  { label: "Slate", value: "#2f2b2d" },
  { label: "Brand", value: "#4a5c1a" },
];

export const settingsApp: AppModule = {
  size: { w: 420, h: 400 },

  html(ctx) {
    const wallpapers = WALLPAPERS.map(
      (w) =>
        `<button type="button" class="os_btn${w.id === ctx.state.wallpaperId ? " is-active" : ""}" data-wallpaper="${esc(w.id)}">${esc(w.label)}</button>`,
    ).join("");

    const swatches = TITLE_COLOURS.map(
      (c) =>
        `<button type="button" class="settings_swatch${c.value === ctx.state.titleColor ? " is-active" : ""}"
           data-title-color="${esc(c.value)}" title="${esc(c.label)}" aria-label="${esc(c.label)}"
           style="--swatch:${esc(c.value)}"></button>`,
    ).join("");

    const sizes = ICON_SIZES.map(
      (s) =>
        `<button type="button" class="os_btn${s.value === ctx.state.iconSize ? " is-active" : ""}" data-icon-size="${s.value}">${esc(s.label)}</button>`,
    ).join("");

    const textures = TEXTURES.map(
      (t) =>
        `<button type="button" class="os_btn${t.id === ctx.state.texture ? " is-active" : ""}" data-texture="${esc(t.id)}">${esc(t.label)}</button>`,
    ).join("");

    return `<div class="app_settings">
      <p class="settings_label">Wallpaper</p>
      <div class="settings_row">${wallpapers}</div>

      <p class="settings_label">Title bar colour</p>
      <div class="settings_row">${swatches}</div>

      <p class="settings_label">Icon size</p>
      <div class="settings_row">${sizes}</div>

      <p class="settings_label">Screen effect</p>
      <div class="settings_row">${textures}</div>
    </div>`;
  },

  menus(ctx) {
    return [
      {
        label: "File",
        key: 0,
        items: [
          { label: "Open Paint", action: () => ctx.openApp("paint") },
          { label: "About Made to Notice", action: () => ctx.openApp("about") },
        ],
      },
    ];
  },

  status() {
    return ["Display properties", PAINT_URL.replace(/^https?:\/\//, "")];
  },

  wire(ctx, el) {
    /** Mark the clicked button active within its own row. */
    const activate = (btn: Element) => {
      btn.parentElement
        ?.querySelectorAll(".os_btn, .settings_swatch")
        .forEach((x) => x.classList.toggle("is-active", x === btn));
    };

    el.querySelectorAll<HTMLButtonElement>("[data-wallpaper]").forEach((b) => {
      b.addEventListener("click", () => {
        ctx.state.wallpaperId = b.dataset.wallpaper ?? ctx.state.wallpaperId;
        ctx.persist();
        ctx.applyChrome();
        activate(b);
      });
    });

    el.querySelectorAll<HTMLButtonElement>("[data-title-color]").forEach((b) => {
      b.addEventListener("click", () => {
        ctx.state.titleColor = b.dataset.titleColor ?? "";
        ctx.persist();
        ctx.applyChrome();
        activate(b);
      });
    });

    el.querySelectorAll<HTMLButtonElement>("[data-icon-size]").forEach((b) => {
      b.addEventListener("click", () => {
        ctx.state.iconSize = Number(b.dataset.iconSize);
        ctx.persist();
        ctx.applyChrome();
        ctx.renderIcons();
        activate(b);
      });
    });

    el.querySelectorAll<HTMLButtonElement>("[data-texture]").forEach((b) => {
      b.addEventListener("click", () => {
        ctx.state.texture = (b.dataset.texture ?? "none") as TextureId;
        ctx.persist();
        ctx.applyChrome();
        activate(b);
      });
    });
  },
};
