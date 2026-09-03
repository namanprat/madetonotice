import { NOTEPAD_DEFAULT } from "@/content/os.ts";
import type { AppModule } from "@/os/apps/types.ts";
import { esc } from "@/os/context.ts";

export const notepadApp: AppModule = {
  size: { w: 500, h: 400 },

  html(ctx) {
    return `<textarea class="app_notepad${ctx.state.wordWrap ? " is-wrapped" : ""}"
      data-notepad spellcheck="false"
      aria-label="Notepad document">${esc(ctx.state.notepad)}</textarea>`;
  },

  menus(ctx, el) {
    const area = el.querySelector<HTMLTextAreaElement>("[data-notepad]");
    return [
      {
        label: "File",
        key: 0,
        items: [
          {
            label: "New",
            action: () => {
              if (!area) return;
              area.value = "";
              ctx.state.notepad = "";
              ctx.persist();
            },
          },
          {
            label: "Reset to default",
            action: () => {
              if (!area) return;
              area.value = NOTEPAD_DEFAULT;
              ctx.state.notepad = NOTEPAD_DEFAULT;
              ctx.persist();
            },
          },
        ],
      },
      {
        label: "Edit",
        key: 0,
        items: [
          {
            label: "Select All",
            action: () => {
              area?.focus();
              area?.select();
            },
          },
        ],
      },
      {
        label: "Format",
        key: 0,
        items: [
          {
            label: ctx.state.wordWrap ? "✓ Word Wrap" : "Word Wrap",
            action: () => {
              ctx.state.wordWrap = !ctx.state.wordWrap;
              area?.classList.toggle("is-wrapped", ctx.state.wordWrap);
              ctx.persist();
            },
          },
        ],
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

  status(ctx) {
    const lines = ctx.state.notepad.split("\n").length;
    return [`${lines} line(s)`, `${ctx.state.notepad.length} chars`];
  },

  wire(ctx, el) {
    const area = el.querySelector<HTMLTextAreaElement>("[data-notepad]");
    const status = el
      .closest(".window_wrap")
      ?.querySelector<HTMLElement>(".window_status_main");
    const size = el
      .closest(".window_wrap")
      ?.querySelector<HTMLElement>(".window_status_side");

    area?.addEventListener("input", () => {
      ctx.state.notepad = area.value;
      ctx.persist();
      if (status) status.textContent = `${area.value.split("\n").length} line(s)`;
      if (size) size.textContent = `${area.value.length} chars`;
    });
  },
};
