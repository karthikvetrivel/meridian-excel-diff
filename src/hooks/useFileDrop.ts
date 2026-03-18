import { useState, useRef, useCallback } from 'react';

interface UseFileDropOptions {
  accept: string[];
  maxSizeMB: number;
  onFile: (file: File) => void;
  onError: (message: string) => void;
}

export function useFileDrop({ accept, maxSizeMB, onFile, onError }: UseFileDropOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const validateFile = useCallback(
    (file: File): boolean => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!accept.includes(ext)) {
        onError(`Unsupported file type. Drop .xlsx, .xls, or .csv`);
        return false;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        onError(`File too large. Maximum size is ${maxSizeMB}MB.`);
        return false;
      }
      return true;
    },
    [accept, maxSizeMB, onError],
  );

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) onFile(file);
    },
    [validateFile, onFile],
  );

  const dragHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      setIsDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current--;
      if (dragCounter.current === 0) setIsDragging(false);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
  };

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleFile],
  );

  return { isDragging, dragHandlers, openFilePicker, inputRef, onInputChange };
}
