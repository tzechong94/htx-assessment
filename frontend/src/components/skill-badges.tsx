import { cn } from 'cn';
import type { Skill } from '@/lib/api';
import { skillStyle } from '@/lib/skills';

export function SkillBadge({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        skillStyle(name),
        className,
      )}
    >
      {name}
    </span>
  );
}

export function SkillBadges({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) {
    return <span className="text-xs text-muted-foreground">Any skill</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <SkillBadge key={skill.id} name={skill.name} />
      ))}
    </div>
  );
}
