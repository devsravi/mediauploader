import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { JSDOM } from "jsdom";

import { mediaApi } from "./media-api.client";
import type { MediaApiResponse } from "./types";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, {
  DOMException: dom.window.DOMException,
  File: dom.window.File,
  FormData: dom.window.FormData,
});

const media: MediaApiResponse = {
  data: {
    id: 7,
    file_name: "hash.jpg",
    original_file_name: "photo.jpg",
    file_path: "media/hash.jpg",
    file_url: "/storage/media/hash.jpg",
    mime_type: "image/jpeg",
    extension: "jpg",
    size: 100,
    width: 640,
    height: 480,
  },
};

class FakeXhr extends EventTarget {
  static instance: FakeXhr;
  upload = new EventTarget();
  status = 0;
  responseText = "";
  method = "";
  url = "";
  sentData: FormData | null = null;

  constructor() {
    super();
    FakeXhr.instance = this;
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader() {}

  send(data: FormData) {
    this.sentData = data;
  }

  abort() {
    this.dispatchEvent(new Event("abort"));
  }

  finish(status: number, body: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.dispatchEvent(new Event("load"));
  }
}

beforeEach(() => {
  Object.assign(globalThis, { XMLHttpRequest: FakeXhr });
});

describe("media API client", () => {
  it("posts a new file under the public API file field", async () => {
    const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
    const request = mediaApi.upload(file);
    const xhr = FakeXhr.instance;
    assert.equal(xhr.method, "POST");
    assert.equal(xhr.url, "/api/media");
    assert.equal(xhr.sentData?.get("file"), file);
    xhr.finish(201, media);
    assert.equal((await request.promise).id, 7);
  });

  it("uses the replacement endpoint when a media id is supplied", async () => {
    const request = mediaApi.upload(new File(["image"], "new.jpg"), { replaceId: 7 });
    assert.equal(FakeXhr.instance.url, "/api/media/7");
    FakeXhr.instance.finish(200, media);
    await request.promise;
  });

  it("reports computable upload progress", async () => {
    let progress = 0;
    const request = mediaApi.upload(new File(["image"], "photo.jpg"), {
      onProgress: ({ loaded }) => { progress = loaded; },
    });
    const event = new Event("progress");
    Object.assign(event, { lengthComputable: true, loaded: 50, total: 100 });
    FakeXhr.instance.upload.dispatchEvent(event);
    assert.equal(progress, 50);
    FakeXhr.instance.finish(201, media);
    await request.promise;
  });

  it("surfaces Laravel field validation errors", async () => {
    const request = mediaApi.upload(new File(["bad"], "bad.txt"));
    FakeXhr.instance.finish(422, {
      message: "The given data was invalid.",
      errors: { file: ["The file field must be an image."] },
    });
    await assert.rejects(request.promise, /must be an image/);
  });

  it("rejects aborted uploads without resolving stale state", async () => {
    const request = mediaApi.upload(new File(["image"], "photo.jpg"));
    request.abort();
    await assert.rejects(request.promise, (error: unknown) =>
      error instanceof DOMException && error.name === "AbortError"
    );
  });

  it("deletes media through the public API", async () => {
    let requestUrl = "";
    Object.assign(globalThis, {
      fetch: async (url: string) => {
        requestUrl = url;
        return { ok: true } as Response;
      },
    });
    await mediaApi.delete(7);
    assert.equal(requestUrl, "/api/media/7");
  });
});
