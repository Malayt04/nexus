import { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { Content, GoogleGenerativeAI, Part, SchemaType, Tool } from '@google/generative-ai';
import { createSystemPrompt } from './prompt';
import { getJson } from 'serpapi';

const configFileName = 'config.json';
type StoreData = { 
  apiKey: string,
  userDescription?: string,
  serpApiKey: string
};

function getConfigPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, configFileName);
}

function readStore(): StoreData {
  const configPath = getConfigPath();
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    return { apiKey: '', userDescription: '', serpApiKey: '' };
  }
}

function writeToStore(key: keyof StoreData, value: string) {
  const configPath = getConfigPath();
  const data = readStore();
  data[key] = value;
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

function createWindow() {
  const preloadScriptPath = path.join(__dirname, '../preload/index.js');

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    vibrancy: 'under-window',
    webPreferences: {
      preload: preloadScriptPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWindow.setContentProtection(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }
  if (process.platform === 'win32') {
    mainWindow.setContentProtection(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  const moveWindow = (x: number, y: number) => {
    const currentPosition = mainWindow.getPosition();
    mainWindow.setPosition(currentPosition[0] + x, currentPosition[1] + y);
  };
  globalShortcut.register('CommandOrControl+Right', () => moveWindow(50, 0));
  globalShortcut.register('CommandOrControl+Left', () => moveWindow(-50, 0));
  globalShortcut.register('CommandOrControl+Up', () => moveWindow(0, -50));
  globalShortcut.register('CommandOrControl+Down', () => moveWindow(0, 50));
  globalShortcut.register(`CommandOrControl+H`, () => mainWindow.isAlwaysOnTop() ? mainWindow.setAlwaysOnTop(false) : mainWindow.setAlwaysOnTop(true));
}

ipcMain.handle('invoke-ai', async (_, prompt: string, includeScreenshot: boolean, history: Content[]) => {
  const { apiKey, userDescription, serpApiKey } = readStore();
  if (!apiKey) return 'Gemini API Key not found. Please set it in Settings.';
  if (!serpApiKey) return 'SerpAPI Key not found. Please set it in Settings.';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemInstruction = createSystemPrompt(userDescription as string);
    
    // Define tools
    const tools = [
      {
        functionDeclarations: [
          {
            name: "execute_terminal_command",
            description: "Executes a shell command on the user's computer and returns the output. Use this for file system operations (ls, mkdir, touch, echo), running scripts, or any other terminal command.",
            parameters: { type: SchemaType.OBJECT, properties: { command: { type: SchemaType.STRING, description: "The command to execute." } }, required: ["command"] }
          },
          {
            name: "web_search",
            description: "Performs a web search to find recent information or data.",
            parameters: { type: SchemaType.OBJECT, properties: { query: { type: SchemaType.STRING, description: "The search query." } }, required: ["query"] }
          }
        ]
      }
    ];

    const modelName = "gemini-2.5-flash"

    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: { role: "system", parts: [{ text: systemInstruction }] }, tools });

    const chat = model.startChat({ history });
    const promptParts: Part[] = [{ text: prompt }];

    if (includeScreenshot) {
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
      const primarySource = sources[0];
      const imageB64 = primarySource.thumbnail.toDataURL().split(',')[1];
      promptParts.unshift({ inlineData: { mimeType: 'image/png', data: imageB64 } });
    }
    
    let result = await chat.sendMessage(promptParts);
    let response = await result.response;

    
    let functionCalls = response.functionCalls();
    while(functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      let toolResponse = { functionResponse: { name: call.name, response: {} } };

      if (call.name === 'execute_terminal_command') {
        const { command } = call.args;
        console.log(`[AI] Executing command: "${command}"`);
        const output = await new Promise<string>((resolve) => {
            exec(command, { cwd: app.getPath('desktop') }, (error, stdout, stderr) => {
                if (error) resolve(`Error: ${stderr}`);
                else resolve(stdout);
            });
        });
        toolResponse.functionResponse.response = { output };
      } 
      else if (call.name === 'web_search') {
        const { query } = call.args;
        console.log(`[AI] Performing web search for: "${query}"`);
        const searchResults = await getJson({ engine: "google", q: query, api_key: serpApiKey });
        toolResponse.functionResponse.response = {
          results: searchResults["organic_results"]?.map(r => ({ title: r.title, link: r.link, snippet: r.snippet })).slice(0, 5) || [],
          answer_box: searchResults["answer_box"] || null
        };
      }
      
      result = await chat.sendMessage([toolResponse as Part]);
      response = result.response;
      functionCalls = response.functionCalls();
    }
  
    
    return response.text();
    
  } catch (error) {
    console.error('Error invoking Gemini API:', error);
    return `Error: ${(error as Error).message}`;
  }
});


ipcMain.handle('get-api-key', () => readStore().apiKey);
ipcMain.handle('set-api-key', (_, key: string) => writeToStore('apiKey', key));
ipcMain.handle('get-user-description', () => readStore().userDescription);
ipcMain.handle('set-user-description', (_, desc: string) => writeToStore('userDescription', desc));
ipcMain.handle('get-serpapi-key', () => readStore().serpApiKey);
ipcMain.handle('set-serpapi-key', (_, key: string) => writeToStore('serpApiKey', key));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});