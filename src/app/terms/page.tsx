import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";

export const revalidate = 0; // always fetch the current published version

export default async function TermsPage() {
  const supabase = createClient();
  const { data: doc } = await supabase
    .from("policy_documents")
    .select("version, title, content, published_at")
    .eq("doc_type", "TERMS")
    .eq("status", "PUBLISHED")
    .maybeSingle();

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-6">
        <Logo size={48} withLink={false} />
        <div>
          <p className="font-bold text-brand-blue">Vasantham Furniture & Home Appliances</p>
          <p className="text-sm text-slate-500">Terms & Conditions</p>
        </div>
      </div>

      {!doc ? (
        <p className="text-slate-500 italic">
          No published Terms & Conditions found yet. An admin needs to publish
          a version from Admin → Settings → Terms & Conditions.
        </p>
      ) : (
        <>
          <div className="text-sm text-slate-500 mb-6">
            Version {doc.version} · Published{" "}
            {doc.published_at ? new Date(doc.published_at).toLocaleDateString("en-IN") : "—"}
          </div>
          <article
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />
        </>
      )}
    </div>
  );
}
