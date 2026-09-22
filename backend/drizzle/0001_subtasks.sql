ALTER TABLE "tasks" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_id_tasks_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_parent_id_idx" ON "tasks" USING btree ("parent_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_not_own_parent" CHECK ("tasks"."parent_id" <> "tasks"."id");