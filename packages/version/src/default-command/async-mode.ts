import { exit } from "node:process";
import type { ReleaseType } from "semver";
import { formatTag, formatTagPrefix } from "../utils/format-tag";
import { generateChangelog } from "../utils/generate-changelog";
import { generateVersion } from "../utils/generate-version";
import { generateVersionByBranchPattern } from "../utils/generate-version-by-branch-pattern";
import { getLatestTag } from "../utils/get-latest-tag";
import { formatCommitMessage } from "../utils/template-string";
import { updatePackageVersion } from "../utils/update-package-version";
import { summarizePackages } from "../utils/dependents";
import { gitProcess } from "../utils/git";
import { logger } from "../utils/logger";
import { ConfigType } from "../config-schema";

export async function asyncMode(config: ConfigType, type?: ReleaseType) {
  const { preset, baseBranch, branchPattern = [] } = config;

  try {
    const packages = await summarizePackages(config);

    if (packages.length === 0) {
      return logger.noChanges({
        message: "There are no changes since last release.",
      });
    }

    logger.tag({
      message: `Working on package(s)`,
      details: packages.map((pkg) => pkg.packageJson.name).join(", "),
    });
    for (const pkg of packages) {
      const name = pkg.packageJson.name;
      const path = pkg.relativeDir;

      if (config.skip?.some((p) => p === pkg.packageJson.name)) {
        logger.skip({ message: "Skipped", packageName: name });
      } else {
        const tagPrefix = formatTagPrefix({
          tagPrefix: config.tagPrefix,
          name,
          sync: Boolean(config.sync),
        });
        const latestTag = await getLatestTag(tagPrefix);

        let version: string | null = null;

        if (config.versionStrategy === "branchPattern") {
          version = await generateVersionByBranchPattern({
            latestTag,
            tagPrefix,
            type: type ?? (pkg.type as ReleaseType),
            path,
            branchPattern,
            baseBranch,
            prereleaseIdentifier: config.prereleaseIdentifier,
          });
        } else {
          version = await generateVersion({
            latestTag,
            preset,
            tagPrefix,
            type: type ?? (pkg.type as ReleaseType),
            path,
            name,
            prereleaseIdentifier: config.prereleaseIdentifier,
          });
        }

        if (version) {
          logger.new({
            message: `New version calculated ${version}`,
            details: name,
          });
          const nextTag = formatTag({ tagPrefix, version });
          await updatePackageVersion({ path, version, name });
          logger.paper({
            message: `Package version updated ${version}`,
            details: name,
          });

          await generateChangelog({
            tagPrefix,
            preset,
            path,
            version,
            name,
          });

          logger.list({
            message: "Changelog generated",
            details: name,
          });

          const commitMessage = formatCommitMessage({
            commitMessage: config.commitMessage,
            version,
            name,
          });

          await gitProcess({
            files: [`${path}/package.json`, `${path}/CHANGELOG.md`],
            nextTag,
            commitMessage,
            skipHooks: config.skipHooks,
          });

          logger.tag({
            message: `Git Tag generated for ${nextTag} successfully`,
            details: name,
          });
        } else {
          logger.noChanges({
            message: "No changes detected since last version",
            packageName: name,
          });
        }
      }
    }
  } catch (err: any) {
    logger.error({ message: "An error occurred", details: err.message });
    exit(1);
  }
}
