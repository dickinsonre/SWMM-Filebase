import React, { createContext, useContext, useState, ReactNode } from 'react';
import { InpFile, mockInpFiles } from '@/lib/mock-data';

interface FileContextType {
  files: InpFile[];
  addFiles: (newFiles: InpFile[]) => void;
  removeFile: (id: string) => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<InpFile[]>(mockInpFiles);

  const addFiles = (newFiles: InpFile[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <FileContext.Provider value={{ files, addFiles, removeFile }}>
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
