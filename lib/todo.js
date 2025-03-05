import dayjs from "dayjs";
import Fuse from "fuse.js";
import { main } from "../index.js";
import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";

const now = dayjs();
const today = now.format("YYYY-MM-DD");

const getPriorityColor = (status) => {
  switch (status) {
    case "low":
      return chalk.green(status);
    case "medium":
      return chalk.yellow(status);
    case "high":
      return chalk.red(status);
  }
};

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

const homedir = os.homedir();
const dataDir = path.join(homedir, ".taskly");
const tasksFilePath = path.join(dataDir, "task.json");

const readTasks = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true }); // Create the directory if it doesn't exist
  }

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

const priorityTasks = async () => {
  const tasks = readTasks();

  if (tasks.length === 0) {
    console.log("No task Available");
    return;
  }

  const { taskId } = await inquirer.prompt([
    {
      type: "list",
      name: "taskId",
      message: "Select a task to change the Priority",
      choices: tasks.map((task) => ({
        name: `${task.task} - (${getPriorityColor(task.priority)})`,
        value: task.id,
      })),
    },
  ]);

  const { priority } = await inquirer.prompt([
    {
      type: "list",
      name: "priority",
      message: "Select Priority for The Task",
      choices: ["low", "medium", "high"],
    },
  ]);

  const selectedTask = tasks.find((task) => task.id === taskId);
  const updatedTasks = tasks.map((task) =>
    task.id === taskId ? { ...task, priority } : task,
  );
  writeTasks(updatedTasks);
  console.log(
    `${chalk.green(selectedTask.task)} priority has been updated to ${getPriorityColor(priority)}`,
  );
};

const searchFilters = async () => {
  const tasks = readTasks();
  if (tasks.length === 0) {
    console.log("No tasks available");
    return;
  }

  const { query } = await inquirer.prompt([
    {
      type: "input",
      name: "query",
      message: "Search your tasks : ",
    },
  ]);

  // Fuse.js options for fuzzy search
  const options = {
    keys: ["task", "status", "priority", "lastDay"], // Search across these fields
    threshold: 0.3, // Lower threshold = stricter match
    ignoreLocation: true, // Ignore location of matches (just content)
    findAllMatches: true, // Return all matches, not just the best match
  };

  // Initialize Fuse.js
  const fuse = new Fuse(tasks, options);

  // Search using Fuse.js
  const results = fuse.search(query);

  // If no results found
  if (results.length === 0) {
    console.log("No matching tasks found.");
  } else {
    // Show the filtered results in a table
    const filteredTasks = results.map((result) => result.item);
    console.table(filteredTasks);
  }
};

export default async function todo() {
  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "Todo Options",
      choices: [
        "📝 Add a Task",
        "📋 List Tasks",
        "✅ Mark As Done",
        "🗑️ Delete Tasks",
        "⚡ Priority Tasks",
        "🔍 Search And Filters",
        "exit",
      ],
    },
  ]);

  switch (choice) {
    case "📝 Add a Task":
      await addTask();
      break;
    case "📋 List Tasks":
      await listTask();
      break;
    case "✅ Mark As Done":
      await markAsDone();
      break;
    case "🗑️ Delete Tasks":
      await deleteTasks();
      break;
    case "⚡ Priority Tasks":
      await priorityTasks();
      break;
    case "🔍 Search And Filters":
      await searchFilters();
      break;
    case "exit":
      console.log("Good Bye");
      break;
    default:
      break;
  }
}
