/**
 * Oqto Apps Extension for Pi
 *
 * Provides tools for agents to open HTML files as interactive apps
 * in the Oqto frontend. Uses a file-based signal mechanism:
 * the tool writes to .oqto/app-signals.json, and the frontend
 * watches for changes and processes commands.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

interface AppSignal {
  action: "open" | "close";
  path: string;
  title?: string;
  timestamp: number;
}

interface AppSignalFile {
  signals: AppSignal[];
}

function ensureOqtoDir(cwd: string): string {
  const dir = join(cwd, ".oqto");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function writeSignal(cwd: string, signal: AppSignal): void {
  const dir = ensureOqtoDir(cwd);
  const signalPath = join(dir, "app-signals.json");

  let file: AppSignalFile = { signals: [] };
  try {
    const existing = readFileSync(signalPath, "utf-8");
    file = JSON.parse(existing);
  } catch {
    // File doesn't exist or is invalid
  }

  file.signals.push(signal);
  writeFileSync(signalPath, JSON.stringify(file, null, 2));
}

export default function oqtoAppsExtension(pi: ExtensionAPI) {
  // ==========================================================================
  // OpenApp tool
  // ==========================================================================
  pi.registerTool({
    name: "OpenApp",
    label: "Open App",
    description:
      "Open an HTML file as an interactive app in the Oqto frontend. " +
      "The file is rendered in an iframe with access to workspace files " +
      "via the apphost bridge (window.apphost). Use this after creating " +
      "or updating an HTML app file to show it to the user.\n\n" +
      "The HTML file can use these APIs:\n" +
      "- var(--app-*) CSS variables for theming\n" +
      "- apphost.readFile(path) to read workspace files\n" +
      "- apphost.writeFile(path, data) to write workspace files\n" +
      "- apphost.saveState(key, value) / loadState(key) for persistence\n" +
      "- apphost.theme and apphost.onThemeChange(cb) for theme awareness",
    parameters: Type.Object({
      path: Type.String({
        description:
          "Path to the HTML file relative to the workspace root (e.g. 'tools/dashboard.html')",
      }),
      title: Type.Optional(
        Type.String({
          description:
            "Optional display title for the app tab. Defaults to the filename.",
        }),
      ),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const filePath = params.path;
      const fullPath = join(ctx.cwd, filePath);

      if (!existsSync(fullPath)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: File not found: ${filePath}`,
            },
          ],
        };
      }

      if (!/\.html?$/i.test(filePath)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Only .html files can be opened as apps. Got: ${filePath}`,
            },
          ],
        };
      }

      writeSignal(ctx.cwd, {
        action: "open",
        path: filePath,
        title: params.title,
        timestamp: Date.now(),
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Opened ${filePath} as app in the frontend.${params.title ? ` Title: "${params.title}"` : ""}`,
          },
        ],
      };
    },
  });

  // ==========================================================================
  // CloseApp tool
  // ==========================================================================
  pi.registerTool({
    name: "CloseApp",
    label: "Close App",
    description:
      "Close an app that was previously opened in the Oqto frontend.",
    parameters: Type.Object({
      path: Type.String({
        description:
          "Path to the HTML file to close (same path used when opening).",
      }),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      writeSignal(ctx.cwd, {
        action: "close",
        path: params.path,
        timestamp: Date.now(),
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Closed app: ${params.path}`,
          },
        ],
      };
    },
  });
}
