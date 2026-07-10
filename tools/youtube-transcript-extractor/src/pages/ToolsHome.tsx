import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowUpRight,
  Circle,
  Moon,
  Sun,
} from 'lucide-react';
import { tools } from '@/data/tools';

export default function ToolsHome() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <main
      className={`min-h-screen transition-colors ${
        isDark ? 'bg-[#050505] text-[#f3f0e9]' : 'bg-[#f5f3ee] text-[#111111]'
      }`}
    >
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
          isDark ? 'border-white/10 bg-[#050505]/82' : 'border-black/10 bg-[#f5f3ee]/82'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className={`flex h-9 shrink-0 items-center rounded-lg border px-3 font-mono text-[11px] uppercase tracking-normal ${
              isDark ? 'border-white/12 text-[#f3f0e9]' : 'border-black/12 text-[#111111]'
            }`}
          >
            WUT
          </Link>

          <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
            {tools.map((tool) => (
              <Link
                key={tool.id}
                to={tool.route}
                className={`group inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
                  isDark
                    ? 'border-white/12 bg-white/[0.03] text-[#d8d3ca] hover:border-white/24 hover:bg-white/[0.07] hover:text-white'
                    : 'border-black/12 bg-white/50 text-[#34312d] hover:border-black/24 hover:bg-white hover:text-black'
                }`}
              >
                <Circle size={7} className={tool.status === 'ready' ? 'fill-[#9affc9] text-[#9affc9]' : ''} />
                <span>{tool.shortName}</span>
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setIsDark((value) => !value)}
            aria-label={isDark ? 'Use light mode' : 'Use dark mode'}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
              isDark
                ? 'border-white/12 text-[#f3f0e9] hover:bg-white/[0.07]'
                : 'border-black/12 text-[#111111] hover:bg-white'
            }`}
          >
            {isDark ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
        <div className="flex items-end justify-between gap-6 border-b border-current/10 pb-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-normal opacity-45">
              Web Utility Tools
            </p>
            <h1 className="mt-3 text-5xl font-normal leading-none tracking-normal sm:text-7xl">
              Tools
            </h1>
          </div>
          <p className="hidden font-mono text-[11px] uppercase tracking-normal opacity-45 sm:block">
            {String(tools.length).padStart(2, '0')} / Index
          </p>
        </div>

        <div className="divide-y divide-current/10">
          {tools.map((tool, index) => {
            const Icon = tool.Icon;

            return (
              <Link
                key={tool.id}
                to={tool.route}
                className="group grid gap-5 py-7 transition-opacity hover:opacity-80 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:items-center sm:py-9"
              >
                <span className="font-mono text-xs opacity-40">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="text-2xl font-normal leading-tight tracking-normal sm:text-4xl">
                      {tool.name}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-normal ${
                        isDark
                          ? 'border-[#9affc9]/30 text-[#9affc9]'
                          : 'border-[#0b7d50]/25 text-[#0b7d50]'
                      }`}
                    >
                      {tool.status}
                    </span>
                  </span>

                  <span className="mt-4 flex flex-wrap gap-2">
                    {tool.actions.map((action) => (
                      <span
                        key={action}
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          isDark
                            ? 'border-white/10 text-[#9c968d]'
                            : 'border-black/10 text-[#6d6860]'
                        }`}
                      >
                        {action}
                      </span>
                    ))}
                  </span>
                </span>

                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-lg border transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${
                    isDark
                      ? 'border-white/12 bg-white/[0.03]'
                      : 'border-black/12 bg-white/60'
                  }`}
                >
                  <Icon size={19} />
                  <ArrowUpRight size={13} className="-ml-1 mt-5 opacity-45" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
