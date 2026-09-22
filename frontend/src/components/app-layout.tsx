import { ListChecks } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router';
import { cn } from 'cn';

const NAV = [
  { to: '/', label: 'Tasks', end: true },
  { to: '/tasks/new', label: 'Create task', end: false },
];

export function AppLayout() {
  return (
    <div className="min-h-svh bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ListChecks className="size-4" />
            </span>
            Taskboard
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 font-medium transition-colors',
                    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
