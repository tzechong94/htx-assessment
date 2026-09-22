import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUpdateTask } from '@/hooks/queries';

/**
 * Shown when a task has no skills, which only happens when identification failed at creation
 * (no API key, timeout, API error). Sending `skillIds: []` asks the API to identify them again.
 */
export function IdentifySkillsButton({ taskId }: { taskId: number }) {
  const updateTask = useUpdateTask();

  function identify() {
    updateTask.mutate(
      { id: taskId, input: { skillIds: [] } },
      {
        onSuccess: (task) => {
          if (task.skills.length === 0) {
            toast.warning("Couldn't identify skills", {
              description: 'The AI service is unavailable. Try again later, or choose skills with Edit.',
            });
          }
        },
      },
    );
  }

  return (
    <Button variant="outline" size="xs" onClick={identify} disabled={updateTask.isPending} className="bg-background">
      {updateTask.isPending ? <Loader2 className="animate-spin" /> : <Sparkles className="text-violet-500" />}
      Identify skills
    </Button>
  );
}
