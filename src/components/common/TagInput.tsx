import { useState, useRef, useEffect } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  maxTags?: number;
  placeholder?: string;
  label?: string;
  allowNewTags?: boolean;
}

// Tag validation: alphanumeric, dash, dot
const TAG_REGEX = /^[a-zA-Z0-9.-]+$/;

export function TagInput({
  value,
  onChange,
  suggestions,
  maxTags = 5,
  placeholder = 'Add tag...',
  label,
  allowNewTags = true,
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions
  const filtered = suggestions
    .filter((tag) => tag.toLowerCase().includes(input.toLowerCase()) && !value.includes(tag))
    .slice(0, 8);
  const isValid = input.length > 0 && TAG_REGEX.test(input);
  const isNew = isValid && !suggestions.includes(input);

  useEffect(() => {
    setHighlighted(filtered.length > 0 ? 0 : -1);
  }, [input, filtered.length]);

  const addTag = (tag: string) => {
    if (
      value.length < maxTags &&
      TAG_REGEX.test(tag) &&
      !value.includes(tag) &&
      (allowNewTags || suggestions.includes(tag))
    ) {
      onChange([...value, tag]);
      setInput('');
      setIsOpen(false);
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && input && isValid) {
      if (highlighted >= 0 && filtered[highlighted]) {
        addTag(filtered[highlighted]);
      } else if (!allowNewTags && filtered.length > 0) {
        addTag(filtered[0]);
      } else if (allowNewTags) {
        addTag(input);
      }
      e.preventDefault();
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'ArrowDown') {
      setIsOpen(true);
      setHighlighted((h) => (h < filtered.length - 1 ? h + 1 : h));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlighted((h) => (h > 0 ? h - 1 : h));
      e.preventDefault();
    }
  };

  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <div className="flex flex-wrap gap-2 items-center border border-border rounded px-2 py-1 bg-surface">
        {value.map((tag) => (
          <span
            key={tag}
            className="bg-primary-700 text-white rounded px-2 py-0.5 text-xs flex items-center gap-1"
          >
            {tag}
            <button
              type="button"
              className="ml-1 text-xs hover:text-red-400"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        {value.length < maxTags && (
          <div className="relative flex-1 min-w-[120px]">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onBlur={() => setTimeout(() => setIsOpen(false), 100)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="input border-none bg-transparent p-0 h-7 text-sm focus:ring-0 focus:outline-none"
              maxLength={24}
            />
            {isOpen && (filtered.length > 0 || (allowNewTags && isValid && isNew)) && (
              <div className="absolute z-10 left-0 right-0 bg-surface-hover border border-muted rounded shadow-lg mt-1 max-h-40 overflow-y-auto">
                {filtered.map((tag, i) => (
                  <button
                    key={tag}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm ${
                      i === highlighted ? 'bg-primary text-white' : 'hover:bg-surface'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(tag);
                    }}
                  >
                    {tag}
                  </button>
                ))}
                {allowNewTags && isValid && isNew && (
                  <div
                    className="px-3 py-2 text-sm text-green-500 flex items-center gap-2 cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(input);
                    }}
                  >
                    <span>New tag:</span>
                    <span className="font-mono">{input}</span>
                  </div>
                )}
                {!isValid && input && (
                  <div className="px-3 py-2 text-sm text-red-500">
                    Invalid tag (alphanumeric, dash, dot)
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="text-xs text-muted mt-1">
        {value.length}/{maxTags} tags
      </div>
    </div>
  );
}
