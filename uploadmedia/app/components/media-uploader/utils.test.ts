import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { JSDOM } from "jsdom";

import {
  editedFileName,
  isAcceptedMediaType,
  MAX_FILE_SIZE,
  MediaValidationError,
  validateMediaFile,
} from "./utils";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, {
  File: dom.window.File,
  Image: dom.window.Image,
});

beforeEach(() => {
  Object.defineProperty(globalThis.URL, "createObjectURL", {
    configurable: true,
    value: () => "blob:test",
  });
  Object.defineProperty(globalThis.URL, "revokeObjectURL", {
    configurable: true,
    value: () => undefined,
  });
});

describe("media validation", () => {
  it("accepts every MIME family configured by Filament", () => {
    assert.equal(isAcceptedMediaType("image/jpeg"), true);
    assert.equal(isAcceptedMediaType("video/mp4"), true);
    assert.equal(isAcceptedMediaType("audio/mpeg"), true);
    assert.equal(isAcceptedMediaType("application/pdf"), true);
  });

  it("rejects unsupported files", async () => {
    const file = new File(["test"], "test.txt", { type: "text/plain" });
    await assert.rejects(() => validateMediaFile(file), MediaValidationError);
  });

  it("rejects files above the effective 12 MB limit", async () => {
    const file = new File([new Uint8Array(MAX_FILE_SIZE + 1)], "large.pdf", {
      type: "application/pdf",
    });
    await assert.rejects(() => validateMediaFile(file), /12 MB/);
  });

  it("accepts a valid non-image without decoding it", async () => {
    const file = new File(["%PDF"], "test.pdf", { type: "application/pdf" });
    await assert.doesNotReject(() => validateMediaFile(file));
  });
});

describe("edited file naming", () => {
  it("adds the same initial version suffix as Filament", () => {
    const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
    assert.equal(editedFileName(file, "image/jpeg"), "photo-v1.jpg");
  });

  it("increments an existing version and converts unsupported output to PNG", () => {
    const file = new File(["image"], "logo-v2.svg", { type: "image/svg+xml" });
    assert.equal(editedFileName(file, "image/png"), "logo-v3.png");
  });
});
