import { execSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { generateVersion } from "./generate-version";
import { getLatestTagSync, pickLatestTag } from "./get-latest-tag";
import { assertTagAvailable, getCommitsLength, tagExists } from "./git";
import { recommendBump } from "./recommend-bump";

describe("pickLatestTag", () => {
  it("prefers a stable release over a prerelease of the same version", () => {
    expect(pickLatestTag(["v1.5.2-rc.2", "v1.5.2", "v1.5.2-rc.1"], "v")).toBe(
      "v1.5.2"
    );
  });

  it("prefers a prerelease of a higher version over a lower release", () => {
    expect(pickLatestTag(["v1.5.2", "v1.5.3-rc.0"], "v")).toBe("v1.5.3-rc.0");
  });

  it("orders prerelease numbers numerically", () => {
    expect(pickLatestTag(["v1.0.0-rc.9", "v1.0.0-rc.10"], "v")).toBe(
      "v1.0.0-rc.10"
    );
  });

  it("ignores tags of another prefix and tags that are not versions", () => {
    expect(
      pickLatestTag(["pkg-a-9.0.0", "latest", "pkg-b-1.2.0", "pkg-b-1.10.0"], "pkg-b-")
    ).toBe("pkg-b-1.10.0");
  });

  it("returns an empty string when there is no version tag", () => {
    expect(pickLatestTag(["latest"], "v")).toBe("");
  });
});

// Rebuilds the history that broke frontend-commons: a branch cut before 1.5.2
// was released tags 1.5.2-rc.2, merges main back in and is merged into main.
// The prerelease commit is newer than the release commit, so `git log` shows
// 1.5.2-rc.2 first.
describe("with a late prerelease merged back into the base branch", () => {
  const originalCwd = process.cwd();
  let repo: string;
  let clock: number;

  const git = (command: string) => {
    clock += 60;
    const date = `${clock} +0000`;
    return execSync(`git ${command}`, {
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: date,
        GIT_COMMITTER_DATE: date,
      },
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  };
  const commit = (message: string) => {
    appendFileSync("CHANGELOG.md", `${message}\n`);
    git("add CHANGELOG.md");
    git(`commit -q -m "${message}"`);
  };
  const tag = (name: string) => git(`tag -a -m ${name} ${name}`);

  const buildHistory = (staleBranchCommit: string) => {
    commit("feat: first feature");
    tag("v1.5.1");
    commit("fix: keep spotlight search");
    tag("v1.5.2-rc.1");

    git("checkout -q -b stale");
    git("checkout -q main");
    commit("chore: release version 1.5.2");
    tag("v1.5.2");

    git("checkout -q stale");
    commit(staleBranchCommit);
    commit("chore: release version 1.5.2-rc.2");
    tag("v1.5.2-rc.2");
    git('merge -q --no-ff -X ours -m "Merge main into stale" main');

    git("checkout -q main");
    git('merge -q --no-ff -X theirs -m "Merged in stale" stale');

    git("checkout -q --orphan abandoned");
    git("rm -q -r --cached .");
    commit("chore: abandoned major");
    tag("v2.0.0-0");
    git("checkout -q main");
  };

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "turboversion-"));
    clock = 1_700_000_000;
    process.chdir(repo);
    git("init -q -b main");
    git("config user.email test@test");
    git("config user.name test");
    git("config commit.gpgsign false");
    git("config tag.gpgsign false");
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(repo, { recursive: true, force: true });
  });

  it("reproduces the log order that picked the prerelease", () => {
    buildHistory("fix: vertical scroll on sidebar menu");

    const firstInLog = git("log --decorate --no-color").match(/tag: ([^,)]+)/)?.[1];

    expect(firstInLog).toBe("v1.5.2-rc.2");
  });

  it("takes the highest reachable tag as the latest one", () => {
    buildHistory("fix: vertical scroll on sidebar menu");

    expect(getLatestTagSync("v")).toBe("v1.5.2");
  });

  it("counts the commits since the highest reachable tag", () => {
    buildHistory("fix: vertical scroll on sidebar menu");

    expect(getCommitsLength(".", "v")).toBeGreaterThan(0);
  });

  it("reads the bump from the commits since the highest reachable tag", async () => {
    buildHistory("feat: vertical scroll on sidebar menu");

    expect(await recommendBump({ preset: "angular", from: "v1.5.2" })).toBe("minor");
    expect(
      await recommendBump({ preset: "conventionalcommits", from: "v1.5.2" })
    ).toBe("minor");
  });

  it("releases the next patch instead of the existing tag", async () => {
    buildHistory("fix: vertical scroll on sidebar menu");
    const latestTag = getLatestTagSync("v");

    const version = await generateVersion({
      latestTag,
      preset: "angular",
      tagPrefix: "v",
    });

    expect(version).toBe("1.5.3");
    expect(() => assertTagAvailable(`v${version}`, latestTag)).not.toThrow();
  });

  it("refuses a tag that already exists", () => {
    buildHistory("fix: vertical scroll on sidebar menu");

    expect(tagExists("v1.5.2")).toBe(true);
    expect(() => assertTagAvailable("v1.5.2", "v1.5.2-rc.2")).toThrow(
      "Tag v1.5.2 already exists"
    );
  });
});
