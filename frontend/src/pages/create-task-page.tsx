import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { NewTaskFields, type TaskDraft } from '@/components/new-task-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useCreateTask } from '@/hooks/queries';

export function CreateTaskPage() {
  const navigate = useNavigate();
  const createTask = useCreateTask();
  const [draft, setDraft] = useState<TaskDraft>({ title: '', skillIds: [] });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!draft.title.trim()) return;

    createTask.mutate(draft, {
      onSuccess: () => {
        toast.success('Task created');
        void navigate('/');
      },
      onError: (error) => toast.error("Couldn't create task", { description: error.message }),
    });
  }

  return (
    <>
      <PageHeader title="Create Task" description="Describe the work and pick the skills it requires." />
      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <CardContent>
            <NewTaskFields draft={draft} onChange={setDraft} showErrors={submitted} />
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
