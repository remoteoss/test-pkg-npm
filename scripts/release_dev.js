const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { exec } = require("child_process");

const packageJsonPath = path.resolve(__dirname, "../package.json");
const packageJson = require(packageJsonPath);

function getDateYyyyMMDDHHMMSS() {
  function pad2(n) {
    // always returns a string
    return (n < 10 ? "0" : "") + n;
  }
  const date = new Date();
  return (
    date.getFullYear() +
    pad2(date.getMonth() + 1) +
    pad2(date.getDate()) +
    pad2(date.getHours()) +
    pad2(date.getMinutes()) +
    pad2(date.getSeconds())
  );
}

const currentDate = getDateYyyyMMDDHHMMSS();

function askForConfirmation({ onYes, onNo }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Do you want to proceed with publishing it? (Y/n) ", (answer) => {
    const normalizedAnswer = answer.trim().toLowerCase();

    if (normalizedAnswer === "y" || normalizedAnswer === "yes") {
      console.log("Confirmed! Proceeding...");
      onYes();
    } else if (normalizedAnswer === "n" || normalizedAnswer === "no") {
      console.log("Cancelled. Exiting...");
      onNo();
      // Handle cancellation or exit the script as needed
    } else {
      console.log("Invalid input. Please enter Y or n.");
      askForConfirmation();
    }

    rl.close();
  });
}

function init() {
  console.log(":: Current version:", packageJson.version);

  let newVersion;
  // An existing dev version already exists
  if (packageJson.version.includes("-dev.")) {
    console.log("Bumping the dev version...");
    newVersion = packageJson.version.replace(
      /-dev.\d{14}$/,
      `-dev.${currentDate}`
    );
  } else {
    console.log("Creating a new dev version...");
    const [major, minor, patch] = packageJson.version.split(".");
    const newPatch = Number(patch) + 1;
    newVersion = `${major}.${minor}.${newPatch}-dev.${currentDate}`;
  }

  // Creating the new version
  const cmd = `npm version --no-git-tag-version ${newVersion}`;
  exec(cmd, (error, stdout, stderr) => {
    console.log(`Exec: ${cmd}`);
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log("New version:", stdout);

    askForConfirmation({
      onYes: () => commit({ newVersion }),
      onNo: () => console.log("Okay, aborted."),
    });
  });
}

function commit({ newVersion }) {
  const cmd = `git add package.json package-lock.json && git commit -m "Publish ${newVersion}"`;
  exec(cmd, (error, stdout, stderr) => {
    console.log(`Exec: ${cmd}`);
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
  });
}

init();
