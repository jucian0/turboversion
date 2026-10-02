import { execSync } from "node:child_process";
import semver from "semver";

// The latest tag is the highest version among the tags reachable from HEAD,
// not the first one `git log` happens to show. Log order follows commit dates,
// so once a branch that cut a prerelease before a stable release merges the
// base branch back in, that prerelease shows up first: 1.5.2-rc.2 would be
// taken as the latest tag on top of 1.5.2, and the next version would collide
// with a tag that already exists.
export function pickLatestTag(tags: string[], tagPrefix: string): string {
  const versioned = tags
    .filter((tag) => tag.startsWith(tagPrefix))
    .map((tag) => ({ tag, version: semver.valid(tag.slice(tagPrefix.length)) }))
    .filter((entry): entry is { tag: string; version: string } =>
      Boolean(entry.version)
    );

  versioned.sort((a, b) => semver.rcompare(a.version, b.version));

  return versioned[0]?.tag ?? "";
}

export function getLatestTagSync(tagPrefix: string): string {
  try {
    const output = execSync("git tag --merged HEAD", {
      maxBuffer: 1024 * 1024 * 10,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();

    const tags = output
      .split("\n")
      .map((tag) => tag.trim())
      .filter(Boolean);

    return pickLatestTag(tags, tagPrefix);
  } catch {
    return "";
  }
}

export async function getLatestTag(tagPrefix: string) {
  return getLatestTagSync(tagPrefix);
}
