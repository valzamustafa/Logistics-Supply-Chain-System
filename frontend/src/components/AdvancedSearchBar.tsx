import { Search } from 'lucide-react';

export interface SortOption {
  value: string;
  label: string;
}

interface AdvancedSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  sortOptions: SortOption[];
  onSortByChange: (sortBy: string) => void;
  onSortDirChange: (sortDir: 'asc' | 'desc') => void;
  showClear?: boolean;
  onClear?: () => void;
}

export function AdvancedSearchBar({
  query,
  onQueryChange,
  placeholder = 'Search and filter with tokens (e.g. status:active)',
  sortBy,
  sortDir,
  sortOptions,
  onSortByChange,
  onSortDirChange,
  showClear,
  onClear,
}: AdvancedSearchBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 min-w-0">
        <label className="sr-only" htmlFor="advanced-search">Search</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="advanced-search"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-2xl border border-slate-300 bg-white px-12 py-3 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2">
          <label htmlFor="sort-by" className="text-sm text-slate-500">Sort</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2">
          <label htmlFor="sort-dir" className="text-sm text-slate-500">Direction</label>
          <select
            id="sort-dir"
            value={sortDir}
            onChange={(e) => onSortDirChange(e.target.value as 'asc' | 'desc')}
            className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none"
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </div>
        {showClear && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
