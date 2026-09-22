import { relations, sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const taskStatus = pgEnum('task_status', TASK_STATUSES);

export const skills = pgTable('skills', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull().unique(),
});

export const developers = pgTable('developers', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
});

export const developerSkills = pgTable(
  'developer_skills',
  {
    developerId: integer('developer_id')
      .notNull()
      .references(() => developers.id, { onDelete: 'cascade' }),
    skillId: integer('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.developerId, t.skillId] })],
);

export const tasks = pgTable(
  'tasks',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    title: text('title').notNull(),
    status: taskStatus('status').notNull().default('todo'),
    assigneeId: integer('assignee_id').references(() => developers.id, { onDelete: 'set null' }),
    // Subtasks are tasks with a parent (adjacency list), so they share every property of a task.
    parentId: integer('parent_id').references((): AnyPgColumn => tasks.id, { onDelete: 'cascade' }),
    // True when the required skills were identified by the LLM rather than chosen by the user.
    skillsIdentifiedByLlm: boolean('skills_identified_by_llm').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('tasks_assignee_id_idx').on(t.assigneeId),
    index('tasks_parent_id_idx').on(t.parentId),
    check('tasks_not_own_parent', sql`${t.parentId} <> ${t.id}`),
  ],
);

export const taskSkills = pgTable(
  'task_skills',
  {
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    skillId: integer('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.skillId] })],
);

export const skillsRelations = relations(skills, ({ many }) => ({
  developerSkills: many(developerSkills),
  taskSkills: many(taskSkills),
}));

export const developersRelations = relations(developers, ({ many }) => ({
  developerSkills: many(developerSkills),
  tasks: many(tasks),
}));

export const developerSkillsRelations = relations(developerSkills, ({ one }) => ({
  developer: one(developers, { fields: [developerSkills.developerId], references: [developers.id] }),
  skill: one(skills, { fields: [developerSkills.skillId], references: [skills.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  assignee: one(developers, { fields: [tasks.assigneeId], references: [developers.id] }),
  parent: one(tasks, { fields: [tasks.parentId], references: [tasks.id], relationName: 'subtasks' }),
  subtasks: many(tasks, { relationName: 'subtasks' }),
  taskSkills: many(taskSkills),
}));

export const taskSkillsRelations = relations(taskSkills, ({ one }) => ({
  task: one(tasks, { fields: [taskSkills.taskId], references: [tasks.id] }),
  skill: one(skills, { fields: [taskSkills.skillId], references: [skills.id] }),
}));
