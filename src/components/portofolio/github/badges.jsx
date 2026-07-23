import { getLanguageColor } from '@/hooks/useGithubRepos';

export function LangDot({ language }) {
  const color = getLanguageColor(language);
  return (
    <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs">{language}</span>
    </span>
  );
}

export function TopicBadge({ topic }) {
  return (
    <span className="px-2 py-0.5 rounded-md bg-accent-web/8 border border-accent-web/12 text-[9px] font-medium text-accent-web/70 whitespace-nowrap">
      {topic}
    </span>
  );
}
