#!/usr/bin/env node
import todo from "./lib/todo.js";
import inquirer from "inquirer";
import timeTracking from "./lib/timeTracking.js";

export const main = async () => {
  const args = process.argv.slice(2);
  if (args[0] === "todo") {
    await todo();
    return;
  }
  //choices propmpts
  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "What do you want to do",
      choices: ["todo", "Time tracking", "Notes", "clipboard Manager", "exit"],
    },
  ]);

  switch (choice) {
    case "todo":
      await todo();
      break;
    case "Time tracking":
      await timeTracking();
      break;

    case "exit":
      console.log("Goodbye");
      process.exit(0);

    default:
      break;
  }
};

// triggire the cli
main();
