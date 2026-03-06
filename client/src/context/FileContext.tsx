import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { InpFile, UploadResult } from '@/lib/api';
import * as api from '@/lib/api';

interface FileContextType {
  files: InpFile[];
  loading: boolean;
  error: string | null;
  uploadFiles: (files: File[], directory?: string) => Promise<UploadResult>;
  removeFile: (id: string) => Promise<void>;
  removeDirectory: (directory: string) => Promise<void>;
  refreshFiles: () => Promise<void>;
  refreshCounter: number;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<InpFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refreshFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAllInpFilesFlat();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (filesToUpload: File[], directory?: string): Promise<UploadResult> => {
    try {
      setError(null);
      const result = await api.uploadInpFiles(filesToUpload, directory);
      await refreshFiles();
      setRefreshCounter(c => c + 1);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload files');
      throw err;
    }
  };

  const removeFile = async (id: string) => {
    try {
      setError(null);
      await api.deleteInpFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      setRefreshCounter(c => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
      throw err;
    }
  };

  const removeDirectory = async (directory: string) => {
    try {
      setError(null);
      await api.deleteDirectory(directory);
      setFiles((prev) => prev.filter((f) => f.directory !== directory));
      setRefreshCounter(c => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete directory');
      throw err;
    }
  };

  // Load files on mount
  useEffect(() => {
    refreshFiles();
  }, []);

  return (
    <FileContext.Provider value={{ files, loading, error, uploadFiles, removeFile, removeDirectory, refreshFiles, refreshCounter }}>
      {children}
    </FileContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
}
