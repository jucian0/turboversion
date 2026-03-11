import { z } from "zod";

export const versionConfigSchema = z
  .object({
    $schema: z.string().url().optional().describe("The JSON Schema URL"),
    prereleaseIdentifier: z
      .string()
      .min(1)
      .optional()
      .describe("The prerelease identifier to use when bumping the version")
      .default("beta"),
    tagPrefix: z
      .string()
      .min(1)
      .describe("The prefix used for Git tags, usually the project name")
      .default("v"),
    versionStrategy: z
      .enum(["branchPattern", "commitMessage"])
      .default("commitMessage")
      .describe(
        "The versioning strategy to use, either 'branchPattern' or 'commitMessage'. " +
        "Select 'branchPattern' if you want to calculate the version based on the branch name, " +
        "and 'commitMessage' if you want to calculate the version based on the commit message."
      ),
    preset: z
      .enum(["angular", "conventionalcommits"])
      .default("angular")
      .describe(
        "The commit message convention preset used by commitizen. " +
        "That applies only when `versionStrategy` is 'commitMessage'"
      ),
    branchPattern: z
      .array(z.string().min(1))
      .min(1)
      .refine((arr) => new Set(arr).size === arr.length, {
        message: "Branch patterns must be unique",
      })
      .optional()
      .describe(
        "The pattern to match the branch name. " +
        "Only applies when `versionStrategy` is 'branchPattern'"
      ),
    commitMessage: z
      .string()
      .min(1)
      .optional()
      .describe(
        "The commit message, this is just a commit message template, " +
        "not related with `versionStrategy`."
      ),
    sync: z
      .boolean()
      .optional()
      .describe(
        "Whether or not the local Git repository is sync with the remote repository"
      ),

    updateInternalDependencies: z
      .union([z.enum(["major", "minor", "patch"]), z.literal(false)])
      .describe("How to update internal dependencies between packages"),
    skip: z
      .array(z.string().min(1))
      .refine((arr) => new Set(arr).size === arr.length, {
        message: "Skip entries must be unique",
      })
      .optional()
      .describe(
        "A list of package names to skip publishing. " +
        "When specified, these packages will be excluded from the publish process."
      ),
    baseBranch: z
      .string()
      .min(1)
      .describe("The base git branch to compare against for changes"),
    skipHooks: z
      .boolean()
      .default(false)
      .describe("Whether to skip git hooks during versioning"),
  })
  .strict()
  .refine(
    (data) =>
      !(data.versionStrategy === "commitMessage" && data.branchPattern) &&
      !(data.versionStrategy === "branchPattern" && data.commitMessage),
    {
      message:
        "Cannot use both commitMessage and branchPattern - choose one versioning strategy",
      path: ["versionStrategy"],
    }
  )
  .refine((data) => typeof data.sync === "boolean", {
    message:
      "sync must be explicitly set to true (sync mode) or false (async mode)",
    path: ["sync"],
  });

export type ConfigType = z.infer<typeof versionConfigSchema>;
