export const publicPages = {
  "/": {
    title: "CogniHood — A more attentive journey",
    description:
      "Explore CogniHood, a privacy-conscious driver attention-support project. Understand the mission, local camera processing, and hardware development.",
  },
  "/mission": {
    title: "Our mission | CogniHood",
    description:
      "Why CogniHood exists: understandable attention signals, human judgment, and privacy-conscious development.",
  },
  "/how-it-works": {
    title: "How it works | CogniHood",
    description:
      "From a parked camera check to local attention indicators and trip reflection. Explore what works today and what is still in development.",
  },
  "/hardware": {
    title: "Hardware development | CogniHood",
    description:
      "The Raspberry Pi integration direction, its relationship to the browser application, and the questions still being evaluated.",
  },
} as const;
export type PublicPath = keyof typeof publicPages;
const appPaths = ["/app", "/app/records", "/app/predrive", "/app/dashboard"];
export function safeAppDestination(value: string | null): string {
  return value && appPaths.includes(value) ? value : "/app";
}
export function appViewForPath(
  path: string,
): "selector" | "records" | "predrive" {
  if (path === "/app/records") return "records";
  if (path === "/app/predrive" || path === "/app/dashboard") return "predrive";
  return "selector";
}
export function isAppPath(path: string): boolean {
  return appPaths.includes(path);
}
export const legalLinks = [
  ["Legal center", "/legal.html"],
  ["Privacy", "/privacy.html"],
  ["Notice at collection", "/notice-at-collection.html"],
  ["Terms of use", "/terms.html"],
  ["Safety notice", "/safety.html"],
  ["AI transparency", "/ai-notice.html"],
  ["Acceptable use", "/acceptable-use.html"],
  ["Cookies & storage", "/cookies.html"],
  ["Service providers", "/subprocessors.html"],
  ["Copyright", "/copyright.html"],
  ["Accessibility", "/accessibility.html"],
  ["MIT license", "/license.html"],
] as const;
