import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, type Task, type UpdateTaskInput } from '@/lib/api';

export const queryKeys = {
  tasks: ['tasks'] as const,
  developers: ['developers'] as const,
  skills: ['skills'] as const,
};

export const useTasks = () => useQuery({ queryKey: queryKeys.tasks, queryFn: api.listTasks });

export const useDevelopers = () => useQuery({ queryKey: queryKeys.developers, queryFn: api.listDevelopers });

export const useSkills = () => useQuery({ queryKey: queryKeys.skills, queryFn: api.listSkills });

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
  });
}

/** Optimistically patches the cached task list, rolling back if the server rejects the change. */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  const developers = useDevelopers().data ?? [];

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTaskInput }) => api.updateTask(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks);
      queryClient.setQueryData<Task[]>(queryKeys.tasks, (tasks) =>
        tasks?.map((task) => {
          if (task.id !== id) return task;
          const developer = developers.find((d) => d.id === input.assigneeId);
          const assignee =
            input.assigneeId === undefined
              ? task.assignee
              : developer
                ? { id: developer.id, name: developer.name }
                : null;
          return { ...task, ...(input.status && { status: input.status }), assignee };
        }),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(queryKeys.tasks, context?.previous);
      toast.error("Couldn't update task", { description: error.message });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      void queryClient.invalidateQueries({ queryKey: queryKeys.developers });
    },
  });
}
