export interface InpFile {
  id: string;
  filename: string;
  directory: string;
  size: string;
  lastModified: string;
  nodeCount: number;
  linkCount: number;
  subcatchmentCount: number;
  description?: string;
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface NodeCoordinate {
  id: string;
  x: number;
  y: number;
}

export interface LinkVertices {
  id: string;
  vertices: Coordinate[];
}

export interface PolygonCoordinates {
  id: string;
  vertices: Coordinate[];
}

export interface LinkDefinition {
  id: string;
  fromNode: string;
  toNode: string;
}

export interface CoordinateData {
  nodes: NodeCoordinate[];
  vertices: LinkVertices[];
  polygons: PolygonCoordinates[];
  links: LinkDefinition[];
}

export interface InpFileWithContent extends InpFile {
  fileContent: string;
  coordinates: CoordinateData | null;
}

export interface PaginatedFilesResponse {
  files: InpFile[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export async function getAllInpFiles(limit = 100, offset = 0): Promise<PaginatedFilesResponse> {
  const response = await fetch(`/api/inp-files?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error('Failed to fetch files');
  }
  return response.json();
}

export async function getAllInpFilesFlat(): Promise<InpFile[]> {
  const allFiles: InpFile[] = [];
  let offset = 0;
  const limit = 200;
  
  while (true) {
    const response = await getAllInpFiles(limit, offset);
    allFiles.push(...response.files);
    if (!response.hasMore) break;
    offset += limit;
  }
  
  return allFiles;
}

export async function getInpFile(id: string): Promise<InpFileWithContent> {
  const response = await fetch(`/api/inp-files/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch file');
  }
  return response.json();
}

export async function uploadInpFiles(files: File[], directory?: string): Promise<{ files: InpFile[], count: number }> {
  const formData = new FormData();
  
  for (const file of files) {
    formData.append('files', file);
  }
  
  if (directory) {
    formData.append('directory', directory);
  }
  
  const response = await fetch('/api/inp-files/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload files');
  }
  
  return response.json();
}

export async function deleteInpFile(id: string): Promise<void> {
  const response = await fetch(`/api/inp-files/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete file');
  }
}

export async function deleteDirectory(directory: string): Promise<void> {
  const response = await fetch(`/api/directories/${encodeURIComponent(directory)}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete directory');
  }
}

export interface ContentSearchResult {
  id: string;
  filename: string;
  directory: string;
  matches: { lineNumber: number; content: string }[];
}

export interface QuickAccessFile {
  id: string;
  filename: string;
  directory: string;
  isPinned: boolean;
  lastAccessedAt?: string;
}

export async function searchFileContent(query: string): Promise<ContentSearchResult[]> {
  const response = await fetch(`/api/inp-files/search/content?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Failed to search files');
  }
  return response.json();
}

export async function togglePinFile(id: string): Promise<{ id: string; isPinned: boolean }> {
  const response = await fetch(`/api/inp-files/${id}/pin`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to toggle pin');
  }
  return response.json();
}

export async function getPinnedFiles(): Promise<QuickAccessFile[]> {
  const response = await fetch('/api/pinned-files');
  if (!response.ok) {
    throw new Error('Failed to fetch pinned files');
  }
  return response.json();
}

export async function getRecentFiles(limit = 5): Promise<QuickAccessFile[]> {
  const response = await fetch(`/api/recent-files?limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch recent files');
  }
  return response.json();
}

export async function recordFileAccess(id: string): Promise<void> {
  await fetch(`/api/inp-files/${id}/access`, { method: 'POST' });
}

export async function exportFiles(fileIds: string[]): Promise<void> {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileIds }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to export files');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `swmm5-export-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function exportDirectory(directory: string): Promise<void> {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ directory }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to export directory');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${directory.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
