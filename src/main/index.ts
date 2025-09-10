import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./window";
import { ensureStoragePathsExist } from "./store";
import { registerAIIpc } from "./ai-ipc";
import { registerHistoryIpc } from "./history-ipc";
import { registerWindowIpc } from "./window-ipc";

app.whenReady().then(() => {
  ensureStoragePathsExist();
  createMainWindow();

  registerAIIpc();
  registerHistoryIpc();
  registerWindowIpc();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});