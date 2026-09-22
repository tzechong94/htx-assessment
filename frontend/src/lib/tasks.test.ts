import { describe, expect, it } from 'vitest';
import { makeTask } from '@/test/utils';
import { blockedStatuses, flattenTasks } from './tasks';

describe('blockedStatuses', () => {
  it('blocks Done while any subtask is open', () => {
    const task = makeTask({ subtasks: [makeTask({ id: 2, status: 'done' }), makeTask({ id: 3, status: 'in_progress' })] });
    expect(blockedStatuses(task, undefined)).toEqual({ done: 'Subtasks open' });
  });

  it('allows Done once every subtask is Done', () => {
    const task = makeTask({ subtasks: [makeTask({ id: 2, status: 'done' })] });
    expect(blockedStatuses(task, undefined)).toEqual({});
  });

  it('blocks reopening while the parent is Done', () => {
    const parent = makeTask({ status: 'done' });
    expect(blockedStatuses(makeTask({ id: 2, status: 'done' }), parent)).toEqual({
      todo: 'Parent is Done',
      in_progress: 'Parent is Done',
    });
  });
});

it('flattenTasks walks the whole tree depth-first', () => {
  const tree = [makeTask({ id: 1, subtasks: [makeTask({ id: 2, subtasks: [makeTask({ id: 3 })] })] }), makeTask({ id: 4 })];
  expect(flattenTasks(tree).map((t) => t.id)).toEqual([1, 2, 3, 4]);
});
