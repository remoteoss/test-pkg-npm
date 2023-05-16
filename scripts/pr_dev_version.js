const fs = require("fs");

function init() {
  const packageJson = fs.readFileSync("./package.json", "utf8");
  const { version } = JSON.parse(packageJson);

  if (version.includes(".dev-")) {
    console.error(
      'This PR cannot be merged because the package.json version contains ".dev-". Please revert to the original version and try again.'
    );
    process.exit(1);
  }

  console.log(`Package version ${version} is valid. Continuing...`);
}

init();
