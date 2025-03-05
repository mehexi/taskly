import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import os from "os";
import inquirer from "inquirer";

const homedir = os.homedir();
const dataDir = path.join(homedir, ".taskly");
const timelineFilePath = path.join(dataDir, "timeline.json");

// Ensure the data directory and tracking file exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(timelineFilePath)) {
  fs.writeFileSync(
    timelineFilePath,
    JSON.stringify({ active: null, log: [] }, null, 2),
  );
}

const readData = () => JSON.parse(fs.readFileSync(timelineFilePath));
const writeData = (data) =>
  fs.writeFileSync(timelineFilePath, JSON.stringify(data, null, 2));

const startTracking = async () => {
  const { project } = await inquirer.prompt([
    { type: "input", name: "project", message: "Enter project name:" },
  ]);

  const data = readData();
  if (data.active) {
    console.log(`Already tracking: ${data.active.project}`);
    return;
  }

  // Spawn a new background process that tracks time
  const child = spawn("node", [process.argv[1], "background", project], {
    detached: true,
    stdio: "ignore",
  });

  child.unref(); // Detach the process

  data.active = { project, startTime: Date.now(), pid: child.pid };
  writeData(data);

  console.log(`Tracking started for: ${project}`);
};

const stopTracking = () => {
  const data = readData();
  if (!data.active) {
    console.log("No active tracking session.");
    return;
  }

  const { pid } = data.active;

  try {
    process.kill(pid);
    console.log(`Tracking process ${pid} stopped.`);
  } catch (err) {
    if (err.code === "ESRCH") {
      console.log("Warning: Process not found. It may have already stopped.");
    } else {
      console.log("Error stopping process:", err);
      return;
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - data.active.startTime) / 1000).toFixed(2);

  data.log.push({
    project: data.active.project,
    startTime: data.active.startTime,
    endTime,
    duration: `${duration} sec`,
  });

  data.active = null;
  writeData(data);

  console.log(`Tracking stopped. Duration: ${duration} sec`);
};

const checkStatus = () => {
  const data = readData();
  if (!data.active) {
    console.log("No active tracking session.");
    return;
  }
  console.log(
    `Tracking: ${data.active.project} (since ${new Date(data.active.startTime).toLocaleTimeString()})`,
  );
};

const showLog = () => {
  const data = readData();
  if (data.log.length === 0) {
    console.log("No logs found.");
    return;
  }
  console.table(data.log);
};

const timeTracking = async () => {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Choose an action:",
      choices: [
        "Start Tracking",
        "Stop Tracking",
        "Check Status",
        "View Log",
        "Back",
      ],
    },
  ]);

  switch (action) {
    case "Start Tracking":
      await startTracking();
      break;
    case "Stop Tracking":
      stopTracking();
      break;
    case "Check Status":
      checkStatus();
      break;
    case "View Log":
      showLog();
      break;
    case "Back":
      return;
    default:
      console.log("Invalid option, please try again.");
  }

  await timeTracking(); // Loop back to menu
};

export default timeTracking;

// Background Process Logic (runs when `node timeTracking.js background <project>` is called)
if (process.argv[2] === "background") {
  const project = process.argv[3];
  if (!project) process.exit(1);

  const data = readData();
  data.active = { project, startTime: Date.now(), pid: process.pid };
  writeData(data);

  setInterval(() => {
    const trackingData = readData();
    trackingData.active.lastUpdate = Date.now();
    writeData(trackingData);
  }, 5000); // Update every 5 seconds
}
