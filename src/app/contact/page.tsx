import Logo from "@/components/Logo";

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-6">
        <Logo size={48} withLink={false} />
        <div>
          <p className="font-bold text-brand-blue">Vasantham Furniture & Home Appliances</p>
          <p className="text-sm text-slate-500">Contact Us</p>
        </div>
      </div>
      <div className="bg-white border rounded-xl p-6 space-y-3 text-slate-700">
        <p><span className="font-medium">Store:</span> Update your store address in Admin → Settings → Company Settings.</p>
        <p><span className="font-medium">Phone:</span> Update in Company Settings.</p>
        <p><span className="font-medium">Email:</span> Update in Company Settings.</p>
        <p className="text-sm text-slate-400 pt-2">
          These contact details are configurable by an admin and are not hard-coded.
        </p>
      </div>
    </div>
  );
}
