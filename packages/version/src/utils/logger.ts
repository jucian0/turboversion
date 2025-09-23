import chalk from "chalk";
// boxen will be dynamically imported
type BoxenOptions = {
  padding?: number;
  margin?: number;
  borderStyle?: string;
  borderColor?: string;
};

type LogStep =
  | "list"
  | "failed"
  | "no_changes"
  | "new"
  | "paper"
  | "tag"
  | "error"
  | "skip"
  | "success"
  | "help";

type LogOptions = {
  message: string;
  packageName?: string;
  details?: string;
};

type LogHandler = (options: LogOptions) => Promise<void>;

const emojiMap = new Map<LogStep, string>([
  ["list", "📜"],
  ["failed", "💥"],
  ["no_changes", "✅"],
  ["new", "✨"],
  ["paper", "📝"],
  ["tag", "🏷️"],
  ["error", "❌"],
  ["skip", "⏭️"],
  ["success", "🎯"],
  ["help", "❓"],
]);

const colorMap = new Map<LogStep, (text: string) => string>([
  ["list", chalk.cyan],
  ["failed", chalk.red.bold],
  ["no_changes", chalk.green],
  ["new", chalk.magenta.bold],
  ["paper", chalk.blue],
  ["tag", chalk.blue.bold],
  ["error", chalk.red.bold.underline],
  ["skip", chalk.gray],
  ["success", chalk.green.bold],
  ["help", chalk.dim],
]);

const boxenConfigMap = new Map<LogStep, BoxenOptions | null>([
  [
    "error",
    {
      padding: 1,
      margin: 1,
      borderStyle: "double",
      borderColor: "red",
    },
  ],
  [
    "help",
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "magenta",
    },
  ],
  ["list", null],
  ["failed", null],
  ["no_changes", null],
  ["new", null],
  ["paper", null],
  ["tag", null],
  ["skip", null],
  ["success", null],
]);


function createLogHandler(step: LogStep): LogHandler {
  return async ({ message, packageName, details }) => {
    const emoji = emojiMap.get(step) ?? "";
    const colorize = colorMap.get(step) ?? ((text) => text);
    const timestamp = chalk.dim(`[${new Date().toLocaleTimeString()}]`);

    let parts = [
      timestamp,
      packageName ? chalk.bold(`[${packageName}]`) : "",
      emoji,
      colorize(message),
    ]
      .filter(Boolean)
      .join(" ");

    if (details) {
      parts += `\n${chalk.dim("└─ " + details)}`;
    }

    const boxenConfig = boxenConfigMap.get(step) as BoxenOptions | null;
    let output = parts;
    if (boxenConfig) {
      const boxenModule = await import("boxen");
      output = boxenModule.default(parts, boxenConfig as any);
    }

    step === "error" ? console.error(output) : console.log(output);
  };
}


export const logger = {
  list: createLogHandler("list"),
  failed: createLogHandler("failed"),
  noChanges: createLogHandler("no_changes"),
  new: createLogHandler("new"),
  paper: createLogHandler("paper"),
  tag: createLogHandler("tag"),
  error: createLogHandler("error"),
  skip: createLogHandler("skip"),
  success: createLogHandler("success"),
  help: createLogHandler("help"),
};
