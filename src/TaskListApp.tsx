import { useCallback, useEffect, useState } from "react";
import { useEnvironmentId, useIsDisabled, useItemInfo, useValue, useVariantInfo } from "./customElement/CustomElementContext";
import { Value, isFulfilled } from "./customElement/value";
import "./TaskListApp.css";

export const TaskListApp = () => {
  const [value, setValue] = useValue();
  const isDisabled = useIsDisabled();
  const environmentId = useEnvironmentId();
  const item = useItemInfo();
  const variant = useVariantInfo();
  const [newTaskText, setNewTaskText] = useState("");

  // The element's real value is only ever non-null once every task is checked off (see setTasks
  // below), so a not-yet-finished checklist can't be read back from it after a page reload. To
  // survive that, the working list is also cached in this browser via localStorage.
  const draftKey = `kontent-tasklist-draft:${environmentId}:${item.id}:${variant.id}`;
  const [tasks, setTasksState] = useState<Value>(() => value ?? readDraft(draftKey) ?? []);

  // If Kontent.ai hands us a fresh non-null value (e.g. the item was loaded with an already
  // completed checklist), let it take over as the source of truth.
  useEffect(() => {
    if (value !== null) {
      setTasksState(value);
    }
  }, [value]);

  const setTasks = useCallback((next: Value) => {
    setTasksState(next);
    writeDraft(draftKey, next);
    setValue(isFulfilled(next) ? next : null);
  }, [draftKey, setValue]);

  const addTask = () => {
    const text = newTaskText.trim();
    if (!text) {
      return;
    }
    setTasks([...tasks, { id: crypto.randomUUID(), text, done: false }]);
    setNewTaskText("");
  };

  const removeTask = (id: string) => setTasks(tasks.filter(task => task.id !== id));

  const toggleTask = (id: string) =>
    setTasks(tasks.map(task => task.id === id ? { ...task, done: !task.done } : task));

  const doneCount = tasks.filter(task => task.done).length;
  const complete = isFulfilled(tasks);

  return (
    <div className="task-list">
      <p className={`task-list__status ${complete ? "task-list__status--complete" : "task-list__status--incomplete"}`}>
        {tasks.length === 0
          ? "Add at least one task. This item can't be published until all tasks are checked off."
          : complete
            ? `All ${tasks.length} task${tasks.length === 1 ? "" : "s"} done — this item can be published.`
            : `${doneCount} / ${tasks.length} tasks done — finish them all before publishing.`}
      </p>

      {tasks.length > 0 && (
        <ul className="task-list__items">
          {tasks.map(task => (
            <li key={task.id} className="task-list__item">
              <label className="task-list__label">
                <input
                  type="checkbox"
                  checked={task.done}
                  disabled={isDisabled}
                  onChange={() => toggleTask(task.id)}
                />
                <span className={task.done ? "task-list__text task-list__text--done" : "task-list__text"}>
                  {task.text}
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
    </div>
  );
};

TaskListApp.displayName = "TaskListApp";

const readDraft = (key: string): Value | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as Value : null;
  }
  catch (e) {
    return null;
  }
};

const writeDraft = (key: string, tasks: Value) => {
  try {
    localStorage.setItem(key, JSON.stringify(tasks));
  }
  catch (e) {
    // ignore storage errors (e.g. private browsing mode or quota exceeded) - the task list still
    // works for the current session, it just won't survive a reload in that case
  }
};
