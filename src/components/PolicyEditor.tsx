"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Doc = {
  id: string;
  version: string;
  title: string;
  content: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
};

export default function PolicyEditor({ docType, docs }: { docType: "TERMS" | "PRIVACY"; docs: Doc[] }) {
  const router = useRouter();
  const published = docs.find((d) => d.status === "PUBLISHED");
  const drafts = docs.filter((d) => d.status === "DRAFT");
  const archived = docs.filter((d) => d.status === "ARCHIVED");

  const [version, setVersion] = useState("");
  const [title, setTitle] = useState(docType === "TERMS" ? "Terms & Conditions" : "Privacy Policy");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveDraft() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/policy-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docType, version, title, content }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save draft.");
      return;
    }
    setVersion("");
    setContent("");
    router.refresh();
  }

  async function publish(documentId: string, versionLabel: string) {
    if (!confirm(`Publish version ${versionLabel}? This will make it active for new customer consent.`)) return;
    const res = await fetch("/api/admin/policy-documents/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Failed to publish.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-slate-700 mb-1">Current Published Version</h2>
        {published ? (
          <p className="text-sm text-slate-600">
            Version {published.version} · Published {new Date(published.published_at!).toLocaleDateString("en-IN")}
          </p>
        ) : (
          <p className="text-sm text-slate-400 italic">No published version yet.</p>
        )}
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-slate-700 mb-4">Create / Edit Draft</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Version</label>
            <input className="input" placeholder="e.g. 2.0" value={version} onChange={(e) => setVersion(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
        <label className="block text-sm font-medium mb-1">Content (HTML — headings, paragraphs, lists, bold, links supported)</label>
        <textarea className="input font-mono text-xs" rows={10} value={content} onChange={(e) => setContent(e.target.value)} />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={() => setPreview((p) => !p)} type="button" className="border px-4 py-2 rounded-lg text-sm">
            {preview ? "Hide Preview" : "Preview"}
          </button>
          <button onClick={saveDraft} disabled={loading || !version || !content} className="bg-brand-blue text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            {loading ? "Saving…" : "Save Draft"}
          </button>
        </div>
        {preview && (
          <div className="mt-4 border rounded-lg p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
        )}
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-slate-700 mb-4">Drafts</h2>
        {drafts.length === 0 && <p className="text-sm text-slate-400">No drafts.</p>}
        <div className="space-y-2">
          {drafts.map((d) => (
            <div key={d.id} className="flex items-center justify-between border rounded-lg px-4 py-2 text-sm">
              <span>Version {d.version} — {d.title}</span>
              <button onClick={() => publish(d.id, d.version)} className="text-brand-blue font-medium hover:underline">Publish</button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-slate-700 mb-4">Previous Versions</h2>
        {archived.length === 0 && <p className="text-sm text-slate-400">No archived versions.</p>}
        <ul className="text-sm space-y-1">
          {archived.map((d) => (
            <li key={d.id} className="text-slate-500">Version {d.version} — archived {d.archived_at ? new Date(d.archived_at).toLocaleDateString("en-IN") : ""}</li>
          ))}
        </ul>
      </div>

      <style jsx global>{`
        .input { width: 100%; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.55rem 0.75rem; font-size: 0.9rem; }
      `}</style>
    </div>
  );
}
