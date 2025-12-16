# 🦙 RepoLlama

**Local AI Code Assistant** with a premium, privacy-focused interface.

RepoLlama is a Next.js application that allows you to **chat with your codebase** completely locally. It ingests your git repositories, creates vector embeddings using clean local models (Ollama), and provides a context-aware chat interface to ask questions, debug errors, and generate code.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Ollama](https://img.shields.io/badge/AI-Ollama-white)

---

## 🎥 Demo

See RepoLlama in action:

<video src="public/demo.mp4" controls width="100%"></video>

> *Video not playing? [Download the demo](public/demo.mp4)*

---

## ✨ Features

-   **🔒 100% Local & Private**: No data leaves your machine. Powered by [Ollama](https://ollama.com).
-   **📚 Repository Ingestion**:
    -   Recursively scans your codebase (`walkRepo`).
    -   Smartly ignores noise (`node_modules`, `dist`, binaries).
    -   Chunks and embeds code for efficient RAG (Retrieval-Augmented Generation).
-   **💬 "Repo Whisperer" Persona**:
    -   Intelligent, context-grounded answers.
    -   Cites specific files and sources.
    -   Premium Markdown rendering with syntax highlighting.
-   **🎨 Premium UI**:
    -   **Deep Dark Mode**: Inspired by tools like Linear/Vercel.
    -   **Glassmorphism**: Subtle blurs, floating panels, and refined spacing.
    -   **Smooth Animations**: Polished transitions and loading states.

---

## 🚀 Getting Started

### Prerequisites

1.  **Node.js**: v18+ installed.
2.  **Ollama**: Installed and running (`ollama serve`).
    *   **Models**: You need `llama3.2` (or similar) and `nomic-embed-text`.
    ```bash
    ollama pull llama3.2
    ollama pull nomic-embed-text
    ```

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/repo-llama.git
    cd repo-llama
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    # or use the LAUNCH_REPOLLAMA.bat launcher!
    ```

4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Usage

### 1. Ingest a Repository
-   On the **Home Screen**, enter the absolute path to a folder on your computer (e.g., `C:\Projects\MyCoolApp`).
-   (Optional) Give it a friendly nickname like "My Cool App".
-   Click **Start Ingestion**. RepoLlama will scan, chunk, and embed your code.

### 2. Chat with your Code
-   Select your context from the **Sidebar**.
-   Ask questions like:
    -   *"How does the authentication flow work?"*
    -   *"Where is the User component defined?"*
    -   *"Refactor utils.ts to use async/await."*
-   The AI will answer using the actual code from your project as context.

---

## ⚙️ Configuration

-   **Models**: Configured in `lib/qa/askModel.ts` and `lib/ingest/embedChunks.ts`.
-   **UI Theme**: Global styles in `app/globals.css` (Tailwind CSS).
-   **File Ignore List**: robust patterns defined in `lib/ingest/walkRepo.ts`.

---

Built with ❤️ by *Yulchan*
