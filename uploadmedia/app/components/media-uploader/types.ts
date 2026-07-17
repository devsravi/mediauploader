export type MediaRecord = {
  id: number;
  file_name: string;
  original_file_name: string | null;
  file_path: string;
  file_url: string;
  mime_type: string | null;
  extension: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
};

export type MediaApiResponse = {
  data: MediaRecord;
};

export type UploadProgress = {
  loaded: number;
  total: number;
};

export type UploadRequest = {
  promise: Promise<MediaRecord>;
  abort: () => void;
};

export type UploadMediaOptions = {
  replaceId?: number;
  onProgress?: (progress: UploadProgress) => void;
};

export type MediaApi = {
  upload: (file: File, options?: UploadMediaOptions) => UploadRequest;
  delete: (id: number) => Promise<void>;
};

export type CropData = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
};

export type PendingEdit = {
  file: File;
  itemId?: string;
  replacementId?: number;
};
