import type { ReactNode } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.95),_rgba(2,6,23,1)_60%)] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-semibold tracking-wide text-white">
            Garage Management
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-full px-4 py-2 transition ${
                  isActive ? 'bg-emerald-400 text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `rounded-full px-4 py-2 transition ${
                  isActive ? 'bg-emerald-400 text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              Dashboard
            </NavLink>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-24">
      <div className="space-y-8">
        <span className="inline-flex w-fit rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-sm text-emerald-300">
          Chore: init React + Vite + Tailwind + router
        </span>
        <div className="space-y-5">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            A clean starter for the garage-management system frontend.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            This project now ships with a React app scaffolded by Vite, Tailwind CSS, and
            a basic router so the team can start building screens immediately.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="rounded-full bg-emerald-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-emerald-300"
          >
            Open dashboard
          </Link>
          <a
            href="https://react.dev"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/15 px-5 py-3 font-medium text-white transition hover:bg-white/10"
          >
            React docs
          </a>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.2),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.2),_transparent_40%)]" />
        <div className="relative space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Frontend stack</p>
            <p className="mt-2 text-xl font-semibold text-white">React 19 + Vite 8</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Styling</p>
            <p className="mt-2 text-xl font-semibold text-white">Tailwind CSS v4</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Routing</p>
            <p className="mt-2 text-xl font-semibold text-white">React Router basic shell</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function HomePage() {
  return (
    <Shell>
      <Hero />
    </Shell>
  )
}

function DashboardPage() {
  return (
    <Shell>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Dashboard</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Starter route is ready</h2>
          <p className="mt-4 max-w-2xl text-slate-300">
            This is a placeholder route for the future garage-management screens. The
            structure is ready for nested pages, auth guards, or a shared layout later.
          </p>
        </div>
      </section>
    </Shell>
  )
}

function NotFoundPage() {
  return (
    <Shell>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-rose-300">404</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Page not found</h2>
        </div>
      </section>
    </Shell>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
