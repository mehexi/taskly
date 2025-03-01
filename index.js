import todo from "./lib/todo.js";
import inquirer from "inquirer";

const main = async () => {
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

    case "exit":
      console.log("Goodbye");
      process.exit(0);

    default:
      break;
  }
};

// triggire the cli
main();
