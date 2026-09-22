import { UserRound } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Developer, DeveloperRef, Skill } from '@/lib/api';
import { missingSkills } from '@/lib/skills';

const UNASSIGNED = 'unassigned';

type Props = {
  assignee: DeveloperRef | null;
  requiredSkills: Skill[];
  developers: Developer[];
  onChange: (developerId: number | null) => void;
};

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
      {name.charAt(0)}
    </span>
  );
}

/** Only developers holding every required skill are selectable; the rest are shown disabled with the reason. */
export function AssigneeSelect({ assignee, requiredSkills, developers, onChange }: Props) {
  const options = developers.map((developer) => ({ developer, missing: missingSkills(developer, requiredSkills) }));

  return (
    <Select
      value={assignee ? String(assignee.id) : UNASSIGNED}
      onValueChange={(v) => onChange(v === UNASSIGNED ? null : Number(v))}
    >
      <SelectTrigger className="w-44 bg-background" aria-label="Assignee">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>
          <span className="flex size-5 items-center justify-center rounded-full border border-dashed text-muted-foreground">
            <UserRound className="size-3" />
          </span>
          <span className="text-muted-foreground">Unassigned</span>
        </SelectItem>
        <SelectSeparator />
        {options.map(({ developer, missing }) => (
          <SelectItem key={developer.id} value={String(developer.id)} disabled={missing.length > 0}>
            <Avatar name={developer.name} />
            {developer.name}
            {missing.length > 0 && (
              <span className="ml-auto pl-3 text-xs text-muted-foreground">
                No {missing.map((s) => s.name).join(', ')}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
