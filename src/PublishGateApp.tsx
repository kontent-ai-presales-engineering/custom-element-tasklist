import { useEffect, useState } from "react";
import { useIsDisabled, useValue } from "./customElement/CustomElementContext";
import { activeTasks, isFulfilled, parseValue } from "./customElement/value";
import "./TaskListApp.css";

type Props = Readonly<{
  taskListElement: string;
}>;

// A companion element marked as Required in the content type. It reads the task list element and
// only holds a value while every task is done, which is what blocks publishing. Keeping this in a
// separate element lets the task list itself always store its full state (and so show up in
// version history).
export const PublishGateApp = ({ taskListElement }: Props) => {
  const [value, setValue] = useValue();
  const isDisabled = useIsDisabled();
  // `undefined` until the task list's value has been read for the first time
  const [taskListValue, setTaskListValue] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const read = () =>
      CustomElement.getElementValue(taskListElement, v => setTaskListValue(typeof v === "string" && v !== "" ? v : null));

    read();
    CustomElement.observeElementChanges([taskListElement], read);
  }, [taskListElement]);

  const parsed = taskListValue === undefined ? undefined : parseValue(taskListValue);
  // An unreadable task list blocks publishing rather than silently allowing it.
  const tasks = parsed === undefined || parsed === "invalidValue" ? null : parsed ?? [];
  const fulfilled = tasks !== null && isFulfilled(tasks);
  const openCount = tasks === null ? 0 : activeTasks(tasks).filter(task => !task.done).length;

  useEffect(() => {
    if (parsed === undefined || isDisabled) {
      return;
    }
    const desired = fulfilled ? fulfilledValue : null;
    if (desired !== value) {
      setValue(desired);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed === undefined, fulfilled, isDisabled, value]);

  if (parsed === undefined) {
    return <p className="task-list">Checking tasks…</p>;
  }

  return (
    <div className="task-list">
      <p className={`task-list__status task-list__status--compact ${fulfilled ? "task-list__status--complete" : "task-list__status--incomplete"}`}>
        {parsed === "invalidValue"
          ? "The task list couldn't be read, so publishing is blocked."
          : fulfilled
            ? "All tasks done — this item can be published."
            : `${openCount} open task${openCount === 1 ? "" : "s"} — finish ${openCount === 1 ? "it" : "them"} before publishing.`}
      </p>
    </div>
  );
};

PublishGateApp.displayName = "PublishGateApp";

const fulfilledValue = "All tasks done";
