export type Task = Readonly<{
  id: string;
  text: string;
  done: boolean;
}>;

export type Value = ReadonlyArray<Task>;

export const parseValue = (input: string | null): Value | null | "invalidValue" => {
  if (input === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(input);

    return isValidValue(parsed) ? parsed : "invalidValue";
  }
  catch (e) {
    return "invalidValue";
  }
};

const isValidValue = (value: unknown): value is Value =>
  Array.isArray(value) && value.every(isValidTask);

const isValidTask = (value: unknown): value is Task =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Task).id === "string" &&
  typeof (value as Task).text === "string" &&
  typeof (value as Task).done === "boolean";

// The element only ever reports a non-null value to Kontent.ai once every task is done.
// That is what lets the "Required" validation on this element gate publishing.
export const isFulfilled = (tasks: Value): boolean =>
  tasks.length > 0 && tasks.every(task => task.done);
