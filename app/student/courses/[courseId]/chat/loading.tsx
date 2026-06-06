export default function CourseChatLoading() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 inline-block -rotate-[6deg] bg-[#2E6F87] px-4 py-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white">
            Studdy Buddy
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <div className="h-4 w-36 animate-pulse rounded bg-[#E0EFEF]" />
          <div className="mt-5 h-10 w-2/3 animate-pulse rounded bg-[#E0EFEF]" />
          <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-[#E0EFEF]" />
        </div>

        <div className="rounded-xl border border-[#E2DFD7] bg-white shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <div className="border-b border-[#E2DFD7] p-6">
            <div className="h-7 w-48 animate-pulse rounded bg-[#E0EFEF]" />
            <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-[#E0EFEF]" />
          </div>

          <div className="space-y-4 p-6">
            <div className="h-16 w-2/3 animate-pulse rounded-xl bg-[#F7F5F0]" />
            <div className="ml-auto h-16 w-2/3 animate-pulse rounded-xl bg-[#E0EFEF]" />
          </div>
        </div>
      </section>
    </main>
  );
}
