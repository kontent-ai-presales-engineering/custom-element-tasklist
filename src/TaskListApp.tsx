import { useEffect, useMemo, useState } from "react";
import { useEnvironmentId, useIsDisabled, useItemInfo, useValue, useVariantInfo } from "./customElement/CustomElementContext";
import { Task, TaskEvent, TaskEventType, Value, activeTasks, isFulfilled, parseValue, serializeValue } from "./customElement/value";
import "./TaskListApp.css";

export const TaskListApp = () => {
  const [rawValue, setRawValue] = useValue();
  const isDisabled = useIsDisabled();
  const environmentId = useEnvironmentId();
  const item = useItemInfo();
  const variant = useVariantInfo();
  const [newTaskText, setNewTaskText] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Every change is written to the element's value (including removed tasks as tombstones), so each
  // Kontent.ai version of the item holds the task list and its history as they were at that time.
  const tasks = useMemo(() => {
    const parsed = parseValue(rawValue);
    if (parsed === "invalidValue") {
      console.warn(`Custom element received invalid value "${rawValue}". Treating it as an empty task list.`);
      return [];
    }
    return parsed ?? [];
  }, [rawValue]);

  const setTasks = (next: Value) => setRawValue(serializeValue(next));

  // Earlier versions of this element only stored the list once it was complete and kept unfinished
  // lists in localStorage. Move such a draft into the real value the first time it's opened for editing.
  useEffect(() => {
    const legacyDraftKey = `kontent-tasklist-draft:${environmentId}:${item.id}:${variant.id}`;
    if (rawValue !== null || isDisabled) {
      return;
    }
    const draft = readLegacyDraft(legacyDraftKey);
    if (draft && draft.length > 0) {
      setTasks(draft);
    }
    removeLegacyDraft(legacyDraftKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTask = () => {
    const text = newTaskText.trim();
    if (!text) {
      return;
    }
    setTasks([...tasks, { id: crypto.randomUUID(), text, done: false, removed: false, events: [createEvent("added")] }]);
    setNewTaskText("");
  };

  const removeTask = (id: string) =>
    setTasks(tasks.map(task => task.id === id ? { ...task, removed: true, events: [...task.events, createEvent("removed")] } : task));

  const toggleTask = (id: string) =>
    setTasks(tasks.map(task => task.id === id
      ? { ...task, done: !task.done, events: [...task.events, createEvent(task.done ? "reopened" : "completed")] }
      : task));

  const visibleTasks = activeTasks(tasks);
  const doneCount = visibleTasks.filter(task => task.done).length;
  const complete = isFulfilled(tasks);
  const history = collectHistory(tasks);

  return (
    <div className="task-list">
      <p className={`task-list__status ${complete ? "task-list__status--complete" : "task-list__status--incomplete"}`}>
        {visibleTasks.length === 0
          ? "No tasks added — this item can be published."
          : complete
            ? `All ${visibleTasks.length} task${visibleTasks.length === 1 ? "" : "s"} done — this item can be published.`
            : `${doneCount} / ${visibleTasks.length} tasks done — finish them all before publishing.`}
      </p>

      {visibleTasks.length > 0 && (
        <ul className="task-list__items">
          {visibleTasks.map(task => (
            <li key={task.id} className="task-list__item">
              <label className="task-list__label">
                <input
                  type="checkbox"
                  checked={task.done}
                  disabled={isDisabled}
                  onChange={() => toggleTask(task.id)}
                />
                <span className="task-list__content">
                  <span className={task.done ? "task-list__text task-list__text--done" : "task-list__text"}>
                    {task.text}
                  </span>
                  <TaskMeta task={task} />
                </span>
              </label>
              <button
                type="button"
                className="task-list__remove"
                disabled={isDisabled}
                onClick={() => removeTask(task.id)}
                aria-label={`Remove task "${task.text}"`}
                title="Remove task"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="task-list__add"
        onSubmit={e => {
          e.preventDefault();
          addTask();
        }}
      >
        <input
          type="text"
          className="task-list__add-input"
          placeholder="Add a new task…"
          value={newTaskText}
          disabled={isDisabled}
          onChange={e => setNewTaskText(e.target.value)}
        />
        <button type="submit" className="task-list__add-button" disabled={isDisabled || !newTaskText.trim()}>
          Add
        </button>
      </form>

      {history.length > 0 && (
        <div className="task-list__history">
          <button
            type="button"
            className="task-list__history-toggle"
            aria-expanded={showHistory}
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? "Hide history" : `Show history (${history.length})`}
          </button>
          {showHistory && (
            <ol className="task-list__history-items">
              {history.map(entry => (
                <li key={`${entry.task.id}-${entry.index}`} className="task-list__history-item">
                  <time className="task-list__history-time" dateTime={entry.event.at}>{formatTime(entry.event.at)}</time>
                  <span>
                    {eventLabels[entry.event.type]} <q className="task-list__history-task">{entry.task.text}</q>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="task-list__history-note">
            To see who made a change, use Version history in Kontent.ai and hover over the highlighted change.
          </p>
        </div>
      )}
    </div>
  );
};

TaskListApp.displayName = "TaskListApp";

const TaskMeta = ({ task }: Readonly<{ task: Task }>) => {
  const added = lastEvent(task, "added");
  const completed = task.done ? lastEvent(task, "completed") : undefined;
  if (!added && !completed) {
    return null;
  }

  return (
    <span className="task-list__meta">
      {[
        added && `Added ${formatTime(added.at)}`,
        completed && `Completed ${formatTime(completed.at)}`,
      ].filter(Boolean).join(" · ")}
    </span>
  );
};

const eventLabels: Readonly<Record<TaskEventType, string>> = {
  added: "Added",
  completed: "Completed",
  reopened: "Reopened",
  removed: "Removed",
};

const createEvent = (type: TaskEventType): TaskEvent => ({ type, at: new Date().toISOString() });

const lastEvent = (task: Task, type: TaskEventType): TaskEvent | undefined =>
  [...task.events].reverse().find(event => event.type === type);

// All events of all tasks (removed ones included), newest first.
const collectHistory = (tasks: Value) =>
  tasks
    .flatMap(task => task.events.map((event, index) => ({ task, event, index })))
    .sort((a, b) => b.event.at.localeCompare(a.event.at));

const timeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? iso : timeFormat.format(date);
};

const readLegacyDraft = (key: string): Value | null => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? parseValue(raw) : null;
    return parsed === "invalidValue" ? null : parsed;
  }
  catch (e) {
    return null;
  }
};

const removeLegacyDraft = (key: string) => {
  try {
    localStorage.removeItem(key);
  }
  catch (e) {
    // ignore storage errors (e.g. private browsing mode)
  }
};
