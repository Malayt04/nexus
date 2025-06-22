# Nexus AI Assistant 🤖

**Nexus** is an ambient, context-aware AI assistant that lives on your desktop. It's designed to be an "over-the-shoulder" partner, capable of seeing your screen, understanding your requests, and even performing actions on your computer, all while remaining invisible to screen recordings.

## ✨ Core Features

- **Context-Aware Vision:** Can analyze your screen to understand the context of your questions. Perfect for debugging code, summarizing articles, or getting help with any application.
- **Stealth Mode:** Remains completely invisible during screen shares or recordings, so you can get help without distracting others.
- **Always-On-Top & Transparent UI:** The sleek, translucent interface floats above your other windows, ensuring the assistant is always available at a glance.
- **Actionable Commands:** Go beyond chat. Instruct Nexus to create files, open applications, or browse folders directly on your desktop.
- **Live Internet Access:** Integrated with real-time web search to provide up-to-the-minute answers on current events and breaking news.
- **Personalized & Conversational:** Remembers your self-described profile and the current conversation to provide tailored, follow-up responses.
- **Desktop-Native Feel:** Fully draggable window and movable with `Ctrl/Cmd + Arrow Key` hotkeys.
- **Developer-Friendly:** Automatically formats and syntax-highlights code snippets in its responses.

## 🛠️ Tech Stack

- **Framework:** Electron
- **UI:** React & TypeScript
- **Styling:** Tailwind CSS
- **Bundler:** Vite
- **Core AI Model:** Google Gemini Pro & Vision
- **Web Search:** SerpAPI

## 🚀 Setup and Installation

### Prerequisites

- Node.js (v18 or later recommended)
- `npm` or `yarn` package manager

### 1. Clone the Repository

First, clone the project to your local machine:

```bash
git clone <your-repository-url>
cd assist
```

### 2. Install Dependencies

Install all the necessary packages for the project:

```bash
npm install
```

### 3. API Key Setup

The assistant requires two API keys to function:

- **Google Gemini API Key:** For the core AI and vision capabilities. Get one from [Google AI Studio](https://makersuite.google.com/app/apikey).
- **SerpAPI Key:** For the real-time web search tool. Get one from your [SerpAPI Dashboard](https://serpapi.com/dashboard). The free plan is sufficient.

**Note:** You do **not** need to put these keys in the code. The application will ask for them on the first run.

### 4. Run the Application

Launch the application in development mode. This will open the window and enable live-reloading for any code changes:

```bash
npm run dev
```

## 📖 How to Use

### 1. First-Time Setup

- **Setup Page:** On the very first launch, you'll be greeted by a **Setup Page**. Write a short paragraph describing yourself or what you do (e.g., "I'm a backend developer specializing in Go and Python."). This helps personalize the AI's responses.

- **Settings Page:** Next, you'll be taken to the **Settings Page**. Enter your Google Gemini API key and your SerpAPI key into the respective fields and click "Save & Continue".

### 2. Interacting with Nexus

#### Text Chat
Simply type a question and get an answer. The AI will remember your profile and the previous turns in the conversation.

**Example:** *"What do you know about me?"*

#### Screen Context
Check the **"Include Screenshot"** box before sending your message. Nexus will analyze your screen along with your text.

**Example:** *(While looking at a bug in your code)* *"Find the error in this function."*

#### Web Search
Ask a question about a recent event or a specific fact. The AI will automatically decide when to use its web search tool.

**Example:** *"What were the top headlines in tech news yesterday?"*

### 3. Action Commands

You can command Nexus to perform tasks. Try prompts like:

- `"Create a file on my desktop named 'test.txt' with the content 'Hello, World!'"`
- `"Open the Notes app for me."`

### 4. Window Management

- **Drag & Drop:** Click and drag the header bar of the application to move it.
- **Hotkeys:** Use `Ctrl + Arrow Keys` (or `Cmd + Arrow Keys` on macOS) to nudge the window's position on your screen.

## 🎯 Use Cases

### For Developers
- Debug code by showing your screen and asking for help
- Get explanations of complex code patterns
- Create files and folders quickly
- Open development tools and applications

### For Content Creators
- Summarize articles or documentation
- Get help with writing and editing
- Research topics with live web search
- Format content in various styles

### For General Productivity
- Quick file operations
- Application launching
- Context-aware assistance with any task
- Always-available help without disrupting workflow

## 🔧 Configuration

### Stealth Mode
Nexus automatically enters stealth mode during screen recordings and shares, making it invisible to others while remaining functional for you.

### Transparency
The interface transparency can be adjusted to suit your preferences and desktop environment.

### Hotkeys
- `Ctrl/Cmd + Arrow Keys`: Move window position
- Default positioning keeps the assistant accessible but unobtrusive

## 📝 Tips for Best Results

1. **Be Specific:** When asking for help with screen content, be clear about what you want to focus on.

2. **Use Action Commands:** Take advantage of the ability to perform file operations and launch applications.

3. **Leverage Context:** Include screenshots when the visual context is important to your question.

4. **Personalize:** Update your profile in settings to get more tailored responses.

5. **Combine Features:** Use web search for current information while leveraging your screen context for specific tasks.

## 🔒 Privacy & Security

- API keys are stored locally and never transmitted except to the respective services
- Screen captures are processed locally and only sent to AI services when explicitly requested
- No conversation data is stored permanently without your consent
- Stealth mode ensures privacy during screen shares

## 🤝 Contributing

Contributions to this project are welcomed.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section in our documentation
2. Search existing issues in the repository
3. Create a new issue with detailed information about your problem

---

**Made with ❤️ for productivity enthusiasts and developers who want an intelligent desktop companion.**