import { app, BrowserWindow, desktopCapturer, ipcMain } from "electron";
import { exec } from "child_process";
import * as fs from "fs/promises";
import { getJson } from "serpapi";
import {
  Content,
  GoogleGenerativeAI,
  Part,
  SchemaType,
  Tool,
} from "@google/generative-ai";
import { createMeetingCoachPrompt, createSystemPrompt } from "./prompt";
import { readStore, writeToStore } from "./store";

export function registerAIIpc() {
  ipcMain.handle(
    "invoke-ai",
    async (_, prompt: string, history: Content[], file?: { path: string }) => {
      const { apiKey, userDescription, serpApiKey } = readStore();
      if (!apiKey || !serpApiKey)
        return "API Keys not set. Please set them in Settings.";

      try {
        let limitedHistory = history.slice(-6);
        if (limitedHistory.length > 0) {
          while (
            limitedHistory.length > 0 &&
            limitedHistory[0].role === "model"
          ) {
            limitedHistory = limitedHistory.slice(1);
          }
          const validHistory: Content[] = [];
          let expectedRole: "user" | "model" = "user";
          for (const message of limitedHistory) {
            if (message.role === expectedRole) {
              validHistory.push(message);
              expectedRole = expectedRole === "user" ? "model" : "user";
            }
          }
          limitedHistory = validHistory;
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const systemPrompt = createSystemPrompt(userDescription as string);

        const systemInstruction = {
          role: "system",
          parts: [{ text: systemPrompt }],
        };

        const tools: Tool[] = [
          {
            functionDeclarations: [
              {
                name: "execute_terminal_command",
                description:
                  "Executes a shell command on the user's computer and returns the output.",
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    command: {
                      type: SchemaType.STRING,
                      description: "The command to execute.",
                    },
                  },
                  required: ["command"],
                },
              },
              {
                name: "take_screenshot",
                description:
                  "Takes a screenshot of the user's screen to see what's currently displayed. Use this when the user asks to read their screen, see what's on their screen, analyze their display, or when you need visual context of their current screen.",
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    reason: {
                      type: SchemaType.STRING,
                      description:
                        "Brief explanation of why the screenshot is needed.",
                    },
                  },
                  required: ["reason"],
                },
              },
              {
                name: "web_search",
                description:
                  "Performs a web search to find recent information or data.",
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    query: {
                      type: SchemaType.STRING,
                      description: "The search query.",
                    },
                  },
                  required: ["query"],
                },
              },
            ],
          },
        ];

        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction,
          tools,
        });
        const chat = model.startChat({ history: limitedHistory });

        const promptParts: Part[] = [{ text: prompt }];
        if (file) {
          try {
            const [fileBuffer, fileTypeModule] = await Promise.all([
              fs.readFile(file.path),
              eval("import('file-type')"),
            ]);
            const fileType = await fileTypeModule.fileTypeFromBuffer(
              fileBuffer
            );
            if (fileType) {
              promptParts.unshift({
                inlineData: {
                  mimeType: fileType.mime,
                  data: fileBuffer.toString("base64"),
                },
              });
            }
          } catch (error) {
            console.error("Error processing file:", error);
          }
        }

        let result = await chat.sendMessage(promptParts);
        let response = result.response;

        let functionCalls = response.functionCalls();
        let callCount = 0;
        const maxCalls = 3;

        while (
          functionCalls &&
          functionCalls.length > 0 &&
          callCount < maxCalls
        ) {
          const call = functionCalls[0];
          const toolResponse: Part = {
            functionResponse: { name: call.name, response: {} },
          };

          console.log(`[AI Tool Call] Name: ${call.name}, Args:`, call.args);

          try {
            switch (call.name) {
              case "execute_terminal_command": {
                const commandResult = await Promise.race([
                  new Promise<{ stdout: string; stderr: string }>((resolve) =>
                    exec(
                      call.args.command as string,
                      { cwd: app.getPath("desktop"), timeout: 10000 },
                      (err, stdout, stderr) =>
                        resolve({ stdout, stderr: err ? stderr : "" })
                    )
                  ),
                  new Promise<{ stdout: string; stderr: string }>((_, reject) =>
                    setTimeout(
                      () => reject(new Error("Command timeout")),
                      10000
                    )
                  ),
                ]);
                (toolResponse.functionResponse as any).response = commandResult;
                break;
              }
              case "take_screenshot": {
                try {
                  const sources = await desktopCapturer.getSources({
                    types: ["screen"],
                    thumbnailSize: { width: 1280, height: 720 },
                  });
                  const imageBuffer = sources[0].thumbnail.toPNG();
                  const screenshotData = {
                    inlineData: {
                      mimeType: "image/png",
                      data: imageBuffer.toString("base64"),
                    },
                  };
                  const screenshotResult = await chat.sendMessage([
                    {
                      text: `Here's the current screen content. ${
                        call.args.reason || "User requested screen analysis."
                      }`,
                    },
                    screenshotData,
                  ]);
                  (toolResponse.functionResponse as any).response = {
                    success: true,
                    message: "Screenshot taken and analyzed successfully",
                  };
                  response = screenshotResult.response;
                } catch (screenshotError) {
                  (toolResponse.functionResponse as any).response = {
                    error: `Screenshot failed: ${
                      (screenshotError as Error).message
                    }`,
                  };
                }
                break;
              }
              case "web_search": {
                const { serpApiKey } = readStore();
                const searchResults = await Promise.race([
                  getJson({
                    engine: "google",
                    q: call.args.query as string,
                    api_key: serpApiKey,
                  }),
                  new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Search timeout")), 8000)
                  ),
                ]);
                (toolResponse.functionResponse as any).response = {
                  results:
                    (searchResults as any)["organic_results"]
                      ?.map((r: any) => ({
                        title: r.title,
                        link: r.link,
                        snippet: r.snippet,
                      }))
                      .slice(0, 3) || [],
                  answer_box: (searchResults as any)["answer_box"] || null,
                };
                break;
              }
              default: {
                (toolResponse.functionResponse as any).response = {
                  error: `Unknown tool called: ${call.name}`,
                };
              }
            }
          } catch (error) {
            (toolResponse.functionResponse as any).response = {
              error: `Tool execution failed: ${(error as Error).message}`,
            };
          }

          if (call.name !== "take_screenshot") {
            result = await chat.sendMessage([toolResponse]);
            response = result.response;
          }

          functionCalls = response.functionCalls();
          callCount++;
        }

        return response.text();
      } catch (error) {
        console.error("Error invoking Gemini API:", error);
        return `Error: ${(error as Error).message}`;
      }
    }
  );

  ipcMain.handle(
    "invoke-ai-stream",
    async (
      event,
      requestId: string,
      prompt: string,
      history: Content[],
      file?: { path: string }
    ) => {
      const { apiKey, userDescription, serpApiKey } = readStore();
      if (!apiKey) {
        event.sender.send("ai-stream-error", {
          requestId,
          error: "API Key not set. Please set it in Settings.",
        });
        return;
      }
      try {
        let limitedHistory = history.slice(-6);
        if (limitedHistory.length > 0) {
          while (
            limitedHistory.length > 0 &&
            limitedHistory[0].role === "model"
          )
            limitedHistory = limitedHistory.slice(1);
          const validHistory: Content[] = [];
          let expectedRole: "user" | "model" = "user";
          for (const message of limitedHistory) {
            if (message.role === expectedRole) {
              validHistory.push(message);
              expectedRole = expectedRole === "user" ? "model" : "user";
            }
          }
          limitedHistory = validHistory;
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const systemPrompt = createSystemPrompt(userDescription as string);
        const systemInstruction = {
          role: "system",
          parts: [{ text: systemPrompt }],
        } as Content;
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "execute_terminal_command",
                  description:
                    "Executes a shell command on the user's computer and returns the output.",
                  parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                      command: {
                        type: SchemaType.STRING,
                        description: "The command to execute.",
                      },
                    },
                    required: ["command"],
                  },
                },
                {
                  name: "take_screenshot",
                  description:
                    "Takes a screenshot of the user's screen to see what's currently displayed.",
                  parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                      reason: {
                        type: SchemaType.STRING,
                        description:
                          "Brief explanation of why the screenshot is needed.",
                      },
                    },
                    required: ["reason"],
                  },
                },
                {
                  name: "web_search",
                  description:
                    "Performs a web search to find recent information or data.",
                  parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                      query: {
                        type: SchemaType.STRING,
                        description: "The search query.",
                      },
                    },
                    required: ["query"],
                  },
                },
              ],
            },
          ],
        });
        const chat = model.startChat({ history: limitedHistory });

        const promptParts: Part[] = [{ text: prompt }];
        if (file) {
          try {
            const [fileBuffer, fileTypeModule] = await Promise.all([
              fs.readFile(file.path),
              eval("import('file-type')"),
            ]);
            const fileType = await fileTypeModule.fileTypeFromBuffer(
              fileBuffer
            );
            if (fileType)
              promptParts.unshift({
                inlineData: {
                  mimeType: fileType.mime,
                  data: fileBuffer.toString("base64"),
                },
              });
          } catch (error) {
            console.error("Error processing file for stream:", error);
          }
        }

        const executeToolCall = async (
          call: any
        ): Promise<{ followupParts?: Part[]; toolResponsePart?: Part }> => {
          const toolResponse: Part = {
            functionResponse: { name: call.name, response: {} },
          };
          try {
            switch (call.name) {
              case "execute_terminal_command": {
                const commandResult = await Promise.race([
                  new Promise<{ stdout: string; stderr: string }>((resolve) =>
                    exec(
                      call.args.command as string,
                      { cwd: app.getPath("desktop"), timeout: 10000 },
                      (err, stdout, stderr) =>
                        resolve({ stdout, stderr: err ? stderr : "" })
                    )
                  ),
                  new Promise<{ stdout: string; stderr: string }>((_, reject) =>
                    setTimeout(
                      () => reject(new Error("Command timeout")),
                      10000
                    )
                  ),
                ]);
                (toolResponse.functionResponse as any).response = commandResult;
                return { toolResponsePart: toolResponse };
              }
              case "take_screenshot": {
                try {
                  const sources = await desktopCapturer.getSources({
                    types: ["screen"],
                    thumbnailSize: { width: 1280, height: 720 },
                  });
                  const imageBuffer = sources[0].thumbnail.toPNG();
                  const reasonText = `Here's the current screen content. ${
                    call.args?.reason || "User requested screen analysis."
                  }`;
                  const followupParts: Part[] = [
                    { text: reasonText },
                    {
                      inlineData: {
                        mimeType: "image/png",
                        data: imageBuffer.toString("base64"),
                      },
                    } as any,
                  ];
                  return { followupParts };
                } catch (screenshotError) {
                  (toolResponse.functionResponse as any).response = {
                    error: `Screenshot failed: ${
                      (screenshotError as Error).message
                    }`,
                  };
                  return { toolResponsePart: toolResponse };
                }
              }
              case "web_search": {
                try {
                  const searchResults = await Promise.race([
                    getJson({
                      engine: "google",
                      q: call.args.query as string,
                      api_key: serpApiKey,
                    }),
                    new Promise((_, reject) =>
                      setTimeout(
                        () => reject(new Error("Search timeout")),
                        8000
                      )
                    ),
                  ]);
                  (toolResponse.functionResponse as any).response = {
                    results:
                      (searchResults as any)["organic_results"]
                        ?.map((r: any) => ({
                          title: r.title,
                          link: r.link,
                          snippet: r.snippet,
                        }))
                        .slice(0, 3) || [],
                    answer_box: (searchResults as any)["answer_box"] || null,
                  };
                } catch (err) {
                  (toolResponse.functionResponse as any).response = {
                    error: `Search failed: ${(err as Error).message}`,
                  };
                }
                return { toolResponsePart: toolResponse };
              }
              default: {
                (toolResponse.functionResponse as any).response = {
                  error: `Unknown tool called: ${call.name}`,
                };
                return { toolResponsePart: toolResponse };
              }
            }
          } catch (e) {
            (toolResponse.functionResponse as any).response = {
              error: `Tool execution failed: ${(e as Error).message}`,
            };
            return { toolResponsePart: toolResponse };
          }
        };

        const maxRetries = 3;
        let attempt = 0;
        while (true) {
          try {
            let partsToSend: Part[] = promptParts;
            let callsHandled = 0;
            const maxCalls = 3;
            while (true) {
              const result = await chat.sendMessageStream(partsToSend);
              for await (const chunk of result.stream) {
                try {
                  const chunkText = (chunk as any).text
                    ? (chunk as any).text()
                    : "";
                  if (chunkText)
                    event.sender.send("ai-stream-chunk", {
                      requestId,
                      text: chunkText,
                    });
                } catch {}
              }
              const response = await result.response;
              let functionCalls: any[] | null = null;
              try {
                const fc = (response as any).functionCalls
                  ? (response as any).functionCalls()
                  : undefined;
                if (fc && fc.length) functionCalls = fc as any[];
              } catch {}
              if (
                functionCalls &&
                functionCalls.length &&
                callsHandled < maxCalls
              ) {
                const call = functionCalls[0];
                const execResult = await executeToolCall(call);
                if (
                  execResult.followupParts &&
                  execResult.followupParts.length
                ) {
                  partsToSend = execResult.followupParts;
                } else if (execResult.toolResponsePart) {
                  partsToSend = [execResult.toolResponsePart];
                } else {
                  partsToSend = [{ text: "" }];
                }
                callsHandled++;
                continue;
              }
              const finalText = response.text();
              event.sender.send("ai-stream-end", { requestId, finalText });
              break;
            }
            break;
          } catch (err: any) {
            const status = err?.status;
            if ((status === 503 || status === 429) && attempt < maxRetries) {
              const backoffMs = 500 * Math.pow(2, attempt);
              await new Promise((r) => setTimeout(r, backoffMs));
              attempt++;
              continue;
            }
            throw err;
          }
        }
      } catch (error: any) {
        console.error("Error in invoke-ai-stream:", error);
        event.sender.send("ai-stream-error", {
          requestId,
          error:
            error?.status === 503
              ? "The model is overloaded. Please try again shortly."
              : error?.status === 429
              ? "Rate limited. Please slow down and try again."
              : (error as Error).message,
        });
      }
    }
  );

  ipcMain.handle(
    "invoke-coach",
    async (_, transcript: string, meetingContext: string) => {
      const { apiKey } = readStore();
      if (!apiKey) return "API Key not set. Please set it in Settings.";
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = createMeetingCoachPrompt(transcript, meetingContext);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        BrowserWindow.getAllWindows()[0].webContents.send(
          "coach-response",
          text
        );
      } catch (error) {
        console.error("Error invoking Gemini API for coach:", error);
        BrowserWindow.getAllWindows()[0].webContents.send(
          "coach-response-error",
          (error as Error).message
        );
      }
    }
  );

  ipcMain.handle("get-api-key", () => {
    const { apiKey } = readStore();
    return apiKey;
  });

  ipcMain.handle("set-api-key", (_, key: string) => {
    writeToStore("apiKey", key);
  });

  ipcMain.handle("get-serpapi-key", () => {
    const { serpApiKey } = readStore();
    return serpApiKey;
  });

  ipcMain.handle("set-serpapi-key", (_, key: string) => {
    writeToStore("serpApiKey", key);
  });

  ipcMain.handle("get-user-description", () => {
    const { userDescription } = readStore();
    return userDescription;
  });

  ipcMain.handle("set-user-description", (_, desc: string) => {
    writeToStore("userDescription", desc);
  });
}
