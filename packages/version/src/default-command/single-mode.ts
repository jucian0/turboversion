import { cwd, exit } from "node:process";
import { getPackagesSync } from "@manypkg/get-packages";
import { formatTag, formatTagPrefix } from "../utils/format-tag";
import { generateChangelog } from "../utils/generate-changelog";
import { generateVersion } from "../utils/generate-version";
import { generateVersionByBranchPattern } from "../utils/generate-version-by-branch-pattern";
import { getLatestTag } from "../utils/get-latest-tag";
import { formatCommitMessage } from "../utils/template-string";
import { updatePackageVersion } from "../utils/update-package-version";
import { logger } from "../utils/logger";
import { gitProcess } from "../utils/git";
import { ConfigType } from "../config-schema";

export async function singleMode(config: ConfigType, options: any) {
  const { preset, baseBranch, branchPattern = [] } = config;
  const pkgNames: string[] = options.target.split(",");
  const type = options.bump;
  const { packages: pkgs } = getPackagesSync(cwd());

  try {
    const packages = pkgs
      .filter(
        (pkg) =>
          pkgNames.some((name) => name === pkg.packageJson.name) && !config.sync
      )
      .filter((pkg) => !config.skip?.some((sp) => sp === pkg.packageJson.name));

    for (const pkg of packages) {
      const { name } = pkg.packageJson;
      const path = pkg.relativeDir;
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
          type,
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
          type,
          path,
          name,
          prereleaseIdentifier: config.prereleaseIdentifier,
        });
      }

      if (version && name && version && path) {
        logger.new({
          message: `New version calculated ${version}`,
          packageName: name,
        });

        const nextTag = formatTag({ tagPrefix, version });
        await updatePackageVersion({ path, version, name });
        logger.paper({
          message: "Package version updated",
          packageName: name,
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
          packageName: name,
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
          message: "Git Tag successfully generated",
          packageName: name,
        });
      } else {
        logger.noChanges({
          message: "There are no changes since the last release",
          packageName: name,
        });
      }
    }
  } catch (err: any) {
    logger.error({ message: "An error occurred", details: err.message });
    exit(1);
  }
}
