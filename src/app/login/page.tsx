"use client";

import { useState } from "react";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success, the browser is redirected to Google, then back to /auth/callback.
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border rounded-2xl shadow-sm p-8 text-center">
        <div className="flex justify-center mb-4">
          <Logo size={72} withLink={false} />
        </div>
        <h1 className="text-lg font-bold text-brand-blue">Vasantham Furniture & Home Appliances</h1>
        <p className="text-slate-500 text-sm mb-6">Customer Login</p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-lg py-3 font-medium hover:bg-slate-50 disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.7l6-6C33.5 6.5 29 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-1.5-.2-3-.9-4.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.7l6-6C33.5 6.5 29 4.5 24 4.5c-7.6 0-14.1 4.3-17.7 10.2z"/>
            <path fill="#4CAF50" d="M24 45.5c5.2 0 9.9-1.7 13.5-4.7l-6.2-5.2C29.2 37 26.7 38 24 38c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.9 41.2 16.4 45.5 24 45.5z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.7 36.1 44.5 30.9 44.5 25c0-1.5-.2-3-.9-4.5z"/>
          </svg>
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        <p className="text-xs text-slate-400 mt-6">
          By continuing, you agree to our{" "}
          <a href="/terms" className="underline">Terms & Conditions</a> and{" "}
          <a href="/privacy" className="underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
