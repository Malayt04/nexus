import { app } from "electron";
import * as path from "path";
import * as fs from "fs/promises";
import { getConfigPath } from "./utils";

export type StoreData = {
  apiKey: string;
  userDescription?: string;
  serpApiKey: string;
};

const configFileName = "config.json";
const configPath = getConfigPath(configFileName);

export function readStore(): StoreData {
  try {
    return JSON.parse(require("fs").readFileSync(configPath, "utf8"));
  } catch {
    return { apiKey: "", userDescription: "", serpApiKey: "" } as StoreData;
  }
}

export function writeToStore(key: keyof StoreData, value: string) {
  const data = readStore();
  (data as any)[key] = value;
  require("fs").writeFileSync(configPath, JSON.stringify(data, null, 2));
}

export const manifestPath = path.join(
  app.getPath("userData"),
  "history_manifest.json"
);
export const chatsPath = path.join(app.getPath("userData"), "chats");

export async function ensureStoragePathsExist() {
  try {
    await fs.mkdir(chatsPath, { recursive: true });
    await fs.access(manifestPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.writeFile(manifestPath, JSON.stringify([]));
    } else {
      console.error("Error ensuring storage paths:", error);
    }
  }
}

export async function readManifest() {
  try {
    const data = await fs.readFile(manifestPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Could not read manifest, returning empty array.", error);
    return [] as any[];
  }
}
