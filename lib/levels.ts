import type { Aspect, Style } from "@/lib/n8n";

// Display copy only. The rules themselves live in the n8n "Go 2 Market · Progress" workflow.
export const LEVELS = [
  { level: 1, title: "Intern", unlock: "Your first shoot, free with a verified email" },
  { level: 2, title: "Junior Creative", unlock: "+1 shoot, portrait and landscape formats" },
  { level: 3, title: "Art Director", unlock: "+1 shoot, scene styles" },
  { level: 4, title: "Creative Director", unlock: "+2 shoots, your own art direction" },
  { level: 5, title: "Chief Creative", unlock: "+3 shoots, Signature badge" },
];

export const FORMATS: { id: Aspect; label: string; ratio: string; level: number }[] = [
  { id: "square", label: "Square", ratio: "1:1", level: 1 },
  { id: "portrait", label: "Portrait", ratio: "2:3", level: 2 },
  { id: "landscape", label: "Landscape", ratio: "3:2", level: 2 },
];

export const STYLES: { id: Style; label: string; level: number }[] = [
  { id: "auto", label: "Director's pick", level: 1 },
  { id: "luxe-dark", label: "Luxe dark", level: 3 },
  { id: "sunlit", label: "Sunlit", level: 3 },
  { id: "minimal-studio", label: "Minimal studio", level: 3 },
  { id: "nature", label: "Nature", level: 3 },
  { id: "neon", label: "Neon", level: 3 },
];

export const DIRECTION_LEVEL = 4;

export const XP_RULES = [
  ["A message of 3+ words", "+10"],
  ["Attaching a product photo", "+30"],
  ["Verifying your email", "+100"],
  ["Each finished ad", "+50"],
  ["First message of the day", "+15 per streak day"],
] as const;
