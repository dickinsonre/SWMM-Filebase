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

export async function getAllInpFiles(): Promise<InpFile[]> {
  const response = await fetch('/api/inp-files');
  if (!response.ok) {
    throw new Error('Failed to fetch files');
  }
  return response.json();
}

export async function getInpFile(id: string): Promise<InpFile & { fileContent: string }> {
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
