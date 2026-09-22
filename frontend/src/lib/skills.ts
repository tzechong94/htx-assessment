import type { Developer, Skill } from './api';

const SKILL_STYLES: Record<string, string> = {
  Frontend: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/30',
  Backend:
    'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/30',
};

const FALLBACK_STYLE = 'bg-muted text-muted-foreground ring-border';

export const skillStyle = (name: string) => SKILL_STYLES[name] ?? FALLBACK_STYLE;

/** Required skills the developer lacks; empty means they may be assigned. Mirrors the API rule. */
export function missingSkills(developer: Developer, required: Skill[]) {
  const held = new Set(developer.skills.map((s) => s.id));
  return required.filter((s) => !held.has(s.id));
}
