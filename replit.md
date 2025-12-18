# SWMM5 Manager

## Overview

SWMM5 Manager is a web application for managing, analyzing, and organizing SWMM5 (Storm Water Management Model) `.inp` files. The application allows users to upload, view, and organize stormwater modeling files with AI-powered analysis capabilities. It parses `.inp` files to extract metadata like node counts, link counts, and subcatchment counts, storing both the metadata and file content in a PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: React Context API for file state, TanStack Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **Animations**: Framer Motion for UI animations
- **Build Tool**: Vite

The frontend follows a component-based architecture with:
- Pages in `client/src/pages/` (Dashboard, AIAnalysis, NotFound)
- Reusable components in `client/src/components/`
- Context providers for global state in `client/src/context/`
- API client functions in `client/src/lib/api.ts`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (compiled with tsx for development, esbuild for production)
- **API Pattern**: RESTful API with JSON responses
- **File Uploads**: Multer middleware with in-memory storage

Key API endpoints:
- `GET /api/inp-files` - List all uploaded files
- `GET /api/inp-files/:id` - Get single file with content
- `POST /api/inp-files/upload` - Upload new `.inp` files
- `DELETE /api/inp-files/:id` - Remove a file

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Object Storage**: Replit Object Storage (Google Cloud Storage backend) for raw .inp file content
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit (`drizzle-kit push`)

Database tables:
- `users` - Basic user authentication (id, username, password)
- `inp_files` - SWMM5 file metadata (filename, directory, counts, objectPath reference)

Object Storage:
- Raw .inp file content stored in Replit Object Storage bucket
- Files stored at path: `/objects/inp-files/<uuid>-<filename>`
- Object storage service: `server/objectStorage.ts`
- ACL policies: `server/objectAcl.ts`

### INP File Parser
A custom parser (`server/inp-parser.ts`) extracts metadata from SWMM5 `.inp` files by reading section headers and counting elements in sections like JUNCTIONS, CONDUITS, SUBCATCHMENTS, etc.

### Build System
- Development: Vite dev server with HMR for frontend, tsx watch for backend
- Production: Custom build script that uses Vite for frontend and esbuild for backend bundling
- Static files served from `dist/public` in production

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management
- **connect-pg-simple**: Session storage (available but not currently in active use)

### Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **Radix UI**: Accessible UI primitives (dialog, dropdown, tabs, etc.)
- **Framer Motion**: Animation library
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Frontend build tool with React plugin
- **Tailwind CSS v4**: Utility-first CSS framework
- **TypeScript**: Type checking across the entire codebase

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay for development
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development environment indicator