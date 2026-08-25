import { execFileSync } from "node:child_process";
import path from "node:path";

const repositoryRoot = path.resolve(__dirname, "../../..");
const command: readonly [string, readonly string[]] =
  process.platform === "win32"
    ? [
        process.env.ComSpec || "cmd.exe",
        ["/d", "/s", "/c", "pnpm.cmd exec supabase status -o env"],
      ]
    : ["pnpm", ["exec", "supabase", "status", "-o", "env"]];

export function getLocalSupabaseEnvironment() {
  const output = execFileSync(command[0], command[1], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z_]+)="(.*)"$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => [match[1], match[2]]),
  );
}
