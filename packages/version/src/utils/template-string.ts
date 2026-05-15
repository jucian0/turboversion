import { getCurrentBranch } from "./git";

export function createTemplateString(
   template: string,
   context: Record<string, any>,
): string {
   return Object.keys(context).reduce((accumulator, contextParamKey) => {
      const interpolationRegex = new RegExp(`\\$\\{${contextParamKey}}`, "g");
      return accumulator.replace(
         interpolationRegex,
         context[contextParamKey].toString(),
      );
   }, template);
}

function sanitizePrereleaseIdentifier(value: string): string {
   return value
      .trim()
      .replace(/[^0-9A-Za-z-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
}

export function formatPrereleaseIdentifier({
   prereleaseIdentifier,
   name,
}: {
   prereleaseIdentifier?: string;
   name?: string;
}) {
   if (!prereleaseIdentifier) {
      return prereleaseIdentifier;
   }

   const branchName = sanitizePrereleaseIdentifier(getCurrentBranch());

   const renderedIdentifier = createTemplateString(prereleaseIdentifier, {
      branchName: branchName || "detached",
      packageName: name ?? "",
      target: name ?? "",
   });

   return sanitizePrereleaseIdentifier(renderedIdentifier);
}

export function formatCommitMessage({
   commitMessage,
   version,
   name,
}: {
   version: string;
   commitMessage?: string;
   name?: string;
}): string {
   return createTemplateString(commitMessage ?? "", {
      packageName: name ?? "",
      version,
   });
}
