import { cwd, exit } from "node:process";
import { getPackagesSync } from "@manypkg/get-packages";
import type { ReleaseType } from "semver";
import { formatTag, formatTagPrefix } from "../utils/format-tag";
import { generateChangelog } from "../utils/generate-changelog";
import { generateVersion } from "../utils/generate-version";
import { generateVersionByBranchPattern } from "../utils/generate-version-by-branch-pattern";
import { getLatestTag } from "../utils/get-latest-tag";
import { formatCommitMessage } from "../utils/template-string";
import { updatePackageVersion } from "../utils/update-package-version";
import { gitProcess } from "../utils/git";
import { logger } from "../utils/logger";
import { ConfigType } from "../config-schema";

export async function syncedMode(config: ConfigType, type?: ReleaseType, prerelease?: boolean) {
  try {
    const { preset, baseBranch, branchPattern = [] } = config;
    const { packages } = getPackagesSync(cwd());

    const tagPrefix = formatTagPrefix({
      sync: Boolean(config.sync),
    });

    const latestTag = await getLatestTag(tagPrefix);

    let version: string | null = null;
    if (config.versionStrategy === "branchPattern") {
      version = await generateVersionByBranchPattern({
        latestTag,
        tagPrefix,
        type,
        branchPattern,
        baseBranch,
        prereleaseIdentifier: config.prereleaseIdentifier,
      });
    } else {
      version = await generateVersion({
        latestTag,
        preset,
        tagPrefix,
        type,
        prereleaseIdentifier: config.prereleaseIdentifier,
        prerelease,
      });
    }

    if (typeof version === "string") {
      logger.new({
        message: `New version calculated ${version}`,
        packageName: "All",
      });
      const nextTag = formatTag({ tagPrefix, version });

      for (const pkg of packages) {
        const { name } = pkg.packageJson;
        const path = pkg.relativeDir;

        if (config.skip?.some((p) => p === pkg.packageJson.name)) {
          logger.skip({ message: "Skipped", packageName: name });
        } else {
          await updatePackageVersion({ path, version, name });
          logger.paper({ message: "Updated", packageName: name });

          await generateChangelog({
            tagPrefix,
            preset,
            path,
            version,
            name,
          });
          logger.paper({ message: "Generated", packageName: name });
        }
      }

      const commitMessage = formatCommitMessage({
        commitMessage: config.commitMessage,
        version,
      });

      await gitProcess({
        files: packages
          .filter(
            (pkg) => !config.skip?.some((sp) => sp === pkg.packageJson.name)
          )
          .map((path) => [
            `${path.relativeDir}/package.json`,
            `${path.relativeDir}/CHANGELOG.md`,
          ])
          .flat(),
        nextTag,
        commitMessage,
        skipHooks: config.skipHooks,
      });
      logger.tag({
        message: `Git Tag generated for ${nextTag}.`,
        packageName: "All",
      });
    } else {
      logger.noChanges({
        message: "There are no changes since last release.",
        packageName: "All",
      });
    }
  } catch (err: any) {
    logger.error({ message: "An error occurred", details: err.message });
    exit(1);
  }
}
