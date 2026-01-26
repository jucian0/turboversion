import { cwd } from "node:process";
import { promisify } from "util";
import conventionalRecommendedBump from "conventional-recommended-bump";
import semver from "semver";

import {} from "conventional-recommended-bump";
import { getCommitsLength } from "./git";

//https://www.npmjs.com/package/semver
//https://www.npmjs.com/package/conventional-recommended-bump

const recommendedBumpAsync = promisify(conventionalRecommendedBump);

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
    const recommendation: any = await recommendedBumpAsync(
      Object.assign(
        {
          preset,
          tagPrefix,
        },
        path ? { lernaPackage: name, path } : {}
      )
    );
    const recommended = recommendation?.releaseType;
    const currentVersion =
      semver.parse(latestTag.replace(tagPrefix, "")) ?? "0.0.0";

    const amountCommits = getCommitsLength(path ?? cwd(), tagPrefix);

    if (latestTag && amountCommits === 0 && !type && !prerelease) {
      return null;
    }

    // Determine the bump type to use
    let bumpType: semver.ReleaseType = type ?? recommended;

    // Convert to prerelease type when --prerelease flag is set
    if (prerelease && !type) {
      const prereleaseMap: Record<string, semver.ReleaseType> = {
        major: "premajor",
        minor: "preminor",
        patch: "prepatch",
      };
      bumpType = prereleaseMap[recommended] ?? "prerelease";
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
