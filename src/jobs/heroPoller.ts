import cron from 'node-cron';
import {
    fetchAllHeroes,
    fetchHeroStats,
    fetchHeroCounterStats,
    fetchHeroSynergyStats,
    fetchTotalMatchCount,
} from '../utils/deadlockApi.js';
import { upsertHero, upsertHeroMatchup, upsertHeroSynergy } from '../db/database.js';
import { logger } from '../utils/logger.js';

const poll = async (): Promise<void> => {
    logger.info('Hero poller: starting refresh...');
    try {
        const heroAssets = await fetchAllHeroes();
        const heroStats = await fetchHeroStats();
        const counterStats = await fetchHeroCounterStats();
        const synergyStats = await fetchHeroSynergyStats();
        const totalMatches = await fetchTotalMatchCount();

        const statsMap = new Map(heroStats.map((stats) => [stats.hero_id, stats]));

        for (const hero of heroAssets) {
            const stats = statsMap.get(hero.id);
            upsertHero({
                id: hero.id,
                name: hero.name,
                image_url: hero.images?.icon_hero_card ?? null,
                hero_type: hero.hero_type ?? null,
                complexity: hero.complexity ?? null,
                base_hp: hero.starting_stats?.max_health?.value ?? null,
                hp_per_boon:
                    hero.standard_level_up_upgrades?.MODIFIER_VALUE_BASE_HEALTH_FROM_LEVEL ?? null,
                move_speed: hero.starting_stats?.max_move_speed?.value ?? null,
                stamina: hero.starting_stats?.stamina?.value ?? null,
                sprint_speed: hero.starting_stats?.sprint_speed?.value ?? null,
                win_rate: stats ? stats.wins / stats.matches : null,
                pick_rate: stats && totalMatches > 0 ? stats.matches / totalMatches : null,
                matches: stats?.matches ?? null,
            });
        }

        for (const row of counterStats) {
            upsertHeroMatchup(
                row.hero_id,
                row.enemy_hero_id,
                row.wins / row.matches_played,
                row.matches_played,
            );
        }

        for (const row of synergyStats) {
            const winRate = row.wins / row.matches_played;
            upsertHeroSynergy(row.hero_id1, row.hero_id2, winRate, row.matches_played);
            upsertHeroSynergy(row.hero_id2, row.hero_id1, winRate, row.matches_played);
        }

        logger.info(
            `Hero poller: updated ${heroAssets.length} heroes, ${counterStats.length} counter pairs, ${synergyStats.length} synergy pairs`,
        );
    } catch (error) {
        logger.error('Hero poller failed', error);
    }
};

export const startHeroPoller = (): void => {
    logger.info('Hero poller started, running daily at 06:00');
    void poll();
    cron.schedule('0 6 * * *', () => void poll());
};
