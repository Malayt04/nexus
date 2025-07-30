import { app } from "electron";
import * as path from 'path';

export function getConfigPath(configFileName: string): string {
    const userDataPath = app.getPath("userData");
    return path.join(userDataPath, configFileName);
  }