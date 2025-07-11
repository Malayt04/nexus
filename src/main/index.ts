import { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut } from 'electron'
import * as path from 'path'
import * as fs from 'fs/promises'
import { exec } from 'child_process'
import { Content, GoogleGenerativeAI, Part, SchemaType, Tool } from '@google/generative-ai'
import {createMeetingCoachPrompt, createSystemPrompt } from './prompt'
import { getJson } from 'serpapi'
import crypto from 'crypto'
import vad from '@ricky0123/vad-web'


const configFileName = 'config.json'
type StoreData = {
  apiKey: string
  userDescription?: string
  serpApiKey: string
}

function getConfigPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, configFileName)
}

function readStore(): StoreData {
  const configPath = getConfigPath()
  try {
    return JSON.parse(require('fs').readFileSync(configPath, 'utf8'))
  } catch (error) {
    return { apiKey: '', userDescription: '', serpApiKey: '' }
  }
}

function writeToStore(key: keyof StoreData, value: string) {
  const configPath = getConfigPath()
  const data = readStore()
  data[key] = value
  require('fs').writeFileSync(configPath, JSON.stringify(data, null, 2))
}

const manifestPath = path.join(app.getPath('userData'), 'history_manifest.json')
const chatsPath = path.join(app.getPath('userData'), 'chats')

async function ensureStoragePathsExist() {
  try {
    await fs.mkdir(chatsPath, { recursive: true })
    await fs.access(manifestPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.writeFile(manifestPath, JSON.stringify([]))
    } else {
      console.error('Error ensuring storage paths:', error)
    }
  }
}

async function readManifest() {
  try {
    const data = await fs.readFile(manifestPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Could not read manifest, returning empty array.', error)
    return []
  }
}

// Track overlay interaction state
let isOverlayInteractive = false

function createWindow() {
  const preloadScriptPath = path.join(__dirname, '../preload/index.js')

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    vibrancy: 'under-window',
    icon: path.join(__dirname, '../../resources/nexus-icon.png'), // Add your icon here
    webPreferences: {
      preload: preloadScriptPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Set initial state to pass-through (non-interactive)
  mainWindow.setIgnoreMouseEvents(true, { forward: true })

  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    mainWindow.setContentProtection(true)
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
  }
  if (process.platform === 'win32') {
    mainWindow.setContentProtection(true)
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
  }
  
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL'] || 'http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  const moveWindow = (x: number, y: number) => {
    const currentPosition = mainWindow.getPosition()
    mainWindow.setPosition(currentPosition[0] + x, currentPosition[1] + y)
  }
  
  // Function to toggle overlay interaction mode
  const toggleOverlayInteraction = () => {
    isOverlayInteractive = !isOverlayInteractive
    mainWindow.setIgnoreMouseEvents(!isOverlayInteractive, { forward: true })
    
    // Send state to renderer for UI feedback
    mainWindow.webContents.send('overlay-state-changed', isOverlayInteractive)
    
    console.log(`Overlay is now ${isOverlayInteractive ? 'interactive' : 'pass-through'}`)
  }
  
  // Register keyboard shortcuts
  globalShortcut.register('CommandOrControl+Right', () => moveWindow(50, 0))
  globalShortcut.register('CommandOrControl+Left', () => moveWindow(-50, 0))
  globalShortcut.register('CommandOrControl+Up', () => moveWindow(0, -50))
  globalShortcut.register('CommandOrControl+Down', () => moveWindow(0, 50))
  globalShortcut.register(`CommandOrControl+H`, () =>
    mainWindow.isAlwaysOnTop() ? mainWindow.setAlwaysOnTop(false) : mainWindow.setAlwaysOnTop(true)
  )
  
  // Main toggle shortcut - Ctrl+Enter to toggle interaction mode
  globalShortcut.register('CommandOrControl+Return', toggleOverlayInteraction)
  
  // Alternative shortcuts for different functions
  globalShortcut.register('CommandOrControl+Shift+Return', () => {
    // Force interactive mode and focus input
    isOverlayInteractive = true
    mainWindow.setIgnoreMouseEvents(false)
    mainWindow.webContents.send('overlay-state-changed', isOverlayInteractive)
    mainWindow.webContents.send('focus-input')
    console.log('Overlay activated and input focused')
  })
  
  globalShortcut.register('CommandOrControl+Escape', () => {
    // Force pass-through mode
    isOverlayInteractive = false
    mainWindow.setIgnoreMouseEvents(true, { forward: true })
    mainWindow.webContents.send('overlay-state-changed', isOverlayInteractive)
    console.log('Overlay set to pass-through mode')
  })
  
  // Screenshot toggle shortcut - Ctrl+S to toggle screenshot mode
  globalShortcut.register('CommandOrControl+S', () => {
    // Only send if the window is focused and interactive
    if (mainWindow.isFocused() || isOverlayInteractive) {
      mainWindow.webContents.send('toggle-screenshot')
      console.log('Screenshot mode toggled')
    }
  })
}

ipcMain.handle(
  'invoke-ai',
  async (
    _,
    prompt: string,
    includeScreenshot: boolean,
    history: Content[],
    file?: { path: string }
  ) => {
    const { apiKey, userDescription, serpApiKey } = readStore()
    if (!apiKey || !serpApiKey) return 'API Keys not set. Please set them in Settings.'

    try {
      // Limit history to last 6 messages (3 exchanges) for faster processing
      let limitedHistory = history.slice(-6)
      
      // Ensure history starts with 'user' role and alternates properly for Gemini API compatibility
      if (limitedHistory.length > 0) {
        // Remove any leading 'model' messages
        while (limitedHistory.length > 0 && limitedHistory[0].role === 'model') {
          limitedHistory = limitedHistory.slice(1)
        }
        
        // Ensure alternating pattern: user -> model -> user -> model
        const validHistory: Content[] = []
        let expectedRole: 'user' | 'model' = 'user'
        
        for (const message of limitedHistory) {
          if (message.role === expectedRole) {
            validHistory.push(message)
            expectedRole = expectedRole === 'user' ? 'model' : 'user'
          }
        }
        
        limitedHistory = validHistory
      }
      
      const genAI = new GoogleGenerativeAI(apiKey)
      const systemPrompt = createSystemPrompt(userDescription as string)
      
      const systemInstruction = {
        role: 'system',
        parts: [{ text: systemPrompt }]
      }

      const tools: Tool[] = [
        {
          functionDeclarations: [
            {
              name: 'execute_terminal_command',
              description: "Executes a shell command on the user's computer and returns the output.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: { command: { type: SchemaType.STRING, description: 'The command to execute.' } },
                required: ['command']
              }
            },
            {
              name: 'web_search',
              description: 'Performs a web search to find recent information or data.',
              parameters: {
                type: SchemaType.OBJECT,
                properties: { query: { type: SchemaType.STRING, description: 'The search query.' } },
                required: ['query']
              }
            }
          ]
        }
      ]

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction, tools })
      const chat = model.startChat({ history: limitedHistory })

      const promptParts: Part[] = [{ text: prompt }]

      // Parallel processing for media attachments
      const mediaPromises: Promise<any>[] = []
      
      if (includeScreenshot) {
        mediaPromises.push(
          desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1280, height: 720 } // Reduced resolution for faster processing
          }).then(sources => {
            const imageBuffer = sources[0].thumbnail.toPNG()
            return {
              inlineData: {
                mimeType: 'image/png',
                data: imageBuffer.toString('base64')
              }
            }
          })
        )
      }
      
      if (file) {
        mediaPromises.push(
          Promise.all([
            fs.readFile(file.path),
            eval("import('file-type')")
          ]).then(async ([fileBuffer, fileTypeModule]) => {
            const fileType = await fileTypeModule.fileTypeFromBuffer(fileBuffer)
            if (fileType) {
              return {
                inlineData: {
                  mimeType: fileType.mime,
                  data: fileBuffer.toString('base64')
                }
              }
            }
            return null
          })
        )
      }

      // Wait for all media processing to complete
      const mediaResults = await Promise.all(mediaPromises)
      mediaResults.forEach(result => {
        if (result) promptParts.unshift(result)
      })

      let result = await chat.sendMessage(promptParts)
      let response = result.response

      // Handle function calls with timeout to prevent hanging
      let functionCalls = response.functionCalls()
      let callCount = 0
      const maxCalls = 3 // Limit function calls to prevent infinite loops
      
      while (functionCalls && functionCalls.length > 0 && callCount < maxCalls) {
        const call = functionCalls[0]
        const toolResponse: Part = { functionResponse: { name: call.name, response: {} } }

        console.log(`[AI Tool Call] Name: ${call.name}, Args:`, call.args)

        try {
          switch (call.name) {
            case 'execute_terminal_command':
              const commandResult = await Promise.race([
                new Promise<{ stdout: string; stderr: string }>((resolve) =>
                  exec(call.args.command as string, { cwd: app.getPath('desktop'), timeout: 10000 }, (err, stdout, stderr) =>
                    resolve({ stdout, stderr: err ? stderr : '' })
                  )
                ),
                new Promise<{ stdout: string; stderr: string }>((_, reject) => 
                  setTimeout(() => reject(new Error('Command timeout')), 10000)
                )
              ])
              toolResponse.functionResponse.response = commandResult
              break
            case 'web_search':
              const searchResults = await Promise.race([
                getJson({
                  engine: 'google',
                  q: call.args.query as string,
                  api_key: serpApiKey
                }),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Search timeout')), 8000)
                )
              ])
              toolResponse.functionResponse.response = {
                results:
                  searchResults['organic_results']
                    ?.map((r: any) => ({ title: r.title, link: r.link, snippet: r.snippet }))
                    .slice(0, 3) || [], // Reduced to 3 results for faster processing
                answer_box: searchResults['answer_box'] || null
              }
              break
            default:
              toolResponse.functionResponse.response = { error: `Unknown tool called: ${call.name}` }
          }
        } catch (error) {
          toolResponse.functionResponse.response = { error: `Tool execution failed: ${(error as Error).message}` }
        }

        result = await chat.sendMessage([toolResponse])
        response = await result.response
        functionCalls = response.functionCalls()
        callCount++
      }

      return response.text()
    } catch (error) {
      console.error('Error invoking Gemini API:', error)
      return `Error: ${(error as Error).message}`
    }
  }
)

ipcMain.handle('get-api-key', () => readStore().apiKey)
ipcMain.handle('set-api-key', (_, key: string) => writeToStore('apiKey', key))
ipcMain.handle('get-user-description', () => readStore().userDescription)
ipcMain.handle('set-user-description', (_, desc: string) => writeToStore('userDescription', desc))
ipcMain.handle('get-serpapi-key', () => readStore().serpApiKey)
ipcMain.handle('set-serpapi-key', (_, key: string) => writeToStore('serpApiKey', key))

// Overlay state management
ipcMain.handle('get-overlay-state', () => isOverlayInteractive)
ipcMain.handle('set-overlay-interactive', (_, interactive: boolean) => {
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    isOverlayInteractive = interactive
    mainWindow.setIgnoreMouseEvents(!interactive, { forward: true })
    mainWindow.webContents.send('overlay-state-changed', interactive)
    console.log(`Overlay set to ${interactive ? 'interactive' : 'pass-through'} mode via IPC`)
  }
})


let vadInstance: any;

ipcMain.handle('invoke-coach', async (_, transcript: string, meetingContext: string) => {
  const { apiKey } = readStore();
  if (!apiKey) {
    return 'API Key not set. Please set it in Settings.';
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = createMeetingCoachPrompt(transcript, meetingContext);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    BrowserWindow.getAllWindows()[0].webContents.send('coach-response', text);
  } catch (error) {
    console.error('Error invoking Gemini API for coach:', error);
    BrowserWindow.getAllWindows()[0].webContents.send('coach-response-error', (error as Error).message);
  }
});

ipcMain.handle('start-audio-listening', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { mandatory: { chromeMediaSource: 'desktop' } } as any });
    vadInstance = await vad.MicVAD.new({
      stream,
      onSpeechEnd: (audio) => {
        const transcript = '[...]'; // Placeholder for actual transcript
        ipcMain.emit('invoke-coach', transcript, '');
      },
    });
    vadInstance.start();
  } catch (error) {
    console.error('Error starting audio listening:', error);
  }
});

ipcMain.handle('stop-audio-listening', () => {
  if (vadInstance) {
    vadInstance.destroy();
    vadInstance = null;
  }
});


ipcMain.handle('history:getAllChats', async () => {
  const manifest = await readManifest();

  manifest.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return manifest;
});

ipcMain.handle('history:getChatContent', async (_, chatId: string) => {
    const filePath = path.join(chatsPath, `chat_${chatId}.json`);
    try {
      const fileData = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(fileData);
    } catch (error) {
      console.error(`Could not read chat file for ID ${chatId}:`, error);
      return null;
    }
});

ipcMain.handle('history:saveChat', async (_, { chatId, messagesToAppend }: { chatId: string | null, messagesToAppend: any[] }) => {
    const manifest = await readManifest();
    const now = new Date().toISOString();
    let currentChatId = chatId;

    if (!currentChatId) {
        const newChatId = crypto.randomUUID();
        const newChat = { messages: messagesToAppend };
        const newFilePath = path.join(chatsPath, `chat_${newChatId}.json`);
        await fs.writeFile(newFilePath, JSON.stringify(newChat, null, 2));

        const newTitle = `Chat ${manifest.length + 1}`;
        manifest.push({ id: newChatId, title: newTitle, createdAt: now, updatedAt: now });
        currentChatId = newChatId;
    } else {
        const chatFilePath = path.join(chatsPath, `chat_${currentChatId}.json`);
        try {
            const fileData = await fs.readFile(chatFilePath, 'utf-8');
            const existingChat = JSON.parse(fileData);
            existingChat.messages.push(...messagesToAppend);
            await fs.writeFile(chatFilePath, JSON.stringify(existingChat, null, 2));

            const chatInManifest = manifest.find((c: any) => c.id === currentChatId);
            if (chatInManifest) {
                chatInManifest.updatedAt = now;
            }
        } catch (error) {
            console.error("Error updating chat:", error);
            return null;
        }
    }

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    
    return currentChatId;
});


ipcMain.handle('history:deleteChat', async (_, chatId: string) => {
  const manifest = await readManifest();
  const updatedManifest = manifest.filter((chat: any) => chat.id !== chatId);
  
  const chatFilePath = path.join(chatsPath, `chat_${chatId}.json`);

  try {
    await fs.unlink(chatFilePath); 
    await fs.writeFile(manifestPath, JSON.stringify(updatedManifest, null, 2));
    return true;
  } catch (error) {
    console.error(`Failed to delete chat ${chatId}:`, error);
    return false;
  }
});

ipcMain.handle('history:generateTitle', async (_, chatId: string, history: Content[]) => {
    const { apiKey } = readStore();
    if (!apiKey || !history || history.length < 2) {
        console.log('Not enough context to generate a title.');
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Use only the first user message for title generation
        const firstUserMessage = history.find(h => h.role === 'user');
        if (!firstUserMessage) return;
        
        const messageText = firstUserMessage.parts[0].text.slice(0, 200); // Limit to 200 chars
        const titlePrompt = `Create a 3-4 word title for this query: "${messageText}". No quotes.`;

        const result = await model.generateContent(titlePrompt);
        let title = result.response.text().trim().replace(/^\"|\"|\"$/g, ''); 

        if (title) {
            const manifest = await readManifest();
            const chatIndex = manifest.findIndex((c: any) => c.id === chatId);
            if (chatIndex !== -1) {
                manifest[chatIndex].title = title;
                await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
                console.log(`Generated title for chat ${chatId}: "${title}"`);
            }
        }
    } catch (e) {
        console.error(`Could not generate title for chat ${chatId}:`, e);
    }
});


app.whenReady().then(() => {
  ensureStoragePathsExist() 
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})