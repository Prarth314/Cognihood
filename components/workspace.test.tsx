import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppShell from "./layout/AppShell";
import ModuleSelector from "./ModuleSelector";
vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ supabaseReady: true, supabaseConnected: true }),
}));
afterEach(() => vi.unstubAllGlobals());
describe("redesigned workspace", () => {
  it("preserves the monitoring and archive entry points without starting the camera", () => {
    const html = renderToStaticMarkup(
      <ModuleSelector
        onStartTrip={() => {}}
        onViewArchives={() => {}}
        onDeleteAccount={() => {}}
      />,
    );
    expect(html).toContain("Start pre-drive check");
    expect(html).toContain("View history");
    expect(html).toContain("Permanently delete");
    expect(html).not.toContain("<video");
  });
  it("keeps the off-screen mobile navigation inert and exposes its toggle state", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    const html = renderToStaticMarkup(
      <AppShell currentView="records" onNavigate={() => {}}>
        <p>Archive content</p>
      </AppShell>,
    );
    expect(html).toContain('inert=""');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Archive content");
    expect(html).toContain("Public website");
  });
});
