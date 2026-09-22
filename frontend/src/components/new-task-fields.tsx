import { Check, Sparkles } from 'lucide-react';
import { useId } from 'react';
import { cn } from 'cn';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useSkills } from '@/hooks/queries';
import { skillStyle } from '@/lib/skills';

export type TaskFields = { title: string; skillIds: number[] };

type Props<T extends TaskFields> = {
  draft: T;
  onChange: (draft: T) => void;
  showErrors: boolean;
  autoFocus?: boolean;
};

export function NewTaskFields<T extends TaskFields>({ draft, onChange, showErrors, autoFocus }: Props<T>) {
  const id = useId();
  const skills = useSkills();
  const titleError = showErrors && !draft.title.trim();

  function toggleSkill(skillId: number) {
    const skillIds = draft.skillIds.includes(skillId)
      ? draft.skillIds.filter((s) => s !== skillId)
      : [...draft.skillIds, skillId];
    onChange({ ...draft, skillIds });
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor={`${id}-title`}>Title</Label>
        <Textarea
          id={`${id}-title`}
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="As a visitor, I want to see a responsive homepage so that…"
          aria-invalid={titleError}
          aria-describedby={titleError ? `${id}-title-error` : undefined}
          maxLength={500}
          autoFocus={autoFocus}
          rows={2}
          className="resize-none bg-background"
        />
        {titleError && (
          <p id={`${id}-title-error`} className="text-xs text-destructive">
            Give the task a title.
          </p>
        )}
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Required skills</legend>
        <div className="flex flex-wrap gap-2">
          {skills.isPending
            ? Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-8 w-24 rounded-full" />)
            : skills.data?.map((skill) => {
                const selected = draft.skillIds.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSkill(skill.id)}
                    className={cn(
                      'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium ring-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      selected ? cn(skillStyle(skill.name), 'ring-inset') : 'bg-background text-muted-foreground ring-border hover:text-foreground',
                    )}
                  >
                    {selected && <Check className="size-3.5" />}
                    {skill.name}
                  </button>
                );
              })}
        </div>
        {draft.skillIds.length === 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-violet-500" />
            Leave empty and AI will identify the required skills from the title.
          </p>
        )}
      </fieldset>
    </div>
  );
}
