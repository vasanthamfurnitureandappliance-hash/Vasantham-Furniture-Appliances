import { NextResponse } from "next/server";
import DOMPurify from "isomorphic-dompurify";
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
    return NextResponse.json({ error: "Only SUPER_ADMIN can manage policy documents" }, { status: 403 });
  }

  const body = await request.json();
  const { docType, version, title, content } = body;
  if (!docType || !version || !title || !content) {
    return NextResponse.json({ error: "docType, version, title, content are required" }, { status: 400 });
  }

  const cleanContent = DOMPurify.sanitize(content);

  const { data, error } = await supabase
    .from("policy_documents")
    .upsert(
      { doc_type: docType, version, title, content: cleanContent, status: "DRAFT", created_by: admin.id },
      { onConflict: "doc_type,version" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    actor_user_id: userData.user.id,
    action: "TERMS_DRAFT_CREATED",
    entity_type: "policy_document",
    entity_id: data.id,
    metadata: { docType, version },
  });

  return NextResponse.json({ document: data });
}
