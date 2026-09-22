import { CornerDownRight, Plus, Trash2 } from 'lucide-react';
import { cn } from 'cn';
import { NewTaskFields } from '@/components/new-task-fields';
import { Button } from '@/components/ui/button';
import type { CreateTaskInput } from '@/lib/api';

export type TaskDraft = {
  /** Stable React key; drafts have no id until they are saved. */
  key: string;
  title: string;
  skillIds: number[];
  subtasks: TaskDraft[];
};

export const newDraft = (): TaskDraft => ({ key: crypto.randomUUID(), title: '', skillIds: [], subtasks: [] });

export const isDraftValid = (draft: TaskDraft): boolean =>
  draft.title.trim() !== '' && draft.subtasks.every(isDraftValid);

export const countDrafts = (draft: TaskDraft): number =>
  1 + draft.subtasks.reduce((n, s) => n + countDrafts(s), 0);

export const toCreateInput = ({ title, skillIds, subtasks }: TaskDraft): CreateTaskInput => ({
  title: title.trim(),
  skillIds,
  subtasks: subtasks.map(toCreateInput),
});

type Props = {
  draft: TaskDraft;
  onChange: (draft: TaskDraft) => void;
  onRemove?: () => void;
  /** Outline number such as "1.2"; empty for the top-level task. */
  path: string;
  showErrors: boolean;
};

/** Editor for one task plus, recursively, an editor for each of its subtasks. */
export function TaskDraftEditor({ draft, onChange, onRemove, path, showErrors }: Props) {
  const isSubtask = path !== '';

  function updateSubtask(key: string, next: TaskDraft) {
    onChange({ ...draft, subtasks: draft.subtasks.map((s) => (s.key === key ? next : s)) });
  }

  function removeSubtask(key: string) {
    onChange({ ...draft, subtasks: draft.subtasks.filter((s) => s.key !== key) });
  }

  return (
    <div
      role={isSubtask ? 'group' : undefined}
      aria-label={isSubtask ? `Subtask ${path}` : undefined}
      className={cn(
        isSubtask && 'rounded-xl border bg-muted/30 p-4 duration-200 animate-in fade-in-0 slide-in-from-top-1',
      )}
    >
      {isSubtask && (
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <CornerDownRight className="size-3.5" />
            Subtask {path}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Remove subtask ${path}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      )}

      <NewTaskFields draft={draft} onChange={onChange} showErrors={showErrors} autoFocus={isSubtask} />

      {draft.subtasks.length > 0 && (
        <div className="mt-4 grid gap-3 border-l-2 border-dashed pl-4">
          {draft.subtasks.map((subtask, i) => (
            <TaskDraftEditor
              key={subtask.key}
              draft={subtask}
              onChange={(next) => updateSubtask(subtask.key, next)}
              onRemove={() => removeSubtask(subtask.key)}
              path={isSubtask ? `${path}.${i + 1}` : `${i + 1}`}
              showErrors={showErrors}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 bg-background"
        onClick={() => onChange({ ...draft, subtasks: [...draft.subtasks, newDraft()] })}
      >
        <Plus /> Add subtask
      </Button>
    </div>
  );
}
