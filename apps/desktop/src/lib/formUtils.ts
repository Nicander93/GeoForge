import { useEffect, useState } from 'react';
export { cloneOutputPath, formatTaskProgressLine, pathsEqual, realProgressPercent, stageLabelZh, suggestOutputPath } from './formUtilsCore';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
