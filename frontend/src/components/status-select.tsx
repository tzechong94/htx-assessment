import { cn } from 'cn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TaskStatus } from '@/lib/api';
import { STATUSES } from '@/lib/status';

type Props = {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
  /** Statuses that cannot be chosen right now, with the reason shown next to them. */
  blocked?: Partial<Record<TaskStatus, string>>;
};

export function StatusSelect({ value, onChange, blocked = {} }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TaskStatus)}>
      <SelectTrigger className="w-36 bg-background" aria-label="Status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((status) => {
          const reason = status.value === value ? undefined : blocked[status.value];
          return (
            <SelectItem key={status.value} value={status.value} disabled={reason !== undefined}>
              <span className={cn('size-2 rounded-full', status.dot)} aria-hidden />
              {status.label}
              {reason && <span className="ml-auto pl-3 text-xs text-muted-foreground">{reason}</span>}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
