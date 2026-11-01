import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    ApiHeroCounterStatSchema,
    ApiHeroSchema,
    ApiHeroStatSchema,
    ApiHeroSynergyStatSchema,
} from '../../src/schemas/heroes.js';

const hero = {
    id: 1,
    name: 'Infernus',
    images: { icon_hero_card: 'https://cdn.example.com/infernus.png', icon_small: 'x' },
    hero_type: 'marksman',
    complexity: 1,
    starting_stats: {
        max_health: { value: 550 },
        max_move_speed: { value: 6.8 },
        sprint_speed: { value: 2 },
        stamina: { value: 3 },
        weapon_power: { value: 0 },
    },
    standard_level_up_upgrades: { MODIFIER_VALUE_BASE_HEALTH_FROM_LEVEL: 35 },
    description: { lore: 'Fields the API sends but the bot does not use.' },
};

describe('ApiHeroSchema', () => {
    it('parses a full hero and drops fields the bot does not use', () => {
        const parsed = ApiHeroSchema.parse(hero);
        assert.equal(parsed.name, 'Infernus');
        assert.equal(parsed.starting_stats.max_health?.value, 550);
        assert.ok(!('description' in parsed));
        assert.ok(!('icon_small' in parsed.images));
    });

    it('accepts a hero without the optional fields', () => {
        const minimal = {
            id: 2,
            name: 'Seven',
            images: { icon_hero_card: 'https://cdn.example.com/seven.png' },
            starting_stats: {},
        };
        assert.deepEqual(ApiHeroSchema.parse(minimal), minimal);
    });

    it('rejects a hero missing a required field', () => {
        for (const field of ['id', 'name', 'images', 'starting_stats'] as const) {
            const broken: Record<string, unknown> = { ...hero };
            delete broken[field];
            assert.equal(ApiHeroSchema.safeParse(broken).success, false, field);
        }
    });

    it('rejects fields of the wrong type', () => {
        assert.equal(ApiHeroSchema.safeParse({ ...hero, id: '1' }).success, false);
        assert.equal(
            ApiHeroSchema.safeParse({ ...hero, starting_stats: { max_health: { value: 'a' } } })
                .success,
            false,
        );
    });
});

describe('stat schemas', () => {
    it('parse valid rows', () => {
        assert.ok(ApiHeroStatSchema.safeParse({ hero_id: 1, wins: 5, matches: 10 }).success);
        assert.ok(
            ApiHeroCounterStatSchema.safeParse({
                hero_id: 1,
                enemy_hero_id: 2,
                wins: 5,
                matches_played: 10,
            }).success,
        );
        assert.ok(
            ApiHeroSynergyStatSchema.safeParse({
                hero_id1: 1,
                hero_id2: 2,
                wins: 5,
                matches_played: 10,
            }).success,
        );
    });

    it('reject rows with missing fields', () => {
        assert.equal(ApiHeroStatSchema.safeParse({ hero_id: 1, wins: 5 }).success, false);
        assert.equal(
            ApiHeroCounterStatSchema.safeParse({ hero_id: 1, wins: 5, matches_played: 10 }).success,
            false,
        );
        assert.equal(
            ApiHeroSynergyStatSchema.safeParse({ hero_id1: 1, wins: 5, matches_played: 10 })
                .success,
            false,
        );
    });
});
