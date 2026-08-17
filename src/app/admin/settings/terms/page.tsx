import { requireAdmin } from "@/lib/require-admin";
import PolicyEditor from "@/components/PolicyEditor";

export const revalidate = 0;

export default async function AdminTermsSettings() {
  const { supabase } = await requireAdmin();
  const { data: docs } = await supabase
    .from("policy_documents")
    .select("*")
    .eq("doc_type", "TERMS")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-brand-blue mb-6">Terms & Conditions</h1>
      <PolicyEditor docType="TERMS" docs={docs ?? []} />
    </div>
  );
}
