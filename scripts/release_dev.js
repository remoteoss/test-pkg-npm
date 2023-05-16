const path = require("path");
const {
  askForConfirmation,
  askForText,
  runExec,
  checkGitStatus,
} = require("./release.helpers");

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

async function bumpVersion({ newVersion }) {
  const cmd = `npm version --no-git-tag-version ${newVersion}`;
  await runExec(cmd);
}

async function commit({ newVersion }) {
  console.log("Comitting new version...");
  const cmd = `git add package.json package-lock.json && git commit -m "Prerelease ${newVersion}"`; // && git push
  await runExec(cmd);
}

async function publish({ newVersion }) {
  console.log("Publishing new version...");

  const otp = await askForText("🔐 What is the NPM Auth OTP? (Check 1PW) ");
  /*
    --access=public
      By default, NPM treats packages with workspace (@remoteoss) as private. This forces it to be public
    --tag=dev 
      VERY IMPORTANT: Having a tag tells NPM that this is not a "stable" version,
      otherwise it will be automatically installed by anyone doing "npm install <package-name>".
      This forces the devs to be precise in the version with "npm install <package-name>@x.x.x-dev.xxxxx"
      Know more at: https://stackoverflow.com/a/48038690/4737729
  */
  const cmd = `npm publish --access=public --tag=dev --otp=${otp}`;
  try {
    await runExec(cmd);
    console.log(`🎉 Version ${newVersion} published!"`);
  } catch {
    console.log("You may want to revert the commit using 'git reset HEAD~1'.");
  }
}

async function init() {
  // await checkGitStatus();

  const newVersion = getNewVersion();

  console.log(":: Current version:", packageJson.version);
  console.log(":::::: New version:", newVersion);

  const answer = await askForConfirmation("Ready to commit and publish it?");

  if (answer === "no") {
    process.exit();
  }

  await bumpVersion({ newVersion });
  await commit({ newVersion });
  await publish({ newVersion });
}

init();
