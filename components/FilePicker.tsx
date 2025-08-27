import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";

export interface FilePickerOptions {
  type?: string[];
  multiple?: boolean;
}

export interface FilePickerResult {
  canceled: boolean;
  assets?: Array<{
    name: string;
    size?: number;
    uri: string;
    mimeType?: string;
  }>;
}

export const pickFile = async (options: FilePickerOptions = {}): Promise<FilePickerResult> => {
  const {
    type = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ],
    multiple = false
  } = options;

  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = multiple;
      
      // Convert MIME types to file extensions for web
      const acceptTypes = type.map(mimeType => {
        switch (mimeType) {
          case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            return '.xlsx';
          case 'application/vnd.ms-excel':
            return '.xls';
          case 'text/csv':
            return '.csv';
          case 'application/pdf':
            return '.pdf';
          case 'image/jpeg':
            return '.jpg,.jpeg';
          case 'image/png':
            return '.png';
          default:
            return '';
        }
      }).filter(Boolean).join(',');
      
      if (acceptTypes) {
        input.accept = acceptTypes;
      }

      input.onchange = (event) => {
        const files = (event.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const assets = Array.from(files).map(file => ({
            name: file.name,
            size: file.size,
            uri: URL.createObjectURL(file),
            mimeType: file.type,
            file: file // Keep reference to original file for web
          }));

          resolve({
            canceled: false,
            assets: assets as any
          });
        } else {
          resolve({ canceled: true });
        }
      };

      input.oncancel = () => {
        resolve({ canceled: true });
      };

      // Trigger the file picker
      input.click();
    });
  } else {
    // Use expo-document-picker for mobile
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type,
        multiple,
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return { canceled: true };
      }

      return {
        canceled: false,
        assets: result.assets
      };
    } catch (error) {
      console.error('File picker error:', error);
      return { canceled: true };
    }
  }
};

// Convenience functions for common file types
export const pickExcelFile = () => pickFile({
  type: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ]
});

export const pickImageFile = () => pickFile({
  type: ['image/jpeg', 'image/png', 'image/gif']
});

export const pickPDFFile = () => pickFile({
  type: ['application/pdf']
});

export const pickMultipleFiles = (types?: string[]) => pickFile({
  type: types,
  multiple: true
});

// Helper function to read file content (useful for CSV/text files)
export const readFileContent = async (file: any): Promise<string> => {
  if (Platform.OS === "web") {
    // For web, file.file contains the original File object
    const originalFile = file.file || file;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(originalFile);
    });
  } else {
    // For mobile, use FileSystem or fetch
    try {
      const response = await fetch(file.uri);
      return await response.text();
    } catch (error) {
      throw new Error('Failed to read file content');
    }
  }
};
