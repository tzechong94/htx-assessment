import { ChevronRight, ClipboardList, Plus, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { cn } from 'cn';
import { AssigneeSelect } from '@/components/assignee-select';
import { IdentifySkillsButton } from '@/components/identify-skills-button';
import { PageHeader } from '@/components/page-header';
import { SkillBadges } from '@/components/skill-badges';
import { StatusSelect } from '@/components/status-select';
import { TaskActions } from '@/components/task-actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDevelopers, useTasks, useUpdateTask } from '@/hooks/queries';
import type { Developer, Task } from '@/lib/api';
import { STATUSES } from '@/lib/status';
import { blockedStatuses, flattenTasks } from '@/lib/tasks';

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
            {flattenTasks(tasks).filter((t) => t.status === status.value).length}
          </span>
        </div>
      ))}
    </div>
  );
}

function SubtaskProgress({ subtasks }: { subtasks: Task[] }) {
  const done = subtasks.filter((s) => s.status === 'done').length;
  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width]"
          style={{ width: `${(done / subtasks.length) * 100}%` }}
        />
      </div>
      <span className="tabular-nums">
        {done}/{subtasks.length} subtasks done
      </span>
    </div>
  );
}

type TaskRowsProps = {
  task: Task;
  parent?: Task;
  depth: number;
  developers: Developer[];
  collapsed: Set<number>;
  onToggle: (id: number) => void;
};

/** Renders a task row followed, when expanded, by its subtask rows (recursively). */
function TaskRows({ task, parent, depth, developers, collapsed, onToggle }: TaskRowsProps) {
  const updateTask = useUpdateTask();
  const hasSubtasks = task.subtasks.length > 0;
  const expanded = hasSubtasks && !collapsed.has(task.id);

  return (
    <>
      <TableRow className={cn(depth > 0 && 'bg-muted/20')}>
        <TableCell className="py-4 align-top whitespace-normal">
          <div className="flex items-start gap-1.5" style={{ paddingLeft: depth * 24 }}>
            {hasSubtasks ? (
              <button
                type="button"
                onClick={() => onToggle(task.id)}
                aria-expanded={expanded}
                aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
                className="mt-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className={cn('size-4 transition-transform', expanded && 'rotate-90')} />
              </button>
            ) : (
              <span className="size-5 shrink-0" aria-hidden>
                {depth > 0 && <span className="mx-auto mt-2 block size-1.5 rounded-full bg-border" />}
              </span>
            )}
            <div className="min-w-0">
              <p className={cn('max-w-prose leading-relaxed', task.status === 'done' && 'text-muted-foreground')}>
                {task.title}
              </p>
              {hasSubtasks && <SubtaskProgress subtasks={task.subtasks} />}
            </div>
          </div>
        </TableCell>
        <TableCell className="py-4 align-top">
          {task.skills.length > 0 ? (
            <SkillBadges skills={task.skills} identifiedByLlm={task.skillsIdentifiedByLlm} />
          ) : (
            <IdentifySkillsButton taskId={task.id} />
          )}
        </TableCell>
        <TableCell className="py-3 align-top">
          <StatusSelect
            value={task.status}
            blocked={blockedStatuses(task, parent)}
            onChange={(status) => updateTask.mutate({ id: task.id, input: { status } })}
          />
        </TableCell>
        <TableCell className="py-3 align-top">
          <AssigneeSelect
            assignee={task.assignee}
            requiredSkills={task.skills}
            developers={developers}
            onChange={(assigneeId) => updateTask.mutate({ id: task.id, input: { assigneeId } })}
          />
        </TableCell>
        <TableCell className="py-3 align-top">
          <TaskActions task={task} />
        </TableCell>
      </TableRow>
      {expanded &&
        task.subtasks.map((subtask) => (
          <TaskRows
            key={subtask.id}
            task={subtask}
            parent={task}
            depth={depth + 1}
            developers={developers}
            collapsed={collapsed}
            onToggle={onToggle}
          />
        ))}
    </>
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
      <TableCell className="py-3">
        <Skeleton className="size-7" />
      </TableCell>
    </TableRow>
  ));
}

export function TaskListPage() {
  const tasks = useTasks();
  const developers = useDevelopers();
  const error = tasks.error ?? developers.error;
  const loaded = tasks.data && developers.data ? { tasks: tasks.data, developers: developers.data } : null;
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

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
                {/* Indent matches the chevron column so the header lines up with task titles. */}
                <TableHead className="w-[46%] pl-[42px]">Task title</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead className="w-48">Assignee</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4">
              {loaded ? (
                loaded.tasks.map((task) => (
                  <TaskRows
                    key={task.id}
                    task={task}
                    depth={0}
                    developers={loaded.developers}
                    collapsed={collapsed}
                    onToggle={toggle}
                  />
                ))
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
