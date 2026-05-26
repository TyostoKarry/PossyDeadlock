const timestamp = (): string => new Date().toISOString();

export const logger = {
    info: (msg: string): void => console.log(`[${timestamp()}] [INFO] ${msg}`),
    warn: (msg: string): void => console.warn(`[${timestamp()}] [WARN] ${msg}`),
    error: (msg: string, err?: unknown): void => {
        console.error(`[${timestamp()}] [ERROR] ${msg}`);
        if (err instanceof Error) console.error(`  → ${err.message}`);
    },
};
