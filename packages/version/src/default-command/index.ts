#!/usr/bin/env node

import { exit } from "node:process";
import chalk from "chalk";
import { Command, Option } from "commander";
import { syncedMode } from "./sync-mode";
import { singleMode } from "./single-mode";
import { asyncMode } from "./async-mode";
import { loadConfig } from "../load-config";
import { logger } from "../utils/logger";
import packageJson from "../../package.json";

type BumpOption =
  | "patch"
  | "minor"
  | "major"
  | "premajor"
  | "preminor"
  | "prepatch"
  | "prerelease";
type CommandOptions = {
  target?: string;
  bump?: BumpOption;
  sync?: boolean;
  async?: boolean;
  config?: string;
  version?: boolean;
  prerelease?: boolean;
};

export function defaultCommand(program: Command): Command {
  return program
    .option(
      "-t, --target <project>",
      "Specific project to version (ignored in sync mode or single project mode)"
    )
    .addOption(
      new Option("--bump <type>", "Specify version bump type")
        .choices([
          "patch",
          "minor",
          "major",
          "premajor",
          "preminor",
          "prepatch",
          "prerelease",
        ])
        .makeOptionMandatory(false)
    )
    .option(
      "-s, --sync",
      "Sync all projects to the same version (ignored in async mode)"
    )
    .option(
      "-a, --async",
      "Run the command asynchronously (ignored in sync mode)"
    )
    .option(
      "-p, --prerelease",
      "Create prerelease version using commit-detected bump type (e.g., feat commit -> preminor)"
    )
    .option(
      "-c, --config <path>",
      "Path to the configuration file (default: version.config.json in the current directory)"
    )
    .option("-v, --version", "Show version of the tool")
    .addHelpText(
      "after",
      `\nExamples:
  ${chalk.cyan("$ turbo bump")}
  ${chalk.cyan("$ turbo bump --bump minor")}
  ${chalk.cyan("$ turbo bump --target frontend")}`
    )
    .action(async (options: CommandOptions) => {
      try {
        const config = await loadConfig(options.config);
        const isSync = options.sync || config.sync;

        if (options.version) {
          logger.info({
            message: "Turboversion version",
            details: `Version: ${packageJson.version}`,
          });
          exit(0);
        }

        if (isSync && options.target) {
          console.log(
            chalk.yellow.bold("⚠ Warning:") +
              chalk.yellow(
                " Target option ignored in sync mode. All projects will be versioned together."
              )
          );
        }

        if (isSync) {
          await syncedMode(config, options.bump, options.prerelease);
        } else if (options.bump && options.target) {
          await singleMode(config, options);
        } else {
          await asyncMode(config, options.bump, options.prerelease);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          chalk.red.bold("✖ Error:") + " " + chalk.red(errorMessage)
        );
        exit(1);
      }
    });
}

/**
 * CLI Commands:
 * turboversion -> bump automatic versison based on conventional commits or branch
 * turboversion --type/-t major/minor/patch/premajor/preminor/prepatch/prerelease -> bump version manually
 * turboversion --bump/-p\b <package-name> -> bump version of a specific package in a monorepo
 * turboversion --sync/-s -> sync versions of all packages in a monorepo to the same version
 * turboversion --async/-a -> run the command asynchronously
 * turboversion --config/-c <path-to-config-file> -> specify a custom config file
 */
