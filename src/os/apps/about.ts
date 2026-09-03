import { ABOUT } from "@/content/os.ts";
import type { AppModule } from "@/os/apps/types.ts";
import { esc } from "@/os/context.ts";

const TABS = [
  { id: "general", label: "General", body: ABOUT.general },
  { id: "verticals", label: "Verticals", body: ABOUT.verticals },
  { id: "technology", label: "Technology", body: ABOUT.technology },
];

export const aboutApp: AppModule = {
  size: { w: 420, h: 340 },

  html() {
    const tabs = TABS.map(
      (t, i) =>
        `<button type="button" class="app_tab${i === 0 ? " is-active" : ""}" data-tab="${t.id}" role="tab" aria-selected="${i === 0}">${esc(t.label)}</button>`,
    ).join("");

    const panels = TABS.map(
      (t, i) =>
        `<div class="app_tabpanel${i === 0 ? "" : " display-none"}" data-panel="${t.id}">${esc(t.body)}</div>`,
    ).join("");

    return `<div class="app_about">
      <p class="app_about_authors"><strong>${esc(ABOUT.parent)}</strong></p>
      <div class="app_tabs" role="tablist">${tabs}</div>
      ${panels}
    </div>`;
  },

  menus(ctx) {
    return [
      {
        label: "File",
        key: 0,
        items: [{ label: "Send Mail…", action: () => ctx.openApp("mail") }],
      },
      {
        label: "Help",
        key: 0,
        items: [
          {
            label: "Visit wearenotice.com",
            action: () => ctx.openApp("ie"),
          },
        ],
      },
    ];
  },

  wire(_ctx, el) {
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
  },
};
