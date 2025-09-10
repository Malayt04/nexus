import { app, BrowserWindow, globalShortcut, screen } from "electron";
import * as path from "path";

export function createMainWindow() {
  const preloadScriptPath = path.join(__dirname, "../preload/index.js");
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 80,
    x: Math.floor((screen.getPrimaryDisplay().workAreaSize.width - 400) / 2),
    y: 0,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    vibrancy: "under-window",
    focusable: false,
    icon: path.join(__dirname, "../../resources/nexus-icon.png"),
    webPreferences: {
      preload: preloadScriptPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.platform === "darwin") {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWindow.setContentProtection(true);
    mainWindow.setAlwaysOnTop(true, "screen-saver");
  }
  if (process.platform === "win32") {
    mainWindow.setContentProtection(true);
    mainWindow.setAlwaysOnTop(true, "screen-saver");
  }

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL(
      process.env["VITE_DEV_SERVER_URL"] || "http://localhost:5173"
    );
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  const moveWindow = (x: number, y: number) => {
    const currentPosition = mainWindow.getPosition();
    mainWindow.setPosition(currentPosition[0] + x, currentPosition[1] + y);
  };

  const registerShortcuts = () => {
    console.log("Registering shortcuts");
    globalShortcut.register("CommandOrControl+Right", () => moveWindow(50, 0));
    globalShortcut.register("CommandOrControl+Left", () => moveWindow(-50, 0));
    globalShortcut.register("CommandOrControl+Up", () => moveWindow(0, -50));
    globalShortcut.register("CommandOrControl+Down", () => moveWindow(0, 50));
    globalShortcut.register(`CommandOrControl+H`, () =>
      mainWindow.isAlwaysOnTop()
        ? mainWindow.setAlwaysOnTop(false)
        : mainWindow.setAlwaysOnTop(true)
    );

    globalShortcut.register("CommandOrControl+\\", () => {
      console.log("CommandOrControl+\\ pressed");
      mainWindow.setFocusable(true);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send("focus-input");
    });

    globalShortcut.register("CommandOrControl+;", () => {
      console.log("CommandOrControl+; pressed");
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send("toggle-screenshot");
    });

    globalShortcut.register("CommandOrControl+N", () => {
      console.log("CommandOrControl+N pressed");
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send("new-chat");
    });

    globalShortcut.register("CommandOrControl+Return", () => {
      console.log("CommandOrControl+Return pressed - sending message");
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send("send-message");
    });
  };

  registerShortcuts();

  mainWindow.on("blur", () => {
    console.log("Window blurred, making it unfocusable");
    mainWindow.setFocusable(false);
  });

  mainWindow.on("focus", () => {
    console.log("Window focused");
  });

  return mainWindow;
}