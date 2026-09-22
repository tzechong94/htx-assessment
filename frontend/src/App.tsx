import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AppLayout } from '@/components/app-layout';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CreateTaskPage } from '@/pages/create-task-page';
import { TaskListPage } from '@/pages/task-list-page';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <TaskListPage /> },
      { path: '/tasks/new', element: <CreateTaskPage /> },
    ],
  },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
