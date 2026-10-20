export type TodoItem = {
  Id: number;
  Text: string;
  Done: boolean;
};

export function createTodoItem(
  id: number,
  text: string,
  done = false,
): TodoItem {
  return { Id: id, Text: text, Done: done };
}
