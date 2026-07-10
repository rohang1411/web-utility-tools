import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';

export default function NavBar() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('theme') as Theme | null) ?? 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--yt-border)] bg-[var(--yt-bg-page)] backdrop-blur-2xl">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--yt-control-border)] bg-[var(--yt-nav-button-bg)] text-[var(--yt-nav-button-text)] transition hover:opacity-90"
          aria-label="All tools"
          title="All tools"
        >
          <ArrowLeft size={16} />
        </Link>

        <button
          type="button"
          onClick={() => document.querySelector('#home')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-[12px] font-medium uppercase tracking-[0.34em] text-[var(--yt-text-muted)]"
        >
          Transcript Extractor
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--yt-control-border)] bg-[var(--yt-nav-button-bg)] text-[var(--yt-nav-button-text)] transition hover:opacity-90"
          aria-label={theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
          title={theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </nav>
  );
}
