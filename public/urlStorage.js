import {genRandomId, randomColor} from "./util.mjs";

/**
 * Creates a URL-safe string representation of task data that can be used for sharing
 * @param {Array} tasks - Array of task objects from getTasks
 * @returns {string} URL-safe string representation of the tasks
 */
export const createTaskDataUrl = (tasks) => {
  const tasksWithoutIds = tasks.map(task => ({...task, id: undefined}))
  const jsonString = JSON.stringify(tasksWithoutIds);

  return encodeURIComponent(btoa(decodeURIComponent(encodeURIComponent(jsonString))));
}

/**
 * Parses a URL-safe string representation created by createTaskDataUrl back into an array of tasks
 * @param {string} urlSafeString - URL-safe string representation of tasks
 * @returns {Array|null} Array of task objects or null if parsing fails
 */
export const tryParseTaskDataUrl = (urlSafeString) => {
  try {
    const jsonString = atob(decodeURIComponent(urlSafeString));

    // Parse the JSON string
    const tasks = JSON.parse(jsonString);

    // Verify the parsed data has the expected structure
    if (!Array.isArray(tasks)) {
      return null;
    }

    // Validate each task has the required properties
    return tasks.map(task => {
      // Ensure all necessary properties exist, use defaults if missing
      return {
        id: genRandomId(),
        label: task.label || 'Imported Task',
        color: task.color || randomColor(),
        x: typeof task.x === 'number' ? task.x : 0,
        y: typeof task.y === 'number' ? task.y : 0,
        completed: typeof task.completed === 'boolean' ? task.completed : false
      };
    });
  } catch (error) {
    console.warn('Failed to parse task data URL', error);
    return null;
  }
}

