export interface Hero {
    id: number;
    name: string;
    image_url: string | null;
    base_hp: number | null;
    hp_per_boon: number | null;
    move_speed: number | null;
    stamina: number | null;
    sprint_speed: number | null;
    win_rate: number | null;
    pick_rate: number | null;
    matches: number | null;
    updated_at: string;
}

export interface HeroMatchup {
    hero_id: number;
    enemy_id: number;
    win_rate: number | null;
    matches: number | null;
}

export interface HeroSynergy {
    hero_id: number;
    ally_id: number;
    win_rate: number | null;
    matches: number | null;
}
