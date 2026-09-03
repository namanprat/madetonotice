import {
  ICON_SIZES,
  SAVER_DELAYS,
  SAVERS,
  TEXTURES,
  WALLPAPERS,
} from "@/content/os.ts";
import type { SaverId, TextureId } from "@/content/os.ts";
import type { AppModule } from "@/os/apps/types.ts";
import { esc } from "@/os/context.ts";
import { startScreensaver } from "@/os/screensaver.ts";

/** Title-bar swatches, replacing the browser's native colour picker. */
const TITLE_COLOURS = [
  { label: "Notice", value: "#004fff" },
  { label: "Navy", value: "#14045c" },
  { label: "Classic", value: "#000080" },
  { label: "Teal", value: "#0a5f5c" },
  { label: "Plum", value: "#4b0f3f" },
  { label: "Slate", value: "#2f2b2d" },
];

const TABS = [
  { id: "background", label: "Background" },
  { id: "saver", label: "Screen Saver" },
  { id: "appearance", label: "Appearance" },
] as const;

function pill(
  attr: string,
  value: string,
  label: string,
  active: boolean,
): string {
  return `<button type="button" class="os_btn${active ? " is-active" : ""}" ${attr}="${esc(value)}">${esc(label)}</button>`;
}

export const settingsApp: AppModule = {
  size: { w: 440, h: 420 },

  html(ctx) {
    const tabs = TABS.map(
      (t, i) =>
        `<button type="button" class="app_tab${i === 0 ? " is-active" : ""}" data-tab="${t.id}" role="tab" aria-selected="${i === 0}">${esc(t.label)}</button>`,
    ).join("");

    const wallpapers = WALLPAPERS.map((w) =>
      pill("data-wallpaper", w.id, w.label, w.id === ctx.state.wallpaperId),
    ).join("");

    const textures = TEXTURES.map((t) =>
      pill("data-texture", t.id, t.label, t.id === ctx.state.texture),
    ).join("");

    const savers = SAVERS.map((s) =>
      pill("data-saver", s.id, s.label, s.id === ctx.state.saver),
    ).join("");

    const delays = SAVER_DELAYS.map((d) =>
      pill(
        "data-saver-delay",
        String(d),
        d >= 60 ? `${d / 60} min` : `${d} sec`,
        d === ctx.state.saverDelay,
      ),
    ).join("");

    const swatches = TITLE_COLOURS.map(
      (c) =>
        `<button type="button" class="settings_swatch${c.value === ctx.state.titleColor ? " is-active" : ""}"
           data-title-color="${esc(c.value)}" title="${esc(c.label)}" aria-label="${esc(c.label)}"
           style="--swatch:${esc(c.value)}"></button>`,
    ).join("");

    const sizes = ICON_SIZES.map((s) =>
      pill("data-icon-size", String(s.value), s.label, s.value === ctx.state.iconSize),
    ).join("");

    return `<div class="app_settings">
      <div class="app_tabs" role="tablist">${tabs}</div>

      <div class="app_tabpanel settings_panel" data-panel="background">
        <div class="settings_preview" aria-hidden="true">
          <div class="settings_preview_screen" data-preview></div>
        </div>
        <p class="settings_label">Wallpaper</p>
        <div class="settings_row">${wallpapers}</div>
        <p class="settings_label">Screen effect</p>
        <div class="settings_row">${textures}</div>
      </div>

      <div class="app_tabpanel settings_panel display-none" data-panel="saver">
        <p class="settings_label">Screen saver</p>
        <div class="settings_row">${savers}</div>
        <p class="settings_label">Wait</p>
        <div class="settings_row">${delays}</div>
        <div class="settings_row">
          <button type="button" class="os_btn" data-saver-preview>Preview</button>
        </div>
        <p class="settings_note">Moving the pointer or pressing a key ends it.</p>
      </div>

      <div class="app_tabpanel settings_panel display-none" data-panel="appearance">
        <p class="settings_label">Title bar colour</p>
        <div class="settings_row">${swatches}</div>
        <p class="settings_label">Icon size</p>
        <div class="settings_row">${sizes}</div>
        <p class="settings_label">Sound</p>
        <div class="settings_row">
          <button type="button" class="os_btn${ctx.state.sound ? " is-active" : ""}" data-sound-toggle>
            ${ctx.state.sound ? "On" : "Off"}
          </button>
        </div>
      </div>
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
    ];
  },

  status(ctx) {
    const wall = WALLPAPERS.find((w) => w.id === ctx.state.wallpaperId);
    return ["Display Properties", wall?.label ?? ""];
  },

  wire(ctx, el) {
    /** Mark the clicked control active within its own row. */
    const activate = (btn: Element) => {
      btn.parentElement
        ?.querySelectorAll(".os_btn, .settings_swatch")
        .forEach((x) => x.classList.toggle("is-active", x === btn));
    };

    const preview = el.querySelector<HTMLElement>("[data-preview]");
    const statusSide = el
      .closest(".window_wrap")
      ?.querySelector<HTMLElement>(".window_status_side");

    const paintPreview = () => {
      const wall = WALLPAPERS.find((w) => w.id === ctx.state.wallpaperId);
      if (!wall) return;
      if (statusSide) statusSide.textContent = wall.label;
      if (!preview) return;
      const isPattern = wall.value.includes("gradient");
      preview.style.backgroundColor = isPattern
        ? "var(--os-desktop)"
        : wall.value;
      preview.style.backgroundImage = isPattern ? wall.value : "none";
      preview.style.backgroundSize = wall.size ?? "auto";
    };
    paintPreview();

    el.querySelectorAll<HTMLButtonElement>(".app_tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const name = tab.dataset.tab;
        el.querySelectorAll(".app_tab").forEach((t) => {
          t.classList.toggle("is-active", t === tab);
          t.setAttribute("aria-selected", String(t === tab));
        });
        el.querySelectorAll<HTMLElement>(".app_tabpanel").forEach((p) => {
          p.classList.toggle("display-none", p.dataset.panel !== name);
        });
      });
    });

    el.querySelectorAll<HTMLButtonElement>("[data-wallpaper]").forEach((b) => {
      b.addEventListener("click", () => {
        ctx.state.wallpaperId = b.dataset.wallpaper ?? ctx.state.wallpaperId;
        ctx.persist();
        ctx.applyChrome();
        paintPreview();
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

    el.querySelectorAll<HTMLButtonElement>("[data-saver]").forEach((b) => {
      b.addEventListener("click", () => {
        ctx.state.saver = (b.dataset.saver ?? "off") as SaverId;
        ctx.persist();
        ctx.rearmScreensaver();
        activate(b);
      });
    });

    el.querySelectorAll<HTMLButtonElement>("[data-saver-delay]").forEach((b) => {
      b.addEventListener("click", () => {
        ctx.state.saverDelay = Number(b.dataset.saverDelay);
        ctx.persist();
        ctx.rearmScreensaver();
        activate(b);
      });
    });

    el.querySelector("[data-saver-preview]")?.addEventListener("click", () => {
      // Let the click finish before the saver's own dismiss handler sees it.
      window.setTimeout(() => startScreensaver(ctx), 60);
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

    const soundBtn = el.querySelector<HTMLButtonElement>("[data-sound-toggle]");
    soundBtn?.addEventListener("click", () => {
      ctx.state.sound = !ctx.state.sound;
      ctx.persist();
      ctx.applyChrome();
      soundBtn.textContent = ctx.state.sound ? "On" : "Off";
      soundBtn.classList.toggle("is-active", ctx.state.sound);
    });
  },
};
