import { useState, useRef, useEffect, useCallback } from 'react';
import { profile, projects, techCategories } from '@/lib/data';

// ═══════════════════════════════════════════════════════════════════════════════
// TerminalEasterEgg — Interactive terminal hidden in the portfolio footer
//
// Triggered by clicking the terminal icon button or pressing Ctrl+` / Cmd+`.
// Does NOT interfere with the intro sequence — only mountable after introDone.
//
// Commands:
//   help      — Show available commands
//   whoami    — Display visitor info
//   projects  — List portfolio projects
//   skills    — Show technology stack
//   contact   — Display contact information
//   clear     — Clear terminal output
//   date      — Show current date/time
//   repl      — Show REPL count
//   banner    — Display welcome banner
// ═══════════════════════════════════════════════════════════════════════════════

const BANNER = `
  ╔══════════════════════════════════╗
  ║     QOID RIF'AT · PORTFOLIO      ║
  ║  Interactive Terminal (v1.0)     ║
  ╚══════════════════════════════════╝
`;

const AVAILABLE_COMMANDS = [
  { cmd: 'help',     desc: 'Show available commands' },
  { cmd: 'whoami',   desc: 'Display visitor information' },
  { cmd: 'projects', desc: 'List portfolio projects' },
  { cmd: 'skills',   desc: 'Show technology stack' },
  { cmd: 'contact',  desc: 'Display contact information' },
  { cmd: 'clear',    desc: 'Clear terminal output' },
  { cmd: 'date',     desc: 'Show current date and time' },
  { cmd: 'banner',   desc: 'Display welcome banner' },
];

const INITIAL_OUTPUT = [
  { text: BANNER, type: 'banner' },
  { text: 'Type `help` to see available commands.', type: 'system' },
];

function generateOutput(command, args) {
  const cmd = command.toLowerCase().trim();

  switch (cmd) {
    case 'help':
      return [
        { text: 'Available commands:', type: 'system' },
        ...AVAILABLE_COMMANDS.map(({ cmd: c, desc }) => ({
          text: `  ${c.padEnd(14)} ${desc}`,
          type: 'help',
        })),
      ];

    case 'whoami':
      return [
        { text: `${profile.name}`, type: 'highlight' },
        { text: `${profile.role}`, type: 'info' },
        { text: `Location: ${profile.location}`, type: 'info' },
        { text: `Status: ${profile.status}`, type: 'success' },
        { text: `Email: ${profile.email}`, type: 'info' },
      ];

    case 'projects':
      if (projects.length === 0) {
        return [{ text: 'No projects found.', type: 'system' }];
      }
      return [
        { text: `Projects (${projects.length}):`, type: 'system' },
        ...projects.map((p, i) => ({
          text: `  ${i + 1}. ${p.title} — ${p.category}`,
          type: 'info',
        })),
      ];

    case 'skills':
      if (techCategories.length === 0) {
        return [{ text: 'No skills data available.', type: 'system' }];
      }
      return techCategories.flatMap((cat) => [
        { text: `\n${cat.label}:`, type: 'highlight' },
        { text: `  ${cat.items.map((item) => item.name).join(', ')}`, type: 'info' },
      ]);

    case 'contact':
      return [
        { text: 'Contact Information:', type: 'system' },
        { text: `  Email:    ${profile.email}`, type: 'info' },
        { text: `  Phone:    ${profile.phone}`, type: 'info' },
        { text: `  Location: ${profile.location}`, type: 'info' },
        { text: `  GitHub:   https://github.com/qoidrifat`, type: 'info' },
      ];

    case 'clear':
      return [];

    case 'date':
      return [{ text: new Date().toLocaleString(), type: 'info' }];

    case 'banner':
      return [{ text: BANNER, type: 'banner' }];

    default:
      return [
        { text: `Unknown command: "${command}". Type "help" for available commands.`, type: 'error' },
      ];
  }
}

export default function TerminalEasterEgg() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(INITIAL_OUTPUT);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef(null);
  const outputRef = useRef(null);
  // Mirror of `open` for the global key handler (avoids re-binding per toggle)
  const openRef = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);

  // ── Keyboard shortcut: Ctrl+` / Cmd+` ──
  useEffect(() => {
    const down = (e) => {
      // Ignore shortcuts while the intro overlay is up — the terminal would
      // open invisibly underneath it and steal focus from the page
      if (document.querySelector('[data-intro-overlay]')) return;
      // Support both '`' (US) and 'Backquote' (international layouts) via e.code
      const isBackquote = e.key === '`' || e.code === 'Backquote';
      if (isBackquote && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      // Only consume Escape when the terminal is actually open, so other
      // overlays (modal, lightbox, palette) don't all close at once
      if (e.key === 'Escape' && openRef.current) {
        e.stopImmediatePropagation();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // ── Visible trigger — footer button dispatches this event ──
  useEffect(() => {
    const openTerminal = () => setOpen(true);
    window.addEventListener('open-terminal', openTerminal);
    return () => window.removeEventListener('open-terminal', openTerminal);
  }, []);

  // ── Focus input when opened ──
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    const output = generateOutput(trimmed, []);
    setHistory((prev) => [
      ...prev,
      { text: `> ${trimmed}`, type: 'input' },
      ...output,
    ]);
    setInput('');
  }, [input]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1
          ? commandHistory.length - 1
          : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    }
  }, [historyIndex, commandHistory]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9997] flex items-end justify-center p-4 pb-20 md:p-8 pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={() => setOpen(false)}
      />

      {/* Terminal window — floating sheet */}
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl pointer-events-auto"
        style={{
          background: 'rgba(9, 9, 11, 0.94)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          maxHeight: 'min(80vh, 600px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {/* Traffic light dots */}
            <div className="flex items-center gap-[6px]">
              <button
                onClick={() => setOpen(false)}
                className="w-[10px] h-[10px] rounded-full bg-red-500/50 hover:bg-red-500 transition-colors"
                aria-label="Close terminal"
              />
              <div className="w-[10px] h-[10px] rounded-full bg-yellow-500/50" />
              <div className="w-[10px] h-[10px] rounded-full bg-green-500/50" />
            </div>
            <span
              className="text-xs font-semibold text-zinc-500 uppercase tracking-wider"
              style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
            >
              Terminal — qoidrifat
            </span>
          </div>
        </div>

        {/* Output area */}
        <div
          ref={outputRef}
          className="overflow-y-auto px-5 py-4"
          style={{
            maxHeight: 'calc(min(80vh, 600px) - 120px)',
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: 'clamp(0.6875rem, 1.1vw, 0.8125rem)',
            lineHeight: 1.7,
          }}
        >
          {history.map((entry, idx) => (
            <div
              key={idx}
              style={{
                color: entry.type === 'input' ? 'rgba(96,165,250,0.85)'
                     : entry.type === 'error' ? 'rgba(239,68,68,0.85)'
                     : entry.type === 'highlight' ? 'rgba(96,165,250,0.9)'
                     : entry.type === 'success' ? 'rgba(52,211,153,0.85)'
                     : entry.type === 'banner' ? 'rgba(96,165,250,0.6)'
                     : entry.type === 'system' ? 'rgba(212,212,216,0.7)'
                     : 'rgba(161,161,170,0.8)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {entry.text}
            </div>
          ))}
        </div>

        {/* Input line */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-5 py-3 border-t border-white/[0.06]"
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: 'clamp(0.6875rem, 1.1vw, 0.8125rem)',
              color: 'rgba(96,165,250,0.6)',
            }}
          >
            $
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-zinc-600"
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: 'clamp(0.6875rem, 1.1vw, 0.8125rem)',
            }}
            autoComplete="off"
            spellCheck={false}
            aria-label="Terminal input"
          />
        </form>
      </div>
    </div>
  );
}
