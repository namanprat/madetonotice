import { MAIL_TO } from "@/content/os.ts";
import type { AppModule } from "@/os/apps/types.ts";
import { esc } from "@/os/context.ts";

export const mailApp: AppModule = {
  size: { w: 460, h: 400 },

  html() {
    return `<form class="app_mail" data-mail-form>
      <div class="app_mail_to">
        <span class="os_btn app_mail_to_label">To</span>
        <input class="os_input" name="to" type="email" value="${esc(MAIL_TO)}" readonly tabindex="-1" />
      </div>
      <label class="app_mail_field">Name
        <input class="os_input" name="name" required autocomplete="name" placeholder="Your name" />
      </label>
      <label class="app_mail_field">Your email
        <input class="os_input" name="email" type="email" required autocomplete="email" placeholder="you@example.com" />
      </label>
      <label class="app_mail_field app_mail_body">Message
        <textarea class="os_input" name="message" rows="6" required placeholder="Write your message…"></textarea>
      </label>
      <div class="app_mail_actions">
        <button type="submit" class="os_btn">Send</button>
      </div>
    </form>`;
  },

  menus(ctx, el) {
    return [
      {
        label: "File",
        key: 0,
        items: [
          {
            label: "Send",
            action: () =>
              el
                .querySelector<HTMLFormElement>("[data-mail-form]")
                ?.requestSubmit(),
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

  status() {
    return [`Inbox: ${MAIL_TO}`, ""];
  },

  wire(ctx, el) {
    const form = el.querySelector<HTMLFormElement>("[data-mail-form]");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get("name") ?? "");
      const from = String(fd.get("email") ?? "");
      const message = String(fd.get("message") ?? "");
      const subject = encodeURIComponent(`Made to Notice — ${name}`);
      const body = encodeURIComponent(`From: ${name} <${from}>\n\n${message}`);

      // A hidden anchor hands the mailto to the OS without navigating the
      // page away, which `location.href` would do — taking the desktop with it.
      const link = document.createElement("a");
      link.href = `mailto:${MAIL_TO}?subject=${subject}&body=${body}`;
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();

      ctx.toast(`Opening mail to ${MAIL_TO}…`);
      ctx.showClippy("Thanks for writing. We'll be in touch.");
    });
  },
};
