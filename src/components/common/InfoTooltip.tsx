interface InfoTooltipProps {
  tooltip: string;
}

export function InfoTooltip({ tooltip }: InfoTooltipProps) {
  return (
    <div className="group relative inline-flex items-center justify-center">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-400 text-[10px] font-bold leading-none text-cyan-400 cursor-help">
        !
      </span>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-cyan-300 text-xs rounded px-2 py-1 whitespace-nowrap border border-cyan-500 z-50 shadow-lg">
        {tooltip}
      </div>
    </div>
  );
}
