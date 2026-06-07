import { readFileSync, statSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

const SKILLS_DIR = resolve(homedir(), ".claude/skills/ppt-generator");

export interface DetailInfo {
  slug: string;
  themeColors: string[];
  fonts: { cn: string; en: string };
  mtime: number;
}

export function readDetailJson(templateSlug: string): DetailInfo | null {
  try {
    const detailPath = resolve(SKILLS_DIR, "templates", templateSlug, "detail.json");
    const raw = readFileSync(detailPath, "utf-8");
    const detail = JSON.parse(raw);
    const stat = statSync(detailPath);
    return {
      slug: detail.slug || templateSlug,
      themeColors: detail.theme_colors || [],
      fonts: detail.fonts || { cn: "微软雅黑", en: "Arial" },
      mtime: stat.mtimeMs,
    };
  } catch {
    return null;
  }
}
