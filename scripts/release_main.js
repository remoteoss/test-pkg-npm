const path = require("path");
const semver = require("semver");
const {
  askForConfirmation,
  askForText,
  runExec,
} = require("./release.helpers");

const packageJsonPath = path.resolve(__dirname, "../package.json");
const packageJson = require(packageJsonPath);

async function checkGitStatus() {
  const output = await runExec("git status --porcelain").toString().trim();
  if (!!output) {
    console.error(
      "🟠 There are unstaged git files. Please commit or revert them and try again."
    );
    process.exit();
  }
}

function getNewVersion() {
  const currentVersion = packageJson.version;

  // TODO later - get the right version based on commit history.
  const versionType = process.argv.slice(2)[0];
  const versionBase = semver.coerce(currentVersion);
  return semver.inc(versionBase, versionType) + "-beta.0";
}

async function bumpVersion({ newVersion }) {
  const cmd = `npm version --no-git-tag-version ${newVersion}`;
  await runExec(cmd);
}

async function updateChangelog({ newVersion }) {
  console.log("Updating changelog...");
  const cmd = `npx generate-changelog`;
  await runExec(cmd);
}

async function commit({ newVersion }) {
  console.log("Comitting new version...");
  const cmd = `git add package.json package-lock.json CHANGELOG.md && git commit -m "Release ${newVersion}" && git tag v${newVersion}`;
  await runExec(cmd);
}

async function publish({ newVersion }) {
  console.log("Publishing new version...");

  const otp = await askForText("🔐 What is the NPM Auth OTP? (Check 1PW) ");
  /*
    --access=public
      By default, NPM treats packages with workspace (@remoteoss) as private. This forces it to be public
    --tag=latest 
      VERY IMPORTANT: This tag tells NPM that although beta this is our "latest" version,
      This way when devs install the package, it will consider this beta the stable one.
  */
  const cmd = `npm publish --access=public --tag=latest --otp=${otp}`;
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

  const answerVersion = await askForConfirmation("Is this version correct?");

  if (answerVersion === "no") {
    process.exit();
  }

  await bumpVersion({ newVersion });
  await updateChangelog({ newVersion });

  const answerChangelog = await askForConfirmation(
    "Changelog is updated. You may tweak it as needed. Once ready, press Y to continue."
  );

  if (answerChangelog === "no") {
    console.log("You may want to revert the changed files!");
    process.exit();
  }

  await commit({ newVersion });
  await publish({ newVersion });
}

init();
