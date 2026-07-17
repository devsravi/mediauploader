import * as FilePond from "filepond";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginImageEdit from "filepond-plugin-image-edit";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import { Download, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-edit/dist/filepond-plugin-image-edit.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "cropperjs/dist/cropper.css";

import { ImageEditorDialog } from "./image-editor-dialog";
import { ImagePreview } from "./image-preview";
import { mediaApi as defaultMediaApi } from "./media-api.client";
import type { MediaApi, MediaRecord, PendingEdit } from "./types";
import {
  ACCEPTED_FILE_TYPES,
  errorMessage,
  isImage,
  MAX_FILE_SIZE,
  validateMediaFile,
} from "./utils";

FilePond.registerPlugin(
  FilePondPluginFileValidateSize,
  FilePondPluginFileValidateType,
  FilePondPluginImageEdit,
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview,
);

type MediaUploaderProps = {
  api?: MediaApi;
  onUploaded?: (media: MediaRecord) => void;
};

export function MediaUploader({ api = defaultMediaApi, onUploaded }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pondRef = useRef<FilePond.FilePond | null>(null);
  const bypassEditorRef = useRef(new WeakSet<File>());
  const queueRef = useRef<PendingEdit[]>([]);
  const activeEditRef = useRef<PendingEdit | null>(null);
  const activeRequestsRef = useRef(new Set<() => void>());
  const [activeEdit, setActiveEdit] = useState<PendingEdit | null>(null);
  const [uploaded, setUploaded] = useState<MediaRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showNextEditor = () => {
    const next = queueRef.current.shift() ?? null;
    activeEditRef.current = next;
    setActiveEdit(next);
  };

  const enqueueEditor = (edit: PendingEdit) => {
    if (activeEditRef.current) {
      queueRef.current.push(edit);
      return;
    }
    activeEditRef.current = edit;
    setActiveEdit(edit);
  };

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const pond = FilePond.create(input, {
      acceptedFileTypes: [...ACCEPTED_FILE_TYPES],
      allowImageExifOrientation: true,
      allowImageEdit: true,
      allowMultiple: true,
      allowPaste: true,
      credits: false,
      instantUpload: true,
      labelIdle: 'Drag & Drop your files or <span class="filepond--label-action">Browse</span>',
      maxFileSize: `${MAX_FILE_SIZE}B`,
      beforeAddFile: async (item) => {
        const file = item.file;
        if (!(file instanceof File)) return true;

        try {
          await validateMediaFile(file);
        } catch (validationError) {
          setError(errorMessage(validationError));
          return false;
        }

        setError(null);
        if (isImage(file) && !bypassEditorRef.current.has(file)) {
          enqueueEditor({ file });
          return false;
        }

        bypassEditorRef.current.delete(file);
        return true;
      },
      imageEditEditor: {
        open: (file: File) => {
          const item = pond.getFiles().find((candidate) => candidate.filename === file.name);
          enqueueEditor({
            file,
            itemId: item?.id,
            replacementId: item?.serverId ? Number(item.serverId) : undefined,
          });
        },
        onconfirm: () => undefined,
        oncancel: () => undefined,
        onclose: () => undefined,
      },
      server: {
        process: (_fieldName, file, metadata, load, fail, progress, abort) => {
          const replaceId = typeof metadata.replaceId === "number" ? metadata.replaceId : undefined;
          const request = api.upload(file as File, {
            replaceId,
            onProgress: ({ loaded, total }) => progress(true, loaded, total),
          });
          activeRequestsRef.current.add(request.abort);
          request.promise
            .then((media) => {
              activeRequestsRef.current.delete(request.abort);
              setUploaded((current) => [media, ...current.filter((item) => item.id !== media.id)]);
              setMessage(`${media.original_file_name ?? media.file_name} uploaded successfully.`);
              onUploaded?.(media);
              load(String(media.id));
            })
            .catch((uploadError: unknown) => {
              activeRequestsRef.current.delete(request.abort);
              if (uploadError instanceof DOMException && uploadError.name === "AbortError") {
                abort();
                return;
              }
              setError(errorMessage(uploadError));
              fail(errorMessage(uploadError));
            });

          return {
            abort: () => {
              request.abort();
              activeRequestsRef.current.delete(request.abort);
              abort();
            },
          };
        },
        revert: (source, load, fail) => {
          api.delete(Number(source))
            .then(() => {
              setUploaded((current) => current.filter((media) => media.id !== Number(source)));
              setMessage("The uploaded file was removed.");
              load();
            })
            .catch((deleteError: unknown) => {
              setError(errorMessage(deleteError));
              fail(errorMessage(deleteError));
            });
        },
      },
    });
    pondRef.current = pond;

    return () => {
      activeRequestsRef.current.forEach((abort) => abort());
      activeRequestsRef.current.clear();
      pond.destroy();
      pondRef.current = null;
    };
  }, [api, onUploaded]);

  const saveEdit = (file: File) => {
    const edit = activeEditRef.current;
    const pond = pondRef.current;
    if (!edit || !pond) return;

    if (edit.itemId) {
      void pond.removeFile(edit.itemId, { revert: false });
    }

    bypassEditorRef.current.add(file);
    void pond.addFile(file, {
      metadata: edit.replacementId ? { replaceId: edit.replacementId } : {},
    });
    showNextEditor();
  };

  const cancelEdit = () => showNextEditor();

  const editUploaded = (media: MediaRecord) => {
    const item = pondRef.current?.getFiles().find((candidate) => Number(candidate.serverId) === media.id);
    if (item?.file instanceof File) {
      enqueueEditor({ file: item.file, itemId: item.id, replacementId: media.id });
    }
  };

  const removeUploaded = async (media: MediaRecord) => {
    try {
      await api.delete(media.id);
      setUploaded((current) => current.filter((item) => item.id !== media.id));
      const item = pondRef.current?.getFiles().find((candidate) => Number(candidate.serverId) === media.id);
      if (item) await pondRef.current?.removeFile(item.id, { revert: false });
      setMessage("The uploaded file was removed.");
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    }
  };

  return (
    <section aria-labelledby="media-details-title" className="media-section">
      <div className="media-section-heading">
        <h2 id="media-details-title">Media Details</h2>
        <p>Provide details about the media item</p>
      </div>
      <div className="media-field">
        <label id="media-upload-label">Upload Media <span aria-hidden="true">*</span></label>
        <input aria-labelledby="media-upload-label" ref={inputRef} type="file" multiple />
        <p className="media-helper">Images, video, audio, or PDF up to 12 MB</p>
        <div aria-live="polite" className="media-status">
          {error && <p className="media-error" role="alert">{error}</p>}
          {!error && message && <p className="media-success">{message}</p>}
        </div>
      </div>

      {uploaded.length > 0 && (
        <div className="uploaded-media-grid" aria-label="Uploaded media">
          {uploaded.map((media) => (
            <article className="uploaded-media" key={media.id}>
              <div className="uploaded-media-preview"><ImagePreview media={media} /></div>
              <div className="uploaded-media-info">
                <strong>{media.original_file_name ?? media.file_name}</strong>
                <span>{media.mime_type ?? "File"}</span>
              </div>
              <div className="uploaded-media-actions">
                {media.mime_type?.startsWith("image/") && (
                  <button aria-label="Edit image" onClick={() => editUploaded(media)} title="Edit image" type="button"><Pencil /></button>
                )}
                <a aria-label="Download file" download href={media.file_url} title="Download file"><Download /></a>
                <button aria-label="Delete file" onClick={() => void removeUploaded(media)} title="Delete file" type="button"><Trash2 /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {activeEdit && (
        <ImageEditorDialog file={activeEdit.file} onCancel={cancelEdit} onSave={saveEdit} />
      )}
    </section>
  );
}
