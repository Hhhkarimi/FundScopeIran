import Link from "next/link";

export default function NotFound() {
  return <main className="shell grid min-h-screen place-items-center py-16"><div className="glass card max-w-xl p-8 text-center"><p className="text-6xl font-black text-lime-200">404</p><h1 className="mt-4 text-2xl font-bold">صندوق یا صفحه پیدا نشد</h1><p className="mt-3 text-sm leading-7 text-white/50">ممکن است شناسه صندوق تغییر کرده باشد یا هنوز در Snapshot آخر وجود نداشته باشد.</p><Link href="/" className="mt-6 inline-block rounded-xl bg-lime-200 px-5 py-2.5 text-sm font-bold text-[#07100e]">بازگشت به داشبورد</Link></div></main>;
}
