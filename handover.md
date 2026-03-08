# SWMM5 Network Miner — Handover Document

## 1. Overview

SWMM5 Network Miner is a full-stack web application for mining, analyzing, and visualizing SWMM5 (`.inp`) and XPSWMM (`.xp`) stormwater model files. It serves as the central hub for managing stormwater model libraries with features including file upload/import, directory-based organization, Minecraft-style map visualization, AI-powered health analysis, side-by-side model comparison, aggregate statistical insights, and ReSWMM conduit discretization.

The app parses model files to extract metadata (node counts, link counts, subcatchment counts), stores both metadata in PostgreSQL and raw file content in Replit Object Storage, and provides tools for deep structural analysis across an entire model library.

**Current state**: 1,000+ models loaded across 18+ directories with full import/export, analysis, and visualization capabilities.

**Important**: The app name must always be "SWMM5 Network Miner" — not "SWMM 5 Miner" or "SWMM5 Miner".

---

## 2. Project Structure

```
.
├── client/                          # Frontend (React + Vite)
│   ├── index.html                   # HTML shell with anti-flash theme script in <head>
│   ├── public/                      # Static assets (favicon, etc.)
│   └── src/
│       ├── main.tsx                 # React entry point, mounts <App />
│       ├── App.tsx                  # Root component: providers + router
│       ├── index.css                # Global styles, all theme CSS variables, dark mode rules
│       ├── pages/
│       │   ├── Dashboard.tsx        # Main page: file browser, stats bar, search, filters, collapsible dirs
│       │   ├── CompareModels.tsx    # Side-by-side model comparison with markdown report export
│       │   ├── AIAnalysis.tsx       # Health scoring, batch analysis, issue categorization
│       │   ├── Insights.tsx         # 6 statistical chart visualizations (pure CSS)
│       │   ├── ReSWMM.tsx           # Conduit discretization configuration page
│       │   ├── Settings.tsx         # Dark mode toggle + color theme picker
│       │   └── not-found.tsx        # 404 page
│       ├── components/
│       │   ├── Sidebar.tsx          # Navigation sidebar + file/directory upload + mobile header
│       │   ├── FileCard.tsx         # Individual model card: metadata, viewer, maps, actions
│       │   ├── MapVisualization.tsx  # SVG-based network map renderer (zoom/pan)
│       │   ├── MinecraftMap.tsx     # Voxel-style Minecraft map visualization (multiple themes)
│       │   └── ui/                  # shadcn/ui component library (~30 components)
│       │       ├── accordion.tsx
│       │       ├── badge.tsx
│       │       ├── button.tsx
│       │       ├── card.tsx
│       │       ├── checkbox.tsx
│       │       ├── dialog.tsx
│       │       ├── dropdown-menu.tsx
│       │       ├── input.tsx
│       │       ├── label.tsx
│       │       ├── popover.tsx
│       │       ├── progress.tsx
│       │       ├── scroll-area.tsx
│       │       ├── select.tsx
│       │       ├── separator.tsx
│       │       ├── sheet.tsx
│       │       ├── slider.tsx
│       │       ├── spinner.tsx
│       │       ├── switch.tsx
│       │       ├── table.tsx
│       │       ├── tabs.tsx
│       │       ├── textarea.tsx
│       │       ├── toast.tsx
│       │       ├── toaster.tsx
│       │       ├── toggle.tsx
│       │       ├── toggle-group.tsx
│       │       └── tooltip.tsx
│       ├── context/
│       │   ├── FileContext.tsx      # Global file state: files[], upload, delete, refresh, refreshCounter
│       │   └── ThemeContext.tsx     # Dark mode + color theme: persisted to localStorage
│       ├── hooks/
│       │   ├── use-mobile.tsx       # useIsMobile() hook for responsive breakpoints
│       │   └── use-toast.ts        # useToast() hook for notification system
│       └── lib/
│           ├── api.ts              # All API client functions (fetch wrappers + types)
│           ├── inpAnalyzer.ts      # Client-side INP deep structural analysis engine
│           ├── diff.ts             # File comparison/diff logic for Compare page
│           ├── swmmEngine.ts       # WebAssembly SWMM simulation engine integration
│           ├── queryClient.ts      # TanStack Query client configuration
│           ├── mock-data.ts        # Sample data helpers
│           └── utils.ts            # cn() utility for Tailwind class merging
│
├── server/                          # Backend (Express + TypeScript)
│   ├── index.ts                    # Server entry: creates Express app, registers routes, starts listening
│   ├── routes.ts                   # All 18 API route handlers (file CRUD, search, stats, insights, etc.)
│   ├── storage.ts                  # IStorage interface + DatabaseStorage implementation (Drizzle ORM)
│   ├── db.ts                       # Drizzle ORM database connection setup
│   ├── inp-parser.ts              # SWMM5 .inp file metadata parser (section counting)
│   ├── reswmm.ts                  # ReSWMM conduit discretization engine
│   ├── objectStorage.ts           # Replit Object Storage service wrapper (upload/download/delete)
│   ├── objectAcl.ts               # Object storage access control policies
│   ├── vite.ts                    # Vite dev server middleware integration
│   ├── static.ts                  # Static file serving for production builds
│   └── samples/                   # Bundled sample .inp model files for demo loading
│
├── shared/
│   └── schema.ts                  # Drizzle ORM schema definitions + Zod validation + TypeScript types
│
├── script/
│   └── build.ts                   # Production build script (Vite frontend + esbuild backend)
│
├── drizzle.config.ts              # Drizzle Kit configuration (database push/migrations)
├── vite.config.ts                 # Vite configuration with React + Replit plugins
├── vite-plugin-meta-images.ts     # Custom Vite plugin for meta image handling
├── tsconfig.json                  # TypeScript configuration (path aliases: @shared, @assets)
├── components.json                # shadcn/ui configuration
├── package.json                   # Dependencies, scripts, project metadata
└── package-lock.json              # Locked dependency versions
```

---

## 3. System Architecture

### 3.1 Frontend

| Aspect              | Technology                                                                |
|:---------------------|:-------------------------------------------------------------------------|
| Framework            | React 19 with TypeScript                                                |
| Routing              | Wouter (lightweight client-side router)                                 |
| Global State         | `FileContext` (files list, CRUD ops, refreshCounter), `ThemeContext` (dark mode, color theme) |
| Server State         | TanStack Query (`@tanstack/react-query`) — configured with no auto-refetch |
| UI Components        | shadcn/ui built on Radix UI primitives (~30 components)                 |
| Styling              | Tailwind CSS v4 with CSS variables for theming                          |
| Animations           | Framer Motion for page transitions and interactive elements             |
| Icons                | Lucide React                                                            |
| Build Tool           | Vite with HMR                                                          |

**Route Map:**

| Route          | Page Component     | Purpose                                              |
|:---------------|:-------------------|:-----------------------------------------------------|
| `/`            | `Dashboard`        | Main file browser, stats, search, directory view     |
| `/compare`     | `CompareModels`    | Side-by-side model comparison                        |
| `/ai-analysis` | `AIAnalysis`       | Health scoring and batch analysis                    |
| `/insights`    | `Insights`         | Statistical visualizations across all models         |
| `/reswmm`      | `ReSWMM`           | Conduit discretization configuration                 |
| `/settings`    | `Settings`         | Theme and dark mode preferences                     |
| `*`            | `NotFound`         | 404 fallback page                                    |

### 3.2 Backend

| Aspect              | Technology                                                                |
|:---------------------|:-------------------------------------------------------------------------|
| Runtime              | Node.js with Express                                                    |
| Language             | TypeScript (dev: `tsx`, prod: `esbuild`)                                |
| API Pattern          | RESTful with JSON responses                                             |
| File Uploads         | Multer with in-memory storage                                           |
| Duplicate Detection  | Server checks filename uniqueness within target directory before upload  |
| Archive Export       | Archiver library for ZIP creation                                       |
| External Simulation  | Sends .inp content to `swmm-engine--robertdickinson.replit.app`         |

### 3.3 Data Storage

| Store               | Technology                  | Purpose                                               |
|:---------------------|:---------------------------|:------------------------------------------------------|
| Metadata             | PostgreSQL + Drizzle ORM   | File metadata, user accounts, pins, access timestamps |
| Raw File Content     | Replit Object Storage (GCS)| `.inp` and `.xp` file content stored as text blobs    |
| Client Preferences   | localStorage               | Theme settings (`swmm-theme`), ReSWMM config         |

---

## 4. Database Schema

### 4.1 `users` Table

| Column     | Type      | Constraints                        | Notes                  |
|:-----------|:----------|:-----------------------------------|:-----------------------|
| `id`       | `varchar` | Primary Key, Default: `gen_random_uuid()` | Auto-generated UUID    |
| `username` | `text`    | Not Null, Unique                   |                        |
| `password` | `text`    | Not Null                           |                        |

### 4.2 `inp_files` Table

| Column              | Type        | Constraints                              | Notes                                  |
|:---------------------|:-----------|:-----------------------------------------|:---------------------------------------|
| `id`                | `varchar`   | Primary Key, Default: `gen_random_uuid()`| Auto-generated UUID                    |
| `filename`           | `text`      | Not Null                                 | Original filename (e.g., `model.inp`)  |
| `directory`          | `text`      | Not Null                                 | Logical directory grouping             |
| `size`               | `integer`   | Not Null                                 | File size in bytes                     |
| `lastModified`       | `timestamp` | Not Null                                 | Last modification date                 |
| `nodeCount`          | `integer`   | Not Null, Default: 0                     | Parsed from file content               |
| `linkCount`          | `integer`   | Not Null, Default: 0                     | Parsed from file content               |
| `subcatchmentCount`  | `integer`   | Not Null, Default: 0                     | Parsed from file content               |
| `description`        | `text`      | Nullable                                 | User/system description                |
| `objectPath`         | `text`      | Not Null                                 | Path in object storage bucket          |
| `createdAt`          | `timestamp` | Not Null, Default: `now()`               | Record creation time                   |
| `isPinned`           | `boolean`   | Not Null, Default: false                 | Quick access pin status                |
| `lastAccessedAt`     | `timestamp` | Nullable                                 | Last viewed timestamp                  |

### 4.3 Type Exports (`shared/schema.ts`)

| Export                | Type         | Purpose                                                     |
|:----------------------|:-------------|:------------------------------------------------------------|
| `insertInpFileSchema` | Zod schema   | Validates insert data (omits `id`, `createdAt`)             |
| `InsertInpFile`       | TypeScript   | Inferred from `insertInpFileSchema`                         |
| `InpFile`             | TypeScript   | Select type: `typeof inpFiles.$inferSelect`                 |
| `insertUserSchema`    | Zod schema   | Validates user insert (picks `username`, `password`)        |
| `InsertUser`          | TypeScript   | Inferred from `insertUserSchema`                            |
| `User`                | TypeScript   | Select type: `typeof users.$inferSelect`                    |

---

## 5. API Endpoints (18 total)

### 5.1 File Management

| Method   | Path                            | Description                                                                                          |
|:---------|:--------------------------------|:-----------------------------------------------------------------------------------------------------|
| `GET`    | `/api/inp-files`                | Paginated file list. Query: `limit` (default 100), `offset` (default 0). Response: `{files[], total, limit, offset, hasMore}` |
| `GET`    | `/api/inp-files/:id`            | Single file with full text content + parsed coordinates for map rendering                            |
| `POST`   | `/api/inp-files/upload`         | Multi-file upload (multipart). Accepts `.inp` and `.xp`. Skips duplicates (same filename+directory). Response: `{files[], count, failed[], failedCount, skipped[], skippedCount}` |
| `PUT`    | `/api/inp-files/:id/content`    | Update file text content. Re-parses metadata (node/link/sub counts) and updates DB                   |
| `DELETE` | `/api/inp-files/:id`            | Delete single file from both DB and object storage                                                   |
| `DELETE` | `/api/directories/:directory`   | Delete all files in a directory (URL-encoded name)                                                   |

### 5.2 Search & Comparison

| Method   | Path                            | Description                                                                                          |
|:---------|:--------------------------------|:-----------------------------------------------------------------------------------------------------|
| `GET`    | `/api/inp-files/compare`        | Compare two files. Query: `file1`, `file2` (IDs). Returns both files' metadata + full content        |
| `GET`    | `/api/inp-files/search/content` | Full-text content search across all stored files. Returns matches with line numbers + context         |

### 5.3 Quick Access

| Method   | Path                            | Description                                                                                          |
|:---------|:--------------------------------|:-----------------------------------------------------------------------------------------------------|
| `POST`   | `/api/inp-files/:id/pin`        | Toggle pinned status for a file                                                                      |
| `GET`    | `/api/pinned-files`             | List all pinned files                                                                                |
| `GET`    | `/api/recent-files`             | List recently accessed files. Query: `limit` (default 5)                                             |
| `POST`   | `/api/inp-files/:id/access`     | Update `lastAccessedAt` timestamp for a file                                                         |

### 5.4 Statistics & Insights

| Method   | Path                            | Description                                                                                          |
|:---------|:--------------------------------|:-----------------------------------------------------------------------------------------------------|
| `GET`    | `/api/stats`                    | Aggregate stats: total files/dirs/nodes/links/subs, averages, largest/smallest file, directory breakdown, `.inp` vs `.xp` counts |
| `GET`    | `/api/insights`                 | Deep analysis of all files: pipe diameters, cross-section shapes, Manning's n, conduit lengths, offset patterns, model complexity. 5-minute server-side TTL cache |

### 5.5 Operations

| Method   | Path                            | Description                                                                                          |
|:---------|:--------------------------------|:-----------------------------------------------------------------------------------------------------|
| `POST`   | `/api/load-samples`             | Load bundled sample models from `server/samples/` into "Sample Models" directory. Deduplicates by filename |
| `POST`   | `/api/reswmm/apply`             | Apply ReSWMM conduit discretization to all files in a directory. Creates `_Disc.inp` output files    |
| `POST`   | `/api/simulate/:id`             | Send file content to external SWMM engine API for hydraulic simulation                               |
| `POST`   | `/api/export`                   | Export files (by IDs or entire directory) as a downloadable `.zip` archive                            |

---

## 6. Storage Interface (`server/storage.ts`)

The `IStorage` interface defines all data access methods. `DatabaseStorage` implements them with Drizzle ORM.

### 6.1 User Operations
- `getUser(id: string): Promise<User | undefined>`
- `getUserByUsername(username: string): Promise<User | undefined>`
- `createUser(user: InsertUser): Promise<User>`

### 6.2 File CRUD
- `getAllInpFiles(): Promise<InpFile[]>` — all files ordered by createdAt desc
- `getAllInpFilesPaginated(limit, offset): Promise<{files, total}>` — paginated with count
- `getInpFile(id: string): Promise<InpFile | undefined>` — single file by ID
- `createInpFile(file: InsertInpFile): Promise<InpFile>` — insert new file record
- `deleteInpFile(id: string): Promise<void>` — delete by ID
- `getInpFilesByDirectory(directory: string): Promise<InpFile[]>` — filter by directory
- `deleteDirectory(directory: string): Promise<InpFile[]>` — delete all files in directory, returns deleted records
- `updateFileMetadata(id, {nodeCount, linkCount, subcatchmentCount, size}): Promise<InpFile | undefined>` — update parsed metadata

### 6.3 Quick Access
- `togglePinFile(id: string): Promise<InpFile | undefined>` — toggle isPinned boolean
- `getPinnedFiles(): Promise<InpFile[]>` — files where isPinned is true
- `getRecentFiles(limit: number): Promise<InpFile[]>` — ordered by lastAccessedAt desc
- `updateLastAccessed(id: string): Promise<void>` — set lastAccessedAt to now
- `searchFiles(query: string): Promise<InpFile[]>` — case-insensitive search across filename, directory, description

### 6.4 Statistics
- `getStats(): Promise<{...}>` — SQL aggregations: count, sum, countDistinct, plus filtered counts for `.inp` vs `.xp` extensions using PostgreSQL `FILTER` clause

---

## 7. Object Storage

| Aspect               | Detail                                                           |
|:----------------------|:-----------------------------------------------------------------|
| Provider              | Replit Object Storage (Google Cloud Storage backend)             |
| Service Wrapper       | `server/objectStorage.ts`                                        |
| ACL Policies          | `server/objectAcl.ts`                                            |
| File Path Pattern     | `/objects/inp-files/<uuid>-<filename>`                           |
| Supported Formats     | `.inp` (SWMM5), `.xp` (XPSWMM)                                 |
| Operations            | Upload, download (read content), delete                          |
| Environment Variables | `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` |

---

## 8. Feature Details

### 8.1 Dashboard (`/`)

The main page showing all models organized by directory with aggregate statistics.

**Stats Bar** (top of page):
- Total Models count with `.inp` / `.xp` breakdown shown beneath
- Total Nodes (across all models)
- Total Links (across all models)
- Total Subcatchments
- Total Directories count

**Quick Access Section**:
- Pinned files row (files the user has pinned for fast access)
- Recently viewed files row (last 5 accessed models)

**Search**:
- Filename search: instant client-side filter as you type
- Content search: server-side full-text search inside file content. Results show match count per file with a "View" button that opens a highlighted content viewer dialog with all matches wrapped in `<mark>` tags

**Filters**:
- Min/max node count sliders
- Min/max link count sliders
- Directory multi-select checkboxes

**Sorting** (dropdown):
- By name, file size, node count, link count, subcatchment count
- Ascending/descending toggle

**Directory Sections**:
- Each directory is a collapsible section with chevron toggle
- "Collapse All / Expand All" button in toolbar
- Per-directory action buttons: ReSWMM (apply discretization), Export (download as ZIP)
- File count shown in parentheses next to directory name

**Empty State**:
- When no files are loaded, shows onboarding cards and a "Load Sample Models" button

### 8.2 FileCard (model cards within Dashboard)

Each model file is rendered as a card with:

- **Header**: Filename, directory badge, file size
- **Metadata Row**: Node count, Link count, Subcatchment count
- **Content Viewer/Editor**: Expandable panel to view raw `.inp`/`.xp` text content. Editable with save functionality (re-parses metadata on save)
- **Map Visualizations**: Two toggle-able views:
  - Standard SVG map: renders nodes as circles, links as lines, subcatchments as polygons with zoom/pan
  - Minecraft-style voxel map: renders geometry in a blocky aesthetic with multiple biome themes (Satellite, Desert, Snow, etc.)
- **SWMM Simulation**: Button to send the model to the external SWMM engine for hydraulic simulation
- **Actions Dropdown**:
  - Pin/Unpin for quick access
  - Download as `.inp` file
  - Delete file
  - Open in Engine (external link)
  - Open in INP MAKER (external link)
  - Run in BatchSWMM (external link)

### 8.3 Compare Models (`/compare`)

- Two dropdown selectors to pick files from the loaded library
- Side-by-side display showing:
  - Metadata comparison (nodes, links, subcatchments, size)
  - Section-by-section diff highlighting additions, removals, changes
- "Download Report" button generates a comprehensive markdown comparison report file

### 8.4 AI Analysis (`/ai-analysis`)

**Single Model Analysis**:
- Select a model from dropdown
- Generates a health score from 0 to 100 based on:
  - Section completeness (checks for presence of expected INP sections)
  - Connectivity analysis (orphan nodes, disconnected components)
  - Slope analysis (adverse slopes, zero-slope/flat conduits)
  - Manning's n validation (out-of-range roughness coefficients)
- Issues categorized into three severity levels: Errors, Warnings, Info
- Section completeness displayed in 7 category groups:
  1. Core Network (JUNCTIONS, OUTFALLS, CONDUITS, etc.)
  2. Geometry (COORDINATES, VERTICES, POLYGONS, etc.)
  3. Hydrology (RAINGAGES, SUBCATCHMENTS, INFILTRATION, etc.)
  4. Hydraulics (OPTIONS, REPORT, TIMESERIES, etc.)
  5. Water Quality (POLLUTANTS, LANDUSES, WASHOFF, etc.)
  6. Green Infrastructure (LID_CONTROLS, LID_USAGE, etc.)
  7. Snow & Climate (SNOWPACKS, TEMPERATURE, EVAPORATION, etc.)
- Percentile comparison: shows where the model ranks vs all loaded models for node/link/subcatchment counts

**Batch Analysis** ("Analyze All" button):
- Runs health checks on every model in the library
- Shows a sortable summary table with filename, directory, health score, issue counts
- Processes models sequentially with progress indicator

### 8.5 Insights (`/insights`)

Six interactive statistical visualizations built with pure CSS (no charting library):

1. **Pipe Diameter Distribution**: Histogram showing count of conduits by diameter (in inches). Bars sized proportionally.
2. **Cross-Section Shape Distribution**: Donut/ring chart showing percentage breakdown of conduit cross-section shapes (CIRCULAR, RECT_CLOSED, etc.)
3. **Manning's n Distribution**: Binned histogram of Manning's roughness coefficients across all conduits
4. **Conduit Length Distribution**: Histogram with range bins showing how conduit lengths are distributed
5. **Offset Patterns**: Categorizes conduits by inlet/outlet offset configurations (No Offsets, Inlet Only, Outlet Only, Both)
6. **Model Complexity**: Scatter plot of nodes vs links per model, showing the relationship between model size dimensions

**Data source**: Processes ALL files in the database (no sampling limit). Server parses file content in batches of 20 from object storage. Results cached server-side for 5 minutes.

### 8.6 ReSWMM Conduit Discretization (`/reswmm`)

- **Engine**: `server/reswmm.ts` (algorithm by Robson Leo Pachaly)
- **Purpose**: Splits long conduits into shorter segments with intermediate junction nodes for better Courant-Friedrichs-Lewy (CFL) stability in dynamic wave routing
- **Two Methods**:
  1. **Fixed Interval**: Specify min/max conduit length range. Conduits outside the range get subdivided.
  2. **Δx/D Ratio**: Segment length is proportional to pipe diameter (`Δx = ratio × diameter`). Useful for varying pipe sizes.
- **Configuration Page**: UI to set method, parameters, and MNSA (Minimum Nodal Surface Area for new junction nodes)
- **Config Storage**: Saved in browser `localStorage`, exported via `getReswmmConfig()` / `saveReswmmConfig()`
- **Key Parameters**: `fixedMinLength`, `fixedMaxLength`, `dxDRatio`, `MNSA`
- **INP Sections Modified**: [TITLE], [JUNCTIONS], [CONDUITS], [XSECTIONS], [LOSSES], [COORDINATES]
- **Output**: Creates `_Disc.inp` files alongside original files in the same directory
- **Trigger**: Can be applied per-directory from the Dashboard directory header or from the ReSWMM config page

### 8.7 Settings (`/settings`)

- **Dark Mode Toggle**: Switch between light and dark themes
- **Color Themes**: Four options with live swatch previews:
  - EPA (green) — default
  - UF (orange/blue)
  - Oregon State (orange/black)
  - Auburn (navy/orange)
- **Persistence**: Stored in `localStorage` key `swmm-theme` as `{colorTheme, darkMode}`
- **Anti-Flash Script**: Inline `<script>` in `<head>` of `index.html` reads localStorage before first paint to apply the correct theme class, preventing white flash in dark mode

---

## 9. File Upload & Import Flow

### 9.1 Single File Upload
1. User clicks "Upload Files" button in sidebar
2. Native file picker opens, filtered to `.inp,.xp` via `accept` attribute
3. Selected files are sent to `POST /api/inp-files/upload`
4. Server parses each file for metadata, stores content in object storage, creates DB record
5. Server skips files that already exist (same filename in same directory)
6. Toast shows results: "X imported, Y duplicates skipped, Z failed"

### 9.2 Directory Import
1. User clicks "Import Directory" button in sidebar
2. Native folder picker opens (no file type filter — removed to prevent OS from hiding `.inp` files)
3. Client-side JavaScript filters the selected files for `.inp` and `.xp` extensions
4. A dialog appears listing all found model files with checkboxes, sorted by file size (largest first)
5. User can check/uncheck individual files, or use "Select All" toggle
6. Clicking "Import N Files" uploads only the checked files
7. Same duplicate detection and toast feedback as single upload

### 9.3 State Refresh After Upload
- `FileContext` increments `refreshCounter` after every upload, delete, or directory removal
- Dashboard watches `refreshCounter` via `useEffect` to reload stats and quick access (pinned/recent files)
- This ensures counts always update immediately, even if the total file count doesn't change (e.g., all duplicates)

---

## 10. INP File Parser (`server/inp-parser.ts`)

Server-side parser that extracts metadata from SWMM5 `.inp` files:

| Count Type      | INP Sections Scanned                                    |
|:----------------|:---------------------------------------------------------|
| Node Count      | JUNCTIONS, OUTFALLS, DIVIDERS, STORAGE                   |
| Link Count      | CONDUITS, PUMPS, ORIFICES, WEIRS, OUTLETS                |
| Subcatchment Count | SUBCATCHMENTS                                          |

The parser reads section headers (`[SECTION_NAME]`) and counts non-comment, non-empty data lines within each section.

---

## 11. INP File Analyzer (`client/src/lib/inpAnalyzer.ts`)

Client-side deep structural analysis engine used by the AI Analysis page:

- **Input**: Raw `.inp` file text content
- **Output**: `{ sectionCategories, stats, healthScore, issues, recommendations }`
- **Section Detection**: Identifies all `[SECTION]` headers and categorizes them into 7 groups
- **Connectivity Analysis**: Checks for orphan nodes (nodes not referenced by any link)
- **Slope Analysis**: Calculates conduit slopes, flags adverse slopes and zero-slope conduits
- **Manning's n Validation**: Checks roughness coefficients against typical engineering ranges
- **Health Scoring**: Weighted formula producing 0-100 score
- **Percentile Comparison**: Compares the analyzed model's node/link/subcatchment counts against all loaded models to show ranking

---

## 12. Theme System

### CSS Architecture
- Theme variables defined in `client/src/index.css` using CSS custom properties
- Each theme has its own CSS block: `.theme-epa`, `.theme-uf`, `.theme-oregon-state`, `.theme-auburn`
- Dark mode variants: `.dark.theme-epa`, `.dark.theme-uf`, etc.
- Variables control: `--primary`, `--secondary`, `--background`, `--foreground`, `--border`, `--ring`, etc.

### Runtime Behavior
- `ThemeContext.tsx` manages state and applies CSS classes to `document.documentElement`
- On theme change: removes old theme class, adds new one (e.g., `theme-epa` → `theme-uf`)
- On dark mode toggle: adds/removes `dark` class
- All changes persisted to `localStorage` key `swmm-theme`

### Anti-Flash Prevention
- Inline `<script>` tag is the first element in `<head>` of `index.html`
- Reads `localStorage` synchronously before any CSS/JS loads
- Applies theme classes immediately to prevent white flash on dark-mode page loads

---

## 13. Build System

### Development
```bash
npm run dev
```
- Starts Express server with `tsx` (TypeScript execution)
- Vite dev server runs as middleware (HMR enabled on port 5000)
- Backend and frontend both hot-reload on file changes

### Production Build
```bash
npm run build
npm run start
```
- `script/build.ts` orchestrates the build:
  - Vite builds frontend → `dist/public/`
  - esbuild bundles backend → `dist/index.cjs`
- Production server serves static files from `dist/public`

### Other Scripts
| Script          | Command                  | Purpose                           |
|:----------------|:-------------------------|:----------------------------------|
| `npm run check` | `tsc`                    | TypeScript type checking          |
| `npm run db:push`| `drizzle-kit push`      | Push schema changes to database   |

---

## 14. External Dependencies

### Core Infrastructure
| Package                | Purpose                                              |
|:-----------------------|:-----------------------------------------------------|
| `pg`                   | PostgreSQL client driver                             |
| `drizzle-orm`          | Type-safe ORM for database queries                   |
| `drizzle-zod`          | Zod schema generation from Drizzle schemas           |
| `drizzle-kit`          | Database migration/push tooling                      |
| `@google-cloud/storage`| Replit Object Storage (GCS backend) client           |

### Frontend
| Package                    | Purpose                                          |
|:---------------------------|:-------------------------------------------------|
| `react` / `react-dom`     | UI framework (v19)                               |
| `wouter`                  | Client-side routing                              |
| `@tanstack/react-query`   | Server state management and caching              |
| `@radix-ui/react-*`       | 20+ accessible UI primitives                     |
| `framer-motion`           | Animation library                                |
| `lucide-react`            | Icon library                                     |
| `tailwind-merge`          | Tailwind class merging utility                   |
| `class-variance-authority`| Component variant management                     |
| `date-fns`               | Date formatting                                  |
| `recharts`               | Chart library (available, not used by Insights)  |
| `react-resizable-panels`  | Resizable split panes                            |
| `cmdk`                   | Command palette component                        |
| `embla-carousel-react`    | Carousel component                               |
| `react-hook-form`         | Form state management                            |
| `@hookform/resolvers`     | Zod resolver for react-hook-form                 |

### Backend
| Package                    | Purpose                                          |
|:---------------------------|:-------------------------------------------------|
| `express`                  | HTTP server framework                            |
| `multer`                   | Multipart file upload handling                   |
| `archiver`                 | ZIP archive creation for exports                 |
| `express-session`          | Session middleware (available)                   |
| `connect-pg-simple`        | PostgreSQL session storage (available)           |
| `passport` / `passport-local` | Authentication (available, not actively used) |
| `memorystore`              | In-memory session store (available)              |

### Development
| Package                                   | Purpose                              |
|:------------------------------------------|:-------------------------------------|
| `vite`                                    | Frontend build tool with HMR         |
| `tsx`                                     | TypeScript execution for dev server  |
| `esbuild`                                | Production backend bundling          |
| `typescript`                              | Type checking                        |
| `@replit/vite-plugin-runtime-error-modal` | Error overlay in development         |
| `@replit/vite-plugin-cartographer`        | Replit development tooling           |
| `@replit/vite-plugin-dev-banner`          | Dev environment indicator banner     |

---

## 15. Environment Variables

| Variable                           | Purpose                                           | Source         |
|:-----------------------------------|:--------------------------------------------------|:---------------|
| `DATABASE_URL`                     | PostgreSQL connection string                      | Replit DB      |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Replit Object Storage bucket identifier           | Replit secret  |
| `PUBLIC_OBJECT_SEARCH_PATHS`       | Public asset search paths in object storage       | Replit secret  |
| `PRIVATE_OBJECT_DIR`               | Private object directory path in storage          | Replit secret  |

---

## 16. Key Patterns & Conventions

### API Response Shapes
- **File lists**: `{files: [...], total, limit, offset, hasMore}` — always extract `.files` property
- **Upload response**: `{files: [...], count, failed: [...], failedCount, skipped: [...], skippedCount}`
- **Stats response**: includes `inpCount` and `xpCount` for file type breakdown

### State Management
- `FileContext` provides: `files`, `loading`, `error`, `uploadFiles()`, `removeFile()`, `removeDirectory()`, `refreshFiles()`, `refreshCounter`
- Dashboard watches `refreshCounter` (not `files.length`) to reload stats — this handles edge cases like all-duplicate imports
- `ThemeContext` provides: `darkMode`, `colorTheme`, `setDarkMode()`, `setColorTheme()`

### localStorage Keys
| Key            | Content                                    | Used By          |
|:---------------|:-------------------------------------------|:-----------------|
| `swmm-theme`   | `{colorTheme: string, darkMode: boolean}` | ThemeContext      |
| ReSWMM config  | Discretization parameters object           | ReSWMM page      |

### File Format Support
- Both `.inp` (SWMM5) and `.xp` (XPSWMM) accepted everywhere: upload, import, search, analysis
- Server-side filter: `f.originalname.toLowerCase().endsWith('.inp') || f.originalname.toLowerCase().endsWith('.xp')`
- Client-side filter mirrors the same logic
- Single file input uses `accept=".inp,.xp"`, directory input has no `accept` (to avoid OS hiding files)

### Duplicate Prevention
- Server-side: before upload, fetches all existing files in the target directory and builds a `Set` of filenames
- Files with matching names are skipped (not overwritten)
- Skipped files reported back to client with count

### HTML Nesting
- Directory collapse headers use `<div role="button">` (not `<button>`) to avoid nested button HTML errors when ReSWMM/Export buttons are inside the header

### Insights Caching
- Server caches insights data for 5 minutes (TTL-based, stored in module-level variable)
- Cache key is based on total file count — if files are added/removed, cache invalidates

---

## 17. Known Integrations

| Integration                    | Status      | Notes                                        |
|:-------------------------------|:------------|:---------------------------------------------|
| `javascript_database` v1.0.0  | Installed   | PostgreSQL database integration              |
| `javascript_object_storage` v1.0.0 | Installed | Replit Object Storage integration            |

---

## 18. External App Integrations (Ecosystem Links)

FileCard dropdown includes links to related SWMM tools (opened in new tabs):

| App          | URL Pattern                                           |
|:-------------|:------------------------------------------------------|
| SWMM Engine  | `swmm-engine--robertdickinson.replit.app`             |
| INP MAKER    | External INP file creation tool                       |
| BatchSWMM    | Batch simulation runner                               |

---

## 19. Current Statistics (as of last known state)

| Metric              | Value                |
|:---------------------|:---------------------|
| Total Models         | 1,000+               |
| Total Directories    | 18+                  |
| Total Nodes          | 220,000+             |
| Total Links          | 226,000+             |
| Total Subcatchments  | 70,000+              |
| File Formats         | .inp and .xp         |
| Largest File         | ~24.7 MB             |
| Smallest File        | ~3 KB                |

---

## 20. Grading & Scoring Breakdown

**Overall Grade: A / 92 out of 100**

```
Content & Data                ██████████  97
  1,000+ models, 18 directories, 220K nodes, 226K links, 70K subcatchments
  .inp AND .xp format support

Core Functionality            █████████░  95
  18 REST API endpoints, full CRUD with duplicate detection
  Content search with line-number highlighting, ZIP export via Archiver

Analysis & Intelligence       █████████░  93
  AI health scoring (0-100), batch analysis across all models
  7-category section completeness, slope/connectivity/Manning's n validation

Statistical Insights          █████████░  94
  6 interactive charts (pure CSS), ALL files analyzed (no sampling limit)
  5-minute server-side cache

Visualization                 █████████░  90
  SVG network maps with zoom/pan, Minecraft-style voxel maps (multiple biomes)

Model Comparison              █████████░  91
  Section-aware diff with highlighting, markdown report export

Architecture                  █████████░  92
  PostgreSQL + Drizzle ORM, Replit Object Storage (GCS)
  Proper file/metadata separation, anti-flash theme script

Ecosystem Integration         ████████░░  82
  Links to Engine, INP MAKER, BatchSWMM — but no deep data flow between apps

UI / UX                       █████████░  88
  4 color themes + dark mode, collapsible directories
  Pin/recent quick access, responsive with mobile sidebar
```

---

## 21. Improvement Ideas (10 Features to Reach A+)

### Idea 1: "Model Timeline" — Track Changes Over Time

**Concept**: When users upload multiple versions of the same model, show how it evolved over time.

**What it does**:
- Detects version groups by filename similarity (strips `_v1`, `_rev2`, `_20240315` suffixes)
- Shows timeline with node/link/subcatchment counts at each version
- Auto-diffs between consecutive versions
- Health score trend chart showing improvement over time
- "What changed" summary (e.g., "+44 new junctions, +5 LID controls, health: 68 → 82")

**Implementation approach**:
- Group files by base name (strip version/date suffixes)
- Sort each group by `createdAt` date
- For each version group, compute deltas between consecutive versions
- New page or Dashboard section: clickable timeline with compare links

**Effort**: ~2 weeks | **Impact**: +2 points

---

### Idea 2: "Smart Recommendations" — AI-Powered Auto-Fix

**Concept**: After AI Analysis identifies issues, generate SPECIFIC actionable recommendations with "Fix It" buttons that modify the file content directly.

**Current behavior**: "12 conduits have adverse slopes" (just a count)

**Improved behavior**:
- Lists each problematic element by name with exact values
- Shows what the fix would be (e.g., "Swap upstream/downstream inverts")
- "Auto-Fix All" buttons that modify file content directly
- Estimated health score improvement after all fixes (e.g., "72 → 89, +17 points")

**Auto-fix examples**:
- **Adverse slopes**: Swap upstream/downstream node inverts
- **Orphan nodes**: Remove disconnected nodes or auto-connect to nearest downstream
- **High Manning's n**: Suggest standard values based on pipe material
- **Missing sections**: Generate template sections via INP MAKER integration

**Effort**: ~2 weeks | **Impact**: +2 points

---

### Idea 3: "Model Quality Leaderboard" — Gamified Health Tracking

**Concept**: Rank all 1,000+ models by health score with directory-level averages.

**What it shows**:
- Top 10 healthiest models with score bars
- Bottom 10 models needing attention
- Directory rankings by average health score
- Overall library health score
- Health distribution chart
- CSV export of rankings

**Implementation approach**:
- Add `health_score INTEGER` column to `inp_files` table
- Store score after each AI analysis run
- Leaderboard page queries: `ORDER BY health_score DESC`
- Directory averages: `GROUP BY directory, AVG(health_score)`

**Effort**: ~2 weeks | **Impact**: +1 point

---

### Idea 4: "Cross-Model Pattern Search"

**Concept**: Search for specific engineering PATTERNS across all 1,000+ models, not just text.

**What it does**:
- Filter models by characteristics: "Has pumps AND uses Green-Ampt AND more than 100 conduits"
- Shows common patterns across matching models (e.g., "89% use DYNWAVE routing")
- Preset searches: "Models with LID", "Models with pumps", "Combined sewers", "Large models (>500 nodes)"

**Implementation approach**:
- Build a structured search index from parsed file content per model:
  - `hasPumps`, `hasLID`, `hasWQ`, `hasSnow` (boolean flags from section presence)
  - `routing`, `infiltration`, `flowUnits` (extracted from [OPTIONS] section)
  - `nodeCount`, `linkCount` (already in DB)
- Store index in a new table or JSON column
- Query with combinable filters

**Effort**: ~1-2 weeks | **Impact**: +2 points

---

### Idea 5: "Ecosystem Data Flow" — Send Models to Other Apps

**Concept**: Replace simple external links with actual data transfer to other SWMM apps.

**Current**: FileCard dropdown has links to Engine, INP MAKER, BatchSWMM — but they're just URLs with no data transfer.

**Improved**:
- "Open in SWMM5 Engine" → opens Engine and sends model content via `window.postMessage`
- "Enhance in INP MAKER" → opens INP MAKER with model pre-loaded
- "Run in BatchSWMM" → sends multiple selected files for batch simulation

**New ecosystem actions**:
- "Get Rainfall" → Open Rain Canvas with model's geographic location
- "See Algorithms" → Open Rosetta Stone for relevant SWMM modules
- "Analyze Repository" → Open Repo Insights for pyswmm
- "Compare with SWMManywhere" → Generate model for same area

**Effort**: ~1-2 days per app connection | **Impact**: +2 points

---

### Idea 6: "Model Similarity Finder"

**Concept**: Select any model → find the most similar models in the 1,000+ library.

**Similarity dimensions**:
- **Size**: node/link/subcatchment count comparison
- **Type**: sections present (LID, WQ, Snow, pumps, etc.)
- **Complexity**: links/node ratio, max pipe diameter
- **Parameters**: Manning's n distribution, slope patterns
- **Structure**: cross-section shape distribution, offset patterns

**Implementation approach**:
- Compute similarity score (0-100%) using weighted normalized distances
- `sizeSim = 1 - |countA - countB| / max(countA, countB)`
- `sectionSim = jaccard(sectionsA, sectionsB)`
- Weighted average: 30% size + 30% links + 20% sections + 20% complexity
- "Compare Side-by-Side" link for each similar model

**Effort**: ~1-2 weeks | **Impact**: +1 point

---

### Idea 7: Enhanced Minecraft Maps — Interactive Voxel World

**Concept**: The app already has unique Minecraft-style voxel maps. Enhance them into a full interactive experience.

**Enhancements**:
- Click interactions on nodes/pipes (popup with properties: depth, elevation, diameter, length, slope)
- Pipe thickness proportional to actual diameter (visual scaling)
- Color coding options: by diameter, slope, Manning's n, or flow direction
- New "Neon" cyberpunk theme (dark background, glowing pipes)
- Export as high-res PNG for engineering reports
- 3D isometric view option
- Rotate view button

**Effort**: ~1-2 weeks | **Impact**: +1 point (most unique visualization in any SWMM tool)

---

### Idea 8: "Batch ReSWMM with Results Comparison"

**Concept**: After ReSWMM creates `_Disc.inp` files, automatically run both original and discretized through SWMM simulation and show the improvement.

**What it shows**:
- Table: Model name | Original Continuity Error | Discretized CE | Delta %
- Average CE improvement across all models
- Count of models brought below 1% CE threshold
- Before/after comparison chart
- Download all discretized models as ZIP

**Implementation approach**:
- After ReSWMM creates `_Disc.inp` files, send both original and discretized to external SWMM engine (`POST /api/simulate/:id` already exists)
- Parse continuity errors from both `.rpt` outputs
- Display comparison table with color-coded improvements

**Effort**: ~1-2 weeks | **Impact**: +2 points

---

### Idea 9: "Model Usage Analytics"

**Concept**: Track which models are viewed, analyzed, compared, and downloaded most. Show trends over time.

**What it shows**:
- Most viewed models (last 30 days)
- Most analyzed models
- Most compared model pairs
- Most downloaded models
- Daily activity sparkline chart

**Implementation approach**:
- New database table: `model_events (id, file_id, event_type, created_at)`
- Event types: `view`, `analyze`, `compare`, `download`, `simulate`
- Log events at each relevant API call
- Aggregate queries for analytics dashboard
- Already tracking `lastAccessedAt` — extend with full event history

**Effort**: ~1-2 weeks | **Impact**: +1 point

---

### Idea 10: "WASM Simulation Dashboard"

**Concept**: Run SWMM via WebAssembly in the browser for instant model validation without needing the server.

**What it does**:
- Quick 1-hour simulation runs entirely in browser (2-3 seconds)
- Results: status, routing CE, runoff CE, warnings, flooding nodes, peak outfall flow
- "View Full Report" for detailed simulation output
- "Fix Issues & Re-Run" workflow
- Batch validation: "Validate All with WASM" runs quick sim on every model
- Model cards show validation badge: Validated / Warnings / Failed

**Note**: `client/src/lib/swmmEngine.ts` already exists for WebAssembly SWMM integration.

**Effort**: ~2-3 weeks | **Impact**: +2 points

---

## 22. Priority Ranking for Improvements

### Fastest to Implement
| Priority | Feature                          | Effort     | Impact  |
|:---------|:---------------------------------|:-----------|:--------|
| 1        | Ecosystem Data Flow (#5)         | 1-2 days   | +2 pts  |
| 2        | Model Quality Leaderboard (#3)   | 2 weeks    | +1 pt   |
| 3        | Usage Analytics (#9)             | 1-2 weeks  | +1 pt   |

### Highest Value
| Priority | Feature                          | Effort     | Impact  |
|:---------|:---------------------------------|:-----------|:--------|
| 4        | Smart Recommendations (#2)       | 2 weeks    | +2 pts  |
| 5        | Cross-Model Pattern Search (#4)  | 1-2 weeks  | +2 pts  |
| 6        | Batch ReSWMM Comparison (#8)     | 1-2 weeks  | +2 pts  |
| 7        | Model Timeline (#1)              | 2 weeks    | +2 pts  |

### Unique / Fun
| Priority | Feature                          | Effort     | Impact  |
|:---------|:---------------------------------|:-----------|:--------|
| 8        | Minecraft Map Enhancements (#7)  | 1-2 weeks  | +1 pt   |
| 9        | Model Similarity Finder (#6)     | 1-2 weeks  | +1 pt   |
| 10       | WASM Simulation Dashboard (#10)  | 2-3 weeks  | +2 pts  |

### Fast Path to A+ (96+)
Ecosystem Flow + Smart Recommendations + Pattern Search + Leaderboard = ~5-6 weeks → +7 points → 99

---

## 23. Suite Rankings (Current Standing)

```
 #1   SWMM5 Rosetta Stone          A+ (100)
 #2   SWMM5 INP MAKER              A+ (97)
 #3   Rain Canvas Studio            A  (94)
 #4   Repo Insights                 A  (93)
 #5   SWMM5 Simulation Engine       A  (93)
 #6   SWMM5 Network Miner          A  (92)  ← Current
 #7   BobSWMM (MEL)                A- (91)
 #8   SWMM Docs Archive            A- (90)
 #9   SWMManywhere Explorer          A- (89)
 #10  HydroCouple Explorer          A- (89)
 #11  BatchSWMM                     A- (88)
 #12  PySWMM Explorer               B+ (87)
```
