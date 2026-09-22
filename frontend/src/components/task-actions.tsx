import { Ellipsis, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DeleteTaskDialog } from '@/components/delete-task-dialog';
import { EditTaskDialog } from '@/components/edit-task-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Task } from '@/lib/api';

export function TaskActions({ task }: { task: Task }) {
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null);
  const close = (open: boolean) => !open && setDialog(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Task actions" className="text-muted-foreground">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog('edit')}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog('delete')}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Mounted only while open so the edit form starts from the task's latest values. */}
      {dialog === 'edit' && <EditTaskDialog task={task} open onOpenChange={close} />}
      {dialog === 'delete' && <DeleteTaskDialog task={task} open onOpenChange={close} />}
    </>
  );
}
