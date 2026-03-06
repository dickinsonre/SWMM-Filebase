# SWMM5 Network Miner

## Overview

SWMM5 Network Miner is a web application for mining, analyzing, and visualizing SWMM5 (Storm Water Management Model) `.inp` files with Minecraft-style map visualizations. The application allows users to upload, view, and organize stormwater modeling files with AI-powered analysis capabilities. It parses `.inp` files to extract metadata like node counts, link counts, and subcatchment counts, storing both the metadata and file content in a PostgreSQL database.

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
- Pages in `client/src/pages/` (Dashboard, CompareModels, AIAnalysis, Insights, ReSWMM, Settings, NotFound)
- Reusable components in `client/src/components/`
- Context providers for global state in `client/src/context/`
- API client functions in `client/src/lib/api.ts`
- INP file analyzer in `client/src/lib/inpAnalyzer.ts`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (compiled with tsx for development, esbuild for production)
- **API Pattern**: RESTful API with JSON responses
- **File Uploads**: Multer middleware with in-memory storage

Key API endpoints:
- `GET /api/inp-files` - List all uploaded files (paginated)
- `GET /api/inp-files/:id` - Get single file with content
- `GET /api/inp-files/compare?file1=id&file2=id` - Compare two files
- `POST /api/inp-files/upload` - Upload new `.inp` files
- `DELETE /api/inp-files/:id` - Remove a file
- `GET /api/stats` - Aggregate statistics (totals, averages, directory breakdown)
- `GET /api/insights` - Database insights with distributions (pipe diameters, shapes, Manning's n, conduit lengths, offsets, model complexity). Samples up to 150 files, cached for 5 minutes.
- `POST /api/load-samples` - Load bundled sample models into "Sample Models" directory
- `POST /api/reswmm/apply` - Apply conduit discretization to a directory

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

### INP File Analyzer (Client-Side)
- **Location**: `client/src/lib/inpAnalyzer.ts`
- **Purpose**: Deep structural analysis of .inp file content
- **Features**: Section completeness grouped by 7 categories (Core Network, Geometry, Hydrology, Hydraulics, Water Quality, Green Infrastructure, Snow & Climate), connectivity checks, slope analysis, Manning's n validation, health scoring (0-100), actionable recommendations
- **Percentile Comparison**: Compares analyzed model against all loaded models for nodes, links, subcatchments

### Database Insights
- **Page**: `client/src/pages/Insights.tsx` at `/insights`
- **API**: `GET /api/insights` — samples up to 150 files from object storage, parses content for distributions
- **Charts**: 6 interactive visualizations (pure CSS, no external charting library):
  1. Pipe Diameter Distribution (histogram by inch sizes)
  2. Cross-Section Shape Distribution (donut chart)
  3. Manning's n Distribution (binned histogram)
  4. Conduit Length Distribution (range bins)
  5. Offset Patterns (inlet/outlet configurations)
  6. Model Complexity (scatter plot: nodes vs links)
- **Caching**: Server-side 5-minute TTL cache to avoid repeated object storage reads

### ReSWMM Conduit Discretization Engine
- **Engine**: `server/reswmm.ts` — implements the ReSWMM algorithm (originally by Robson Leo Pachaly)
- **Purpose**: Splits long conduits into shorter segments with intermediate junction nodes for better CFL stability
- **Methods**: Fixed Interval (min/max length range) or Δx/D Ratio (segment length proportional to pipe diameter)
- **API**: `POST /api/reswmm/apply` — applies discretization to all files in a directory, creating `_Disc.inp` output files
- **Page**: `client/src/pages/ReSWMM.tsx` at `/reswmm` (dedicated sidebar tab)
- **Config**: Stored in browser localStorage, configurable via ReSWMM page
- **Key parameters**: fixedMinLength, fixedMaxLength, dxDRatio, MNSA (Minimum Nodal Surface Area)
- **Sections modified**: [TITLE], [JUNCTIONS], [CONDUITS], [XSECTIONS], [LOSSES], [COORDINATES]

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
