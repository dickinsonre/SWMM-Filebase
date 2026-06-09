# 🗂️ SWMM Filebase

![SWMM](https://img.shields.io/badge/SWMM-Filebase-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-74%25-3178C6)
![Vite](https://img.shields.io/badge/Build-Vite-646CFF)
![Replit](https://img.shields.io/badge/Live-Replit-orange)
![License](https://img.shields.io/badge/License-MIT-green)

A web-based **file manager and viewer for SWMM model files** — organize, search, preview, and export your stormwater modeling files, with support for both EPA SWMM `.inp` files and XP-SWMM (`.xp`) files.

🔗 **Live app:** [replit.com/@robertdickinson/SWMM-Filebase](https://replit.com/@robertdickinson/SWMM-Filebase)

---

## About

SWMM Filebase is an interactive web application for managing a library of SWMM modeling files. Instead of digging through folders on disk, it provides a browser-based interface to **load, view, search, pin, and export** model files — making it easier to keep large collections of stormwater models organized and accessible.

A key feature is its ability to handle **XP files alongside standard INP files**, bridging traditional EPA SWMM5 inputs and XP-SWMM project files in a single interface.

This project is part of Robert Dickinson's broader SWMM5 tooling ecosystem.

## What's Inside

| Folder | Purpose |
|---|---|
| `client/` | Front-end web application (TypeScript, Vite) |
| `server/` | Back-end logic for file management and INP/XP file handling |
| `shared/` | Shared types and code used by both client and server |
| `script/` | Build and configuration scripts |
| `attached_assets/` | Project assets and metadata |
| `.agents/` | Project documentation and handover notes |

## Features

- 📁 Manage and browse a library of SWMM model files
- 👁️ View and preview **INP** and **XP** files in the browser
- 🔍 Search across files
- 📌 Pin frequently used files for quick access
- 📤 Export files
- 🔗 INP + XP file support side by side

## Tech Stack

- **Frontend:** TypeScript, Vite, CSS
- **Backend:** Node/server layer with Drizzle ORM
- **Database config:** `drizzle.config.ts`
- **Languages:** TypeScript, JavaScript, CSS, HTML

## Getting Started

```bash
# Clone the repository
git clone https://github.com/dickinsonre/SWMM-Filebase.git
cd SWMM-Filebase

# Install dependencies
npm install

# Start the development server
npm run dev
```

> Check `package.json` for the exact available scripts (dev, build, preview). The app also runs directly on Replit via the live link above.

## Documentation

See `handover.md` and `replit.md` for project structure, architecture details, and future improvement ideas.

## License

Released under the **MIT License**.
