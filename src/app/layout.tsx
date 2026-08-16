import type { Metadata } from "next";
import "./globals.css";
import Logo from "@/components/Logo";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vasantham Furniture & Home Appliances",
  description: "Furniture & Home Appliances — Better Home, Better Life. Shop with easy installment / EMI plans.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <main className="flex-1">{children}</main>
        <footer className="bg-brand-blue text-white mt-16">
          <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <Logo size={48} withLink={false} />
              <div>
                <p className="font-semibold leading-tight">Vasantham</p>
                <p className="text-xs text-blue-100 leading-tight">Furniture & Home Appliances</p>
              </div>
            </div>
            <div className="text-sm space-y-2">
              <p className="font-semibold text-brand-gold">Company</p>
              <Link href="/" className="block hover:underline">Home</Link>
              <Link href="/contact" className="block hover:underline">Contact</Link>
              <Link href="/login" className="block hover:underline">Customer Login</Link>
            </div>
            <div className="text-sm space-y-2">
              <p className="font-semibold text-brand-gold">Legal</p>
              <Link href="/terms" className="block hover:underline">Terms & Conditions</Link>
              <Link href="/privacy" className="block hover:underline">Privacy Policy</Link>
            </div>
          </div>
          <div className="border-t border-white/20 text-center text-xs py-4 text-blue-100">
            © {new Date().getFullYear()} Vasantham Furniture & Home Appliances. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
