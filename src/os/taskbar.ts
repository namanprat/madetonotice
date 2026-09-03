import { ICON_SIZES, START_ITEMS } from "@/content/os.ts";
import type { Ctx } from "@/os/context.ts";
import { playSound } from "@/os/sound.ts";
import { esc } from "@/os/context.ts";

export function renderTaskbar(ctx: Ctx): void {
  const tabs = ctx.el.taskTabs;
  if (!tabs) return;
  tabs.replaceChildren();

  const top = [...ctx.windows.values()].sort((a, b) => b.z - a.z)[0];

  for (const win of ctx.windows.values()) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "taskbar_tab";
    tab.classList.toggle("is-active", !win.minimized && win.id === top?.id);
    tab.dataset.windowId = win.id;
    tab.innerHTML =
      `<img class="taskbar_tab_img" src="${esc(win.icon)}" alt="" draggable="false" />` +
      `<span>${esc(win.title)}</span>`;

    tab.addEventListener("click", () => {
      // Clicking the active tab minimizes it, as Windows does.
      if (!win.minimized && win.id === top?.id) {
        win.minimized = true;
        ctx.paintWindow(win);
        renderTaskbar(ctx);
        return;
      }
      win.minimized = false;
      ctx.paintWindow(win);
      ctx.focusWindow(win.id);
    });

    tabs.appendChild(tab);
  }
}

export function wireStartMenu(ctx: Ctx): void {
  const { startBtn, startMenu } = ctx.el;
  if (!startMenu) return;

  const setOpen = (open: boolean) => {
    startMenu.classList.toggle("is-active", open);
    startBtn?.classList.toggle("is-active", open);
    startBtn?.setAttribute("aria-expanded", String(open));
  };

  startBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!startMenu.classList.contains("is-active"));
  });

  startMenu.replaceChildren();

  // Two weights, the way the Win95 banner sets "Windows" thin and "95" bold.
  const side = document.createElement("div");
  side.className = "start_sidebar";
  side.setAttribute("aria-hidden", "true");
  side.innerHTML =
    `<span class="start_sidebar_thin">Made to</span>` +
    `<span class="start_sidebar_bold">Notice</span>`;
  startMenu.appendChild(side);

  const list = document.createElement("div");
  list.className = "start_list";

  const addItem = (label: string, icon: string, action: () => void) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "start_item";
    btn.innerHTML =
      `<img src="${esc(icon)}" alt="" draggable="false" />` +
      `<span>${esc(label)}</span>`;
    btn.addEventListener("click", () => {
      setOpen(false);
      action();
    });
    list.appendChild(btn);
  };

  const addDivider = () => {
    const hr = document.createElement("div");
    hr.className = "start_divider";
    list.appendChild(hr);
  };

  for (const item of START_ITEMS) {
    addItem(item.label, item.icon, () =>
      ctx.openApp(item.app, { icon: item.icon }),
    );
  }

  addDivider();
  addItem("Programs", "/os/icons/regFolder.png", () => openLauncher(ctx));
  addItem("My Computer", "/os/icons/pcicon.png", () =>
    ctx.openApp("my-computer", { icon: "/os/icons/pcicon.png" }),
  );

  startMenu.appendChild(list);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}

/** Full-screen searchable app grid, after the reference project's launcher. */
export function openLauncher(ctx: Ctx): void {
  const host = ctx.el.launcher;
  if (!host) return;

  const items = ctx.state.icons.filter((i) => i.folderId === null);
  let query = "";

  const draw = () => {
    const q = query.trim().toLowerCase();
    const visible = q
      ? items.filter((i) => i.label.toLowerCase().includes(q))
      : items;

    const grid =
      visible.length === 0
        ? `<div class="launcher_empty">
             <p>No matches</p>
             <small>Try a different search term</small>
           </div>`
        : `<div class="launcher_grid">${visible
            .map(
              (i) =>
                `<button type="button" class="launcher_item" data-launch="${esc(i.id)}">
                   <img src="${esc(i.icon)}" alt="" draggable="false" />
                   <span>${esc(i.label)}</span>
                 </button>`,
            )
            .join("")}</div>`;

    host.innerHTML = `
      <div class="launcher_toolbar">
        <div class="launcher_search">
          <input class="launcher_input" data-launcher-search placeholder="Search programs"
            value="${esc(query)}" aria-label="Search programs" />
        </div>
      </div>
      <div class="launcher_body">${grid}</div>
      <div class="launcher_status">
        <span>${visible.length} item${visible.length === 1 ? "" : "s"}</span>
        <button type="button" class="os_btn" data-launcher-close>Close</button>
      </div>`;

    const input = host.querySelector<HTMLInputElement>(
      "[data-launcher-search]",
    );
    input?.addEventListener("input", () => {
      query = input.value;
      draw();
      // Redrawing blows away focus; put it back at the caret's end.
      const next = host.querySelector<HTMLInputElement>(
        "[data-launcher-search]",
      );
      next?.focus();
      next?.setSelectionRange(next.value.length, next.value.length);
    });

    host.querySelectorAll<HTMLElement>("[data-launch]").forEach((btn) => {
      btn.addEventListener("click", () => {
        closeLauncher(ctx);
        const id = btn.dataset.launch;
        if (id) ctx.openIcon(id);
      });
    });

    host
      .querySelector("[data-launcher-close]")
      ?.addEventListener("click", () => closeLauncher(ctx));
  };

  draw();
  host.hidden = false;
  host.classList.add("is-active");
  host.querySelector<HTMLInputElement>("[data-launcher-search]")?.focus();
}

export function closeLauncher(ctx: Ctx): void {
  const host = ctx.el.launcher;
  if (!host) return;
  host.classList.remove("is-active");
  host.hidden = true;
  host.replaceChildren();
}

export function wireTray(ctx: Ctx): void {
  const { clock, calendar } = ctx.el;

  const tick = () => {
    if (!clock) return;
    clock.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  tick();
  window.setInterval(tick, 1000);

  let month = new Date();

  const drawCalendar = () => {
    if (!calendar) return;
    const view = new Date(month.getFullYear(), month.getMonth(), 1);
    const today = new Date();
    const firstDay = view.getDay();
    const daysInMonth = new Date(
      view.getFullYear(),
      view.getMonth() + 1,
      0,
    ).getDate();

    const cells: string[] = [];
    for (let i = 0; i < firstDay; i += 1) cells.push(`<span></span>`);
    for (let d = 1; d <= daysInMonth; d += 1) {
      const isToday =
        d === today.getDate() &&
        view.getMonth() === today.getMonth() &&
        view.getFullYear() === today.getFullYear();
      cells.push(
        `<span class="calendar_day${isToday ? " is-today" : ""}">${d}</span>`,
      );
    }

    calendar.innerHTML = `
      <div class="calendar_nav">
        <button type="button" class="os_btn" data-cal="prev" aria-label="Previous month">‹</button>
        <span class="calendar_month">${view.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
        <button type="button" class="os_btn" data-cal="next" aria-label="Next month">›</button>
      </div>
      <div class="calendar_grid">
        ${["S", "M", "T", "W", "T", "F", "S"]
          .map((d) => `<span class="calendar_weekday">${d}</span>`)
          .join("")}
        ${cells.join("")}
      </div>`;

    calendar
      .querySelector('[data-cal="prev"]')
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        month = new Date(view.getFullYear(), view.getMonth() - 1, 1);
        drawCalendar();
      });
    calendar
      .querySelector('[data-cal="next"]')
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        month = new Date(view.getFullYear(), view.getMonth() + 1, 1);
        drawCalendar();
      });
  };

  clock?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!calendar) return;
    const open = calendar.hidden;
    if (open) {
      month = new Date();
      drawCalendar();
    }
    calendar.hidden = !open;
  });

  // Right-clicking the tray monitor picks icon size — the reference project's
  // flyout, in place of the native range input that used to sit here.
  const sizeBtn = ctx.el.tray?.querySelector<HTMLElement>(
    "[data-icon-size-btn]",
  );
  const openSizes = (x: number, y: number) => {
    ctx.showContext(
      x,
      y,
      ICON_SIZES.map((s) => ({
        label: `${s.value === ctx.state.iconSize ? "✓ " : ""}${s.label}`,
        action: () => {
          ctx.state.iconSize = s.value;
          ctx.persist();
          ctx.applyChrome();
          ctx.renderIcons();
        },
      })),
    );
  };

  sizeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const r = sizeBtn.getBoundingClientRect();
    openSizes(r.left, r.top);
  });

  // The speaker is a real mute toggle. Sound stays off until this is clicked,
  // which doubles as the gesture that lets the audio context start.
  const soundBtn = ctx.el.tray?.querySelector<HTMLElement>("[data-sound-btn]");
  soundBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    ctx.state.sound = !ctx.state.sound;
    ctx.persist();
    ctx.applyChrome();
    if (ctx.state.sound) playSound("notice");
  });
}
