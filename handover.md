# SWMM5 Network Miner — Complete Handover Document

## 1. Overview

SWMM5 Network Miner is a full-stack web application for mining, analyzing, and visualizing SWMM5 (`.inp`) and XPSWMM (`.xp`) stormwater model files. It serves as a central platform for engineers and urban planners to upload, organize, search, compare, analyze, visualize, and discretize stormwater models — all from a single web interface.

The app parses model files to extract metadata (node counts, link counts, subcatchment counts), stores metadata in PostgreSQL and raw file content in Replit Object Storage (Google Cloud Storage), and provides deep structural analysis, AI-powered health scoring, aggregate statistical insights, side-by-side model comparison with diff views, Minecraft-style voxel map visualization, and ReSWMM conduit discretization.

**Current state**: 1,000+ models loaded across 18+ directories.  
**Important**: The app name must always be "SWMM5 Network Miner" — never "SWMM 5 Miner" or "SWMM5 Miner".

---

## 2. Codebase Metrics

| Metric                       | Value                                                     |
|:-----------------------------|:----------------------------------------------------------|
| Total TypeScript LOC         | ~15,500 lines across all `.ts`/`.tsx` files               |
| Backend (`server/`)          | ~1,842 lines (routes: 821, reswmm: 598, storage: 236, parser: 189) |
| Frontend Pages               | ~2,865 lines across 7 page components                    |
| Frontend Components          | ~2,508 lines across 4 core components + ~30 UI components|
| Frontend Context + Hooks     | ~164 lines (FileContext: 93, ThemeContext: 71)            |
| Frontend Libraries           | ~949 lines across 7 lib modules                          |
| Shared Schema                | 43 lines                                                 |
| Bundled Sample Models        | 5 `.inp` files in `server/samples/`                      |
| Fonts                        | Inter (UI) + JetBrains Mono (code/data) via Google Fonts |

---

## 3. Project File Structure

```
.
├── client/                          # Frontend (React 19 + Vite)
│   ├── index.html                   # HTML shell — anti-flash theme script runs before CSS loads
│   ├── public/                      # Static assets (favicon.png)
│   └── src/
│       ├── main.tsx                 # React entry: ReactDOM.createRoot → <App />
│       ├── App.tsx                  # Root: QueryClientProvider → ThemeProvider → FileProvider → Router
│       ├── index.css                # Global CSS: all theme variables, dark mode, utility classes
│       │
│       ├── pages/                   # One component per route
│       │   ├── Dashboard.tsx        # 928 LOC — main file browser, stats, search, filters, dirs
│       │   ├── AIAnalysis.tsx       # 613 LOC — health scoring, batch analysis, percentiles
│       │   ├── ReSWMM.tsx           # 388 LOC — discretization config, per-directory apply
│       │   ├── CompareModels.tsx    # 386 LOC — side-by-side diff, markdown report export
│       │   ├── Insights.tsx         # 355 LOC — 6 pure-CSS statistical charts
│       │   ├── Settings.tsx         # 177 LOC — dark mode, color themes, notifications
│       │   └── not-found.tsx        # 21 LOC  — 404 page
│       │
│       ├── components/
│       │   ├── MinecraftMap.tsx     # 1,136 LOC — voxel-style map with multiple biome themes
│       │   ├── Sidebar.tsx          # 567 LOC  — nav, uploads, directory import dialog
│       │   ├── FileCard.tsx         # 556 LOC  — model card: metadata, editor, maps, actions
│       │   ├── MapVisualization.tsx  # 251 LOC  — SVG network map with zoom/pan
│       │   └── ui/                  # ~30 shadcn/ui components (accordion, badge, button, card,
│       │                            #   checkbox, dialog, dropdown-menu, input, label, popover,
│       │                            #   progress, scroll-area, select, separator, sheet, slider,
│       │                            #   spinner, switch, table, tabs, textarea, toast, toaster,
│       │                            #   toggle, toggle-group, tooltip)
│       │
│       ├── context/
│       │   ├── FileContext.tsx      # 93 LOC — global file list, CRUD operations, refreshCounter
│       │   └── ThemeContext.tsx     # 71 LOC — dark mode + color theme, localStorage persistence
│       │
│       ├── hooks/
│       │   ├── use-mobile.tsx       # useIsMobile() — responsive breakpoint detection
│       │   └── use-toast.ts        # useToast() — toast notification queue system
│       │
│       └── lib/
│           ├── inpAnalyzer.ts      # 302 LOC — client-side structural analysis engine
│           ├── swmmEngine.ts       # 290 LOC — external SWMM simulation + WASM hooks
│           ├── api.ts              # 275 LOC — all fetch wrappers + TypeScript interfaces
│           ├── diff.ts             # 221 LOC — section-aware INP file diff algorithm
│           ├── mock-data.ts        # 76 LOC  — sample data helpers
│           ├── queryClient.ts      # 57 LOC  — TanStack Query client (no auto-refetch)
│           └── utils.ts            # 6 LOC   — cn() for Tailwind class merging
│
├── server/                          # Backend (Express + TypeScript)
│   ├── routes.ts                   # 821 LOC — all 18 API route handlers
│   ├── reswmm.ts                  # 598 LOC — ReSWMM conduit discretization algorithm
│   ├── storage.ts                  # 236 LOC — IStorage interface + DatabaseStorage (Drizzle)
│   ├── inp-parser.ts              # 189 LOC — section-based metadata parser
│   ├── index.ts                    # Server entry: Express app creation + listen
│   ├── db.ts                       # Drizzle ORM connection via DATABASE_URL
│   ├── objectStorage.ts           # Object Storage wrapper: upload/download/update/delete
│   ├── objectAcl.ts               # Object storage access control policies
│   ├── vite.ts                    # Vite dev server as Express middleware
│   ├── static.ts                  # Production static file serving from dist/public
│   └── samples/                   # 5 bundled .inp files for one-click demo loading
│
├── shared/
│   └── schema.ts                  # 43 LOC — Drizzle tables + Zod schemas + TS types
│
├── script/
│   └── build.ts                   # Vite frontend build + esbuild backend bundle
│
├── drizzle.config.ts              # Drizzle Kit config (schema-first, db:push)
├── vite.config.ts                 # Vite + React plugin + Replit plugins
├── vite-plugin-meta-images.ts     # Custom Vite plugin for OG meta images
├── tsconfig.json                  # TS config with path aliases (@shared, @assets)
├── components.json                # shadcn/ui configuration
├── package.json                   # All deps, scripts, metadata
└── package-lock.json              # Lockfile
```

---

## 4. Architecture Deep Dive

### 4.1 Frontend Architecture

**Framework Stack:**
- React 19 with TypeScript
- Wouter for client-side routing (6 routes + 404 fallback)
- TanStack Query for server state — configured with `refetchOnWindowFocus: false` and `staleTime: Infinity`
- shadcn/ui component library (~30 components) built on Radix UI
- Tailwind CSS v4 with CSS custom properties for theming
- Framer Motion for page transitions and micro-interactions
- Lucide React for icons

**Provider Nesting (App.tsx):**
```
QueryClientProvider
  └── ThemeProvider         ← reads/writes localStorage "swmm-theme"
      └── FileProvider      ← loads all files on mount, exposes CRUD + refreshCounter
          └── TooltipProvider
              └── Router    ← Wouter Switch with 7 Routes
              └── Toaster   ← Toast notification system
```

**Route Map:**

| Route          | Component        | LOC | Purpose                                              |
|:---------------|:-----------------|:----|:-----------------------------------------------------|
| `/`            | `Dashboard`      | 928 | Stats bar, search, filters, sorting, collapsible directory sections |
| `/compare`     | `CompareModels`  | 386 | Two-file selection, section-aware diff, markdown report |
| `/ai-analysis` | `AIAnalysis`     | 613 | Single model health scoring + batch "Analyze All"    |
| `/insights`    | `Insights`       | 355 | 6 statistical visualizations with pure CSS charts    |
| `/reswmm`      | `ReSWMM`         | 388 | Discretization config + per-directory apply          |
| `/settings`    | `Settings`       | 177 | Dark mode, color themes, notification toggles        |
| `*`            | `NotFound`       | 21  | 404 fallback                                         |

### 4.2 Backend Architecture

**Server Stack:**
- Node.js + Express
- TypeScript compiled with `tsx` (dev) / `esbuild` (prod)
- Multer for multipart uploads (in-memory storage, 200 MB limit per file)
- Archiver for ZIP creation
- Server-side INP parsing for metadata extraction

**Request Flow:**
```
Client Request → Express Router → Route Handler → IStorage (Drizzle/PostgreSQL)
                                                 → ObjectStorageService (GCS)
                                                 → Response (JSON or stream)
```

### 4.3 Data Architecture

| Layer               | Technology                  | What It Stores                                          |
|:---------------------|:---------------------------|:--------------------------------------------------------|
| PostgreSQL           | Drizzle ORM                | File metadata (name, dir, counts, pins, timestamps)     |
| Object Storage       | GCS via Replit integration | Raw `.inp`/`.xp` file content as text                   |
| Browser localStorage | Native                     | Theme prefs (`swmm-theme`), ReSWMM config (`reswmm-config`) |
| Server Memory        | Module variable            | Insights cache (5-min TTL)                               |

---

## 5. Database Schema (PostgreSQL)

### 5.1 `users` Table

```sql
CREATE TABLE users (
  id       VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT    NOT NULL UNIQUE,
  password TEXT    NOT NULL
);
```

### 5.2 `inp_files` Table

```sql
CREATE TABLE inp_files (
  id                 VARCHAR   PRIMARY KEY DEFAULT gen_random_uuid(),
  filename           TEXT      NOT NULL,               -- e.g. "city_combined.inp"
  directory          TEXT      NOT NULL,               -- e.g. "EPA" or "Hydraulics"
  size               INTEGER   NOT NULL,               -- file size in bytes
  last_modified      TIMESTAMP NOT NULL,               -- date from upload
  node_count         INTEGER   NOT NULL DEFAULT 0,     -- parsed: JUNCTIONS+OUTFALLS+DIVIDERS+STORAGE
  link_count         INTEGER   NOT NULL DEFAULT 0,     -- parsed: CONDUITS+PUMPS+ORIFICES+WEIRS+OUTLETS
  subcatchment_count INTEGER   NOT NULL DEFAULT 0,     -- parsed: SUBCATCHMENTS
  description        TEXT,                             -- user or auto-generated description
  object_path        TEXT      NOT NULL,               -- GCS path: /objects/inp-files/<uuid>-<name>
  created_at         TIMESTAMP NOT NULL DEFAULT NOW(), -- record creation time
  is_pinned          BOOLEAN   NOT NULL DEFAULT FALSE, -- quick access pin
  last_accessed_at   TIMESTAMP                         -- last time user viewed this file
);
```

**Drizzle Property → SQL Column Mapping:**

| Drizzle Property     | SQL Column           | Type        |
|:---------------------|:---------------------|:------------|
| `id`                 | `id`                 | `varchar`   |
| `filename`           | `filename`           | `text`      |
| `directory`          | `directory`          | `text`      |
| `size`               | `size`               | `integer`   |
| `lastModified`       | `last_modified`      | `timestamp` |
| `nodeCount`          | `node_count`         | `integer`   |
| `linkCount`          | `link_count`         | `integer`   |
| `subcatchmentCount`  | `subcatchment_count` | `integer`   |
| `description`        | `description`        | `text`      |
| `objectPath`         | `object_path`        | `text`      |
| `createdAt`          | `created_at`         | `timestamp` |
| `isPinned`           | `is_pinned`          | `boolean`   |
| `lastAccessedAt`     | `last_accessed_at`   | `timestamp` |

### 5.3 Exported Types (`shared/schema.ts`)

```typescript
export const insertInpFileSchema = createInsertSchema(inpFiles).omit({ id: true, createdAt: true });
export type InsertInpFile = z.infer<typeof insertInpFileSchema>;
export type InpFile = typeof inpFiles.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
```

---

## 6. API Endpoints — Complete Reference (18 Routes)

### 6.1 `GET /api/stats` (line 26)

Returns aggregate statistics across all models.

**Response:**
```json
{
  "totalFiles": 1042,
  "totalDirectories": 18,
  "totalNodes": 220541,
  "totalLinks": 226893,
  "totalSubcatchments": 70214,
  "totalSizeBytes": 482394112,
  "avgNodesPerFile": 211,
  "avgLinksPerFile": 217,
  "avgSubcatchmentsPerFile": 67,
  "largestFile": { "filename": "city_combined.inp", "size": 24700000 },
  "smallestFile": { "filename": "test.inp", "size": 3200 },
  "directories": [{ "name": "EPA", "fileCount": 42 }, ...],
  "inpCount": 980,
  "xpCount": 62
}
```

The `inpCount`/`xpCount` use PostgreSQL `FILTER(WHERE filename LIKE ...)` for extension-based counting.

### 6.2 `GET /api/inp-files` (line 36)

Paginated file list.

**Query params:** `limit` (default 100), `offset` (default 0)

**Response:**
```json
{
  "files": [{
    "id": "uuid-string",
    "filename": "model.inp",
    "directory": "EPA",
    "size": "2.45 MB",          // formatted string, not bytes
    "lastModified": "2024-03-15", // ISO date string
    "nodeCount": 342,
    "linkCount": 385,
    "subcatchmentCount": 28,
    "description": "Uploaded via web interface"
  }],
  "total": 1042,
  "limit": 100,
  "offset": 0,
  "hasMore": true
}
```

**Important:** `size` is a formatted string (e.g., "2.45 MB"), not raw bytes. The `formatFileSize()` helper converts bytes to MB with 2 decimal places.

### 6.3 `GET /api/inp-files/compare` (line 66)

Compare two files side-by-side.

**Query params:** `file1` (ID), `file2` (ID)

**Response:** Two file objects with `id`, `filename`, `directory`, `nodeCount`, `linkCount`, `subcatchmentCount`, and full `content` (raw INP text).

### 6.4 `GET /api/inp-files/:id` (line 117)

Single file with full content and coordinates for map visualization.

**Response:** All `inp_files` columns + `fileContent` (raw text from Object Storage) + `coordinates` (parsed from `[COORDINATES]`, `[VERTICES]`, `[POLYGONS]`, `[CONDUITS]` sections):

```json
{
  "id": "...", "filename": "...", "directory": "...",
  "fileContent": "[TITLE]\nExample Model\n[JUNCTIONS]\n...",
  "coordinates": {
    "nodes": [{ "id": "J1", "x": 1000.0, "y": 2000.0 }],
    "vertices": [{ "id": "C1", "vertices": [{"x": 1100, "y": 2100}] }],
    "polygons": [{ "id": "S1", "vertices": [{"x": 900, "y": 1900}, ...] }],
    "links": [{ "id": "C1", "fromNode": "J1", "toNode": "J2" }]
  },
  "size": "2.45 MB",
  "lastModified": "2024-03-15"
}
```

Also triggers `parseCoordinates()` from `inp-parser.ts` which extracts node positions, link vertex paths, and subcatchment polygon boundaries.

### 6.5 `PUT /api/inp-files/:id/content` (line 146)

Update file text content. Re-parses metadata and updates DB.

**Request body:** `{ "content": "full INP text..." }`

**Server actions:**
1. Updates content in Object Storage via `updateInpFileContent()`
2. Re-parses the new content with `parseInpFile()` to get updated node/link/subcatchment counts
3. Updates DB metadata via `storage.updateFileMetadata()`

**Response:** `{ "success": true, "nodeCount": 350, "linkCount": 392, "subcatchmentCount": 30 }`

### 6.6 `POST /api/inp-files/upload` (line 180)

Multi-file upload with duplicate detection.

**Request:** Multipart form data with `files` field + optional `directory` field (default: "Imported Files")

**Server logic:**
1. Filters uploaded files for `.inp` or `.xp` extensions
2. Fetches existing filenames in target directory → builds `Set`
3. For each file: if filename exists in Set → skip; otherwise → parse metadata → upload to Object Storage → create DB record
4. Returns counts of created, skipped, and failed

**Response:**
```json
{
  "files": [{ "id": "...", "filename": "model.inp", ... }],
  "count": 8,
  "failed": [{ "filename": "bad.inp", "error": "Parse error" }],
  "failedCount": 1,
  "skipped": [{ "filename": "existing.inp" }],
  "skippedCount": 3
}
```

### 6.7 `DELETE /api/inp-files/:id` (line 257)

Delete single file. Removes from both Object Storage and database.

### 6.8 `DELETE /api/directories/:directory` (line 271)

Delete all files in a directory. URL-encodes the directory name. Deletes from Object Storage first, then from DB. Returns `{ "success": true, "deletedCount": 42 }`.

### 6.9 `GET /api/inp-files/search/content` (line 291)

Full-text search inside file content across all models.

**Query param:** `q` (search string)

**Server logic:**
1. Fetches ALL files from DB
2. For each file, downloads content from Object Storage
3. Case-insensitive `includes()` check
4. For matches, scans line-by-line and returns up to 5 matching lines with line numbers

**Response:**
```json
[{
  "id": "uuid",
  "filename": "model.inp",
  "directory": "EPA",
  "matches": [
    { "lineNumber": 42, "content": "C1  J1  J2  500  0.013" },
    { "lineNumber": 108, "content": "C2  J3  J4  750  0.013" }
  ]
}]
```

### 6.10 `POST /api/inp-files/:id/pin` (line 334)

Toggle pin status. Returns `{ "id": "...", "isPinned": true }`.

### 6.11 `GET /api/pinned-files` (line 347)

List pinned files. Returns array of `{ id, filename, directory, isPinned, lastAccessedAt }`.

### 6.12 `GET /api/recent-files` (line 363)

Recently viewed files. **Query param:** `limit` (default 5). Filters out files with null `lastAccessedAt`.

### 6.13 `POST /api/inp-files/:id/access` (line 380)

Record file access (updates `lastAccessedAt` to current time). Called whenever user opens file content viewer.

### 6.14 `POST /api/export` (line 390)

Export files as ZIP archive.

**Request body (option A):** `{ "fileIds": ["id1", "id2", ...] }`  
**Request body (option B):** `{ "directory": "EPA" }`

Uses Archiver library with compression level 9. Streams the ZIP directly to the response. Client receives blob and triggers browser download as `swmm5-export-{timestamp}.zip`.

### 6.15 `POST /api/simulate/:id` (line 434)

Send model to external SWMM simulation engine.

**Server logic:**
1. Reads file content from Object Storage
2. POSTs to `https://swmm-engine--robertdickinson.replit.app/api/simulate` with `{ inp_content, filename }`
3. Proxies the response back to client

### 6.16 `POST /api/load-samples` (line 474)

Load bundled sample models from `server/samples/` directory into "Sample Models" directory. Deduplicates by checking existing filenames. Extracts title from `[TITLE]` section as description.

**Response:** `{ "message": "Loaded 5 sample models", "loaded": 5, "files": ["Example1.inp", ...] }`

### 6.17 `POST /api/reswmm/apply` (line 526)

Apply ReSWMM conduit discretization to all files in a directory.

**Request body:** `{ "directory": "EPA", "config": { "enabled": true, "method": "fixed_interval", ... } }`

**Server logic:**
1. Validates config parameters (min/max lengths, dx/D ratio, MNSA)
2. Fetches all files in directory (skips existing `_Disc.inp` files)
3. For each file: downloads content → runs `applyReswmm()` → if changed, creates or updates `_Disc.inp` file
4. If a `_Disc.inp` already exists for a file, updates it in-place; otherwise creates new

**Response:**
```json
{
  "directory": "EPA",
  "totalFiles": 42,
  "filesChanged": 35,
  "filesCreated": 35,
  "method": "fixed_interval",
  "results": [{
    "filename": "model_Disc.inp",
    "changed": true,
    "stats": { "originalConduits": 385, "newConduits": 892, "nodesAdded": 507 },
    "newFileId": "uuid"
  }]
}
```

### 6.18 `GET /api/insights` (line 643)

Deep statistical analysis of all models. Server-side 5-minute cache.

**Processing pipeline:**
1. Fetches up to 2000 files from DB
2. Downloads content from Object Storage in batches of 20 (using `Promise.allSettled`)
3. Parses each file's `[CONDUITS]` section for lengths, Manning's n, offsets
4. Parses `[XSECTIONS]` section for shapes and diameters
5. Bins data into histogram buckets:
   - Pipe diameters: 4", 6", 8", 10", 12", 15", 18", 21", 24", 30", 36", 42", 48", 54", 60", 72", 84", 96"+ 
   - Manning's n: 0.009-0.011, 0.011-0.013, 0.013-0.015, 0.015-0.020, 0.020-0.030, 0.030+
   - Conduit lengths: 0-50, 50-100, 100-200, 200-500, 500-1000, 1000+
   - Offsets: Both Zero, Outlet Only, Inlet Only, Both Nonzero
6. Caches result in module-level variable with 5-minute TTL

**Diameter conversion logic:** If `geom1 < 10`, assumes feet and converts to inches (`geom1 * 12`); otherwise assumes inches directly.

---

## 7. Storage Interface (`server/storage.ts`) — All Methods

```typescript
interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // File CRUD
  getAllInpFiles(): Promise<InpFile[]>;                    // ordered by createdAt DESC
  getAllInpFilesPaginated(limit, offset): Promise<{files, total}>;
  getInpFile(id: string): Promise<InpFile | undefined>;
  createInpFile(file: InsertInpFile): Promise<InpFile>;
  deleteInpFile(id: string): Promise<void>;
  getInpFilesByDirectory(directory: string): Promise<InpFile[]>;
  deleteDirectory(directory: string): Promise<InpFile[]>;  // returns deleted records
  updateFileMetadata(id, {nodeCount, linkCount, subcatchmentCount, size}): Promise<InpFile | undefined>;

  // Quick Access
  togglePinFile(id: string): Promise<InpFile | undefined>;  // flips isPinned
  getPinnedFiles(): Promise<InpFile[]>;                      // WHERE is_pinned = true
  getRecentFiles(limit: number): Promise<InpFile[]>;         // ORDER BY last_accessed_at DESC, NOT NULL only
  updateLastAccessed(id: string): Promise<void>;             // SET last_accessed_at = new Date()
  searchFiles(query: string): Promise<InpFile[]>;            // ilike on filename, directory, description

  // Stats
  getStats(): Promise<{
    totalFiles, totalDirectories, totalNodes, totalLinks, totalSubcatchments,
    totalSizeBytes, avgNodesPerFile, avgLinksPerFile, avgSubcatchmentsPerFile,
    largestFile, smallestFile, directories, inpCount, xpCount
  }>;
}
```

The `getStats()` implementation uses SQL aggregations: `count()`, `sum()`, `countDistinct()`, and PostgreSQL `FILTER(WHERE ...)` for `.inp`/`.xp` extension counting.

---

## 8. Object Storage Service (`server/objectStorage.ts`)

| Aspect               | Detail                                                           |
|:----------------------|:-----------------------------------------------------------------|
| Provider              | Replit Object Storage → Google Cloud Storage backend             |
| File Path Pattern     | `/objects/inp-files/<uuid>-<filename>`                           |
| Supported Formats     | `.inp` (SWMM5), `.xp` (XPSWMM)                                 |
| Max Upload Size       | 200 MB (Multer limit)                                            |
| Environment Variables | `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` |

**Methods:**
- `uploadInpFile(content: string, filename: string): Promise<string>` — returns object path
- `getInpFileContent(objectPath: string): Promise<string>` — reads content as UTF-8
- `updateInpFileContent(objectPath: string, content: string): Promise<void>` — overwrites
- `deleteInpFile(objectPath: string): Promise<void>` — removes from storage

---

## 9. Client-Side API Module (`client/src/lib/api.ts`)

### TypeScript Interfaces

```typescript
interface InpFile {
  id: string; filename: string; directory: string;
  size: string;              // formatted: "2.45 MB"
  lastModified: string;      // "2024-03-15"
  nodeCount: number; linkCount: number; subcatchmentCount: number;
  description?: string;
}

interface CoordinateData {
  nodes: { id: string; x: number; y: number }[];
  vertices: { id: string; vertices: { x: number; y: number }[] }[];
  polygons: { id: string; vertices: { x: number; y: number }[] }[];
  links: { id: string; fromNode: string; toNode: string }[];
}

interface InpFileWithContent extends InpFile {
  fileContent: string;
  coordinates: CoordinateData | null;
}

interface UploadResult {
  files: InpFile[]; count: number;
  failed: { filename: string; error: string }[]; failedCount: number;
  skipped: { filename: string }[]; skippedCount: number;
}

interface ContentSearchResult {
  id: string; filename: string; directory: string;
  matches: { lineNumber: number; content: string }[];
}

interface QuickAccessFile {
  id: string; filename: string; directory: string;
  isPinned: boolean; lastAccessedAt?: string;
}
```

### Key Functions

| Function                 | HTTP Call                          | Returns                        |
|:-------------------------|:-----------------------------------|:-------------------------------|
| `getAllInpFiles(l, o)`   | `GET /api/inp-files?limit&offset` | `PaginatedFilesResponse`       |
| `getAllInpFilesFlat()`   | Multiple paginated GETs           | `InpFile[]` (all files)        |
| `getInpFile(id)`         | `GET /api/inp-files/:id`          | `InpFileWithContent`           |
| `uploadInpFiles(f, d)`  | `POST /api/inp-files/upload`      | `UploadResult`                 |
| `deleteInpFile(id)`     | `DELETE /api/inp-files/:id`       | `void`                         |
| `deleteDirectory(d)`    | `DELETE /api/directories/:d`      | `void`                         |
| `searchFileContent(q)`  | `GET /api/.../search/content?q=`  | `ContentSearchResult[]`        |
| `togglePinFile(id)`     | `POST /api/inp-files/:id/pin`     | `{ id, isPinned }`             |
| `getPinnedFiles()`      | `GET /api/pinned-files`           | `QuickAccessFile[]`            |
| `getRecentFiles(n)`     | `GET /api/recent-files?limit=n`   | `QuickAccessFile[]`            |
| `recordFileAccess(id)`  | `POST /api/inp-files/:id/access`  | `void`                         |
| `exportFiles(ids)`      | `POST /api/export` + blob download| `void` (triggers browser save) |
| `exportDirectory(d)`    | `POST /api/export` + blob download| `void` (triggers browser save) |
| `updateInpFileContent()` | `PUT /api/inp-files/:id/content` | `UpdateContentResult`          |

`getAllInpFilesFlat()` paginated in batches of 100, continues until `hasMore` is false. Includes error resilience: returns partial results if a batch fails after successfully loading some files.

Export functions create a temporary blob URL, programmatically click a download link, then revoke the URL.

---

## 10. Feature Details

### 10.1 Dashboard — State Management (928 LOC)

**State Variables:**
```typescript
searchQuery: string                  // instant filename filter
contentSearchQuery: string           // server-side content search term
contentSearchResults: ContentSearchResult[]  // results from content search
contentHighlightFile: { id, term }   // selected file for highlighted viewer
pinnedFiles: QuickAccessFile[]       // pinned files for quick access row
recentFiles: QuickAccessFile[]       // recently viewed files row
sortField: "name" | "size" | "nodeCount" | "linkCount" | "subcatchmentCount"
sortDirection: "asc" | "desc"
stats: StatsData                     // aggregate counts from /api/stats
collapsedDirs: Set<string>           // which directories are collapsed
filters: FilterState                 // min/max nodes, min/max links, selectedDirectories
applyingReswmm: string | null        // directory currently being discretized
exportingDir: string | null          // directory currently being exported
loadingSamples: boolean              // loading sample models
```

**Data Flow:**
1. On mount: `loadQuickAccess()` + `loadStats()` — fetch pinned/recent files and stats
2. On `refreshCounter` change: reload both stats and quick access
3. `filteredAndSortedFiles` = `useMemo` applying filters (node/link ranges, directories) + sorting
4. `groupedFiles` = files grouped by directory name
5. `filteredDirectories` = directories filtered by search query (searches both dir name and filenames within)

**Search Behaviors:**
- **Filename search**: Client-side filter. Typing filters both directory names and filenames instantly.
- **Content search**: Calls `searchFileContent(query)` → server downloads every file from Object Storage → scans for matches → returns up to 5 matching lines per file. When user clicks "View" on a result, opens Dialog with full file content where all occurrences are wrapped in `<mark>` tags.

**Highlight Viewer:**
- `highlightText()` function wraps matches in `<mark className="bg-primary/30 ...">` tags
- Full file content is loaded via `getInpFile()` and displayed in a scrollable Dialog
- All matches in the content are highlighted with search term

**Stats Bar Cards:**
- Total Models (shows `.inp` count + `.xp` count breakdown below)
- Total Nodes, Total Links, Total Subcatchments, Directories count
- Each card has an icon and animated number

**Directory Sections:**
- Each directory is collapsible via chevron button
- "Collapse All" / "Expand All" toggle in toolbar
- Per-directory ReSWMM button: calls `handleApplyReswmm(directory)` which reads config from `getReswmmConfig()` (localStorage), POSTs to `/api/reswmm/apply`
- Per-directory Export button: calls `handleExportDirectory(directory)` which POSTs to `/api/export`
- Directory headers use `<div role="button">` (not `<button>`) to avoid nested button HTML validation errors

**Empty State:**
- When `files.length === 0` and not loading, shows hero image background + onboarding cards + "Load Sample Models" button
- Hero image: `technical_hydrology_network_blueprint_abstract_background.png` from `attached_assets/`

### 10.2 FileCard — Individual Model Cards (556 LOC)

**State per card:**
```typescript
showContent: boolean         // content viewer/editor dialog open
showMap: boolean             // SVG map visualization dialog open
showMinecraftMap: boolean    // voxel map dialog open
showDeleteConfirm: boolean   // delete confirmation alert
fileContent: string          // loaded raw file text
originalContent: string      // saved original (for unsaved changes detection)
coordinates: CoordinateData  // parsed node/link positions
hasChanges: boolean          // content edited but not saved
```

**Content Editor:**
- Opens in a Dialog with a `<Textarea>` pre-filled with raw INP text
- Tracks changes by comparing against `originalContent`
- "Save" button calls `updateInpFileContent()` → server re-parses metadata
- Close with unsaved changes: shows browser `confirm()` dialog
- Copy button copies content to clipboard

**Map Visualizations (two toggle buttons):**
1. **SVG Map** (`MapVisualization.tsx`, 251 LOC): Renders nodes as circles, links as lines between nodes. Supports zoom/pan via mouse wheel and drag. Uses `<svg>` with dynamic viewBox. Falls back to "No coordinate data" message if `[COORDINATES]` section missing.
2. **Minecraft Map** (`MinecraftMap.tsx`, 1,136 LOC — largest component): Renders network in voxel/block style with SVG. Features include:
   - **Multiple biome themes** (forest, desert, ocean, etc.) with procedural terrain
   - **Interactive tooltips**: Hover any node (◆), link (━), or subcatchment (≈) to see ID and metadata in a Minecraft-style tooltip popup
   - **Isometric 2.5D toggle**: Button switches between flat top-down view and `perspective(800px) rotateX(45deg) rotateZ(-10deg) scale(0.85)` 3D perspective
   - **Animated water flow**: Conduit pipes show flowing wave animation along their path indicating flow direction
   - **Zoom/pan**: Mouse wheel + drag for navigation

**Actions Dropdown:**
- Pin/Unpin → calls `togglePinFile()` API, updates local state, calls `onPinChange` callback
- Download → calls `exportFiles([file.id])` which downloads a ZIP with single file
- Delete → shows AlertDialog confirmation, then calls `removeFile()`
- Open in Engine → shows toast notification (placeholder — no `window.open`, not wired to external URL)
- Open in INP MAKER → shows toast notification (placeholder — not wired)
- Run in BatchSWMM → shows toast notification (placeholder — not wired)

**Simulation:**
- "Run Simulation" button calls `runSwmmSimulation()` from `swmmEngine.ts`
- Shows simulation report in a Dialog when complete

### 10.3 Sidebar — Navigation & Uploads (567 LOC)

**Navigation Items:**
```typescript
[
  { href: "/",            label: "Dashboard",         icon: LayoutDashboard },
  { href: "/compare",     label: "Compare Models",    icon: GitCompare },
  { href: "/ai-analysis", label: "AI Analysis",       icon: BrainCircuit },
  { href: "/insights",    label: "Database Insights",  icon: BarChart3 },
  { href: "/reswmm",      label: "ReSWMM",            icon: Scissors },
  { href: "/settings",    label: "Settings",           icon: Settings },
]
```

Each nav item shows description on hover via Tooltip.

**File Upload:**
- Hidden `<input type="file" accept=".inp,.xp" multiple>` triggered by "Upload Files" button
- Filters for `.inp`/`.xp` extensions client-side

**Directory Import Flow:**
1. Hidden `<input type="file" webkitdirectory>` (no `accept` attribute — removed because Windows hides non-matching files)
2. On selection: client filters for `.inp`/`.xp` files
3. `showFileSelector` dialog opens listing discovered files
4. Files sorted by size descending (largest first) for prioritized import
5. Each file has a checkbox; "Select All" toggle at top
6. "Import N Files" button sends only checked files to `uploadFiles()`
7. Directory name extracted from `webkitRelativePath` (first path segment)

**Directory List:**
- Collapsible section showing each unique directory with file count
- Each directory has a delete button (with AlertDialog confirmation)
- Delete removes all files in directory via `removeDirectory()`

**Mobile:**
- `MobileHeader` component shows hamburger menu icon
- Sidebar content rendered inside a `Sheet` (slide-out drawer) on mobile
- Uses `useIsMobile()` hook for breakpoint detection

### 10.4 AI Analysis — Health Scoring Engine (613 LOC)

**Single Model Analysis:**
1. User selects model from dropdown (populated from FileContext)
2. Clicks "Analyze" → fetches full content via `getInpFile()`
3. Runs `analyzeInpFile()` from `inpAnalyzer.ts` (client-side, no server round-trip)
4. Displays results:
   - Health score badge (0-100) with color coding (red/yellow/green)
   - Summary text based on score range
   - Issues list grouped by severity (Errors → Warnings → Info)
   - Section completeness in 7 categories with progress bars
   - Suggestions for improvement

**Health Score Formula (`inpAnalyzer.ts`):**
```
score = 100
score -= errorCount × 15
score -= warningCount × 5
score -= infoCount × 1
score -= (missingSections - 3) × 2    (if > 3 missing)
score -= 10                            (if no outfalls and has nodes)
score -= 20                            (if no nodes and no links)
score = clamp(0, 100)
```

**Issues Detected:**
| Category          | Checks                                                           |
|:-------------------|:----------------------------------------------------------------|
| Structural Errors  | No outfalls defined, undefined nodes referenced by links, zero-length conduits, zero/negative cross-section geometry |
| Connectivity       | Orphan nodes (not connected to any link), nodes defined but no links exist |
| Slope Analysis     | Adverse slopes (upstream invert < downstream invert), near-zero slopes |
| Manning's n        | Values ≤ 0 or > 0.5 (unusual), values > 0.05 (relatively high) |
| Missing Sections   | Checks against 13 expected sections: TITLE, OPTIONS, RAINGAGES, SUBCATCHMENTS, SUBAREAS, INFILTRATION, JUNCTIONS, OUTFALLS, CONDUITS, XSECTIONS, COORDINATES, REPORT, MAP |

**Section Categories (7 groups):**
1. **Core Network**: JUNCTIONS, OUTFALLS, STORAGE, DIVIDERS, CONDUITS, PUMPS, ORIFICES, WEIRS, OUTLETS
2. **Geometry**: XSECTIONS, TRANSECTS, COORDINATES, VERTICES, MAP, POLYGONS
3. **Hydrology**: RAINGAGES, SUBCATCHMENTS, SUBAREAS, INFILTRATION, AQUIFERS, GROUNDWATER
4. **Hydraulics**: OPTIONS, REPORT, LOSSES, CONTROLS, CURVES, TIMESERIES, PATTERNS, DWF, INFLOWS
5. **Water Quality**: POLLUTANTS, LANDUSES, BUILDUP, WASHOFF, COVERAGES, TREATMENT, LOADINGS
6. **Green Infrastructure**: LID_CONTROLS, LID_USAGE
7. **Snow & Climate**: SNOWPACKS, TEMPERATURE, EVAPORATION, ADJUSTMENTS

**Percentile Comparison:**
```typescript
function computePercentile(value: number, allValues: number[]): number {
  const sorted = [...allValues].sort((a, b) => a - b);
  return Math.round(sorted.filter(v => v < value).length / sorted.length * 100);
}
```
Shows where the analyzed model ranks vs ALL loaded models for nodes, links, and subcatchments.

**Batch Analysis ("Analyze All"):**
- Iterates through every file sequentially
- For each: fetches content → runs `analyzeInpFile()` → stores result
- Progress bar shows `batchProgress / batchTotal`
- Results table with sortable columns: filename, directory, score, errors, warnings, info
- Failed files shown with score = -1

### 10.5 Compare Models — Section-Aware Diff (386 LOC)

**File Selection:**
- Two `<Select>` dropdowns populated by fetching ALL files (paginated loop in `useQuery`)
- TanStack Query caches the file list

**Diff Algorithm (`lib/diff.ts`, 221 LOC):**
1. `parseInpSections()` splits content by `[SECTION]` headers
2. For each section found in either file, computes line-level diff
3. Outputs `SectionDiff[]` with `hasChanges` flag per section
4. Each line tagged as `'unchanged'`, `'added'`, or `'removed'`

**Display:**
- Metadata comparison table (nodes, links, subcatchments side-by-side)
- Collapsible section-by-section diff (only sections with changes shown by default)
- Lines color-coded: green for added, red for removed, no background for unchanged

**Markdown Report Export:**
- `generateMarkdownReport()` builds a full comparison document
- Includes file metadata table, summary stats (lines added/removed/unchanged, sections changed)
- Section-by-section diff with `+`/`-` line prefixes
- Downloaded as `.md` file via blob URL

### 10.6 Insights — Statistical Visualizations (355 LOC)

**Chart Components (all pure CSS, no charting library):**

1. **`BarChartViz`**: Horizontal bars proportional to max value. Shows count + percentage for each bin. Hover opacity effect.
2. **`DonutChart`**: SVG `<circle>` elements with `strokeDasharray`/`strokeDashoffset` for segments. Center shows total count. Legend shows top 8 entries with color dots.
3. **`ScatterPlot`**: CSS `position: absolute` dots plotted proportionally. Max 200 dots rendered. Hover shows tooltip via `title` attribute. Displays average links/node ratio.

**Data Source:**
- Single `useEffect` fetches `/api/insights` on mount
- Loading state shows spinner with "Analyzing model database..." message
- 4 stat cards at top: Models, Elements, Conduits, Files Analyzed

### 10.7 ReSWMM — Conduit Discretization (388 LOC frontend, 598 LOC engine)

**Config Interface:**
```typescript
interface ReswmmConfig {
  enabled: boolean;
  method: 'none' | 'fixed_interval' | 'dx_d_ratio';
  fixedMinLength: number;   // default: 50
  fixedMaxLength: number;   // default: 200
  dxDRatio: number;         // default: 5
  mnsa: number;             // default: 12.566 (4π ≈ circle area with r=2)
}
```

**Config Persistence:**
```typescript
const STORAGE_KEY = 'reswmm-config';
getReswmmConfig()  → reads from localStorage, merges with defaults
saveReswmmConfig() → writes to localStorage
```

**UI Elements:**
- Enable/disable toggle switch
- Method selector (Fixed Interval vs Δx/D Ratio)
- Slider controls for min/max length, dx/D ratio, MNSA
- Per-directory "Apply" buttons with directory file counts
- Results table showing which files were changed, with stats (original vs new conduit counts, nodes added)

**Engine (`server/reswmm.ts`, 598 LOC):**
- Algorithm by Robson Leo Pachaly
- Takes INP content + config → returns `{ changed: boolean, discretizedContent: string, stats: {...} }`
- Modifies sections: [TITLE], [JUNCTIONS], [CONDUITS], [XSECTIONS], [LOSSES], [COORDINATES]
- For each conduit exceeding length limits: splits into N segments, creates intermediate junction nodes
- Junction coordinates interpolated between upstream/downstream nodes
- New junctions get MNSA (Minimum Nodal Surface Area) parameter

### 10.8 Settings (177 LOC)

**Settings Cards:**
1. **Dark Mode**: Switch toggle → `useTheme().setDark()`
2. **Color Theme**: 4 radio buttons with color swatch previews:
   - EPA: `#3b82f6`, `#1e3a5f` (blue)
   - UF: `#FA4616`, `#0021A5` (orange/blue)
   - Oregon State: `#D73F09`, `#000000` (orange/black)
   - Auburn: `#DD550C`, `#03244D` (orange/navy)
3. **Notifications**: Upload + Analysis notification toggles (UI only, not persisted)
4. **Data Management**: Auto-parse on Upload toggle (UI only, not persisted)

---

## 11. Theme System

### CSS Variables (`index.css`)
Each theme defines: `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--border`, `--ring`, `--muted`, `--muted-foreground`, `--accent`, `--destructive`, `--card`, `--popover`, `--input`, `--sidebar-*` variants.

4 themes × 2 modes = 8 CSS blocks: `.theme-epa`, `.dark.theme-epa`, `.theme-uf`, `.dark.theme-uf`, `.theme-oregon-state`, `.dark.theme-oregon-state`, `.theme-auburn`, `.dark.theme-auburn`

### Anti-Flash Script (inline in `<head>`)
```javascript
try {
  var t = JSON.parse(localStorage.getItem('swmm-theme') || '{}');
  document.documentElement.className = 
    (t.dark !== false ? 'dark' : 'light') + ' theme-' + (t.colorTheme || 'epa');
} catch(e) { 
  document.documentElement.className = 'dark theme-epa'; 
}
```
Runs synchronously before any CSS/JS loads. Default: dark mode with EPA theme.

### Runtime (`ThemeContext.tsx`)
```typescript
useEffect(() => {
  root.classList.remove("dark", "light");
  root.classList.add(dark ? "dark" : "light");
  root.classList.remove("theme-epa", "theme-uf", "theme-oregon-state", "theme-auburn");
  root.classList.add(`theme-${colorTheme}`);
}, [dark, colorTheme]);
```

---

## 12. INP File Parser (`server/inp-parser.ts`, 189 LOC)

**`parseInpFile(content: string)`** — Extracts metadata:

| Count           | Sections Scanned                                         |
|:----------------|:---------------------------------------------------------|
| nodeCount       | [JUNCTIONS], [OUTFALLS], [DIVIDERS], [STORAGE]           |
| linkCount       | [CONDUITS], [PUMPS], [ORIFICES], [WEIRS], [OUTLETS]      |
| subcatchmentCount | [SUBCATCHMENTS]                                        |

Counts non-comment, non-empty lines within each section.

**`parseCoordinates(content: string)`** — Extracts geometry:

| Data Type     | Section Parsed     | Output                                        |
|:-------------|:-------------------|:----------------------------------------------|
| Node positions | [COORDINATES]    | `{ id, x, y }[]`                              |
| Link vertices  | [VERTICES]       | `{ id, vertices: {x, y}[] }[]`                |
| Subcatchment polygons | [POLYGONS] | `{ id, vertices: {x, y}[] }[]`               |
| Link connections | [CONDUITS], [PUMPS], [ORIFICES], [WEIRS], [OUTLETS] | `{ id, fromNode, toNode }[]` |

---

## 13. File Context (`client/src/context/FileContext.tsx`, 93 LOC)

```typescript
interface FileContextType {
  files: InpFile[];                                    // all loaded files
  loading: boolean;                                     // initial load in progress
  error: string | null;                                 // last error message
  uploadFiles(files: File[], dir?: string): Promise<UploadResult>;
  removeFile(id: string): Promise<void>;
  removeDirectory(directory: string): Promise<void>;
  refreshFiles(): Promise<void>;
  refreshCounter: number;                               // increments after every mutation
}
```

**Behavior:**
- `refreshFiles()` calls `getAllInpFilesFlat()` (paginated loop) and sets `files` state
- `uploadFiles()` calls API, refreshes files, increments `refreshCounter`
- `removeFile()` optimistically removes from local state, increments `refreshCounter`
- `removeDirectory()` optimistically removes all files in directory, increments `refreshCounter`
- Dashboard watches `refreshCounter` to reload stats and quick access (not `files.length`, since all-duplicate imports don't change count)

---

## 14. Build & Development

### Scripts
| Command           | What It Does                                                |
|:------------------|:------------------------------------------------------------|
| `npm run dev`     | `NODE_ENV=development tsx server/index.ts` — starts Express + Vite middleware (port 5000) |
| `npm run build`   | `tsx script/build.ts` — Vite builds frontend → `dist/public/`, esbuild bundles backend → `dist/index.cjs` |
| `npm run start`   | `NODE_ENV=production node dist/index.cjs` — serves built frontend + API |
| `npm run check`   | `tsc` — TypeScript type checking                           |
| `npm run db:push` | `drizzle-kit push` — pushes schema changes to PostgreSQL    |

### Path Aliases (tsconfig.json)
```json
{ "@shared": "shared/", "@assets": "attached_assets/" }
```

---

## 15. Environment Variables

| Variable                           | Purpose                                      |
|:-----------------------------------|:---------------------------------------------|
| `DATABASE_URL`                     | PostgreSQL connection string                 |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | GCS bucket identifier                        |
| `PUBLIC_OBJECT_SEARCH_PATHS`       | Object storage public paths                  |
| `PRIVATE_OBJECT_DIR`               | Object storage private directory             |

---

## 16. Key Conventions & Gotchas

| Convention                | Detail                                                                     |
|:--------------------------|:---------------------------------------------------------------------------|
| API file list shape       | Always `{ files: [...], total, limit, offset, hasMore }` — extract `.files` |
| `size` field formatting   | API returns formatted string ("2.45 MB"), not raw bytes                    |
| Date formatting           | `lastModified` returns ISO date string "2024-03-15", not full timestamp    |
| refreshCounter pattern    | Dashboard watches `refreshCounter`, not `files.length`, for stat refresh   |
| Directory input           | No `accept` attribute on directory picker (Windows hides files otherwise)  |
| Single file input         | Uses `accept=".inp,.xp"` for file type filtering                          |
| Duplicate detection       | Server-side by filename within same directory (Set lookup)                 |
| Import sort order         | File selector sorts by size descending (largest first)                     |
| Directory header nesting  | Uses `<div role="button">` to avoid nested `<button>` HTML errors         |
| Insights cache            | Server-side, 5-min TTL, module-level variable, no invalidation logic beyond TTL |
| ReSWMM skip pattern       | Files ending in `_Disc.inp` are skipped when applying ReSWMM              |
| Theme localStorage key    | `swmm-theme` → `{ dark: boolean, colorTheme: string }`                   |
| ReSWMM localStorage key   | `reswmm-config` → full `ReswmmConfig` object                             |
| Default theme             | Dark mode + EPA theme (blue)                                              |
| Default ReSWMM            | Disabled, fixed_interval, min=50, max=200, dxD=5, mnsa=12.566            |
| Content search limit      | Returns up to 5 matching lines per file                                   |
| Insights batch size       | Downloads content from Object Storage in batches of 20 (Promise.allSettled)|
| Insights max files        | Up to 2000 files processed                                               |
| Compare file loading      | CompareModels fetches ALL files via paginated loop in useQuery             |
| Batch analysis            | Sequential (one file at a time), shows live progress                      |
| Export filename pattern   | `swmm5-export-{timestamp}.zip` or `{directory}-{timestamp}.zip`           |
| Simulation endpoint       | External: `https://swmm-engine--robertdickinson.replit.app/api/simulate`  |
| Score -1 in batch         | Indicates analysis failed for that file                                   |

---

## 17. External Dependencies (Complete List)

### Infrastructure
`pg`, `drizzle-orm`, `drizzle-zod`, `drizzle-kit`, `@google-cloud/storage`

### Frontend
`react` (v19), `react-dom`, `wouter`, `@tanstack/react-query`, 20+ `@radix-ui/react-*` packages, `framer-motion`, `lucide-react`, `tailwind-merge`, `class-variance-authority`, `date-fns`, `recharts` (available but unused), `react-resizable-panels`, `cmdk`, `embla-carousel-react`, `react-hook-form`, `@hookform/resolvers`

### Backend
`express`, `multer` (200 MB limit), `archiver` (ZIP level 9), `express-session`, `connect-pg-simple`, `passport`, `passport-local`, `memorystore`

### Dev
`vite`, `tsx`, `esbuild`, `typescript`, `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`

---

## 18. Installed Integrations

| Integration                    | Version | Purpose                              |
|:-------------------------------|:--------|:-------------------------------------|
| `javascript_database`          | 1.0.0   | PostgreSQL database                  |
| `javascript_object_storage`    | 1.0.0   | Replit Object Storage (GCS)          |

---

## 19. Ecosystem Links (External Apps)

| App              | URL                                                   | Integration Level  |
|:-----------------|:------------------------------------------------------|:-------------------|
| SWMM Engine      | `swmm-engine--robertdickinson.replit.app`             | API endpoint exists in backend (`/api/simulate/:id`); FileCard uses client-side WASM simulation via `swmmEngine.ts` instead |
| INP MAKER        | External tool                                         | Toast placeholder only (no URL wired) |
| BatchSWMM        | External tool                                         | Toast placeholder only (no URL wired) |

---

## 20. Model Library Statistics

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

## 21. Git History (Key Milestones)

| Commit    | Description                                                     |
|:----------|:----------------------------------------------------------------|
| `95d9153` | Documentation: grading and improvement ideas                    |
| `60ca370` | Add .xp (XPSWMM) file format support                           |
| `d65f6a0` | Server-side duplicate detection + import feedback               |
| `bf4c92e` | Rename app to "SWMM5 Network Miner" everywhere                 |
| `d0e0ec3` | Directory upload with selective file picker                     |
| `73224ff` | Compare Models + expanded AI Analysis                           |
| `a88e87c` | Collapsible directory sections                                  |
| `c1157e1` | Multi-theme support (EPA, UF, Oregon State, Auburn)             |
| `f563e3c` | Database Insights + improved AI Analysis                        |
| `7419325` | ReSWMM conduit discretization tool                              |

---

## 22. Grading — A / 92 out of 100

```
Content & Data                ██████████  97
Core Functionality            █████████░  95
Analysis & Intelligence       █████████░  93
Statistical Insights          █████████░  94
Visualization                 █████████░  90
Model Comparison              █████████░  91
Architecture                  █████████░  92
Ecosystem Integration         ████████░░  82
UI / UX                       █████████░  88
```

---

## 23. Improvement Roadmap (10 Ideas)

### Fastest to Implement
| # | Feature                     | Effort    | Impact |
|:--|:----------------------------|:----------|:-------|
| 5 | Ecosystem Data Flow (postMessage to other apps) | 1-2 days | +2 pts |
| 3 | Model Quality Leaderboard (store health_score in DB) | 2 weeks | +1 pt |
| 9 | Usage Analytics (model_events table) | 1-2 weeks | +1 pt |

### Highest Value
| # | Feature                     | Effort    | Impact |
|:--|:----------------------------|:----------|:-------|
| 2 | Smart Recommendations with Auto-Fix buttons | 2 weeks | +2 pts |
| 4 | Cross-Model Pattern Search (section-based index) | 1-2 weeks | +2 pts |
| 8 | Batch ReSWMM with CE Comparison (run both original + discretized) | 1-2 weeks | +2 pts |
| 1 | Model Timeline (version detection + evolution tracking) | 2 weeks | +2 pts |

### Unique / Fun
| # | Feature                     | Effort    | Impact |
|:--|:----------------------------|:----------|:-------|
| 7 | Interactive Minecraft Maps (click popups, color coding, PNG export) | 1-2 weeks | +1 pt |
| 6 | Model Similarity Finder (weighted distance scoring) | 1-2 weeks | +1 pt |
| 10| WASM Simulation Dashboard (browser-side validation) | 2-3 weeks | +2 pts |

### Fast Path to A+ (96+)
#5 + #2 + #4 + #3 = ~5-6 weeks → +7 points → 99

---

## 24. Suite Rankings

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
