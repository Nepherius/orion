interface InfoTooltipProps {
  tooltip: string;
}

export function InfoTooltip({ tooltip }: InfoTooltipProps) {
  // Split text into chunks of 6 words
  const words = tooltip.split(' ');
  const lines = [];
  for (let i = 0; i < words.length; i += 6) {
    lines.push(words.slice(i, i + 6).join(' '));
  }

  return (
    <div className="group relative inline-flex items-center justify-center">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-400 text-[10px] font-bold leading-none text-cyan-400 cursor-help">
        !
      </span>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-background text-cyan-300 text-xs rounded px-3 py-2 border border-cyan-500 z-50 shadow-lg whitespace-pre-line text-center w-64">
        {lines.join('\n')}
      </div>
    </div>
  );
}
