import { z } from 'zod';

export const ApiHeroSchema = z.object({
    id: z.number(),
    name: z.string(),
    images: z.object({ icon_hero_card: z.string() }),
    starting_stats: z.object({
        max_health: z.object({ value: z.number() }).optional(),
        max_move_speed: z.object({ value: z.number() }).optional(),
        sprint_speed: z.object({ value: z.number() }).optional(),
        stamina: z.object({ value: z.number() }).optional(),
    }),
    standard_level_up_upgrades: z
        .object({
            MODIFIER_VALUE_BASE_HEALTH_FROM_LEVEL: z.number().optional(),
            MODIFIER_VALUE_BASE_BULLET_DAMAGE_FROM_LEVEL: z.number().optional(),
        })
        .optional(),
});

export const ApiHeroStatSchema = z.object({
    hero_id: z.number(),
    wins: z.number(),
    matches: z.number(),
});

export const ApiHeroCounterStatSchema = z.object({
    hero_id: z.number(),
    enemy_hero_id: z.number(),
    wins: z.number(),
    matches_played: z.number(),
});

export const ApiHeroSynergyStatSchema = z.object({
    hero_id1: z.number(),
    hero_id2: z.number(),
    wins: z.number(),
    matches_played: z.number(),
});

export type ApiHero = z.infer<typeof ApiHeroSchema>;
export type ApiHeroStat = z.infer<typeof ApiHeroStatSchema>;
export type ApiHeroCounterStat = z.infer<typeof ApiHeroCounterStatSchema>;
export type ApiHeroSynergyStat = z.infer<typeof ApiHeroSynergyStatSchema>;
