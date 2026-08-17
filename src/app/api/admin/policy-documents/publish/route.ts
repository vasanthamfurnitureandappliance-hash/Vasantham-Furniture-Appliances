import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("auth_user_id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only SUPER_ADMIN can publish" }, { status: 403 });
  }

  const { documentId } = await request.json();
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

  const { data: doc } = await supabase.from("policy_documents").select("*").eq("id", documentId).single();
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Archive the currently published doc of the same type, if any.
  await supabase
    .from("policy_documents")
    .update({ status: "ARCHIVED", archived_at: new Date().toISOString() })
    .eq("doc_type", doc.doc_type)
    .eq("status", "PUBLISHED");

  const { error: publishError } = await supabase
    .from("policy_documents")
    .update({ status: "PUBLISHED", published_at: new Date().toISOString() })
    .eq("id", documentId);

  if (publishError) return NextResponse.json({ error: publishError.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    actor_user_id: userData.user.id,
    action: "TERMS_PUBLISHED",
    entity_type: "policy_document",
    entity_id: documentId,
    metadata: { docType: doc.doc_type, version: doc.version },
  });

  return NextResponse.json({ success: true });
}
