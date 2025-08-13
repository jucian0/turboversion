import * as fs from "node:fs";
import { promisify } from "node:util";
import { cwd } from "node:process";
import { ConfigType, versionConfigSchema } from "./config-schema";
import { ZodError } from "zod";

export type PkgJson = {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  path?: string;
};

export async function loadConfig(pathParam?: string): Promise<ConfigType> {
  const pathConfig = pathParam || `${cwd()}/version.config.json`;
  const readFile = promisify(fs.readFile);
  return readFile(pathConfig, "utf-8")
    .then((data) => {
      const config = JSON.parse(data);
      return versionConfigSchema.parse(config);
    })
    .catch((err) => {
      let message = "";
      if (err instanceof ZodError) {
        if ((err as ZodError).issues.length > 0) {
          message =
            (err as ZodError).issues[0].message +
            " in " +
            `version.config.json`;
        }
      } else {
        message = "Error loading config file";
      }
      throw new Error(message);
    });
}
