const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { exec } = require("child_process");

const packageJsonPath = path.resolve(__dirname, "../package.json");
const packageJson = require(packageJsonPath);

const versionType = process.argv.slice(2)[0];
const isVersionType = (type) => versionType === type;

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

function askForConfirmation({ question, onYes, onNo }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question(`${question} (Y/n)`, (answer) => {
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

function checkVersionType() {
  if (!["minor", "patch"].includes(versionType)) {
    console.log(
      `🚨 Increment type argument "${versionType}" is invalid or missing. Make sure to run the script through package.json.`
    );
    process.exit();
  }
}

function getNewVersion() {
  if (packageJson.version.includes("-dev.")) {
    console.log("Bumping exisiting dev...");
    return packageJson.version.replace(/-dev.\d{14}$/, `-dev.${currentDate}`);
  }

  console.log("Creating a new dev...");
  const [_, major, minor, patch, prefix] = packageJson.version.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?/
  );
  // @TODO-later support major.
  const newMinor = isVersionType("minor") ? Number(minor) + 1 : minor;
  const newPatch = isVersionType("patch") ? Number(patch) + 1 : 0;
  return `${major}.${newMinor}.${newPatch}-dev.${currentDate}`;
}

function bumpAndCommit({ newVersion }) {
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
    console.log(stdout);
    commit({ newVersion });
  });
}

function commit({ newVersion }) {
  console.log("Comitting new version...");
  const cmd = `git add package.json package-lock.json && git commit -m "Publish ${newVersion}" && echo "✅ All ready for dev publish. Run 'npm run release:publish'"`;
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }

    console.log(stdout);
  });
}

function init() {
  checkVersionType();

  const newVersion = getNewVersion();

  console.log(":: Current version:", packageJson.version);
  console.log(":::::: New version:", newVersion);

  askForConfirmation({
    question: "Ready to commit and publish it?",
    onYes: () => bumpAndCommit({ newVersion }),
    onNo: () => console.log("Okay, aborted."),
  });
}

init();
