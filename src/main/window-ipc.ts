import { BrowserWindow, ipcMain, screen } from "electron";

export function registerWindowIpc() {
  ipcMain.handle("resize-window-for-page", async (_, pageType: string) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return;

    const display = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = display.workAreaSize;

    switch (pageType) {
      case "chat":
        const chatWidth = Math.floor(screenWidth * 0.5);
        const chatHeight = Math.floor(screenHeight * 0.65);
        const currentPos = mainWindow.getPosition();
        const currentSize = mainWindow.getSize();
        const newX =
          currentPos[0] + Math.floor((currentSize[0] - chatWidth) / 2);
        mainWindow.setSize(chatWidth, chatHeight, true);
        mainWindow.setPosition(newX, currentPos[1]);
        break;
      case "settings":
      case "history":
        const currentPosModal = mainWindow.getPosition();
        const currentSizeModal = mainWindow.getSize();
        const newXModal =
          currentPosModal[0] + Math.floor((currentSizeModal[0] - 700) / 2);
        mainWindow.setSize(700, 600, true);
        mainWindow.setPosition(newXModal, currentPosModal[1]);
        break;
      default:
        const currentPosMin = mainWindow.getPosition();
        const currentSizeMin = mainWindow.getSize();
        const newXMin =
          currentPosMin[0] + Math.floor((currentSizeMin[0] - 400) / 2);
        mainWindow.setSize(400, 80, true);
        mainWindow.setPosition(newXMin, currentPosMin[1]);
        break;
    }
  });

  ipcMain.handle("resize-window-minimal", async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return;
    const currentPos = mainWindow.getPosition();
    const currentSize = mainWindow.getSize();
    const newX = currentPos[0] + Math.floor((currentSize[0] - 400) / 2);
    mainWindow.setSize(400, 80, true);
    mainWindow.setPosition(newX, currentPos[1]);
  });

  ipcMain.handle("resize-window-for-menu", async (_, isExpanded: boolean) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return;
    const currentPos = mainWindow.getPosition();
    if (isExpanded) {
      mainWindow.setSize(400, 180, true);
    } else {
      mainWindow.setSize(400, 80, true);
    }
    mainWindow.setPosition(currentPos[0], currentPos[1]);
  });
}
