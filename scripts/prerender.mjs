import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { readFile, writeFile, mkdir } from "node:fs/promises";

// Produce crawlable public HTML from the same components used in the browser.
// No account, environment secret, or Supabase session is involved.
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
const assetOrigin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://cognihood.vercel.app";
try {
  const { default: MarketingPage } = await server.ssrLoadModule(
    "/components/website/MarketingPage.tsx",
  );
  const { publicPages } = await server.ssrLoadModule("/services/siteRoutes.ts");
  const template = await readFile("dist/index.html", "utf8");
  for (const [path, metadata] of Object.entries(publicPages)) {
    const markup = renderToStaticMarkup(
      React.createElement(MarketingPage, { path }),
    );
    const canonical = `https://cognihood.vercel.app${path === "/" ? "/" : path}`;
    const html = template
      .replace(/<title>.*?<\/title>/, `<title>${metadata.title}</title>`)
      .replace(
        /<meta name="description"[^>]*>/,
        `<meta name="description" content="${metadata.description}">`,
      )
      .replace(
        "</head>",
        `<link rel="canonical" href="${canonical}"><meta property="og:title" content="${metadata.title}"><meta property="og:description" content="${metadata.description}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="website"><meta property="og:image" content="${assetOrigin}/social-preview.png"><meta property="og:image:alt" content="CogniHood: A more attentive journey. Driver attention support in development."><meta name="twitter:card" content="summary_large_image"></head>`,
      )
      .replace('<div id="root"></div>', `<div id="root">${markup}</div>`);
    const directory = path === "/" ? "dist" : `dist${path}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/index.html`, html);
  }
  // The auth and app fallbacks contain no public homepage or account data.
  await mkdir("dist/login", { recursive: true });
  await writeFile(
    "dist/login/index.html",
    template
      .replace(
        "</head>",
        '<meta name="robots" content="noindex,nofollow"></head>',
      )
      .replace(/<title>.*?<\/title>/, "<title>Sign in | CogniHood</title>"),
  );
  await mkdir("dist/app", { recursive: true });
  await writeFile(
    "dist/app/index.html",
    template
      .replace(
        "</head>",
        '<meta name="robots" content="noindex,nofollow"></head>',
      )
      .replace(
        /<title>.*?<\/title>/,
        "<title>Your workspace | CogniHood</title>",
      ),
  );
  console.log("Prerendered 4 public pages and private auth/app entry points.");
} finally {
  await server.close();
}
