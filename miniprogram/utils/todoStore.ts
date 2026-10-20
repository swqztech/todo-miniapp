import type { FilterKind } from '../models/filterKind';
import type { TodoItem } from '../models/todoItem';
import { createTodoItem } from '../models/todoItem';

/** 与 Taro / Flutter 导出 JSON 字段一致 */
const STORAGE_KEY = 'todo_taro_todos';

let items: TodoItem[] = [];
let nextId = 1;

function recomputeNextId() {
  nextId = 1;
  for (const item of items) {
    if (item.Id >= nextId) {
      nextId = item.Id + 1;
    }
  }
}

export function loadTodos(): Promise<void> {
  return new Promise(resolve => {
    try {
      const raw = wx.getStorageSync(STORAGE_KEY) as string;
      if (!raw) {
        items = [];
        nextId = 1;
        resolve();
        return;
      }
      const parsed = JSON.parse(raw) as TodoItem[];
      items = parsed.map(row => ({
        Id: row.Id ?? 0,
        Text: row.Text ?? '',
        Done: row.Done ?? false,
      }));
      recomputeNextId();
    } catch {
      items = [];
      nextId = 1;
    }
    resolve();
  });
}

function save(): void {
  wx.setStorageSync(STORAGE_KEY, JSON.stringify(items, null, 2));
}

export function getItems(): readonly TodoItem[] {
  return items;
}

export function add(text: string): void {
  const t = text.trim();
  if (!t) {
    return;
  }
  items.push(createTodoItem(nextId++, t, false));
  save();
}

function addDone(text: string): void {
  const t = text.trim();
  if (!t) {
    return;
  }
  items.push(createTodoItem(nextId++, t, true));
  save();
}

export function setDone(index: number, done: boolean): void {
  if (index < 0 || index >= items.length || items[index].Done === done) {
    return;
  }
  items[index].Done = done;
  save();
}

export function removeAt(index: number): void {
  if (index < 0 || index >= items.length) {
    return;
  }
  items.splice(index, 1);
  save();
}

export function moveItem(from: number, to: number): void {
  if (
    from < 0 ||
    from >= items.length ||
    to < 0 ||
    to >= items.length ||
    from === to
  ) {
    return;
  }
  const [row] = items.splice(from, 1);
  items.splice(to, 0, row);
  save();
}

export function updateText(index: number, text: string): void {
  const t = text.trim();
  if (!t || index < 0 || index >= items.length) {
    return;
  }
  items[index].Text = t;
  save();
}

export function importMarkdown(content: string): void {
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    const lower = line.toLowerCase();
    if (lower.startsWith('- [x]')) {
      addDone(line.slice(5).trim());
    } else if (line.startsWith('- [ ]')) {
      add(line.slice(5).trim());
    } else {
      add(line);
    }
  }
}

export function exportMarkdown(): string {
  return items
    .map(i => (i.Done ? `- [x] ${i.Text}` : `- [ ] ${i.Text}`))
    .join('\n');
}

export function countsLabel(): string {
  const left = items.filter(i => !i.Done).length;
  const done = items.filter(i => i.Done).length;
  return `还剩 ${left} · 已完成 ${done}`;
}

export function filteredIndices(kind: FilterKind): number[] {
  const result: number[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (kind === 'active' && item.Done) {
      continue;
    }
    if (kind === 'done' && !item.Done) {
      continue;
    }
    result.push(i);
  }
  return result;
}

export function replaceFromJson(jsonText: string): void {
  const parsed = JSON.parse(jsonText) as TodoItem[];
  items = parsed.map(row => ({
    Id: row.Id ?? 0,
    Text: row.Text ?? '',
    Done: row.Done ?? false,
  }));
  recomputeNextId();
  save();
}
