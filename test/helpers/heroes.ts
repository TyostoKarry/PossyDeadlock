import type { Hero } from '../../src/types/heroes.js';

// A hero row as upsertHero takes it, with plausible values for every stat.
export const heroRow = (
    id: number,
    name: string,
    overrides: Partial<Hero> = {},
): Omit<Hero, 'updated_at'> => ({
    id,
    name,
    image_url: `https://cdn.example.com/${id}.png`,
    hero_type: 'marksman',
    complexity: 1,
    base_hp: 550,
    hp_per_boon: 30,
    move_speed: 6.8,
    stamina: 3,
    sprint_speed: 2,
    win_rate: 0.5,
    pick_rate: 0.1,
    matches: 1000,
    ...overrides,
});
