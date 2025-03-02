import dayjs from "dayjs";
import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const now = dayjs();
const today = now.format("YYYY-MM-DD");

const getStatusColor = (status) => {
  switch (status) {
    case "pending":
      return chalk.yellow(status);
    case "done":
      return chalk.green(status);
    case "in-progress":
      return chalk.blue(status);
    default:
      return chalk.white(status);
  }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tasksFilePath = path.join(__dirname, "tasks.json");

const readTasks = () => {
  if (!fs.existsSync(tasksFilePath)) {
    fs.writeFileSync(tasksFilePath, JSON.stringify([], null, 2)); // ✅ Ensure the file starts as an empty array
  }
  try {
    const data = fs.readFileSync(tasksFilePath, "utf8").trim(); // Remove unwanted spaces
    return data ? JSON.parse(data) : []; // ✅ Ensure valid JSON or return an empty array
  } catch (error) {
    console.error("Error reading tasks.json:", error.message);
    return []; // ✅ Return empty array instead of crashing
  }
};

const writeTasks = (tasks) => {
  fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
};

const addTask = async () => {
  const { task, priority, lastDay } = await inquirer.prompt([
    { type: "input", name: "task", message: "Enter a new task:" },
    {
      type: "list",
      name: "priority",
      message: "Select Priority:",
      choices: ["low", "medium", "high"],
    },
    {
      type: "input",
      name: "lastDay",
      message: `Enter the deadline (YYYY-MM-DD HH:mm) (Now: ${now.format("YYYY-MM-DD HH:mm")}):`,
      validate: (input) => {
        if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(input)) {
          return "Enter a valid datetime in YYYY-MM-DD HH:mm format";
        }
        const enteredTime = dayjs(input, "YYYY-MM-DD HH:mm");
        if (!enteredTime.isValid()) {
          return "Invalid date or time!";
        }
        if (enteredTime.isBefore(now)) {
          return "Deadline cannot be in the past!";
        }
        return true;
      },
    },
  ]);

  const tasks = readTasks();
  const newTask = {
    id: tasks.length + 1,
    time: Date.now(),
    task,
    status: "pending",
    priority,
    lastDay,
  };
  tasks.push(newTask);
  writeTasks(tasks);

  console.log(
    chalk.yellow(
      `Task "${chalk.green(task)}" added with ${chalk[priority] ? chalk[priority](priority) : chalk.green(priority)} priority!`,
    ),
  );
};

const listTask = async () => {
  console.table(readTasks());
};

const markAsDone = async () => {
  const tasks = readTasks();

  if (tasks.length === 0) {
    console.log(chalk.red("No tasks Available to Mark As Done"));
    return;
  }

  const { taskId } = await inquirer.prompt([
    {
      type: "list",
      name: "taskId",
      message: "Select Task to mark As done",
      choices: tasks.map((task) => ({
        name: `${task.task} (${getStatusColor(task.status)}) `,
        value: task.id,
      })),
    },
  ]);

  const taskIndex = tasks.findIndex((task) => task.id === taskId);
  if (taskIndex !== -1) {
    tasks[taskIndex].status = "done";
    writeTasks(tasks);
    console.log(chalk.green(`Task "${tasks[taskIndex].task}" marked as done`));
  } else {
    console.log(chalk.red("Task not Found"));
  }
};

const deleteTasks = async () => {
  const tasks = readTasks();

  if (tasks.length === 0) {
    console.log("No tasks available for deletion.");
    return;
  }

  const { taskId } = await inquirer.prompt([
    {
      type: "list",
      name: "taskId",
      message: "Select a task to delete",
      choices: tasks.map((task) => ({
        name: `${task.task} (${getStatusColor(task.status)})`,
        value: task.id,
      })),
    },
  ]);

  const deleteTask = tasks.find((task) => task.id === taskId);

  if (!deleteTask) {
    console.log("Task not found.");
    return;
  }

  const updatedTasks = tasks.filter((item) => item.id !== taskId);
  writeTasks(updatedTasks);

  console.log(
    `${deleteTask.task} with the Priority of (${getStatusColor(deleteTask.status)}) has been deleted.`,
  );
};

export default async function todo() {
  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "Todo Options",
      choices: [
        "Add a Task",
        "list Tasks",
        "Mark As Done",
        "Delete Tasks",
        "Priority Tasks",
        "Search And Filters",
      ],
    },
  ]);

  switch (choice) {
    case "Add a Task":
      await addTask();
      break;
    case "list Tasks":
      await listTask();
      break;
    case "Mark As Done":
      await markAsDone();
      break;
    case "Delete Tasks":
      await deleteTasks();
      break;
    default:
      break;
  }
}
