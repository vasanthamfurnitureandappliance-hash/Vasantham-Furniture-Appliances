"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compressImage";

const RELATIONSHIPS = ["Spouse", "Father", "Mother", "Son", "Daughter", "Brother", "Sister", "Other"];
const STEPS = ["Personal Details", "Photo", "Aadhaar", "Nominee", "Terms & Privacy", "Review"];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");

  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [compressingField, setCompressingField] = useState<string | null>(null);

  const [nomineeName, setNomineeName] = useState("");
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [nomineeContact, setNomineeContact] = useState("");

  const [termsDoc, setTermsDoc] = useState<{ version: string; content: string } | null>(null);
  const [privacyDoc, setPrivacyDoc] = useState<{ version: string; content: string } | null>(null);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      const { data: customer } = await supabase
        .from("customers")
        .select("id, full_name, mobile_number, address, onboarding_status")
        .eq("auth_user_id", userData.user.id)
        .maybeSingle();
      if (customer) {
        // Already completed onboarding earlier — this page shouldn't be
        // shown again (e.g. reopening the app on a stale /onboarding tab).
        // Send them straight to the dashboard instead.
        if (customer.onboarding_status === "COMPLETE") {
          router.replace("/dashboard");
          return;
        }
        setCustomerId(customer.id);
        setFullName(customer.full_name ?? "");
        setMobile(customer.mobile_number ?? "");
        setAddress(customer.address ?? "");
      }
      const { data: terms } = await supabase
        .from("policy_documents")
        .select("version, content")
        .eq("doc_type", "TERMS")
        .eq("status", "PUBLISHED")
        .maybeSingle();
      const { data: privacy } = await supabase
        .from("policy_documents")
        .select("version, content")
        .eq("doc_type", "PRIVACY")
        .eq("status", "PUBLISHED")
        .maybeSingle();
      setTermsDoc(terms);
      setPrivacyDoc(privacy);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validateFile(file: File): string | null {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return "Only JPG, PNG, or WEBP files are allowed.";
    if (file.size > 8 * 1024 * 1024) return "File must be under 8MB.";
    return null;
  }

  // Validates the picked file, compresses it to ~300KB in the browser, then
  // hands the final File to the caller's setter. `field` is only used to
  // show a per-field "Compressing…" indicator.
  async function handlePickFile(
    file: File,
    field: string,
    setter: (f: File) => void
  ) {
    const err = validateFile(file);
    if (err) return setError(err);
    setError(null);
    setCompressingField(field);
    try {
      const compressed = await compressImage(file, 300);
      setter(compressed);
    } catch {
      // If compression fails for any reason, fall back to the original file
      // rather than blocking the user.
      setter(file);
    } finally {
      setCompressingField(null);
    }
  }

  async function uploadDoc(file: File, kind: "selfie" | "aadhaar/front" | "aadhaar/back", label: string) {
    if (!customerId) throw new Error("Missing customer profile");
    const ext = file.name.split(".").pop();
    const path = `customers/${customerId}/${kind}.${ext}`;
    let lastError: any = null;
    // A weak mobile connection can drop one upload in a sequence of several;
    // retry once before surfacing an error, and say which document failed.
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { error: upErr } = await supabase.storage
        .from("customer-documents-private")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (!upErr) return path;
      lastError = upErr;
    }
    throw new Error(
      `Failed to upload ${label}. Please check your internet connection and try again. (${lastError?.message ?? "network error"})`
    );
  }

  async function handleNext() {
    setError(null);

    if (step === 0) {
      if (!fullName.trim() || !mobile.trim() || !address.trim()) {
        setError("Please fill in your full name, mobile number, and address.");
        return;
      }
    }
    if (step === 1 && !selfieFile) {
      setError("Please upload a selfie/profile photo.");
      return;
    }
    if (step === 2 && (!aadhaarFront || !aadhaarBack)) {
      setError("Please upload both the front and back of your Aadhaar.");
      return;
    }
    if (step === 3 && (!nomineeName.trim() || !nomineeContact.trim())) {
      setError("Please fill in the nominee's name and contact number.");
      return;
    }
    if (step === 4 && !agree) {
      setError("You must accept the Terms & Conditions and Privacy Policy to continue.");
      return;
    }

    if (step === STEPS.length - 1) {
      await handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    if (!customerId) return;
    setSaving(true);
    setError(null);
    try {
      const selfiePath = selfieFile ? await uploadDoc(selfieFile, "selfie", "your selfie") : null;
      const frontPath = aadhaarFront ? await uploadDoc(aadhaarFront, "aadhaar/front", "Aadhaar front") : null;
      const backPath = aadhaarBack ? await uploadDoc(aadhaarBack, "aadhaar/back", "Aadhaar back") : null;

      const { error: updateErr } = await supabase
        .from("customers")
        .update({
          full_name: fullName,
          mobile_number: mobile,
          address,
          selfie_path: selfiePath,
          aadhaar_front_path: frontPath,
          aadhaar_back_path: backPath,
          nominee_name: nomineeName,
          nominee_relationship: relationship,
          nominee_contact: nomineeContact,
          onboarding_status: "COMPLETE",
        })
        .eq("id", customerId);
      if (updateErr) throw updateErr;

      if (termsDoc) {
        await supabase.from("policy_acceptances").insert({
          customer_id: customerId,
          doc_type: "TERMS",
          version: termsDoc.version,
          accepted: true,
        });
      }
      if (privacyDoc) {
        await supabase.from("policy_acceptances").insert({
          customer_id: customerId,
          doc_type: "PRIVACY",
          version: privacyDoc.version,
          accepted: true,
        });
      }

      // Use a hard navigation instead of router.replace(). The App Router's
      // client-side cache can otherwise serve a stale RSC payload for
      // /dashboard (captured while onboarding was still incomplete), which
      // immediately redirects back to /onboarding even though the DB row
      // is now COMPLETE. A full page load guarantees a fresh server fetch.
      window.location.assign("/dashboard");
      return;
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Logo size={48} withLink={false} />
        <div>
          <p className="font-bold text-brand-blue">Vasantham Furniture & Home Appliances</p>
          <p className="text-sm text-slate-500">Complete Your Account — Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>
      </div>

      <div className="w-full bg-slate-200 rounded-full h-2 mb-8">
        <div
          className="bg-brand-blue h-2 rounded-full transition-all"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="bg-white border rounded-xl p-6 space-y-5">
        {step === 0 && (
          <>
            <Field label="Full Name (exactly as on Aadhaar)">
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="Mobile Number">
              <input className="input" value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" />
            </Field>
            <Field label="Full Address">
              <textarea className="input" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
          </>
        )}

        {step === 1 && (
          <FileField
            label="Selfie / Profile Photo"
            file={selfieFile}
            compressing={compressingField === "selfie"}
            onChange={(f) => handlePickFile(f, "selfie", setSelfieFile)}
            capture
          />
        )}

        {step === 2 && (
          <>
            <FileField
              label="Aadhaar Front"
              file={aadhaarFront}
              compressing={compressingField === "aadhaarFront"}
              onChange={(f) => handlePickFile(f, "aadhaarFront", setAadhaarFront)}
            />
            <FileField
              label="Aadhaar Back"
              file={aadhaarBack}
              compressing={compressingField === "aadhaarBack"}
              onChange={(f) => handlePickFile(f, "aadhaarBack", setAadhaarBack)}
            />
            <p className="text-xs text-slate-400">
              Your Aadhaar images are stored in a private, access-controlled
              location and are never made public.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <Field label="Nominee Name">
              <input className="input" value={nomineeName} onChange={(e) => setNomineeName(e.target.value)} />
            </Field>
            <Field label="Relationship">
              <select className="input" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Nominee Contact Number">
              <input className="input" value={nomineeContact} onChange={(e) => setNomineeContact(e.target.value)} inputMode="tel" />
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <div className="max-h-64 overflow-y-auto border rounded-lg p-4 text-sm text-slate-600 space-y-3">
              {termsDoc ? (
                <div dangerouslySetInnerHTML={{ __html: termsDoc.content }} />
              ) : (
                <p className="italic">Terms & Conditions have not been published by admin yet.</p>
              )}
              {privacyDoc ? (
                <div dangerouslySetInnerHTML={{ __html: privacyDoc.content }} />
              ) : (
                <p className="italic">Privacy Policy has not been published by admin yet.</p>
              )}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
              I have read and agree to the Terms & Conditions and Privacy Policy.
            </label>
          </>
        )}

        {step === 5 && (
          <div className="space-y-2 text-sm text-slate-700">
            <p><span className="font-medium">Name:</span> {fullName}</p>
            <p><span className="font-medium">Mobile:</span> {mobile}</p>
            <p><span className="font-medium">Address:</span> {address}</p>
            <p><span className="font-medium">Nominee:</span> {nomineeName} ({relationship}) — {nomineeContact}</p>
            <p><span className="font-medium">Selfie:</span> {selfieFile?.name}</p>
            <p><span className="font-medium">Aadhaar Front:</span> {aadhaarFront?.name}</p>
            <p><span className="font-medium">Aadhaar Back:</span> {aadhaarBack?.name}</p>
            <p className="text-xs text-slate-400 pt-2">
              Your official Customer ID (VFA-XXXXXX) will be assigned automatically once you complete your account.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-between pt-2">
          <button
            disabled={step === 0 || saving}
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-2 rounded-lg border text-slate-600 disabled:opacity-40"
          >
            Back
          </button>
          <button
            disabled={saving || !!compressingField}
            onClick={handleNext}
            className="px-6 py-2 rounded-lg bg-brand-blue text-white font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : compressingField ? "Compressing…" : step === STEPS.length - 1 ? "Complete Account" : "Next"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.6rem 0.75rem;
          font-size: 0.95rem;
        }
        .input:focus {
          outline: 2px solid #12328c33;
          border-color: #12328c;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(2)}MB`
    : `${Math.round(bytes / 1024)}KB`;
}

function FileField({
  label, file, onChange, capture, compressing,
}: {
  label: string;
  file: File | null;
  onChange: (f: File) => void;
  capture?: boolean;
  compressing?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        capture={capture ? "user" : undefined}
        disabled={compressing}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
          // allow re-selecting the same file name after compression
          e.target.value = "";
        }}
        className="block w-full text-sm"
      />
      {compressing && (
        <p className="text-xs text-slate-500 mt-1">Compressing image…</p>
      )}
      {!compressing && file && (
        <p className="text-xs text-green-700 mt-1">
          Selected: {file.name} ({formatSize(file.size)})
        </p>
      )}
    </div>
  );
}
