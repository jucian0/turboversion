import * as fs from "node:fs";
import conventionalChangelog from "conventional-changelog";
import { resolvePkgPath } from "./fs";
import { getCommitsLength } from "./git";

type ChangeLog = {
  tagPrefix: string;
  preset: string;
  path: string;
  version: string;
  name: string;
  isSyncBump?: boolean;
};

export async function generateChangelog({
  tagPrefix,
  preset,
  path,
  version,
  name,
  isSyncBump = false,
}: ChangeLog) {
  const context = { version };
  const changelogPath = resolvePkgPath(`${path}/CHANGELOG.md`);

  return new Promise((resolve, reject) => {
    const hasCommits = getCommitsLength(path, tagPrefix) > 0;

    if (isSyncBump && !hasCommits) {
      const existingContent = fs.existsSync(changelogPath)
        ? fs.readFileSync(changelogPath, "utf-8")
        : "";

      const today = new Date().toISOString().split("T")[0];
      const syncEntry = `## [${version}](${tagPrefix}${version}) (${today})\n\n**Note:** Version bump only for package synchronization\n\n`;

      const newContent = existingContent
        ? syncEntry + existingContent
        : syncEntry;

      fs.writeFileSync(changelogPath, newContent);
      resolve(`Success changelog generated ${name}`);
      return;
    }

    const outputStream = fs.createWriteStream(changelogPath, {
      flags: "w+",
    });

    conventionalChangelog(
      {
        preset,
        tagPrefix,
        releaseCount: 0,
      },
      context,
      {
        merges: null,
        path,
      } as conventionalChangelog.Options
    )
      .pipe(outputStream)
      .on("close", () => {
        resolve(`Success changelog generated ${name}`);
      })
      .on("error", (err) => {
        reject(new Error(`Error generating changelog ${name}`));
      });
  });
}
