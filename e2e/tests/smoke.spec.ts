import { expect, test, type Page } from '@playwright/test';

// Unique titles so the test can run repeatedly against a database that already has data.
const run = Date.now();
const parentTitle = `E2E ${run}: checkout page`;
const childTitle = `E2E ${run}: checkout form`;

const row = (page: Page, title: string) => page.getByRole('row').filter({ hasText: title });

async function choose(page: Page, rowTitle: string, field: 'Status' | 'Assignee', option: string) {
  await row(page, rowTitle).getByRole('combobox', { name: field }).click();
  await page.getByRole('option', { name: option }).click();
}

test('create, assign, complete, edit and delete a task with a subtask', async ({ page }) => {
  await test.step('create a task with a subtask', async () => {
    await page.goto('/tasks/new');
    await page.getByLabel('Title').fill(parentTitle);
    await page.getByRole('button', { name: 'Frontend' }).click();
    await page.getByRole('button', { name: 'Backend' }).click();

    await page.getByRole('button', { name: 'Add subtask' }).click();
    const subtask = page.getByRole('group', { name: 'Subtask 1' });
    await subtask.getByLabel('Title').fill(childTitle);
    await subtask.getByRole('button', { name: 'Frontend' }).click();

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL('/');
    await expect(row(page, parentTitle)).toContainText('0/1 subtasks done');
    await expect(row(page, childTitle)).toBeVisible();
  });

  await test.step('only developers with every required skill can be assigned', async () => {
    await row(page, parentTitle).getByRole('combobox', { name: 'Assignee' }).click();
    await expect(page.getByRole('option', { name: /Alice/ })).toBeDisabled();
    await expect(page.getByRole('option', { name: /Alice/ })).toContainText('No Backend');
    await page.getByRole('option', { name: /Carol/ }).click();
    await expect(row(page, parentTitle).getByRole('combobox', { name: 'Assignee' })).toContainText('Carol');
  });

  await test.step('a task can only be Done once its subtasks are Done', async () => {
    await row(page, parentTitle).getByRole('combobox', { name: 'Status' }).click();
    await expect(page.getByRole('option', { name: /Done/ })).toBeDisabled();
    await page.keyboard.press('Escape');

    await choose(page, childTitle, 'Status', 'Done');
    await expect(row(page, parentTitle)).toContainText('1/1 subtasks done');
    await choose(page, parentTitle, 'Status', 'Done');
    await expect(row(page, parentTitle).getByRole('combobox', { name: 'Status' })).toContainText('Done');
  });

  const editedTitle = `${parentTitle} (edited)`;

  await test.step('edit the title', async () => {
    await row(page, parentTitle).getByRole('button', { name: 'Task actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit task' });
    await dialog.getByLabel('Title').fill(editedTitle);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await expect(row(page, editedTitle)).toBeVisible();
  });

  await test.step('delete the task together with its subtask', async () => {
    await row(page, editedTitle).getByRole('button', { name: 'Task actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('Its 1 subtask will be deleted too.');
    await dialog.getByRole('button', { name: 'Delete' }).click();

    await expect(row(page, editedTitle)).toHaveCount(0);
    await expect(row(page, childTitle)).toHaveCount(0);
  });
});
