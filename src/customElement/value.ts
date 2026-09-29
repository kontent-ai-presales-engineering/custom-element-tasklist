export type TaskEventType = "added" | "completed" | "reopened" | "removed";

export type TaskEvent = Readonly<{
  type: TaskEventType;
  at: string; // ISO-8601 timestamp, taken from the editor's browser clock
}>;

export type Task = Readonly<{
  id: string;
  text: string;
  done: boolean;
  // Removed tasks are kept as tombstones so their history stays in the stored value (and therefore
  // in every Kontent.ai version of the item). They are hidden from the list and ignored by the gate.
  removed: boolean;
  events: ReadonlyArray<TaskEvent>;
}>;

export type Value = ReadonlyArray<Task>;

export const parseValue = (input: string | null): Value | null | "invalidValue" => {
  if (input === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(input);

    return Array.isArray(parsed) && parsed.every(isValidTask) ? parsed.map(normalizeTask) : "invalidValue";
  }
  catch (e) {
    return "invalidValue";
  }
};

export const serializeValue = (tasks: Value): string => JSON.stringify(tasks);

export const activeTasks = (tasks: Value): Value => tasks.filter(task => !task.removed);

// The item may only be published once every task that hasn't been removed is done
// (an empty task list counts as fulfilled too).
export const isFulfilled = (tasks: Value): boolean =>
  activeTasks(tasks).every(task => task.done);

// Earlier versions of this element stored tasks without `removed`/`events`; accept those too.
type StoredTask = Readonly<{
  id: string;
  text: string;
  done: boolean;
  removed?: boolean;
  events?: ReadonlyArray<TaskEvent>;
}>;

const isValidTask = (value: unknown): value is StoredTask => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const task = value as StoredTask;

  return typeof task.id === "string" &&
    typeof task.text === "string" &&
    typeof task.done === "boolean" &&
    (task.removed === undefined || typeof task.removed === "boolean") &&
    (task.events === undefined || (Array.isArray(task.events) && task.events.every(isValidEvent)));
};

const isValidEvent = (value: unknown): value is TaskEvent =>
  typeof value === "object" &&
  value !== null &&
  eventTypes.includes((value as TaskEvent).type) &&
  typeof (value as TaskEvent).at === "string";

const eventTypes: ReadonlyArray<unknown> = ["added", "completed", "reopened", "removed"] satisfies ReadonlyArray<TaskEventType>;

const normalizeTask = (task: StoredTask): Task => ({
  id: task.id,
  text: task.text,
  done: task.done,
  removed: task.removed ?? false,
  events: task.events ?? [],
});
