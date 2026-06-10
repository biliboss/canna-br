import type { Reporter, File, Task } from "vitest";

const COLOR = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const isTTY = process.stdout.isTTY === true && process.env["NO_COLOR"] === undefined;
const paint = (color: keyof typeof COLOR, s: string): string =>
  isTTY ? `${COLOR[color]}${s}${COLOR.reset}` : s;

const collectTasks = (tasks: readonly Task[]): Task[] => {
  const acc: Task[] = [];
  const visit = (t: Task): void => {
    if (t.type === "test") {
      acc.push(t);
      return;
    }
    if ("tasks" in t && Array.isArray((t as { tasks: Task[] }).tasks)) {
      for (const c of (t as { tasks: Task[] }).tasks) visit(c);
    }
  };
  for (const t of tasks) visit(t);
  return acc;
};

const formatLocation = (file: File, task: Task): string => {
  const loc = task.location;
  const lineCol = loc !== undefined ? `:${String(loc.line)}` : "";
  return `${file.filepath}${lineCol}`;
};

/**
 * Agent-friendly reporter for Claude Code & similar agents.
 * - file:line refs (clickable / parsable)
 * - structured FAIL blocks with stack
 * - one-line success per scenario
 */
export class AgentReporter implements Reporter {
  onFinished(files: readonly File[] = [], errors: readonly unknown[] = []): void {
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const file of files) {
      const tasks = collectTasks(file.tasks);
      for (const task of tasks) {
        const state = task.result?.state;
        if (state === "pass") {
          passed += 1;
          console.log(
            `${paint("green", "[OK]")} ${paint("dim", file.name)} › ${task.name}`,
          );
          continue;
        }
        if (state === "fail") {
          failed += 1;
          console.log(
            `${paint("red", "[FAIL]")} ${paint("bold", task.name)}`,
          );
          console.log(`       at ${formatLocation(file, task)}`);
          const errs = task.result?.errors ?? [];
          for (const e of errs) {
            const message = (e as { message?: string }).message ?? String(e);
            console.log(`       ${paint("red", "✗")} ${message}`);
            const stack = (e as { stack?: string }).stack;
            if (typeof stack === "string") {
              const trimmed = stack
                .split("\n")
                .slice(1, 4)
                .map((l) => `         ${paint("gray", l.trim())}`)
                .join("\n");
              if (trimmed.length > 0) console.log(trimmed);
            }
          }
          continue;
        }
        if (state === "skip" || state === "todo") {
          skipped += 1;
          console.log(
            `${paint("yellow", "[SKIP]")} ${paint("dim", task.name)}`,
          );
        }
      }
    }

    console.log("");
    console.log(
      paint("bold", "Domain scenarios:") +
        ` ${paint("green", `${String(passed)} pass`)}` +
        (failed > 0 ? `  ${paint("red", `${String(failed)} fail`)}` : "") +
        (skipped > 0 ? `  ${paint("yellow", `${String(skipped)} skip`)}` : ""),
    );
    if (errors.length > 0) {
      console.log(paint("red", `Unhandled errors: ${String(errors.length)}`));
    }
  }
}

export default AgentReporter;
