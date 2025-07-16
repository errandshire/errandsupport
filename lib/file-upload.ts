import { storage } from './appwrite';
import { ID } from 'appwrite';

// File upload configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  other: ['application/zip', 'application/x-rar-compressed']
};

const PROHIBITED_CONTENT_PATTERNS = [
  /\b\d{3}-\d{3}-\d{4}\b/, // Phone numbers
  /\b\d{10,}\b/, // Long numbers (potential phone)
  /@[a-zA-Z0-9_]+/, // Social media handles
  /facebook\.com|twitter\.com|instagram\.com|linkedin\.com|tiktok\.com|snapchat\.com/i, // Social media URLs
  /whatsapp|telegram|discord/i // Messaging apps
];

export interface FileUploadResult {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string;
}

export interface FileUploadError {
  code: string;
  message: string;
}

export class FileUploadService {
  private static instance: FileUploadService;
  private bucketId: string;

  private constructor() {
    this.bucketId = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID!;
  }

  static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  // Validate file before upload
  validateFile(file: File): FileUploadError | null {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        code: 'FILE_TOO_LARGE',
        message: 'File size must be less than 10MB'
      };
    }

    // Check file type
    const isAllowedType = Object.values(ALLOWED_FILE_TYPES).some(types => 
      types.includes(file.type)
    );

    if (!isAllowedType) {
      return {
        code: 'INVALID_FILE_TYPE',
        message: 'File type not allowed. Only images, videos, documents, and archives are permitted.'
      };
    }

    // Check for prohibited content in filename
    const hasProhibitedContent = PROHIBITED_CONTENT_PATTERNS.some(pattern => 
      pattern.test(file.name)
    );

    if (hasProhibitedContent) {
      return {
        code: 'PROHIBITED_CONTENT',
        message: 'File name contains prohibited content (phone numbers, social media handles, etc.)'
      };
    }

    return null;
  }

  // Get file type category
  getFileCategory(mimeType: string): string {
    for (const [category, types] of Object.entries(ALLOWED_FILE_TYPES)) {
      if (types.includes(mimeType)) {
        return category;
      }
    }
    return 'other';
  }

  // Generate thumbnail for images
  async generateThumbnail(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) {
      return null;
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Set thumbnail dimensions
        const maxWidth = 200;
        const maxHeight = 200;
        let { width, height } = img;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and convert to blob
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbnailUrl = URL.createObjectURL(blob);
            resolve(thumbnailUrl);
          } else {
            resolve(null);
          }
        }, 'image/jpeg', 0.8);
      };

      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }

  // Upload file to Appwrite storage
  async uploadFile(file: File, conversationId: string): Promise<FileUploadResult> {
    try {
      // Validate file
      const validationError = this.validateFile(file);
      if (validationError) {
        throw new Error(validationError.message);
      }

      // Generate unique file ID
      const fileId = ID.unique();
      
      // Upload file to Appwrite
      const uploadedFile = await storage.createFile(
        this.bucketId,
        fileId,
        file
      );

      // Get file URL
      const fileUrl = storage.getFileView(this.bucketId, fileId);

      // Generate thumbnail if it's an image
      let thumbnailUrl: string | undefined;
      if (file.type.startsWith('image/')) {
        thumbnailUrl = await this.generateThumbnail(file) || undefined;
      }

      return {
        fileId: uploadedFile.$id,
        fileName: file.name,
        fileUrl: fileUrl.href,
        fileType: file.type,
        fileSize: file.size,
        thumbnailUrl
      };

    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Failed to upload file. Please try again.');
    }
  }

  // Delete file from storage
  async deleteFile(fileId: string): Promise<void> {
    try {
      await storage.deleteFile(this.bucketId, fileId);
    } catch (error) {
      console.error('File deletion error:', error);
      throw new Error('Failed to delete file.');
    }
  }

  // Get file preview URL
  getFilePreview(fileId: string, width?: number, height?: number): string {
    return storage.getFilePreview(this.bucketId, fileId, width, height).href;
  }

  // Check if file type supports preview
  supportsPreview(fileType: string): boolean {
    return ALLOWED_FILE_TYPES.image.includes(fileType) || fileType === 'application/pdf';
  }
}

// Export singleton instance
export const fileUploadService = FileUploadService.getInstance(); 