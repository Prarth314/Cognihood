import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MarketingPage from "../components/website/MarketingPage";
import {
  appViewForPath,
  isAppPath,
  legalLinks,
  publicPages,
  safeAppDestination,
} from "./siteRoutes";

describe("public website and route boundaries", () => {
  it("renders a public homepage without requiring authentication or a camera", () => {
    const html = renderToStaticMarkup(<MarketingPage path="/" />);
    expect(html).toContain("attentive");
    expect(html).toContain('href="/mission"');
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<video");
  });
  it("keeps every legal document accessible from every public page", () => {
    for (const path of Object.keys(publicPages) as Array<
      keyof typeof publicPages
    >) {
      const html = renderToStaticMarkup(<MarketingPage path={path} />);
      for (const [, href] of legalLinks)
        expect(html).toContain(`href="${href}"`);
    }
  });
  it("offers returning users the app without forcing them away from public pages", () => {
    expect(
      renderToStaticMarkup(<MarketingPage path="/mission" signedIn />),
    ).toContain('href="/app"');
  });
  it("allows only known internal app destinations after sign-in", () => {
    expect(safeAppDestination("/app/records")).toBe("/app/records");
    for (const input of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/app/../login",
      "/app?next=https://evil.example",
      "%2f%2fevil.example",
      null,
    ])
      expect(safeAppDestination(input)).toBe("/app");
  });
  it("keeps public pages outside the protected app and gates direct monitoring links", () => {
    expect(isAppPath("/app/records")).toBe(true);
    expect(isAppPath("/mission")).toBe(false);
    expect(appViewForPath("/app/records")).toBe("records");
    expect(appViewForPath("/app/dashboard")).toBe("predrive");
  });
});
