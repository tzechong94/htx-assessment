import { ClipboardList, Plus, RotateCw } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from 'cn';
import { AssigneeSelect } from '@/components/assignee-select';
import { PageHeader } from '@/components/page-header';
import { SkillBadges } from '@/components/skill-badges';
import { StatusSelect } from '@/components/status-select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDevelopers, useTasks, useUpdateTask } from '@/hooks/queries';
import type { Developer, Task } from '@/lib/api';
import { STATUSES } from '@/lib/status';

function StatusSummary({ tasks }: { tasks: Task[] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {STATUSES.map((status) => (
        <div
          key={status.value}
          className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium"
        >
          <span className={cn('size-2 rounded-full', status.dot)} aria-hidden />
          {status.label}
          <span className="text-muted-foreground tabular-nums">
            {tasks.filter((t) => t.status === status.value).length}
          </span>
        </div>
      ))}
    </div>
  );
}

function TaskRow({ task, developers }: { task: Task; developers: Developer[] }) {
  const updateTask = useUpdateTask();
  return (
    <TableRow>
      <TableCell className="py-4 align-top whitespace-normal">
        <p className="max-w-prose leading-relaxed">{task.title}</p>
      </TableCell>
      <TableCell className="py-4 align-top">
        <SkillBadges skills={task.skills} />
      </TableCell>
      <TableCell className="py-3 align-top">
        <StatusSelect value={task.status} onChange={(status) => updateTask.mutate({ id: task.id, input: { status } })} />
      </TableCell>
      <TableCell className="py-3 align-top">
        <AssigneeSelect
          assignee={task.assignee}
          requiredSkills={task.skills}
          developers={developers}
          onChange={(assigneeId) => updateTask.mutate({ id: task.id, input: { assigneeId } })}
        />
      </TableCell>
    </TableRow>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <ClipboardList className="size-5 text-muted-foreground" />
      </span>
      <div>
        <p className="font-medium">No tasks yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Create your first task to start assigning work.</p>
      </div>
      <Button asChild size="sm" className="mt-2">
        <Link to="/tasks/new">
          <Plus /> Create task
        </Link>
      </Button>
    </div>
  );
}

function LoadingRows() {
  return Array.from({ length: 3 }, (_, i) => (
    <TableRow key={i}>
      <TableCell className="py-4">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-2 h-4 w-3/5" />
      </TableCell>
      <TableCell className="py-4">
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="py-3">
        <Skeleton className="h-8 w-36" />
      </TableCell>
      <TableCell className="py-3">
        <Skeleton className="h-8 w-44" />
      </TableCell>
    </TableRow>
  ));
}

export function TaskListPage() {
  const tasks = useTasks();
  const developers = useDevelopers();
  const error = tasks.error ?? developers.error;
  const loaded = tasks.data && developers.data ? { tasks: tasks.data, developers: developers.data } : null;

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Track progress and assign each task to a developer with the skills it needs."
        action={
          <Button asChild>
            <Link to="/tasks/new">
              <Plus /> New task
            </Link>
          </Button>
        }
      />

      {tasks.data && tasks.data.length > 0 && <StatusSummary tasks={tasks.data} />}

      <Card className="gap-0 overflow-hidden py-0">
        {error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="font-medium">Couldn't load tasks</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void tasks.refetch();
                void developers.refetch();
              }}
            >
              <RotateCw /> Try again
            </Button>
          </div>
        ) : loaded?.tasks.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[46%] pl-4">Task title</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead className="w-48 pr-4">Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4">
              {loaded ? (
                loaded.tasks.map((task) => <TaskRow key={task.id} task={task} developers={loaded.developers} />)
              ) : (
                <LoadingRows />
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
