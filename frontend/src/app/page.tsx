export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="text-xl font-bold text-blue-700">HeliServiX</div>
          <div className="hidden gap-6 text-sm font-medium text-slate-600 md:flex">
            <span>Dashboard</span>
            <span>Companies</span>
            <span>Contacts</span>
            <span>Opportunities</span>
            <span>Contracts</span>
            <span>Intelligence</span>
            <span>Settings</span>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl bg-white p-10 shadow-sm">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700">
            Tuna Vessel Helicopter Operations
          </p>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
            HeliServiX Commercial Intelligence Platform
          </h1>
          <p className="mt-6 text-2xl font-semibold text-slate-600">
            Eyes in the Sky. More Tuna in the Net.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {[
            ["Companies", "0"],
            ["Contacts", "0"],
            ["Pipeline", "USD 0"],
            ["Contracts", "0"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-bold text-blue-700">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Recent Opportunities</h2>
            <p className="mt-6 rounded-xl border border-dashed p-8 text-center text-slate-500">
              No opportunities yet.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Market Intelligence</h2>
            <p className="mt-6 rounded-xl border border-dashed p-8 text-center text-slate-500">
              No intelligence reports.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}