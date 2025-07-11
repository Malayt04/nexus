# Nexus AI - Overlay Controls

This application now functions as a **click-through overlay** that allows background applications to remain active while the AI assistant is visible.

## Overlay States

- **Pass-through Mode**: Mouse clicks go through the overlay to the background application
- **Interactive Mode**: You can interact with the overlay (click buttons, type in inputs, etc.)

## Keyboard Shortcuts

### Main Controls
- **Ctrl + Enter**: Toggle between pass-through and interactive modes
- **Ctrl + Shift + Enter**: Force interactive mode and focus the input field
- **Ctrl + Escape**: Force pass-through mode (background apps remain active)
- **Ctrl + S**: Toggle screenshot mode (include screen in next AI query)

### Window Controls
- **Ctrl + Arrow Keys**: Move the overlay window
  - **Ctrl + Right**: Move window right
  - **Ctrl + Left**: Move window left
  - **Ctrl + Up**: Move window up
  - **Ctrl + Down**: Move window down
- **Ctrl + H**: Toggle always-on-top behavior

## Visual Indicators

- **Green "Interactive" indicator**: You can interact with the overlay
- **Red "Pass-through" indicator**: Mouse clicks go through to background apps
- **Green camera icon**: Screenshot mode is enabled (screen will be included in next query)
- **Keyboard shortcuts help**: Displayed in the bottom-left corner

## How It Works

1. **Default State**: The overlay starts in pass-through mode
2. **Background Apps Stay Active**: Your background applications remain active and receive mouse clicks
3. **Quick Activation**: Use Ctrl+Shift+Enter to quickly activate the overlay and start typing
4. **Automatic Return**: Use Ctrl+Escape to return to pass-through mode

## Use Cases

- **Coding**: Keep your IDE active while having AI assistance visible
- **Writing**: Use the AI assistant while working in your document editor
- **Research**: Keep your browser or research tools active while asking questions
- **Gaming**: Have the AI assistant available without interrupting your game

## Tips

- The overlay will remember its position between sessions
- Use Ctrl+Shift+Enter when you want to quickly ask a question
- Use Ctrl+Escape when you're done and want to return to your main work
- The keyboard shortcuts work globally - you don't need to focus the overlay first
