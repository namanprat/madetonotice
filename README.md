# Made to Notice

Desktop OS portfolio for [madetonotice.art](https://madetonotice.art).

Built with [Astro](https://astro.build) and [Lumos for Astro](https://lumosframework.com). Authors: **Naman Pratulya** and **Notice**.

## Develop

```sh
npm install
astro dev --background
```

Open `http://localhost:4321`. Manage with `astro dev status`, `astro dev logs`, `astro dev stop`.

```sh
npm run check
npm run build
```

## Notes

- Home is a single fake-OS desktop (`SectionDesktop`). Content lives in `src/content/os.ts`.
- Client runtime: `src/os/` (vanilla TypeScript). Persistence key: `mtn-os-v1`.
- Internet defaults to `https://wearenotice.com` (iframe). Paint embeds `https://jspaint.app`.
