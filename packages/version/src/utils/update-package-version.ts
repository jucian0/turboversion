import * as fs from "node:fs";
import { fileExist, resolvePkgPath } from "./fs";

type PackageVersion = {
  path: string;
  version: string;
  name: string;
};
export function updatePackageVersion({ path, version, name }: PackageVersion) {
  const packageJsonPath = resolvePkgPath(`${path}/package.json`);
  return new Promise<string>((resolve, reject) => {
    if (!fileExist(packageJsonPath)) {
      reject(
        new Error(
          "Could not find the package.json file, make sure your `version.config.json` is right configured!"
        )
      );
    }

    fs.readFile(packageJsonPath, "utf8", (err, data) => {
      if (err) {
        reject(
          new Error(
            "Could not find the package.json file, make sure your `version.config.json` is right configured!"
          )
        );
      }

      const hasTrailingNewline = data.endsWith("\n");
      const packageJson = JSON.parse(data);
      packageJson.version = version;

      const content = JSON.stringify(packageJson, null, 2) + (hasTrailingNewline ? "\n" : "");

      fs.writeFile(
        packageJsonPath,
        content,
        "utf8",
        (err) => {
          if (err) {
            return reject(err);
          }

          resolve(`Packages info updated ${name}`);
        }
      );
    });
  });
}
