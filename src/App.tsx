import { useConfig } from "./customElement/CustomElementContext";
import { PublishGateApp } from "./PublishGateApp";
import { TaskListApp } from "./TaskListApp";

// The same hosted code serves both elements; the element's JSON configuration picks the mode:
//   task list (default):  no configuration needed
//   publish gate:         { "mode": "gate", "taskListElement": "<codename of the task list element>" }
export const App = () => {
  const config = useConfig();

  if (config?.mode !== "gate") {
    return <TaskListApp />;
  }

  if (typeof config.taskListElement !== "string" || !config.taskListElement) {
    return (
      <p className="task-list task-list__status task-list__status--incomplete">
        Configuration error: set "taskListElement" to the codename of the task list element.
      </p>
    );
  }

  return <PublishGateApp taskListElement={config.taskListElement} />;
};

App.displayName = "App";
