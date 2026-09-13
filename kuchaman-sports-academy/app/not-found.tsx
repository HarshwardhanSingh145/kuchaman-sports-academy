import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] text-[#2C1A0E] px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[#8C5A32]/10 flex items-center justify-center mb-4 text-2xl font-bold text-[#8C5A32]">
        404
      </div>
      <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
      <p className="text-sm text-[#8C5A32] max-w-md mb-6">
        The page or resource you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-lg bg-[#8C5A32] text-white font-medium text-sm hover:bg-[#6d4424] transition-colors shadow-sm"
      >
        Return to Academy Home
      </Link>
    </div>
  );
}
