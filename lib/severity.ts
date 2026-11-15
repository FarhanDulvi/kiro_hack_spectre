import type { Severity } from "./types";

export const SEVERITY: Record<Severity, { label: string; en: string; color: string; text: string }> = {
  normal: { label: "Normal", en: "normal", color: "var(--color-normal)", text: "#06281a" },
  waspada: { label: "Waspada", en: "alert", color: "var(--color-waspada)", text: "#2b2100" },
  amaran: { label: "Amaran", en: "warning", color: "var(--color-amaran)", text: "#2e1300" },
  bahaya: { label: "Bahaya", en: "danger", color: "var(--color-bahaya)", text: "#ffffff" },
};
