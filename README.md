# MD Reader

A Visual Studio Code-like Markdown reader built with Electron, Monaco Editor, and Marked.

## Features

- Real-time Markdown editing with Monaco Editor
- Live preview with synchronized scrolling
- Syntax highlighting for code blocks with Prism.js
- Light/dark theme toggle
- File drag & drop support
- Standard file operations (Open, Save, Save As)
- Windows file association for .md files
- VS Code-like styling and user experience

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/MDReader.git
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the application in development mode:
   ```
   npm start
   ```

4. Build the application for production:
   ```
   npm run build
   ```

## Usage

- Open Markdown files using the File menu or drag and drop
- Edit Markdown content in the left panel
- See live preview in the right panel
- Toggle between light and dark themes using the "Toggle Theme" button
- Save your work using Ctrl+S or the File menu

## Development

This project uses:

- **Electron** for cross-platform desktop application framework
- **Monaco Editor** for the editing experience (same editor as VS Code)
- **Marked** for Markdown parsing
- **Prism.js** for syntax highlighting
- **Electron Builder** for packaging and distribution

## Roadmap

See [ROADMAP.md](ROADMAP.md) for future development plans.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.