import type { Route } from "./+types/home";
import { MediaUploader } from "../components/media-uploader";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Media uploader" },
    { name: "description", content: "Upload and edit media" },
  ];
}

export default function Home() {
  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p>Media library</p>
          <h1>Upload media</h1>
        </div>
      </header>
      <MediaUploader />
    </main>
  );
}
