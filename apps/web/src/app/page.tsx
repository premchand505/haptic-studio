// apps/web/src/app/page.tsx
import UploadForm from "../app/components/UploadForm";

export default function HomePage() {
  return (
    <main>
      <h1>Haptic Studio</h1>
      <p>AI-Powered Haptic Feedback Generation</p>
      <UploadForm />
    </main>
  );
}