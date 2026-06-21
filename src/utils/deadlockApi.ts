import { z } from 'zod';
import {
    ApiHeroSchema,
    ApiHeroStatSchema,
    ApiHeroCounterStatSchema,
    ApiHeroSynergyStatSchema,
} from '../schemas/heroes.js';
import type {
    ApiHero,
    ApiHeroStat,
    ApiHeroCounterStat,
    ApiHeroSynergyStat,
} from '../schemas/heroes.js';

const BASE_URL = 'https://api.deadlock-api.com';
// All analytics calls below are scoped to this badge floor (90 = Phantom 1+).
const MIN_BADGE = 90;

async function apiFetch<T>(path: string, schema: z.ZodSchema<T>): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) throw new Error(`deadlock-api ${res.status}: ${path}`);
    return schema.parse(await res.json());
}

export const fetchAllHeroes = (): Promise<ApiHero[]> =>
    apiFetch<ApiHero[]>('/v1/assets/heroes?only_active=true', z.array(ApiHeroSchema));

export const fetchHeroStats = (): Promise<ApiHeroStat[]> =>
    apiFetch<ApiHeroStat[]>(
        `/v1/analytics/hero-stats?min_average_badge=${MIN_BADGE}`,
        z.array(ApiHeroStatSchema),
    );

export const fetchHeroCounterStats = (): Promise<ApiHeroCounterStat[]> =>
    apiFetch<ApiHeroCounterStat[]>(
        `/v1/analytics/hero-counter-stats?min_average_badge=${MIN_BADGE}&min_matches=100`,
        z.array(ApiHeroCounterStatSchema),
    );

export const fetchHeroSynergyStats = (): Promise<ApiHeroSynergyStat[]> =>
    apiFetch<ApiHeroSynergyStat[]>(
        `/v1/analytics/hero-synergy-stats?min_average_badge=${MIN_BADGE}&min_matches=100`,
        z.array(ApiHeroSynergyStatSchema),
    );

export const fetchTotalMatchCountForBadge = async (): Promise<number> => {
    const stats = await apiFetch<Array<{ total_matches: number }>>(
        `/v1/analytics/game-stats?min_average_badge=${MIN_BADGE}`,
        z.array(z.object({ total_matches: z.number() })),
    );
    return stats[0]?.total_matches ?? 0;
};
