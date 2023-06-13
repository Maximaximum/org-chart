export function groupBy<T, TOutput>(
  array: T[],
  keyAccessor: (item: T) => string,
  aggregator: (group: T[]) => TOutput
) {
  const grouped: Record<string, T[]> = {};
  array.forEach((item) => {
    const key = keyAccessor(item);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });

  return Object.keys(grouped).map(
    (key) => [key, aggregator(grouped[key])] as const
  );
}
