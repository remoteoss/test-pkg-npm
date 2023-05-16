const readline = require("node:readline/promises");
const { exec } = require("child-process-promise");

async function checkGitStatus() {
  const output = await runExec("git status --porcelain").toString().trim();
  if (!!output) {
    console.error(
      "🟠 There are unstaged git files. Please commit or revert them and try again."
    );
    process.exit();
  }
}

async function askForText(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

async function askForConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(`${question} (Y/n)`);
  const normalizedAnswer = answer.trim().toLowerCase();

  rl.close();

  if (normalizedAnswer === "y" || normalizedAnswer === "yes") {
    console.log("Confirmed! Proceeding...");
    return "yes";
  }
  if (normalizedAnswer === "n" || normalizedAnswer === "no") {
    console.log("Cancelled. Exiting...");
    return "no";
  }
  console.log("Invalid input. Please enter Y or n.");
  return askForConfirmation();
}

async function runExec(cmd) {
  console.log(`Exec: ${cmd}`);
  try {
    const result = await exec(cmd);
    if (result.stderr) {
      console.error(`stderr: ${result.stderr}`);
    }
    return result;
  } catch (e) {
    console.log("Error", e, e.stdout, e.stderr);
    throw e;
  }
}

module.exports = {
  checkGitStatus,
  askForText,
  askForConfirmation,
  runExec,
};
