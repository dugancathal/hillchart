import {genRandomId, randomColor} from "./util.mjs";

export const buildTask = (overrides = {}) => {
  const id = genRandomId();
  const color = randomColor();
  return Object.assign({
    id,
    label: `Task ${id}`,
    color,
    x: 0,
    y: 0,
    completed: false,
  }, overrides);
}

let locallyCachedTasks = [];

export const getTasks = async () => {
  return new Promise((res) => {
      if (locallyCachedTasks.length === 0) {
        const tasksJson = localStorage.getItem("tasks");
        if (tasksJson) {
          locallyCachedTasks = JSON.parse(tasksJson);
        }
      }
      return res(locallyCachedTasks);
    }
  )
}

const getTaskById = async (id) => (await getTasks()).find(it => it.id === id)

export const saveTasks = async (tasks) => {
  return new Promise((res) => {
    locallyCachedTasks = tasks;
    localStorage.setItem("tasks", JSON.stringify(tasks));
    return res(true);
  });
};

export const saveTask = async (task) => {
  return new Promise((res) => {
    locallyCachedTasks.push(task);
    saveTasks(locallyCachedTasks);
    return res(true);
  })
}

export const updateTask = async (taskId, updates) => {
  return new Promise((res, rej) => {
    const taskIndex = locallyCachedTasks.findIndex(it => it.id === taskId);
    if (taskIndex === -1) {
      return rej(new Error(`Unable to find task with id: ${taskId}`));
    }
    const task = locallyCachedTasks[taskIndex];
    const updated = Object.assign(task, updates);
    saveTasks([
      ...locallyCachedTasks.slice(0, taskIndex),
      updated,
      ...locallyCachedTasks.slice(taskIndex + 1)
    ]);
    return res(true);
  })
}

export const toggleTaskAttribute = async (taskId, attribute) => {
  const task = await getTaskById(taskId);
  if (!task) return false;

  const newValue = !task[attribute];
  await updateTask(taskId, {[attribute]: newValue});
  return newValue;
}

export const removeTaskById = async (taskId) => {
  return new Promise((res) => {
    locallyCachedTasks = locallyCachedTasks.filter(it => it.id !== taskId);
    saveTasks(locallyCachedTasks);
    res();
  })
}
