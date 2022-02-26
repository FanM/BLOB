"use strict";
const { execSync } = require("child_process");

function run(command) {
  console.log(command);
  const result = execSync(command, { stdio: "inherit" });
  if (result != null) {
    console.log(result.toString());
  }
}

exports.handler = async (event) => {
  console.log("BLOB cron task handler called");

  if (!event.Records) {
    console.log("No commands received");
    return;
  }

  for (const record of event.Records) {
    const cmdName = record.name;
    const cmd = record.cmd;
    console.log(cmdName);
    run(cmd);
  }
};
