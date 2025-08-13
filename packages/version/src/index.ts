#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import figlet from "figlet";
import packageJson from "../package.json";
import { initCommand } from "./init-command";
import { helpCommand } from "./help-command";
import { defaultCommand } from "./default-command";

const name = "Turboversion";

function showBanner() {
  console.log(
    chalk.hex("#FF1F57")(figlet.textSync(name)),
    chalk.hex("#0096FF")(
      `\n https://turboversion.juciano.com                     `
    ),
    chalk.hex("#0096FF")(`v${packageJson.version}\n`)
  );
}

async function main() {
  const program = new Command();

  program
    .name(name.toLowerCase())
    .description(
      "The smart, automated versioning tool for monorepos and single-package projects"
    )
    .version(packageJson.version)
    .hook("preAction", showBanner)
    .addCommand(initCommand())
    .addCommand(helpCommand());

  defaultCommand(program);
  await program.parseAsync();
}

main().catch((err) => {
  console.error(chalk.red("Error:"), err);
  process.exit(1);
});

/**
 * CLI Commands:
 * turboversion init -> initialize turboversion in the project
 * turboversion help -> show help
 * turboversion --version -> show version
 */
