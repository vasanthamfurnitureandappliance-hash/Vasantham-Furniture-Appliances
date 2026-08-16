import Link from "next/link";
import Logo from "@/components/Logo";

const CATEGORIES = [
  "Sofa & Living Room", "Beds & Wardrobes", "Refrigerators", "Washing Machines",
  "Televisions", "Air Conditioners", "Fans", "Mixer Grinders & Kitchen Appliances",
];

export default function HomePage() {
  return (
    <div>
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={56} />
            <div>
              <p className="font-bold text-brand-blue leading-tight text-lg">Vasantham</p>
              <p className="text-xs text-slate-500 leading-tight">Furniture & Home Appliances</p>
            </div>
          </div>
          <Link
            href="/login"
            className="bg-brand-blue text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-900 transition"
          >
            Customer Login
          </Link>
        </div>
      </header>

      <section className="bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-brand-blue mb-4">
            Better Home. Better Life.
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto mb-8">
            Furniture and home appliances for every room — pay comfortably through
            simple installment (EMI) plans, with your full purchase and payment
            history always available in your account.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/login" className="bg-brand-red text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90">
              Get Started
            </Link>
            <Link href="/contact" className="border border-brand-blue text-brand-blue px-6 py-3 rounded-lg font-semibold hover:bg-blue-50">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-brand-blue mb-6">Shop by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CATEGORIES.map((c) => (
            <div key={c} className="bg-white border rounded-xl p-5 text-center shadow-sm hover:shadow-md transition">
              <p className="font-medium text-slate-800 text-sm">{c}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-y">
        <div className="max-w-6xl mx-auto px-6 py-12 grid sm:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-brand-blue mb-2">Simple Installment Plans</h3>
            <p className="text-sm text-slate-600">
              Pay a down payment and the rest in easy weekly or monthly
              installments, agreed with our team at purchase time.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-brand-blue mb-2">Track Every Payment</h3>
            <p className="text-sm text-slate-600">
              See your total payable, amount paid, outstanding balance,
              and next due date any time from your customer dashboard.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-brand-blue mb-2">Digital Receipts</h3>
            <p className="text-sm text-slate-600">
              Every payment you make is recorded and a receipt is available
              in your purchase history.
            </p>
          </div>
        </div>
      </section>

      <section id="contact" className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-brand-blue mb-4">Contact Us</h2>
        <p className="text-slate-600 mb-2">Visit our store or reach out — our team is happy to help you choose the right products and payment plan.</p>
        <Link href="/contact" className="text-brand-blue font-medium hover:underline">Go to full contact page →</Link>
      </section>
    </div>
  );
}
