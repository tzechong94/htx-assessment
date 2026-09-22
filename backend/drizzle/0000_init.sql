CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "developer_skills" (
	"developer_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	CONSTRAINT "developer_skills_developer_id_skill_id_pk" PRIMARY KEY("developer_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "developers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "developers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "skills_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "task_skills" (
	"task_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	CONSTRAINT "task_skills_task_id_skill_id_pk" PRIMARY KEY("task_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"assignee_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "developer_skills" ADD CONSTRAINT "developer_skills_developer_id_developers_id_fk" FOREIGN KEY ("developer_id") REFERENCES "public"."developers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_skills" ADD CONSTRAINT "developer_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_skills" ADD CONSTRAINT "task_skills_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_skills" ADD CONSTRAINT "task_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_developers_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."developers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_assignee_id_idx" ON "tasks" USING btree ("assignee_id");