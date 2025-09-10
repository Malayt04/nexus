import { ipcMain } from "electron";
import * as path from "path";
import * as fs from "fs/promises";
import crypto from "crypto";
import { chatsPath, manifestPath, readManifest, readStore } from "./store";
import { Content, GoogleGenerativeAI } from '@google/generative-ai';

export function registerHistoryIpc() {
  ipcMain.handle("history:getAllChats", async () => {
    const manifest = await readManifest();
    manifest.sort(
      (a: any, b: any) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return manifest;
  });

  ipcMain.handle("history:getChatContent", async (_, chatId: string) => {
    const filePath = path.join(chatsPath, `chat_${chatId}.json`);
    try {
      const fileData = await fs.readFile(filePath, "utf-8");
      return JSON.parse(fileData);
    } catch (error) {
      console.error(`Could not read chat file for ID ${chatId}:`, error);
      return null;
    }
  });

  ipcMain.handle(
    "history:saveChat",
    async (
      _,
      {
        chatId,
        messagesToAppend,
      }: { chatId: string | null; messagesToAppend: any[] }
    ) => {
      const manifest = await readManifest();
      const now = new Date().toISOString();
      let currentChatId = chatId;

      if (!currentChatId) {
        const newChatId = crypto.randomUUID();
        const newChat = { messages: messagesToAppend };
        const newFilePath = path.join(chatsPath, `chat_${newChatId}.json`);
        await fs.writeFile(newFilePath, JSON.stringify(newChat, null, 2));

        const newTitle = `Chat ${manifest.length + 1}`;
        manifest.push({
          id: newChatId,
          title: newTitle,
          createdAt: now,
          updatedAt: now,
        });
        currentChatId = newChatId;
      } else {
        const chatFilePath = path.join(chatsPath, `chat_${currentChatId}.json`);
        try {
          const fileData = await fs.readFile(chatFilePath, "utf-8");
          const existingChat = JSON.parse(fileData);
          existingChat.messages.push(...messagesToAppend);
          await fs.writeFile(
            chatFilePath,
            JSON.stringify(existingChat, null, 2)
          );

          const chatInManifest = manifest.find(
            (c: any) => c.id === currentChatId
          );
          if (chatInManifest) chatInManifest.updatedAt = now;
        } catch (error) {
          console.error("Error updating chat:", error);
          return null;
        }
      }

      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      return currentChatId;
    }
  );

  
ipcMain.handle("history:deleteChat", async (_, chatId: string) => {
    const manifest = await readManifest();
    const updatedManifest = manifest.filter((chat: any) => chat.id !== chatId);
    const chatFilePath = path.join(chatsPath, `chat_${chatId}.json`);

    try {
      await fs.unlink(chatFilePath);
      await fs.writeFile(
        manifestPath,
        JSON.stringify(updatedManifest, null, 2)
      );
      return true;
    } catch (error) {
      console.error(`Failed to delete chat ${chatId}:`, error);
      return false;
    }
  });

  ipcMain.handle(
  "history:generateTitle",
  async (_, chatId: string, history: Content[]) => {
    const { apiKey } = readStore();
    if (!apiKey || !history || history.length < 2) {
      console.log("Not enough context to generate a title.");
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Use only the first user message for title generation
      const firstUserMessage = history.find((h) => h.role === "user");
      if (!firstUserMessage) return;

      const messageText = firstUserMessage.parts[0].text.slice(0, 200); // Limit to 200 chars
      const titlePrompt = `Create a 3-4 word title for this query: "${messageText}". No quotes.`;

      const result = await model.generateContent(titlePrompt);
      let title = result.response
        .text()
        .trim()
        .replace(/^"|"|"$/g, "");

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
  }
);
}

