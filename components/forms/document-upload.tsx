"use client";

import * as React from "react";
import { Upload, X, Camera, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DocumentUploadProps {
  title: string;
  description: string;
  required?: boolean;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  maxFiles?: number;
  onUpload: (files: File[]) => Promise<string[]>;
  onRemove: (fileUrl: string) => void;
  uploadedFiles: string[];
  uploading?: boolean;
  error?: string;
  className?: string;
  icon?: React.ReactNode;
}

interface FileUploadState {
  file: File;
  url?: string;
  uploading: boolean;
  error?: string;
}

export function DocumentUpload({
  title,
  description,
  required = false,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  maxSize = 5,
  maxFiles = 1,
  onUpload,
  onRemove,
  uploadedFiles,
  uploading = false,
  error,
  className,
  icon = <Upload className="h-8 w-8" />,
}: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [fileStates, setFileStates] = React.useState<FileUploadState[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const maxSizeBytes = maxSize * 1024 * 1024;
    
    if (!acceptedTypes.includes(file.type)) {
      return `Only ${acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} files are allowed`;
    }
    
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSize}MB`;
    }
    
    return null;
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check if adding these files would exceed the limit
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      toast.error(`You can only upload ${maxFiles} file(s)`);
      return;
    }
    
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`);
        continue;
      }
      
      // Add file to state as uploading
      const fileState: FileUploadState = { file, uploading: true };
      setFileStates(prev => [...prev, fileState]);
      
      try {
        const urls = await onUpload([file]);
        if (urls.length > 0) {
          // Update file state with URL and remove uploading state
          setFileStates(prev => 
            prev.map(f => 
              f.file === file 
                ? { ...f, url: urls[0], uploading: false }
                : f
            )
          );
        } else {
          throw new Error('No URL returned');
        }
      } catch (error) {
        // Update file state with error
        setFileStates(prev => 
          prev.map(f => 
            f.file === file 
              ? { ...f, uploading: false, error: 'Upload failed' }
              : f
          )
        );
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const removeFile = (fileUrl: string) => {
    onRemove(fileUrl);
    setFileStates(prev => prev.filter(f => f.url !== fileUrl));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Camera className="h-4 w-4 text-blue-600" />;
    }
    return <FileText className="h-4 w-4 text-red-600" />;
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const isComplete = uploadedFiles.length > 0;
  const hasError = error || fileStates.some(f => f.error);

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {title}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <p className="text-sm text-neutral-500">{description}</p>
      </div>

      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-colors w-full overflow-hidden",
          isDragOver
            ? "border-primary-500 bg-primary-50"
            : hasError
            ? "border-red-300 bg-red-50"
            : isComplete
            ? "border-green-300 bg-green-50"
            : "border-neutral-300 hover:border-neutral-400"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className={cn(
            "p-3 rounded-full",
            hasError ? "bg-red-100" : isComplete ? "bg-green-100" : "bg-neutral-100"
          )}>
            {hasError ? (
              <AlertCircle className="h-8 w-8 text-red-600" />
            ) : isComplete ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              icon
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium text-neutral-900 mb-1">
              {isComplete ? "Document uploaded successfully" : "Upload your document"}
            </p>
            <p className="text-xs text-neutral-500 mb-4">
              {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} • Max {maxSize}MB
            </p>
          </div>

          {isComplete ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  // Remove existing file first, then allow new upload
                  if (uploadedFiles.length > 0) {
                    onRemove(uploadedFiles[0]);
                  }
                  setTimeout(() => fileInputRef.current?.click(), 100);
                }}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (uploadedFiles.length > 0) {
                    onRemove(uploadedFiles[0]);
                  }
                }}
                disabled={uploading}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </>
              )}
            </Button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={uploading}
          />
        </div>
      </div>

      {/* Display uploaded files */}
      {(uploadedFiles.length > 0 || fileStates.length > 0) && (
        <div className="space-y-3 max-w-full">
          <h4 className="text-sm font-medium text-neutral-700">Uploaded Documents</h4>
          {fileStates.map((fileState, index) => (
            <Card key={index} className="p-3 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="flex-shrink-0">
                      {getFileIcon(fileState.file.type)}
                    </div>
                    <div className="flex-1 min-w-0 max-w-full">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {fileState.file.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatFileSize(fileState.file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {fileState.uploading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                        <span className="text-xs text-neutral-500">Uploading...</span>
                      </div>
                    ) : fileState.error ? (
                      <Badge variant="destructive" className="text-xs">
                        Failed
                      </Badge>
                    ) : fileState.url ? (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        Uploaded
                      </Badge>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => fileState.url && removeFile(fileState.url)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
}
