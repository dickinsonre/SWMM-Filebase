# SWMM5 Network Miner

## Overview
SWMM5 Network Miner is a full-stack web application designed for comprehensive management, analysis, and visualization of SWMM5 (`.inp`) and XPSWMM (`.xp`) stormwater model files. Its core purpose is to provide a central platform for engineers and urban planners to interact with stormwater models, offering functionalities like file upload, directory-based organization, advanced structural analysis, AI-powered health diagnostics, side-by-side model comparison, and interactive visualizations. The application aims to streamline the workflow for managing large libraries of stormwater models, enhance understanding through rich data representation, and improve model quality through automated analysis and discretization tools. With capabilities to parse, store, and analyze thousands of models, it serves as a critical tool for detailed structural analysis and insights into stormwater network performance and design.

## User Preferences
- Preferred communication style: Simple, everyday language.
- App name must always be "SWMM5 Network Miner" (not "SWMM 5 Miner" or "SWMM5 Miner").
- Supports both `.inp` (SWMM5) and `.xp` (XPSWMM) file formats.

## System Architecture

### Frontend Architecture
- **Framework**: React 19 with TypeScript.
- **Routing**: Wouter.
- **State Management**: React Context (`FileContext`, `ThemeContext`) for global states, TanStack Query for server state caching.
- **UI Components**: shadcn/ui library built on Radix UI primitives.
- **Styling**: Tailwind CSS v4 with custom themes and CSS variables.
- **Animations**: Framer Motion for transitions.
- **Build Tool**: Vite.
- **UI/UX Decisions**:
    - **Dashboard**: Features a stats bar, quick access for pinned/recent files, filename/content search, filters by node/link counts and directories, and sorting options.
    - **FileCard**: Displays metadata, content viewer/editor, standard SVG and Minecraft-style voxel map visualizations, and external app integrations.
    - **Compare Models**: Side-by-side visual diff for two selected files.
    - **AI Analysis**: Health score (0-100) based on structural checks, categorized issues (Errors, Warnings, Info), section completeness, and percentile comparisons.
    - **Insights**: Six interactive, pure CSS visualizations for pipe diameter, cross-section shape, Manning's n, conduit length, offset patterns, and model complexity.
    - **ReSWMM**: Configuration for conduit discretization methods (Fixed Interval, Dx/D Ratio).
    - **Settings**: Dark mode toggle and multiple color themes (EPA, UF, Oregon State, Auburn) with live previews, persisted in local storage.
    - **Theme System**: Dynamic CSS class application to `document.documentElement` (`.theme-epa`, `.dark.theme-epa`, etc.) with an anti-flash inline script.

### Backend Architecture
- **Runtime**: Node.js with Express.
- **Language**: TypeScript.
- **API Pattern**: RESTful API with JSON responses.
- **File Uploads**: Multer middleware supporting `.inp` and `.xp` files, with server-side duplicate detection based on filename and directory.
- **INP Parser**: Extracts metadata (node, link, subcatchment counts) from `.inp` files by analyzing section headers and data lines.
- **ReSWMM Engine**: Integrates a conduit discretization engine to split long conduits, modifying various sections of the INP file.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM for metadata.
- **Object Storage**: Replit Object Storage (Google Cloud Storage backend) for raw `.inp` and `.xp` file content.
- **Schema**: Defined in `shared/schema.ts` using Drizzle ORM.

## External Dependencies

### Core
- **PostgreSQL**: Primary relational database.
- **Drizzle ORM**: Type-safe ORM for database interactions.
- **Replit Object Storage**: Cloud-based storage for raw model files.

### Frontend
- **React**: UI library.
- **Wouter**: Client-side router.
- **@tanstack/react-query**: Server state management.
- **Radix UI**: Accessible UI component primitives.
- **Framer Motion**: Animation library.
- **Lucide React**: Icon library.
- **Tailwind CSS**: Utility-first CSS framework.

### Backend
- **Express**: Web application framework.
- **Multer**: Middleware for handling `multipart/form-data`.
- **Archiver**: Library for creating `.zip` archives.