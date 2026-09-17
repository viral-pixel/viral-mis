// Design tokens shared with viral-asset-mgmt and viral-hr-erp for a
// consistent look across NCS's internal tools.

export const C = {
  bg: "#F5F4EF",
  panel: "#FFFFFF",
  sidebar: "#182422",
  sidebarSoft: "#24322F",
  sidebarActive: "rgba(19,158,131,0.22)", // richer than sidebarSoft alone — gives the active nav item real presence instead of a barely-there shade shift
  sidebarLabel: "#7FAFA0", // section labels (KETAN REPORTS etc.) — teal-tinted instead of flat neutral grey
  ink: "#1E2420",
  sub: "#6E7269",
  faint: "#9A9D93",
  border: "#E2DFD5",
  teal: "#13977F",
  tealDark: "#0C6B58",
  tealSoft: "#E1F2ED",
  amber: "#B9770E",
  amberSoft: "#FBF0DD",
  red: "#B3423A",
  redSoft: "#FBE9E7",
  green: "#3E7A3A",
  greenSoft: "#E9F3E8",
};

export const FONT_HEAD = "'Oswald', 'Arial Narrow', sans-serif";
export const FONT_BODY = "'Inter', system-ui, sans-serif";
export const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";

export const PAGE_SIZE = 50;

// Chart palette (recharts) — kept separate from the semantic status colors
// in app/lib/expiry.ts, used for category/trend series instead.
export const CHART_COLORS = [C.teal, C.amber, "#5B7FBD", C.red, "#8A6BB5", C.green, "#C48A3F", "#4C9DA6"];
