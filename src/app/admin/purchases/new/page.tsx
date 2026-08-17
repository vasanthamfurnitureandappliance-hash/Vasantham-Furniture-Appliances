import { requireAdmin } from "@/lib/require-admin";
import NewPurchaseForm from "@/components/NewPurchaseForm";

export const revalidate = 0;

export default async function NewPurchasePage() {
  const { supabase } = await requireAdmin();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, customer_code, full_name")
    .eq("onboarding_status", "COMPLETE")
    .order("full_name");

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-brand-blue mb-6">New Purchase</h1>
      <NewPurchaseForm customers={customers ?? []} />
    </div>
  );
}
