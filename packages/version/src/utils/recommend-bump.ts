import { execSync } from "node:child_process";
import angular from "conventional-changelog-angular";
import conventionalcommits from "conventional-changelog-conventionalcommits";
import conventionalCommitsFilter from "conventional-commits-filter";
import { sync as parseCommit } from "conventional-commits-parser";
import type { ReleaseType } from "semver";

// conventional-recommended-bump always reads the commits since the first tag
// `git log` shows, with no way to pass another one. The version is calculated
// from the highest reachable tag (see get-latest-tag), so the bump has to read
// the commits since that same tag, or a feature cut before a late prerelease
// would be left out and released as a patch.

const VERSIONS: ReleaseType[] = ["major", "minor", "patch"];
const DELIMITER = "------------------------";

type RecommendBump = {
  preset: string;
  from: string;
  path?: string;
};

async function loadPreset(preset: string) {
  if (preset === "conventionalcommits") {
    return conventionalcommits({});
  }
  if (preset === "angular") {
    return angular;
  }
  throw new Error(`Unknown preset "${preset}"`);
}

function readCommits(from: string, path?: string): string[] {
  const range = from ? `${from}..HEAD` : "HEAD";
  const pathArg = path ? ` -- "${path}"` : "";
  const output = execSync(
    `git log --format=%B%n-hash-%n%H%n${DELIMITER} ${range}${pathArg}`,
    { maxBuffer: 1024 * 1024 * 10 }
  ).toString();

  return output.split(`${DELIMITER}\n`).filter((commit) => commit.trim());
}

export async function recommendBump({
  preset,
  from,
  path,
}: RecommendBump): Promise<ReleaseType | undefined> {
  const config = await loadPreset(preset);
  const bumpOpts = config.recommendedBumpOpts ?? {};
  const parserOpts = bumpOpts.parserOpts ?? config.parserOpts;

  const commits = conventionalCommitsFilter(
    readCommits(from, path).map((raw) => parseCommit(raw, parserOpts))
  );

  const result = bumpOpts.whatBump?.(commits, {});

  return result?.level != null ? VERSIONS[result.level] : undefined;
}
