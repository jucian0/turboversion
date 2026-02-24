import { cwd } from "node:process";
import semver from "semver";
import { getCommitsLength, getCurrentBranch, lastMergeBranchName } from "./git";

type Version = {
  latestTag: string;
  tagPrefix: string;
  type?: semver.ReleaseType;
  path?: string;
  branchPattern: string[];
  baseBranch?: string;
  prereleaseIdentifier?: string;
};

export async function generateVersionByBranchPattern({
  latestTag,
  tagPrefix,
  type,
  path,
  branchPattern,
  baseBranch,
  prereleaseIdentifier,
}: Version) {
  try {
    const recommended = await genNextTagByBranchName(
      branchPattern,
      latestTag,
      baseBranch,
      type
    );

    const currentVersion =
      semver.parse(latestTag.replace(tagPrefix, "")) ?? "0.0.0";

    const amountCommits = getCommitsLength(path ?? cwd(), tagPrefix);

    if (latestTag && amountCommits === 0 && !type && !latestTag.includes("-")) {
      return null;
    }

    const next = semver.inc(currentVersion, recommended, prereleaseIdentifier);

    if (!next) {
      throw Error();
    }
    return next.toString();
  } catch (error: any) {
    throw Error(`Failed to calculate version: ${error.message}`);
  }
}

async function genNextTagByBranchName(
  schema: string[],
  latestTag: string,
  mainBranchName = "main",
  type?: semver.ReleaseType
) {
  if (latestTag.includes("-")) {
    return type ?? "patch";
  }

  if (type?.includes("pre")) {
    return `pre${extractBranchPrefix(
      getCurrentBranch(),
      schema
    )}` as semver.ReleaseType;
  }
  const branch = (await lastMergeBranchName(schema, mainBranchName)) as string;

  return extractBranchPrefix(branch, schema) as semver.ReleaseType;
}

function extractBranchPrefix(branch: string, schema: string[]) {
  if (branch?.includes(schema[0])) {
    return "major";
  }

  if (branch?.includes(schema[1])) {
    return "minor";
  }

  if (branch?.includes(schema[2])) {
    return "patch";
  }

  return "patch";
}
