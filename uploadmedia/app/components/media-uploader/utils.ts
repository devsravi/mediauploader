export const MAX_FILE_SIZE = 12 * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = [
  "image/*",
  "video/*",
  "audio/*",
  "application/pdf",
] as const;

export class MediaValidationError extends Error {}

export function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

export function isAcceptedMediaType(type: string): boolean {
  return (
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    type.startsWith("audio/") ||
    type === "application/pdf"
  );
}

export async function validateMediaFile(file: File): Promise<void> {
  if (!isAcceptedMediaType(file.type)) {
    throw new MediaValidationError("This file type is not supported.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new MediaValidationError("The file must not be larger than 12 MB.");
  }

  if (isImage(file)) {
    await decodeImage(file);
  }
}

export function decodeImage(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    const cleanup = () => URL.revokeObjectURL(url);

    image.onload = () => {
      cleanup();
      resolve();
    };
    image.onerror = () => {
      cleanup();
      reject(new MediaValidationError("The image could not be decoded."));
    };
    image.src = url;
  });
}

export function editedFileName(file: File, outputType: string): string {
  const dotIndex = file.name.lastIndexOf(".");
  const base = dotIndex > 0 ? file.name.slice(0, dotIndex) : file.name;
  const versionPattern = /-v(\d+)$/;
  const versionedBase = versionPattern.test(base)
    ? base.replace(versionPattern, (_, value: string) => `-v${Number(value) + 1}`)
    : `${base}-v1`;
  const extension = outputType === "image/jpeg" ? "jpg" : outputType.split("/")[1];

  return `${versionedBase}.${extension}`;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}
