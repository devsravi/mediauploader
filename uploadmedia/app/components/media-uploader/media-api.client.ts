import type {
  MediaApi,
  MediaApiResponse,
  UploadMediaOptions,
  UploadRequest,
} from "./types";

type ValidationErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

function parseResponse<T>(xhr: XMLHttpRequest): T | null {
  if (!xhr.responseText) {
    return null;
  }

  try {
    return JSON.parse(xhr.responseText) as T;
  } catch {
    return null;
  }
}

function responseError(xhr: XMLHttpRequest): Error {
  const response = parseResponse<ValidationErrorResponse>(xhr);
  const fieldError = response?.errors?.file?.[0];

  return new Error(
    fieldError ?? response?.message ?? `Upload failed with status ${xhr.status}.`,
  );
}

function upload(file: File, options: UploadMediaOptions = {}): UploadRequest {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<MediaApiResponse>((resolve, reject) => {
    const endpoint = options.replaceId
      ? `/api/media/${options.replaceId}`
      : "/api/media";

    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        options.onProgress?.({ loaded: event.loaded, total: event.total });
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = parseResponse<MediaApiResponse>(xhr);

        if (response?.data) {
          resolve(response);
          return;
        }
      }

      reject(responseError(xhr));
    });
    xhr.addEventListener("error", () => reject(new Error("Network request failed.")));
    xhr.addEventListener("abort", () => reject(new DOMException("Upload cancelled.", "AbortError")));

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });

  return {
    promise: promise.then((response) => response.data),
    abort: () => xhr.abort(),
  };
}

async function deleteMedia(id: number): Promise<void> {
  const response = await fetch(`/api/media/${id}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("The uploaded file could not be removed.");
  }
}

export const mediaApi: MediaApi = { upload, delete: deleteMedia };
