import { cwd } from "node:process";
import semver from "semver";

import { getCommitsLength } from "./git";
import { recommendBump } from "./recommend-bump";

//https://www.npmjs.com/package/semver

type Version = {
  latestTag: string;
  preset: string;
  tagPrefix: string;
  type?: semver.ReleaseType;
  path?: string;
  name?: string;
  prereleaseIdentifier?: string;
  prerelease?: boolean;
};

export async function generateVersion({
  latestTag,
  preset,
  tagPrefix,
  type,
  path,
  name,
  prereleaseIdentifier,
  prerelease,
}: Version) {
  try {
    const recommended = await recommendBump({
      preset,
      from: latestTag,
      path,
    });
    const currentVersion =
      semver.parse(latestTag.replace(tagPrefix, "")) ?? "0.0.0";

    const amountCommits = getCommitsLength(path ?? cwd(), tagPrefix);

    // A prerelease is an open release. Asking for a stable version while one is
    // open means closing it, so neither guard below applies: there is work to
    // release even when no new commit came in. The branchPattern strategy
    // already behaves this way.
    const closingPrerelease =
      semver.prerelease(currentVersion) !== null && !prerelease;

    if (
      latestTag &&
      amountCommits === 0 &&
      !type &&
      !prerelease &&
      !closingPrerelease
    ) {
      return null;
    }

    // If there are commits but none match the configured conventional preset,
    // do not bump or generate a changelog.
    if (!recommended && !type && !prerelease && !closingPrerelease) {
      return null;
    }

    // Determine the bump type to use. Closing a prerelease with nothing else to
    // release is a patch, which semver resolves by dropping the prerelease and
    // keeping the numbers: 1.5.1-rc.0 -> 1.5.1. A recommendation, when there is
    // one, already graduates on its own and outranks this.
    let bumpType: semver.ReleaseType = type ?? recommended ?? "patch";

    // Convert to prerelease type when --prerelease flag is set
    if (prerelease && !type) {
      const prereleaseMap: Record<string, semver.ReleaseType> = {
        major: "premajor",
        minor: "preminor",
        patch: "prepatch",
      };
      bumpType = (recommended && prereleaseMap[recommended]) ?? "prerelease";
    }

    const next = semver.inc(
      currentVersion,
      bumpType,
      prereleaseIdentifier
    );

    if (!next) {
      throw Error();
    }
    return next.toString();
  } catch (error: any) {
    throw Error(`Failed to calculate version: ${error.message}`);
  }
}
