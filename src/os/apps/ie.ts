import { IE_HOME } from "@/content/os.ts";
import type { AppModule } from "@/os/apps/types.ts";
import { esc } from "@/os/context.ts";

const BUTTONS = [
  { id: "back", label: "Back", icon: "/os/icons/ie_left.png" },
  { id: "forward", label: "Forward", icon: "/os/icons/ie_right.png" },
  { id: "stop", label: "Stop", icon: "/os/icons/ie_stop.png" },
  { id: "refresh", label: "Refresh", icon: "/os/icons/ie_refresh.png" },
  { id: "home", label: "Home", icon: "/os/icons/ie_home.png" },
];

/** Accept a bare host and make it a URL, the way a real address bar does. */
function normalise(input: string): string {
  const url = input.trim();
  if (!url) return IE_HOME;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export const ieApp: AppModule = {
  size: { w: 720, h: 480 },

  html(_ctx, win) {
    const url = win.url ?? IE_HOME;
    const buttons = BUTTONS.map(
      (b) =>
        `<button type="button" class="ie_btn" data-ie="${b.id}" title="${esc(b.label)}">
           <img src="${esc(b.icon)}" alt="" draggable="false" />
           <span>${esc(b.label)}</span>
         </button>`,
    ).join("");

    return `<div class="app_ie">
      <div class="ie_toolbar">${buttons}</div>
      <div class="ie_address_row">
        <span class="ie_address_label">Address:</span>
        <div class="ie_address_box">
          <img src="/os/icons/ie.png" alt="" draggable="false" />
          <input class="ie_address" data-ie-address value="${esc(url)}" spellcheck="false" />
        </div>
        <button type="button" class="os_btn" data-ie="go">Go</button>
      </div>
      <div class="ie_frame_wrap">
        <iframe class="ie_frame" title="Internet" src="${esc(url)}" data-ie-frame
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
        <div class="ie_fallback display-none" data-ie-fallback>
          <img src="/os/icons/warn.png" alt="" />
          <p>This site may block embedding.</p>
          <a class="os_btn" data-ie-external href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open in new tab</a>
        </div>
      </div>
    </div>`;
  },

  menus(ctx, el) {
    return [
      {
        label: "File",
        key: 0,
        items: [
          {
            label: "Open in new tab",
            action: () =>
              el.querySelector<HTMLAnchorElement>("[data-ie-external]")?.click(),
          },
        ],
      },
      {
        label: "View",
        key: 0,
        items: [
          {
            label: "Refresh",
            action: () =>
              el.querySelector<HTMLButtonElement>('[data-ie="refresh"]')?.click(),
          },
        ],
      },
      {
        label: "Go",
        key: 0,
        items: [
          {
            label: "Home",
            action: () =>
              el.querySelector<HTMLButtonElement>('[data-ie="home"]')?.click(),
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

  status(_ctx, win) {
    return [win.url ?? IE_HOME, "Internet zone"];
  },

  wire(_ctx, el, win) {
    const frame = el.querySelector<HTMLIFrameElement>("[data-ie-frame]");
    const address = el.querySelector<HTMLInputElement>("[data-ie-address]");
    const fallback = el.querySelector<HTMLElement>("[data-ie-fallback]");
    const external = el.querySelector<HTMLAnchorElement>("[data-ie-external]");
    const status = el
      .closest(".window_wrap")
      ?.querySelector<HTMLElement>(".window_status_main");

    const history: string[] = [win.url ?? IE_HOME];
    let index = 0;
    let probe: number | undefined;

    const navigate = (url: string, push = true) => {
      if (!frame || !address) return;
      address.value = url;
      win.url = url;
      if (push) {
        history.splice(index + 1);
        history.push(url);
        index = history.length - 1;
      }
      frame.src = url;
      if (external) external.href = url;
      if (status) status.textContent = url;
      fallback?.classList.add("display-none");
      frame.classList.remove("display-none");

      // Cross-origin frames throw on property access once loaded. A frame that
      // refused to load never gets there, so this is the only signal available.
      window.clearTimeout(probe);
      probe = window.setTimeout(() => {
        try {
          void frame.contentWindow?.location.href;
        } catch {
          fallback?.classList.remove("display-none");
        }
      }, 1500);
    };

    el.querySelector('[data-ie="go"]')?.addEventListener("click", () => {
      navigate(normalise(address?.value ?? ""));
    });
    el.querySelector('[data-ie="home"]')?.addEventListener("click", () =>
      navigate(IE_HOME),
    );
    el.querySelector('[data-ie="refresh"]')?.addEventListener("click", () => {
      if (frame) frame.src = frame.src;
    });
    el.querySelector('[data-ie="stop"]')?.addEventListener("click", () => {
      window.clearTimeout(probe);
      if (frame) frame.src = "about:blank";
    });
    el.querySelector('[data-ie="back"]')?.addEventListener("click", () => {
      if (index > 0) navigate(history[(index -= 1)]!, false);
    });
    el.querySelector('[data-ie="forward"]')?.addEventListener("click", () => {
      if (index < history.length - 1) navigate(history[(index += 1)]!, false);
    });
    address?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      el.querySelector<HTMLButtonElement>('[data-ie="go"]')?.click();
    });
  },
};
