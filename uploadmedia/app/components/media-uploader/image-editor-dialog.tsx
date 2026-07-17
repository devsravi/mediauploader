import Cropper from "cropperjs";
import { useEffect, useRef, useState } from "react";

import { ImageEditorToolbar } from "./image-editor-toolbar";
import type { CropData } from "./types";
import { editedFileName } from "./utils";

type ImageEditorDialogProps = {
  createCropper?: (image: HTMLImageElement, options: Cropper.Options) => Cropper;
  file: File;
  onCancel: () => void;
  onSave: (file: File) => void;
};

const defaultCreateCropper = (image: HTMLImageElement, options: Cropper.Options) =>
  new Cropper(image, options);

const initialData: CropData = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotate: 0,
  scaleX: 1,
  scaleY: 1,
};

export function ImageEditorDialog({
  createCropper = defaultCreateCropper,
  file,
  onCancel,
  onSave,
}: ImageEditorDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const [data, setData] = useState<CropData>(initialData);
  const [ratio, setRatio] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;

    const url = URL.createObjectURL(file);
    image.src = url;
    const cropper = createCropper(image, {
      aspectRatio: Number.NaN,
      autoCropArea: 1,
      center: true,
      cropBoxResizable: true,
      guides: true,
      highlight: true,
      responsive: true,
      toggleDragModeOnDblclick: true,
      viewMode: 1,
      wheelZoomRatio: 0.02,
      crop(event) {
        setData({
          x: Math.round(event.detail.x),
          y: Math.round(event.detail.y),
          width: Math.round(event.detail.width),
          height: Math.round(event.detail.height),
          rotate: event.detail.rotate,
          scaleX: event.detail.scaleX,
          scaleY: event.detail.scaleY,
        });
      },
    });
    cropperRef.current = cropper;
    dialogRef.current?.focus();

    return () => {
      cropper.destroy();
      cropperRef.current = null;
      URL.revokeObjectURL(url);
    };
  }, [createCropper, file]);

  const updateData = (key: keyof CropData, value: number) => {
    const cropper = cropperRef.current;
    if (!cropper) return;

    if (key === "rotate") {
      cropper.rotateTo(value);
      return;
    }

    cropper.setData({ ...cropper.getData(true), [key]: value });
  };

  const action = (name: string) => {
    const cropper = cropperRef.current;
    if (!cropper) return;

    const actions: Record<string, () => void> = {
      "move-mode": () => cropper.setDragMode("move"),
      "crop-mode": () => cropper.setDragMode("crop"),
      "zoom-in": () => cropper.zoom(0.1),
      "zoom-out": () => cropper.zoom(-0.1),
      "zoom-100": () => cropper.zoomTo(1),
      "move-left": () => cropper.move(-10, 0),
      "move-right": () => cropper.move(10, 0),
      "move-up": () => cropper.move(0, -10),
      "move-down": () => cropper.move(0, 10),
      "rotate-left": () => cropper.rotate(-90),
      "rotate-right": () => cropper.rotate(90),
      "flip-horizontal": () => cropper.scaleX(-(cropper.getData().scaleX || 1)),
      "flip-vertical": () => cropper.scaleY(-(cropper.getData().scaleY || 1)),
    };
    actions[name]?.();
  };

  const reset = () => {
    cropperRef.current?.reset();
    setRatio(null);
  };

  const save = () => {
    const cropper = cropperRef.current;
    if (!cropper || processing) return;

    setProcessing(true);
    setError(null);
    const canvas = cropper.getCroppedCanvas({
      fillColor: "transparent",
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    const supportedType = ["image/jpeg", "image/png", "image/webp"].includes(file.type)
      ? file.type
      : "image/png";

    canvas.toBlob((blob) => {
      canvas.width = 0;
      canvas.height = 0;

      if (!blob) {
        setError("The edited image could not be exported.");
        setProcessing(false);
        return;
      }

      onSave(
        new File([blob], editedFileName(file, supportedType), {
          type: supportedType,
          lastModified: Date.now(),
        }),
      );
    }, supportedType);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !processing) {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href]'
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      aria-label={`Edit ${file.name}`}
      aria-modal="true"
      className="media-editor"
      onKeyDown={onKeyDown}
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <div aria-hidden="true" className="media-editor-overlay" />
      <div className="media-editor-window">
        <div className="media-editor-image-container">
          <img alt="Image being edited" ref={imageRef} />
        </div>
        <div className="media-editor-panel">
          <div className="media-editor-main">
            <div className="crop-fields">
              {(["x", "y", "width", "height", "rotate"] as const).map((key) => (
                <label key={key}>
                  <span>{key === "rotate" ? "Rotation" : key.toUpperCase()}</span>
                  <input
                    aria-label={key === "rotate" ? "Rotation" : key.toUpperCase()}
                    disabled={processing}
                    onChange={(event) => updateData(key, Number(event.target.value))}
                    type="number"
                    value={Math.round(data[key])}
                  />
                  <small>{key === "rotate" ? "deg" : "px"}</small>
                </label>
              ))}
            </div>
            <ImageEditorToolbar disabled={processing} onAction={action} />
            <div className="aspect-ratios">
              <span>Aspect ratio</span>
              <div className="editor-button-group">
                {[["16:9", 16 / 9], ["4:3", 4 / 3], ["1:1", 1]] .map(([label, value]) => (
                  <button
                    aria-pressed={ratio === label}
                    className={ratio === label ? "active" : ""}
                    disabled={processing}
                    key={label}
                    onClick={() => {
                      setRatio(String(label));
                      cropperRef.current?.setAspectRatio(Number(value));
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="editor-error" role="alert">{error}</p>}
          </div>
          <div className="media-editor-footer">
            <button disabled={processing} onClick={onCancel} type="button">Cancel</button>
            <button className="danger" disabled={processing} onClick={reset} type="button">Reset</button>
            <button className="success" disabled={processing} onClick={save} type="button">
              {processing ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
