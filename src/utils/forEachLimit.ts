// Runs fn for every item, with at most 'limit' running at once, and resolves once all have
// finished. A failing item doesn't stop the others. The errors are thrown together at the end.
export const forEachLimit = async <T>(
    items: Iterable<T>,
    limit: number,
    fn: (item: T) => Promise<void>,
): Promise<void> => {
    const errors: unknown[] = [];
    const iterator = items[Symbol.iterator]();

    // Each worker takes the next item from the shared iterator until none are left.
    const worker = async (): Promise<void> => {
        for (let next = iterator.next(); !next.done; next = iterator.next()) {
            try {
                await fn(next.value);
            } catch (error) {
                errors.push(error);
            }
        }
    };

    await Promise.all(Array.from({ length: limit }, worker));
    if (errors.length > 0) throw new AggregateError(errors, `${errors.length} item(s) failed`);
};
