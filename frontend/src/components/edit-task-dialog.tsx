import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { NewTaskFields, type TaskFields } from '@/components/new-task-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUpdateTask } from '@/hooks/queries';
import type { Task, UpdateTaskInput } from '@/lib/api';

type Props = {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const sameIds = (a: number[], b: number[]) => a.length === b.length && a.every((id) => b.includes(id));

/** Only sends what changed, so an untouched skill set keeps its AI-identified marker. */
function changes(task: Task, draft: TaskFields): UpdateTaskInput {
  const input: UpdateTaskInput = {};
  const title = draft.title.trim();
  if (title !== task.title) input.title = title;
  if (!sameIds(draft.skillIds, task.skills.map((s) => s.id))) input.skillIds = draft.skillIds;
  return input;
}

export function EditTaskDialog({ task, open, onOpenChange }: Props) {
  const updateTask = useUpdateTask();
  const [draft, setDraft] = useState<TaskFields>(() => ({ title: task.title, skillIds: task.skills.map((s) => s.id) }));
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!draft.title.trim()) return;

    const input = changes(task, draft);
    if (Object.keys(input).length === 0) {
      onOpenChange(false);
      return;
    }
    updateTask.mutate({ id: task.id, input }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>
              {task.assignee
                ? `Required skills must stay within what ${task.assignee.name} has, or reassign the task first.`
                : 'Update the title or the skills this task requires.'}
            </DialogDescription>
          </DialogHeader>
          <NewTaskFields draft={draft} onChange={setDraft} showErrors={submitted} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTask.isPending} className="min-w-24">
              {updateTask.isPending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
