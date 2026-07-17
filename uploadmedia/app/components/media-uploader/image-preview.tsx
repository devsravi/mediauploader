import { FileText } from "lucide-react";

import type { MediaRecord } from "./types";

export function ImagePreview({ media }: { media: MediaRecord }) {
  const name = media.original_file_name ?? media.file_name;

  if (media.mime_type?.startsWith("image/")) {
    return <img src={media.file_url} alt={name} />;
  }

  if (media.mime_type?.startsWith("video/")) {
    return <video src={media.file_url} controls aria-label={name} />;
  }

  if (media.mime_type?.startsWith("audio/")) {
    return <audio src={media.file_url} controls aria-label={name} />;
  }

  return (
    <a className="media-file-preview" href={media.file_url} target="_blank" rel="noreferrer">
      <FileText aria-hidden="true" />
      <span>{name}</span>
    </a>
  );
}
