import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteTask } from '@/hooks/queries';
import type { Task } from '@/lib/api';
import { flattenTasks } from '@/lib/tasks';

type Props = {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteTaskDialog({ task, open, onOpenChange }: Props) {
  const deleteTask = useDeleteTask();
  const subtaskCount = flattenTasks(task.subtasks).length;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this task?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="line-clamp-2 font-medium text-foreground">{task.title}</span>
            {subtaskCount > 0 && ` Its ${subtaskCount} subtask${subtaskCount === 1 ? '' : 's'} will be deleted too.`}{' '}
            This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteTask.isPending}
            onClick={(event) => {
              // Keep the dialog open until the server confirms, so a failure isn't hidden.
              event.preventDefault();
              deleteTask.mutate(task.id, { onSuccess: () => onOpenChange(false) });
            }}
          >
            {deleteTask.isPending && <Loader2 className="animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
