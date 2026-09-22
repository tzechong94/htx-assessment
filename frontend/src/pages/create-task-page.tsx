import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import {
  countDrafts,
  isDraftValid,
  newDraft,
  TaskDraftEditor,
  toCreateInput,
  type TaskDraft,
} from '@/components/task-draft-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useCreateTask } from '@/hooks/queries';

export function CreateTaskPage() {
  const navigate = useNavigate();
  const createTask = useCreateTask();
  const [draft, setDraft] = useState<TaskDraft>(newDraft);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!isDraftValid(draft)) return;

    const subtaskCount = countDrafts(draft) - 1;
    createTask.mutate(toCreateInput(draft), {
      onSuccess: () => {
        toast.success('Task created', {
          description: subtaskCount > 0 ? `Including ${subtaskCount} subtask${subtaskCount === 1 ? '' : 's'}.` : undefined,
        });
        void navigate('/');
      },
      onError: (error) => toast.error("Couldn't create task", { description: error.message }),
    });
  }

  return (
    <>
      <PageHeader
        title="Create Task"
        description="Describe the work, pick the skills it requires, and break it into subtasks if needed."
      />
      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <CardContent>
            <TaskDraftEditor draft={draft} onChange={setDraft} path="" showErrors={submitted} />
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t">
            <Button type="button" variant="ghost" onClick={() => void navigate('/')}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending} className="min-w-24">
              {createTask.isPending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </CardFooter>
        </Card>
      </form>
    </>
  );
}
