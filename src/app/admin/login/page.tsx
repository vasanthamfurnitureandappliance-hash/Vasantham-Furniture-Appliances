"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white border rounded-2xl shadow-sm p-8">
        <div className="flex justify-center mb-4">
          <Logo size={64} withLink={false} />
        </div>
        <h1 className="text-center font-bold text-brand-blue mb-1">Admin Portal</h1>
        <p className="text-center text-sm text-slate-500 mb-6">Vasantham Furniture & Home Appliances</p>

        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mb-4"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mb-4"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <button
          disabled={loading}
          className="w-full bg-brand-blue text-white rounded-lg py-2.5 font-medium disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
