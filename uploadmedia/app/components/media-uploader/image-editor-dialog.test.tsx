import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import type Cropper from "cropperjs";
import { JSDOM } from "jsdom";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { ImageEditorDialog } from "./image-editor-dialog";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
Object.assign(globalThis, {
  document: dom.window.document,
  window: dom.window,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  HTMLImageElement: dom.window.HTMLImageElement,
  File: dom.window.File,
  Blob: dom.window.Blob,
});

beforeEach(() => {
  Object.defineProperty(globalThis.URL, "createObjectURL", { configurable: true, value: () => "blob:test" });
  Object.defineProperty(globalThis.URL, "revokeObjectURL", { configurable: true, value: () => undefined });
});

afterEach(() => cleanup());

function setup() {
  const methods = {
    destroy: mock.fn(),
    getData: mock.fn(() => ({ scaleX: 1, scaleY: 1 })),
    setData: mock.fn(),
    setDragMode: mock.fn(),
    zoom: mock.fn(),
    zoomTo: mock.fn(),
    move: mock.fn(),
    rotate: mock.fn(),
    rotateTo: mock.fn(),
    scaleX: mock.fn(),
    scaleY: mock.fn(),
    reset: mock.fn(),
    setAspectRatio: mock.fn(),
    getCroppedCanvas: mock.fn(() => ({
      width: 100,
      height: 100,
      toBlob: (callback: BlobCallback) => callback(new Blob(["edited"], { type: "image/jpeg" })),
    })),
  };
  const createCropper = mock.fn(() => methods as unknown as Cropper);
  const onCancel = mock.fn();
  const onSave = mock.fn();
  const view = render(
    <ImageEditorDialog
      createCropper={createCropper}
      file={new File(["image"], "photo.jpg", { type: "image/jpeg" })}
      onCancel={onCancel}
      onSave={onSave}
    />,
  );
  return { methods, onCancel, onSave, view };
}

describe("image editor dialog", () => {
  it("opens with the full crop toolbar", () => {
    const { view } = setup();
    assert.ok(view.getByRole("dialog", { name: /edit photo.jpg/i }));
    assert.ok(view.getByRole("button", { name: "Crop" }));
    assert.ok(view.getByRole("button", { name: "Zoom in" }));
  });

  it("applies rotation and both flip transformations", () => {
    const { methods, view } = setup();
    fireEvent.click(view.getByRole("button", { name: "Rotate right" }));
    fireEvent.click(view.getByRole("button", { name: "Flip horizontally" }));
    fireEvent.click(view.getByRole("button", { name: "Flip vertically" }));
    assert.equal(methods.rotate.mock.callCount(), 1);
    assert.equal(methods.scaleX.mock.callCount(), 1);
    assert.equal(methods.scaleY.mock.callCount(), 1);
  });

  it("resets all Cropper transformations", () => {
    const { methods, view } = setup();
    fireEvent.click(view.getByRole("button", { name: "Reset" }));
    assert.equal(methods.reset.mock.callCount(), 1);
  });

  it("cancels without exporting a replacement", () => {
    const { onCancel, onSave, view } = setup();
    fireEvent.click(view.getByRole("button", { name: "Cancel" }));
    assert.equal(onCancel.mock.callCount(), 1);
    assert.equal(onSave.mock.callCount(), 0);
  });

  it("exports the transformed canvas as a versioned file", () => {
    const { onSave, view } = setup();
    fireEvent.click(view.getByRole("button", { name: "Save" }));
    assert.equal(onSave.mock.callCount(), 1);
    const saved = onSave.mock.calls[0].arguments[0] as File;
    assert.equal(saved.name, "photo-v1.jpg");
  });
});
