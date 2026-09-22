import { Sparkles } from 'lucide-react';
import { cn } from 'cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

export function SkillBadges({ skills, identifiedByLlm }: { skills: Skill[]; identifiedByLlm: boolean }) {
  if (skills.length === 0) {
    return <span className="text-xs text-muted-foreground">Any skill</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {skills.map((skill) => (
        <SkillBadge key={skill.id} name={skill.name} />
      ))}
      {identifiedByLlm && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              aria-label="Skills identified by AI"
              className="flex size-5 items-center justify-center rounded-md text-violet-500 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Sparkles className="size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Identified by AI from the task title</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
