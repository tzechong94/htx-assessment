import { cn } from 'cn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TaskStatus } from '@/lib/api';
import { STATUSES } from '@/lib/status';

type Props = {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
};

export function StatusSelect({ value, onChange, disabled }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TaskStatus)} disabled={disabled}>
      <SelectTrigger className="w-36 bg-background" aria-label="Status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((status) => (
          <SelectItem key={status.value} value={status.value}>
            <span className={cn('size-2 rounded-full', status.dot)} aria-hidden />
            {status.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
