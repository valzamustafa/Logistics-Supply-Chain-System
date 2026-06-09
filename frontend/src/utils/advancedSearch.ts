export type SortDirection = 'asc' | 'desc';

export type SearchField<T> = keyof T | string | ((item: T) => string);

export interface AdvancedSearchConfig<T> {
  query: string;
  searchFields: SearchField<T>[];
  filterPredicates?: Record<string, (item: T, value: string) => boolean>;
  sortBy?: keyof T | string;
  sortDir?: SortDirection;
}

function getValue(item: any, field: string): string {
  if (!field) return '';
  const parts = field.split('.');
  let value: any = item;
  for (const part of parts) {
    if (value == null) return '';
    value = value[part];
  }
  return value == null ? '' : String(value);
}

function getSearchFieldValue<T>(item: T, field: SearchField<T>): string {
  if (typeof field === 'function') {
    return String(field(item) ?? '');
  }
  return getValue(item, String(field));
}

function normalize(value: any): string {
  return String(value ?? '').toLowerCase();
}

export function parseAdvancedSearchQuery(query: string) {
  const parts = query
    .trim()
    .match(/(?:"([^"]+)")|(?:([^\s]+))/g)
    ?.map((part) => part.replace(/^"|"$/g, '')) ?? [];

  const fieldFilters: Record<string, string[]> = {};
  const terms: string[] = [];

  for (const part of parts) {
    const separatorIndex = part.indexOf(':');
    if (separatorIndex > 0) {
      const field = part.slice(0, separatorIndex).toLowerCase();
      const value = part.slice(separatorIndex + 1).trim();
      if (field && value) {
        if (!fieldFilters[field]) {
          fieldFilters[field] = [];
        }
        fieldFilters[field].push(value);
        continue;
      }
    }
    if (part.length > 0) {
      terms.push(part);
    }
  }

  return { fieldFilters, terms };
}

function compareValues(a: any, b: any): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;

  const aNumber = Number(a);
  const bNumber = Number(b);
  if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) {
    return aNumber - bNumber;
  }

  const aDate = Date.parse(a);
  const bDate = Date.parse(b);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
    return aDate - bDate;
  }

  return String(a).localeCompare(String(b));
}

export function sortItems<T>(items: T[], sortBy?: keyof T | string, sortDir: SortDirection = 'asc'): T[] {
  if (!sortBy) return items;
  return [...items].sort((a, b) => {
    const aVal = getValue(a, String(sortBy));
    const bVal = getValue(b, String(sortBy));
    const result = compareValues(aVal, bVal);
    return sortDir === 'asc' ? result : -result;
  });
}

export function advancedSearch<T>(items: T[], config: AdvancedSearchConfig<T>): T[] {
  const query = config.query || '';
  if (!items || items.length === 0) return [];

  const { fieldFilters, terms } = parseAdvancedSearchQuery(query);
  const stringFields = config.searchFields
    .filter((field): field is string => typeof field === 'string')
    .map((field) => field.toLowerCase());

  return sortItems(
    items.filter((item) => {
      for (const [field, values] of Object.entries(fieldFilters)) {
        const predicate = config.filterPredicates?.[field];
        if (predicate) {
          for (const value of values) {
            if (!predicate(item, value)) {
              return false;
            }
          }
        } else {
          const fieldMatch = stringFields.some((searchField) => searchField === field);
          const content = fieldMatch
            ? normalize(getValue(item, field))
            : config.searchFields
                .map((searchField) => normalize(getSearchFieldValue(item, searchField)))
                .join(' ');
          for (const value of values) {
            if (!content.includes(value.toLowerCase())) {
              return false;
            }
          }
        }
      }

      if (terms.length > 0) {
        for (const term of terms) {
          const lowerTerm = term.toLowerCase();
          const hasTerm = config.searchFields.some((searchField) => normalize(getSearchFieldValue(item, searchField)).includes(lowerTerm));
          if (!hasTerm) {
            return false;
          }
        }
      }

      return true;
    }),
    config.sortBy,
    config.sortDir
  );
}
