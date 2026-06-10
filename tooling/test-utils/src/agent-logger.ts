const COLOR = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const isTTY = process.stdout.isTTY === true && process.env["NO_COLOR"] === undefined;
const paint = (color: keyof typeof COLOR, s: string): string =>
  isTTY ? `${COLOR[color]}${s}${COLOR.reset}` : s;

const ts = (): string => new Date().toISOString().slice(11, 23);

type Level = "info" | "warn" | "error" | "debug" | "trace";

const LEVEL_TAG: Record<Level, string> = {
  info: paint("cyan", "INFO "),
  warn: paint("yellow", "WARN "),
  error: paint("red", "ERROR"),
  debug: paint("gray", "DEBUG"),
  trace: paint("dim", "TRACE"),
};

export interface AgentLogPayload {
  readonly [k: string]: unknown;
}

export const agentLog = (
  level: Level,
  message: string,
  payload?: AgentLogPayload,
): void => {
  const line = `${paint("gray", ts())} ${LEVEL_TAG[level]} ${message}`;
  if (payload === undefined || Object.keys(payload).length === 0) {
    console.log(line);
    return;
  }
  console.log(line);
  for (const [k, v] of Object.entries(payload)) {
    const rendered =
      v instanceof Date
        ? v.toISOString()
        : typeof v === "string"
          ? v
          : JSON.stringify(v);
    console.log(`  ${paint("dim", "›")} ${paint("magenta", k)}=${rendered}`);
  }
};

export const banner = (title: string, subtitle?: string): void => {
  const bar = paint("blue", "━".repeat(Math.min(72, title.length + 4)));
  console.log("");
  console.log(bar);
  console.log(paint("bold", `  ${title}`));
  if (subtitle !== undefined) console.log(paint("dim", `  ${subtitle}`));
  console.log(bar);
};

export const kvBlock = (
  title: string,
  pairs: Readonly<Record<string, unknown>>,
): void => {
  console.log(paint("bold", title));
  for (const [k, v] of Object.entries(pairs)) {
    const rendered = v instanceof Date ? v.toISOString() : JSON.stringify(v);
    console.log(`  ${paint("cyan", k.padEnd(20))} ${rendered}`);
  }
};

export const eventBlock = (event: {
  readonly type: string;
  readonly streamId?: string;
  readonly payload?: unknown;
}): void => {
  const head = `${paint("green", "▶")} ${paint("bold", event.type)}`;
  const stream =
    event.streamId !== undefined
      ? ` ${paint("dim", `[${event.streamId}]`)}`
      : "";
  console.log(`${head}${stream}`);
  if (event.payload !== undefined) {
    const json = JSON.stringify(event.payload, null, 2)
      .split("\n")
      .map((l) => `  ${l}`)
      .join("\n");
    console.log(paint("gray", json));
  }
};
