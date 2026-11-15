import type { Lang } from "@/lib/types";

export const LANGS: {
  code: Lang;
  name: string;
  native: string;
  dir: "ltr" | "rtl";
  speech: string; // BCP-47 tag for the browser voice
}[] = [
  { code: "bn", name: "Bengali", native: "বাংলা", dir: "ltr", speech: "bn-BD" },
  { code: "ne", name: "Nepali", native: "नेपाली", dir: "ltr", speech: "ne-NP" },
  { code: "my", name: "Burmese", native: "မြန်မာ", dir: "ltr", speech: "my-MM" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia", dir: "ltr", speech: "id-ID" },
  { code: "hi", name: "Hindi", native: "हिन्दी", dir: "ltr", speech: "hi-IN" },
  { code: "ur", name: "Urdu", native: "اردو", dir: "rtl", speech: "ur-PK" },
];

export const langInfo = (code: Lang) => LANGS.find((l) => l.code === code)!;
