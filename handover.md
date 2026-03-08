# SWMM5 Network Miner — Handover Document

## 1. Overview

SWMM5 Network Miner is a full-stack web application for mining, analyzing, and visualizing SWMM5 (`.inp`) and XPSWMM (`.xp`) stormwater model files. It serves as the central hub for managing stormwater model libraries with features including file upload/import, directory-based organization, Minecraft-style voxel map visualization, AI-powered health analysis, side-by-side model comparison, aggregate statistical insights, ReSWMM conduit discretization, and SWMM simulation integration.

The app parses model files to extract metadata (node counts, link counts, subcatchment counts), stores metadata in PostgreSQL and raw file content in Replit Object Storage, and provides tools for deep structural analysis across an entire model library.

**Current state**: 1,000+ models loaded across 18+ directories with full import/export, analysis, and visualization capabilities.

**Important**: The app name must always be "SWMM5 Network Miner" — not "SWMM 5 Miner" or "SWMM5 Miner".

---

## 2. Codebase Statistics

| Metric                   | Value                                    |
|:--------------------------|:-----------------------------------------|
| Total TypeScript LOC      | ~15,500 lines across all `.ts`/`.tsx`    |
| Backend (`server/`)       | ~1,842 lines (routes: 820, storage: 235, reswmm: 598, parser: 189) |
| Frontend Pages            | ~2,864 lines (Dashboard: 927, AIAnalysis: 612, ReSWMM: 387, CompareModels: 385, Insights: 355, Settings: 177, 404: 21) |
| Frontend Components       | ~2,508 lines (MinecraftMap: 1,136, Sidebar: 566, FileCard: 555, MapVisualization: 251) |
| Frontend Context/Hooks    | ~164 lines (FileContext: 93, ThemeContext: 71) |
| Frontend Lib              | ~949 lines (inpAnalyzer: 302, swmmEngine: 290, api: 274, diff: 220, queryClient: 57, mock-data: 76, utils: 6) |
| UI Components (shadcn)    | ~30 components in `client/src/components/ui/` |
| Bundled Sample Models     | 5 `.inp` files in `server/samples/`      |
| Fonts                     | Inter + JetBrains Mono (Google Fonts CDN)|

---

## 3. Project Structure

```
.
├── client/                          # Frontend (React + Vite)
│   ├── index.html                   # HTML shell with anti-flash theme script in <head>
│   ├── public/                      # Static assets (favicon.png, etc.)
│   └── src/
│       ├── main.tsx                 # React entry point, mounts <App />
│       ├── App.tsx                  # Root: QueryClientProvider → ThemeProvider → FileProvider → Router
│       ├── index.css                # Global styles, all theme CSS variables, dark mode rules
│       ├── pages/
│       │   ├── Dashboard.tsx        # Main page: stats bar, search, filters, collapsible dirs (927 LOC)
│       │   ├── AIAnalysis.tsx       # Health scoring, batch analysis, issue categorization (612 LOC)
│       │   ├── CompareModels.tsx    # Side-by-side model diff with markdown report export (385 LOC)
│       │   ├── Insights.tsx         # 6 statistical chart visualizations, pure CSS (355 LOC)
│       │   ├── ReSWMM.tsx           # Conduit discretization config page (387 LOC)
│       │   ├── Settings.tsx         # Dark mode toggle + color theme picker (177 LOC)
│       │   └── not-found.tsx        # 404 page (21 LOC)
│       ├── components/
│       │   ├── MinecraftMap.tsx     # Voxel-style Minecraft map, multiple biome themes (1,136 LOC)
│       │   ├── Sidebar.tsx          # Navigation + file/directory upload + mobile responsive (566 LOC)
│       │   ├── FileCard.tsx         # Individual model card: metadata, viewer, maps, actions (555 LOC)
│       │   ├── MapVisualization.tsx  # SVG-based network map renderer with zoom/pan (251 LOC)
│       │   └── ui/                  # shadcn/ui component library (~30 components)
│       ├── context/
│       │   ├── FileContext.tsx      # Global file state: files[], CRUD, refreshCounter (93 LOC)
│       │   └── ThemeContext.tsx     # Dark mode + color theme, persisted to localStorage (71 LOC)
│       ├── hooks/
│       │   ├── use-mobile.tsx       # useIsMobile() hook for responsive breakpoints
│       │   └── use-toast.ts        # useToast() hook for notification system
│       └── lib/
│           ├── inpAnalyzer.ts      # Client-side INP deep structural analysis engine (302 LOC)
│           ├── swmmEngine.ts       # WebAssembly SWMM simulation engine integration (290 LOC)
│           ├── api.ts              # All API client functions and TypeScript types (274 LOC)
│           ├── diff.ts             # File comparison/diff logic for Compare page (220 LOC)
│           ├── queryClient.ts      # TanStack Query client configuration (57 LOC)
│           ├── mock-data.ts        # Sample data helpers (76 LOC)
│           └── utils.ts            # cn() utility for Tailwind class merging (6 LOC)
│
├── server/                          # Backend (Express + TypeScript)
│   ├── routes.ts                   # All 18 API route handlers (820 LOC)
│   ├── reswmm.ts                  # ReSWMM conduit discretization engine (598 LOC)
│   ├── storage.ts                  # IStorage interface + DatabaseStorage implementation (235 LOC)
│   ├── inp-parser.ts              # SWMM5 .inp file metadata parser (189 LOC)
│   ├── index.ts                    # Server entry: Express app, registers routes, starts listening
│   ├── db.ts                       # Drizzle ORM database connection setup
│   ├── objectStorage.ts           # Replit Object Storage service wrapper (upload/download/delete)
│   ├── objectAcl.ts               # Object storage access control policies
│   ├── vite.ts                    # Vite dev server middleware integration
│   ├── static.ts                  # Static file serving for production builds
│   └── samples/                   # 5 bundled sample .inp model files for demo loading
│
├── shared/
│   └── schema.ts                  # Drizzle ORM schema + Zod validation + TypeScript types (43 LOC)
│
├── script/
│   └── build.ts                   # Production build script (Vite frontend + esbuild backend)
│
├── drizzle.config.ts              # Drizzle Kit configuration (database push/migrations)
├── vite.config.ts                 # Vite configuration with React + Replit plugins
├── vite-plugin-meta-images.ts     # Custom Vite plugin for meta image handling
├── tsconfig.json                  # TypeScript config (path aliases: @shared → shared/, @assets → attached_assets/)
├── components.json                # shadcn/ui configuration
├── package.json                   # Dependencies, scripts, project metadata
└── package-lock.json              # Locked dependency versions
```

---

## 4. System Architecture

### 4.1 Frontend

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

**Provider Nesting Order** (in `App.tsx`):
```
QueryClientProvider → ThemeProvider → FileProvider → TooltipProvider → Router + Toaster
```

### 4.2 Backend

| Aspect              | Technology                                                                |
|:---------------------|:-------------------------------------------------------------------------|
| Runtime              | Node.js with Express                                                    |
| Language             | TypeScript (dev: `tsx` watch mode, prod: `esbuild` → `dist/index.cjs`) |
| API Pattern          | RESTful with JSON responses                                             |
| File Uploads         | Multer with in-memory storage, 200 MB file size limit                   |
| Duplicate Detection  | Server checks filename uniqueness within target directory before upload  |
| Archive Export       | Archiver library for ZIP creation                                       |
| External Simulation  | Sends .inp content to `swmm-engine--robertdickinson.replit.app`         |

### 4.3 Data Storage

| Store               | Technology                  | Purpose                                               |
|:---------------------|:---------------------------|:------------------------------------------------------|
| Metadata             | PostgreSQL + Drizzle ORM   | File metadata, user accounts, pins, access timestamps |
| Raw File Content     | Replit Object Storage (GCS)| `.inp` and `.xp` file content stored as text blobs    |
| Client Preferences   | localStorage               | Theme settings (`swmm-theme`), ReSWMM config         |

---

## 5. Database Schema

### 5.1 `users` Table

| Column     | Type      | Constraints                        | Notes                  |
|:-----------|:----------|:-----------------------------------|:-----------------------|
| `id`       | `varchar` | Primary Key, Default: `gen_random_uuid()` | Auto-generated UUID    |
| `username` | `text`    | Not Null, Unique                   |                        |
| `password` | `text`    | Not Null                           |                        |

### 5.2 `inp_files` Table

| Column              | Type        | Constraints                              | Notes                                  |
|:---------------------|:-----------|:-----------------------------------------|:---------------------------------------|
| `id`                | `varchar`   | Primary Key, Default: `gen_random_uuid()`| Auto-generated UUID                    |
| `filename`           | `text`      | Not Null                                 | Original filename (e.g., `model.inp`)  |
| `directory`          | `text`      | Not Null                                 | Logical directory grouping             |
| `size`               | `integer`   | Not Null                                 | File size in bytes                     |
| `lastModified`       | `timestamp` | Not Null                                 | Column name: `last_modified`           |
| `nodeCount`          | `integer`   | Not Null, Default: 0                     | Column name: `node_count`              |
| `linkCount`          | `integer`   | Not Null, Default: 0                     | Column name: `link_count`              |
| `subcatchmentCount`  | `integer`   | Not Null, Default: 0                     | Column name: `subcatchment_count`      |
| `description`        | `text`      | Nullable                                 |                                        |
| `objectPath`         | `text`      | Not Null                                 | Column name: `object_path`             |
| `createdAt`          | `timestamp` | Not Null, Default: `now()`               | Column name: `created_at`              |
| `isPinned`           | `boolean`   | Not Null, Default: false                 | Column name: `is_pinned`               |
| `lastAccessedAt`     | `timestamp` | Nullable                                 | Column name: `last_accessed_at`        |

### 5.3 Type Exports (`shared/schema.ts`)

| Export                | Type         | Purpose                                                     |
|:----------------------|:-------------|:------------------------------------------------------------|
| `insertInpFileSchema` | Zod schema   | Validates insert data (omits `id`, `createdAt`)             |
| `InsertInpFile`       | TypeScript   | `z.infer<typeof insertInpFileSchema>`                       |
| `InpFile`             | TypeScript   | `typeof inpFiles.$inferSelect`                              |
| `insertUserSchema`    | Zod schema   | Validates user insert (picks `username`, `password`)        |
| `InsertUser`          | TypeScript   | `z.infer<typeof insertUserSchema>`                          |
| `User`                | TypeScript   | `typeof users.$inferSelect`                                 |

---

## 6. API Endpoints (18 total)

### 6.1 File Management

| Method   | Path                            | Line | Description                                                                                      |
|:---------|:--------------------------------|:-----|:-------------------------------------------------------------------------------------------------|
| `GET`    | `/api/inp-files`                | 36   | Paginated file list. Query: `limit` (default 100), `offset` (default 0). Response: `{files[], total, limit, offset, hasMore}` |
| `GET`    | `/api/inp-files/:id`            | 117  | Single file with full text content + parsed coordinates for map rendering                        |
| `POST`   | `/api/inp-files/upload`         | 180  | Multi-file upload (multipart). Accepts `.inp` and `.xp`. Skips duplicates. Response: `{files[], count, failed[], failedCount, skipped[], skippedCount}` |
| `PUT`    | `/api/inp-files/:id/content`    | 146  | Update file text content. Re-parses metadata (node/link/sub counts) and updates DB               |
| `DELETE` | `/api/inp-files/:id`            | 257  | Delete single file from both DB and object storage                                               |
| `DELETE` | `/api/directories/:directory`   | 271  | Delete all files in a directory (URL-encoded name)                                               |

### 6.2 Search & Comparison

| Method   | Path                            | Line | Description                                                                                      |
|:---------|:--------------------------------|:-----|:-------------------------------------------------------------------------------------------------|
| `GET`    | `/api/inp-files/compare`        | 66   | Compare two files. Query: `file1`, `file2` (IDs). Returns both files' metadata + full content    |
| `GET`    | `/api/inp-files/search/content` | 291  | Full-text content search across all stored files. Returns matches with line numbers + context     |

### 6.3 Quick Access

| Method   | Path                            | Line | Description                                                                                      |
|:---------|:--------------------------------|:-----|:-------------------------------------------------------------------------------------------------|
| `POST`   | `/api/inp-files/:id/pin`        | 334  | Toggle pinned status for a file                                                                  |
| `GET`    | `/api/pinned-files`             | 347  | List all pinned files                                                                            |
| `GET`    | `/api/recent-files`             | 363  | List recently accessed files. Query: `limit` (default 5)                                         |
| `POST`   | `/api/inp-files/:id/access`     | 380  | Update `lastAccessedAt` timestamp for a file                                                     |

### 6.4 Statistics & Insights

| Method   | Path                            | Line | Description                                                                                      |
|:---------|:--------------------------------|:-----|:-------------------------------------------------------------------------------------------------|
| `GET`    | `/api/stats`                    | 26   | Aggregate stats: total files/dirs/nodes/links/subs, averages, largest/smallest, directory breakdown, `.inp`/`.xp` counts |
| `GET`    | `/api/insights`                 | 643  | Deep analysis: pipe diameters, cross-section shapes, Manning's n, conduit lengths, offsets, complexity. 5-min server cache |

### 6.5 Operations

| Method   | Path                            | Line | Description                                                                                      |
|:---------|:--------------------------------|:-----|:-------------------------------------------------------------------------------------------------|
| `POST`   | `/api/load-samples`             | 474  | Load 5 bundled sample models into "Sample Models" directory. Deduplicates by filename            |
| `POST`   | `/api/reswmm/apply`             | 526  | Apply ReSWMM conduit discretization to all files in a directory. Creates `_Disc.inp` output files|
| `POST`   | `/api/simulate/:id`             | 434  | Send file content to external SWMM engine API for hydraulic simulation                           |
| `POST`   | `/api/export`                   | 390  | Export files (by IDs or entire directory) as a downloadable `.zip` archive                        |

---

## 7. Storage Interface (`server/storage.ts`)

The `IStorage` interface defines all data access methods. `DatabaseStorage` implements them with Drizzle ORM.

### 7.1 User Operations
- `getUser(id: string): Promise<User | undefined>`
- `getUserByUsername(username: string): Promise<User | undefined>`
- `createUser(user: InsertUser): Promise<User>`

### 7.2 File CRUD
- `getAllInpFiles(): Promise<InpFile[]>` — all files ordered by `createdAt` desc
- `getAllInpFilesPaginated(limit, offset): Promise<{files, total}>` — paginated with SQL count
- `getInpFile(id: string): Promise<InpFile | undefined>` — single file by ID
- `createInpFile(file: InsertInpFile): Promise<InpFile>` — insert new file record
- `deleteInpFile(id: string): Promise<void>` — delete by ID
- `getInpFilesByDirectory(directory: string): Promise<InpFile[]>` — filter by directory
- `deleteDirectory(directory: string): Promise<InpFile[]>` — delete all in directory, returns deleted records
- `updateFileMetadata(id, {nodeCount, linkCount, subcatchmentCount, size}): Promise<InpFile | undefined>`

### 7.3 Quick Access
- `togglePinFile(id: string): Promise<InpFile | undefined>` — flips `isPinned` boolean
- `getPinnedFiles(): Promise<InpFile[]>` — files where `isPinned` = true
- `getRecentFiles(limit: number): Promise<InpFile[]>` — ordered by `lastAccessedAt` desc, `NOT NULL` filter
- `updateLastAccessed(id: string): Promise<void>` — sets `lastAccessedAt` to `new Date()`
- `searchFiles(query: string): Promise<InpFile[]>` — `ilike` search across filename, directory, description

### 7.4 Statistics
- `getStats()` — SQL aggregations using `count()`, `sum()`, `countDistinct()`, plus filtered `.inp`/`.xp` counts via PostgreSQL `FILTER(WHERE ...)` clause

---

## 8. Object Storage

| Aspect               | Detail                                                           |
|:----------------------|:-----------------------------------------------------------------|
| Provider              | Replit Object Storage (Google Cloud Storage backend)             |
| Service Wrapper       | `server/objectStorage.ts`                                        |
| ACL Policies          | `server/objectAcl.ts`                                            |
| File Path Pattern     | `/objects/inp-files/<uuid>-<filename>`                           |
| Supported Formats     | `.inp` (SWMM5), `.xp` (XPSWMM)                                 |
| Operations            | Upload (text content), Download (read as string), Delete         |
| Max Upload Size       | 200 MB (Multer limit in `routes.ts`)                             |
| Environment Variables | `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` |

---

## 9. Feature Details

### 9.1 Dashboard (`/`) — 927 LOC

The main page showing all models organized by directory with aggregate statistics.

**Stats Bar** (top of page):
- Total Models count with `.inp` / `.xp` breakdown shown beneath
- Total Nodes (sum across all models)
- Total Links (sum across all models)
- Total Subcatchments
- Total Directories count

**Quick Access Section**:
- Pinned files row (files the user has starred for fast access)
- Recently viewed files row (last 5 accessed models)

**Search** (two modes):
- **Filename search**: instant client-side filter as you type
- **Content search**: server-side full-text search inside raw file content. Results show match count per file with a "View" button that opens a highlighted content viewer dialog (all matches wrapped in `<mark>` tags with line numbers)

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
- Per-directory action buttons in header: ReSWMM (apply discretization) + Export (download as ZIP)
- File count shown in parentheses next to directory name
- Directory headers use `<div role="button">` (not `<button>`) to avoid nested button HTML errors

**Empty State**:
- When no files are loaded, shows onboarding cards and a "Load Sample Models" button

### 9.2 FileCard (model cards) — 555 LOC

Each model file is rendered as a card with:

- **Header**: Filename, directory badge, file size
- **Metadata Row**: Node count, Link count, Subcatchment count (with icons)
- **Content Viewer/Editor**: Expandable panel to view raw `.inp`/`.xp` text. Editable with save (re-parses metadata on save)
- **Map Visualizations** (two toggle-able views):
  - **Standard SVG map**: Renders nodes as circles, links as lines with zoom/pan controls
  - **Minecraft-style voxel map**: Renders geometry in a blocky aesthetic with multiple biome themes (Satellite, Desert, Snow, Forest, etc.)
- **SWMM Simulation**: Button to send the model to the external SWMM engine
- **Actions Dropdown Menu**:
  - Pin/Unpin for quick access
  - Download as `.inp` file
  - Delete file
  - Open in Engine (external link to SWMM5 Simulation Engine)
  - Open in INP MAKER (external link)
  - Run in BatchSWMM (external link)

### 9.3 MinecraftMap — 1,136 LOC

The largest component in the app. Renders stormwater network geometry in a Minecraft-inspired voxel style.

- Multiple biome themes: Satellite, Desert, Snow, Forest, etc.
- Nodes rendered as block-style markers
- Links rendered as pixelated pipe connections
- Background terrain generated procedurally
- Subcatchment polygons rendered as colored block regions
- Canvas-based rendering with zoom and pan support

### 9.4 Sidebar — 566 LOC

Navigation and file management sidebar:

- **Navigation Links**: Dashboard, Compare Models, AI Analysis, Insights, ReSWMM, Settings
- **Upload Buttons**: "Upload Files" (single/multi file picker) + "Import Directory" (folder picker)
- **Directory Import Dialog**: Shows discovered `.inp`/`.xp` files with checkboxes, sorted by file size (largest first). "Select All" toggle. "Import N Files" button.
- **Mobile Responsive**: Collapses to hamburger menu on small screens via Sheet component

### 9.5 Compare Models (`/compare`) — 385 LOC

- Two dropdown selectors to pick files from the entire library
- Side-by-side display showing:
  - Metadata comparison (nodes, links, subcatchments, size)
  - Section-by-section diff highlighting additions, removals, changes
- "Download Report" button generates a comprehensive markdown comparison report file

### 9.6 AI Analysis (`/ai-analysis`) — 612 LOC

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
- Percentile comparison: shows where model ranks vs all loaded models for node/link/subcatchment counts

**Batch Analysis** ("Analyze All" button):
- Runs health checks on every model in the library
- Shows a sortable summary table with filename, directory, health score, issue counts
- Processes models sequentially with progress indicator

### 9.7 Insights (`/insights`) — 355 LOC

Six interactive statistical visualizations built with **pure CSS** (no charting library):

1. **Pipe Diameter Distribution**: Histogram showing conduit count by diameter (in inches)
2. **Cross-Section Shape Distribution**: Donut/ring chart with percentage breakdown (CIRCULAR, RECT_CLOSED, etc.)
3. **Manning's n Distribution**: Binned histogram of roughness coefficients across all conduits
4. **Conduit Length Distribution**: Histogram with range bins
5. **Offset Patterns**: Categories by inlet/outlet offset configurations (No Offsets, Inlet Only, Outlet Only, Both)
6. **Model Complexity**: Scatter plot of nodes vs links per model

**Data pipeline**: Server processes ALL files in the database (no sampling). Parses file content in batches of 20 from object storage. Results cached server-side for 5 minutes (TTL-based, invalidates when file count changes).

### 9.8 ReSWMM Conduit Discretization (`/reswmm`) — 387 LOC

- **Engine**: `server/reswmm.ts` (598 LOC, algorithm by Robson Leo Pachaly)
- **Purpose**: Splits long conduits into shorter segments with intermediate junction nodes for better CFL stability in dynamic wave routing
- **Two Methods**:
  1. **Fixed Interval**: Specify min/max conduit length range. Conduits outside get subdivided.
  2. **Δx/D Ratio**: Segment length proportional to pipe diameter (`Δx = ratio × diameter`). Useful for varying pipe sizes.
- **Key Parameters**: `fixedMinLength`, `fixedMaxLength`, `dxDRatio`, `MNSA` (Minimum Nodal Surface Area for new junctions)
- **INP Sections Modified**: [TITLE], [JUNCTIONS], [CONDUITS], [XSECTIONS], [LOSSES], [COORDINATES]
- **Output**: Creates `_Disc.inp` files alongside original files in the same directory
- **Config Storage**: Browser `localStorage`, accessed via `getReswmmConfig()` / `saveReswmmConfig()`
- **Trigger Points**: Per-directory button on Dashboard header, or from ReSWMM config page

### 9.9 Settings (`/settings`) — 177 LOC

- **Dark Mode Toggle**: Switch between light and dark themes
- **Color Themes** (4 options with live swatch previews):
  - EPA (green) — default
  - UF (orange/blue)
  - Oregon State (orange/black)
  - Auburn (navy/orange)
- **Persistence**: Stored in `localStorage` key `swmm-theme` as `{colorTheme, darkMode}`

---

## 10. Theme System

### CSS Architecture
- Theme variables defined in `client/src/index.css` using CSS custom properties
- Each theme: `.theme-epa`, `.theme-uf`, `.theme-oregon-state`, `.theme-auburn`
- Dark variants: `.dark.theme-epa`, `.dark.theme-uf`, etc.
- Variables: `--primary`, `--secondary`, `--background`, `--foreground`, `--border`, `--ring`, etc.

### Runtime Behavior
- `ThemeContext.tsx` manages state and applies CSS classes to `document.documentElement`
- On theme change: removes old class, adds new (e.g., `theme-epa` → `theme-uf`)
- On dark toggle: adds/removes `dark` class

### Anti-Flash Prevention
- Inline `<script>` in `<head>` of `client/index.html` (runs before any CSS/JS loads):
```javascript
try {
  var t = JSON.parse(localStorage.getItem('swmm-theme') || '{}');
  document.documentElement.className = 
    (t.dark !== false ? 'dark' : 'light') + ' theme-' + (t.colorTheme || 'epa');
} catch(e) { document.documentElement.className = 'dark theme-epa'; }
```

---

## 11. File Upload & Import Flow

### 11.1 Single File Upload
1. User clicks "Upload Files" in sidebar
2. Native file picker opens, filtered to `.inp,.xp` via `accept` attribute
3. Selected files sent to `POST /api/inp-files/upload` as multipart form data
4. Server parses each file for metadata, stores content in object storage, creates DB record
5. Server skips files that already exist (same filename in same directory)
6. Toast shows results: "X imported, Y duplicates skipped, Z failed"

### 11.2 Directory Import
1. User clicks "Import Directory" in sidebar
2. Native folder picker opens (no file type filter — removed to prevent OS from hiding `.inp` files on Windows)
3. Client-side JavaScript filters selected files for `.inp` and `.xp` extensions
4. Dialog appears listing all found model files with checkboxes, sorted by file size (largest first)
5. User checks/unchecks individual files, or uses "Select All" toggle
6. Clicking "Import N Files" uploads only checked files
7. Same duplicate detection and toast feedback as single upload

### 11.3 State Refresh After Mutations
- `FileContext.refreshCounter` increments after every upload, delete, or directory removal
- Dashboard watches `refreshCounter` via `useEffect` to reload stats and quick access
- This ensures UI updates even when total file count doesn't change (e.g., all duplicates skipped)

---

## 12. INP File Parser (`server/inp-parser.ts`) — 189 LOC

Server-side parser that extracts metadata from SWMM5 `.inp` files:

| Count Type      | INP Sections Scanned                                    |
|:----------------|:---------------------------------------------------------|
| Node Count      | [JUNCTIONS], [OUTFALLS], [DIVIDERS], [STORAGE]           |
| Link Count      | [CONDUITS], [PUMPS], [ORIFICES], [WEIRS], [OUTLETS]      |
| Subcatchment Count | [SUBCATCHMENTS]                                        |

Also exports `parseCoordinates()` function that extracts `[COORDINATES]` section data for map visualization (returns `{nodeId, x, y}[]`).

---

## 13. INP File Analyzer (`client/src/lib/inpAnalyzer.ts`) — 302 LOC

Client-side deep structural analysis engine used by AI Analysis page:

- **Input**: Raw `.inp` file text content
- **Output**: `{ sectionCategories, stats, healthScore, issues, recommendations }`
- **Section Detection**: Identifies all `[SECTION]` headers and categorizes into 7 groups
- **Connectivity Analysis**: Checks for orphan nodes (nodes not referenced by any link)
- **Slope Analysis**: Calculates conduit slopes, flags adverse slopes and zero-slope conduits
- **Manning's n Validation**: Checks roughness coefficients against typical engineering ranges
- **Health Scoring**: Weighted formula producing 0-100 score
- **Percentile Comparison**: Ranks model's node/link/subcatchment counts against all loaded models

---

## 14. SWMM Simulation Engine (`client/src/lib/swmmEngine.ts`) — 290 LOC

Client-side integration with the external SWMM simulation API:

- Sends `.inp` file content to `https://swmm-engine--robertdickinson.replit.app/api/simulate`
- Receives simulation results (continuity errors, warnings, outfall flows)
- Also includes WebAssembly SWMM integration hooks for potential in-browser simulation

---

## 15. Build System

### Development
```bash
npm run dev
```
- Runs `NODE_ENV=development tsx server/index.ts`
- Express server with Vite dev server as middleware (HMR on port 5000)
- Both frontend and backend hot-reload on file changes

### Production Build
```bash
npm run build    # Build frontend + backend
npm run start    # NODE_ENV=production node dist/index.cjs
```
- `script/build.ts` orchestrates:
  - Vite builds frontend → `dist/public/`
  - esbuild bundles backend → `dist/index.cjs`

### All Scripts
| Script           | Command                               | Purpose                           |
|:-----------------|:--------------------------------------|:----------------------------------|
| `npm run dev`    | `NODE_ENV=development tsx server/index.ts` | Start development server     |
| `npm run build`  | `tsx script/build.ts`                 | Production build                  |
| `npm run start`  | `NODE_ENV=production node dist/index.cjs` | Start production server      |
| `npm run check`  | `tsc`                                 | TypeScript type checking          |
| `npm run db:push`| `drizzle-kit push`                    | Push schema changes to PostgreSQL |

---

## 16. External Dependencies

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
| `@radix-ui/react-*`       | 20+ accessible UI primitives (dialog, dropdown, tabs, checkbox, etc.) |
| `framer-motion`           | Animation library                                |
| `lucide-react`            | Icon library                                     |
| `tailwind-merge`          | Tailwind class merging utility                   |
| `class-variance-authority`| Component variant management (cva)               |
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
| `multer`                   | Multipart file upload handling (200 MB limit)    |
| `archiver`                 | ZIP archive creation for exports                 |
| `express-session`          | Session middleware (available, not actively used) |
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

## 17. Environment Variables

| Variable                           | Purpose                                           | Source         |
|:-----------------------------------|:--------------------------------------------------|:---------------|
| `DATABASE_URL`                     | PostgreSQL connection string                      | Replit DB      |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Replit Object Storage bucket identifier           | Replit secret  |
| `PUBLIC_OBJECT_SEARCH_PATHS`       | Public asset search paths in object storage       | Replit secret  |
| `PRIVATE_OBJECT_DIR`               | Private object directory path in storage          | Replit secret  |

---

## 18. Key Patterns & Conventions

### API Response Shapes
- **File lists**: `{files: [...], total, limit, offset, hasMore}` — always extract `.files` property
- **Upload response**: `{files: [...], count, failed: [...], failedCount, skipped: [...], skippedCount}`
- **Stats response**: includes `inpCount` and `xpCount` for file type breakdown
- **File detail**: Single file GET returns content + coordinates for map rendering

### State Management Patterns
- `FileContext` provides: `files`, `loading`, `error`, `uploadFiles()`, `removeFile()`, `removeDirectory()`, `refreshFiles()`, `refreshCounter`
- Dashboard watches `refreshCounter` (not `files.length`) to reload stats — handles edge cases like all-duplicate imports
- `ThemeContext` provides: `darkMode`, `colorTheme`, `setDarkMode()`, `setColorTheme()`

### localStorage Keys
| Key            | Shape                                     | Used By          |
|:---------------|:------------------------------------------|:-----------------|
| `swmm-theme`   | `{colorTheme: string, dark: boolean}`     | ThemeContext      |
| ReSWMM config  | `{method, fixedMinLength, fixedMaxLength, dxDRatio, MNSA}` | ReSWMM page |

### File Format Support
- Both `.inp` (SWMM5) and `.xp` (XPSWMM) accepted everywhere
- Server filter: `f.originalname.toLowerCase().endsWith('.inp') || .endsWith('.xp')`
- Client single-file input: `accept=".inp,.xp"`
- Client directory input: **no `accept` attribute** (prevents OS from hiding files)

### Duplicate Prevention
- Server-side: before upload, fetches all existing files in target directory, builds `Set` of filenames
- Matching filenames are skipped (not overwritten), reported back to client

### HTML Nesting Convention
- Directory collapse headers use `<div role="button">` (not `<button>`) to avoid nested `<button>` HTML validation errors when action buttons exist inside the header

### Insights Caching
- Server-side module-level variable with 5-minute TTL
- Cache invalidates when total file count changes (files added or removed)

---

## 19. Installed Integrations

| Integration                    | Version | Notes                                        |
|:-------------------------------|:--------|:---------------------------------------------|
| `javascript_database`          | 1.0.0   | PostgreSQL database integration              |
| `javascript_object_storage`    | 1.0.0   | Replit Object Storage integration            |

---

## 20. External App Integrations (Ecosystem Links)

FileCard dropdown includes links to related SWMM tools (opened in new browser tabs):

| App              | URL Pattern                                           | Purpose                    |
|:-----------------|:------------------------------------------------------|:---------------------------|
| SWMM Engine      | `swmm-engine--robertdickinson.replit.app`             | Hydraulic simulation       |
| INP MAKER        | External INP file creation tool                       | Model building/editing     |
| BatchSWMM        | Batch simulation runner                               | Multi-model simulation     |

Currently these are simple links — no data is transferred between apps via postMessage or API calls.

---

## 21. Current Model Library Statistics

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

## 22. Git History (Key Milestones)

| Commit    | Description                                                     |
|:----------|:----------------------------------------------------------------|
| `95d9153` | Update documentation with project grading and improvement ideas |
| `1859073` | Create comprehensive handover document                          |
| `60ca370` | Add support for managing and viewing XP files alongside INP     |
| `3ceacb2` | Sort imported files by size in sidebar view                     |
| `5a4a174` | Add ability to import .xp files alongside .inp model files      |
| `d65f6a0` | Prevent duplicate file uploads and improve import feedback      |
| `4180d9b` | Update file counts after folder imports                         |
| `bf4c92e` | Update project name to SWMM5 Network Miner everywhere          |
| `d0e0ec3` | Improve directory upload to allow selecting specific files      |
| `73224ff` | Add comprehensive analysis and comparison features              |
| `a88e87c` | Make dashboard directory sections collapsible                   |
| `c1157e1` | Add new theme options (dark mode, university color schemes)     |
| `f563e3c` | Add database insights and improve AI analysis                   |
| `2cdc4c9` | Move ReSWMM tool to its own dedicated section                   |
| `7419325` | Add conduit discretization tool (ReSWMM)                        |

---

## 23. Grading & Scoring Breakdown

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

## 24. Improvement Ideas (10 Features to Reach A+)

### Idea 1: "Model Timeline" — Track Changes Over Time

**Concept**: When users upload multiple versions of the same model, show how it evolved over time.

**What it does**:
- Detects version groups by filename similarity (strips `_v1`, `_rev2`, `_20240315` suffixes)
- Shows timeline with node/link/subcatchment counts at each version
- Auto-diffs between consecutive versions
- Health score trend chart showing improvement over time
- "What changed" summary (e.g., "+44 new junctions, +5 LID controls, health: 68 → 82")

**Implementation approach**:
- Group files by base name (strip version/date suffixes with regex)
- Sort each group by `createdAt` date
- For each version group, compute deltas between consecutive versions
- New page or Dashboard section: clickable timeline with compare links

**Effort**: ~2 weeks | **Impact**: +2 points

---

### Idea 2: "Smart Recommendations" — AI-Powered Auto-Fix

**Concept**: After AI Analysis identifies issues, generate SPECIFIC actionable recommendations with "Fix It" buttons that modify file content directly.

**Current behavior**: "12 conduits have adverse slopes" (just a count)

**Improved behavior**:
- Lists each problematic element by name with exact values (e.g., "C-42: US invert 95.2 > DS invert 95.8")
- Shows what the fix would be (e.g., "Swap upstream/downstream inverts")
- "Auto-Fix All" buttons that modify file content directly via `PUT /api/inp-files/:id/content`
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
- Leaderboard page: `SELECT * FROM inp_files WHERE health_score IS NOT NULL ORDER BY health_score DESC`
- Directory averages: `SELECT directory, AVG(health_score) FROM inp_files GROUP BY directory`

**Effort**: ~2 weeks | **Impact**: +1 point

---

### Idea 4: "Cross-Model Pattern Search"

**Concept**: Search for specific engineering PATTERNS across all 1,000+ models, not just text.

**What it does**:
- Filter models by characteristics: "Has pumps AND uses Green-Ampt AND more than 100 conduits"
- Shows common patterns across matching models (e.g., "89% use DYNWAVE routing")
- Preset searches: "Models with LID", "Models with pumps", "Combined sewers", "Large models (>500 nodes)", "Models with adverse slopes"

**Implementation approach**:
- Build structured search index per model from parsed content:
  - Boolean flags: `hasPumps`, `hasLID`, `hasWQ`, `hasSnow` (from section presence)
  - Extracted options: `routing`, `infiltration`, `flowUnits` (from [OPTIONS] section)
  - Already in DB: `nodeCount`, `linkCount`
- Store index in new table or JSON column
- Query with combinable AND/OR filters

**Effort**: ~1-2 weeks | **Impact**: +2 points

---

### Idea 5: "Ecosystem Data Flow" — Send Models to Other Apps

**Concept**: Replace simple external links with actual data transfer to other SWMM apps via `window.postMessage`.

**Current**: FileCard dropdown has links to Engine, INP MAKER, BatchSWMM — just URLs, no data transfer.

**Improved**:
- "Open in SWMM5 Engine" → opens Engine window and sends model content via `postMessage({type:'load_model', filename, inp: content})`
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
- "Compare Side-by-Side" link for each similar model result

**Effort**: ~1-2 weeks | **Impact**: +1 point

---

### Idea 7: Enhanced Minecraft Maps — Interactive Voxel World

**Concept**: The MinecraftMap component (1,136 LOC) is already the most unique feature. Enhance it into a full interactive experience.

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
- Average CE improvement across all models in directory
- Count of models brought below 1% CE threshold
- Before/after comparison chart
- Download all discretized models as ZIP

**Implementation approach**:
- After ReSWMM creates `_Disc.inp` files, send both original and discretized to external SWMM engine (`POST /api/simulate/:id` already exists)
- Parse continuity errors from simulation results
- Display comparison table with color-coded improvements (green = better, red = worse)

**Effort**: ~1-2 weeks | **Impact**: +2 points

---

### Idea 9: "Model Usage Analytics"

**Concept**: Track which models are viewed, analyzed, compared, and downloaded most.

**What it shows**:
- Most viewed models (last 30 days)
- Most analyzed models
- Most compared model pairs
- Most downloaded models
- Daily activity sparkline chart

**Implementation approach**:
- New database table: `model_events (id SERIAL, file_id VARCHAR REFERENCES inp_files(id), event_type TEXT, created_at TIMESTAMP DEFAULT NOW())`
- Event types: `view`, `analyze`, `compare`, `download`, `simulate`
- Log events in each relevant API route handler
- Aggregate queries for analytics dashboard
- Already tracking `lastAccessedAt` — extend with full event history

**Effort**: ~1-2 weeks | **Impact**: +1 point

---

### Idea 10: "WASM Simulation Dashboard"

**Concept**: Run SWMM via WebAssembly in the browser for instant model validation without server round-trips.

**What it does**:
- Quick 1-hour simulation runs entirely in browser (~2-3 seconds)
- Results: status, routing CE, runoff CE, warnings, flooding nodes, peak outfall flow
- "View Full Report" for detailed simulation output
- "Fix Issues & Re-Run" workflow
- Batch validation: "Validate All with WASM" runs quick sim on every model
- Model cards show validation badge: Validated | Warnings | Failed

**Note**: `client/src/lib/swmmEngine.ts` (290 LOC) already exists with WebAssembly hooks.

**Effort**: ~2-3 weeks | **Impact**: +2 points

---

## 25. Priority Ranking for Improvements

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

## 26. Suite Rankings (Current Standing)

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
