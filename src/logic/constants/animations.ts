// fallow-ignore-file security-sink
/**
 * ANIMATION CONSTANTS (SINGLE SOURCE OF TRUTH)
 * Centralized constant definitions for GSAP durations, easing, offsets, and UI movement.
 */

/** Full rotation angle in degrees (360°). */
export const FULL_ROTATION_DEG = 360;

/** Full scale value (1.0) — normal/identity scale for GSAP animations. */
export const SCALE_FULL = 1;

/** Zero scale value (0) — collapsed/invisible scale for GSAP animations. */
export const SCALE_ZERO = 0;

/** Fast GSAP transition duration in seconds (0.15s). */
export const GSAP_FAST_DURATION_SEC = 0.15;

/** Standard GSAP transition duration in seconds (0.3s). */
export const GSAP_STANDARD_DURATION_SEC = 0.3;

/** Slow GSAP transition duration in seconds (0.5s). */
export const GSAP_SLOW_DURATION_SEC = 0.5;

export const COMBATANT_EMERGE_SPARKLE_FADE_DURATION_SEC = 0.6;
export const HATCH_PARTICLE_MAX_SPREAD_PX = 80;

/** Notification toast display auto-dismiss delay in seconds (4.0s). */
export const NOTIFICATION_DISMISS_DELAY_SEC = 4.0;

/** View tab fade out duration in seconds (0.15s). */
export const VIEW_TAB_FADE_OUT_DURATION_SEC = 0.15;

/** View tab fade in duration in seconds (0.25s). */
export const VIEW_TAB_FADE_IN_DURATION_SEC = 0.25;

/** Login logo floating Y amplitude offset in pixels (15px). */
export const LOGIN_LOGO_FLOAT_Y_PX = 15;

/** Login auth card entrance Y offset in pixels (30px). */
export const LOGIN_CARD_ENTER_Y_PX = 30;

/** HUD height calculation update delay in seconds (0.1s). */
export const HUD_HEIGHT_UPDATE_DELAY_SEC = 0.1;

/** Default avatar size in pixels. */
export const DEFAULT_AVATAR_SIZE_PX = 40;

/** Base Poké Ball diameter in pixels (10px * object_scale 2 = 20px, ~1/5 of Rattata height). */
export const POKEBALL_BASE_SIZE_PX = 10;

/** Map weather drift animation horizontal offset in pixels. */
export const MAP_WEATHER_DRIFT_OFFSET_PX = 10;

/** Map weather shake animation angle in degrees. */
export const MAP_WEATHER_SHAKE_ANGLE_DEG = 3;

/** Map faction union badge animation angle in degrees. */
export const MAP_FACTION_UNION_ANGLE_DEG = 5;

/** Map faction union badge animation scale max. */
export const MAP_FACTION_UNION_MAX_SCALE = 1.05;

/** Map faction poder badge animation scale max. */
export const MAP_FACTION_PODER_MAX_SCALE = 1.08;

/** Combatant floating idle animation base Y-offset percentage. */
export const COMBATANT_IDLE_FLOAT_BASE_Y_PERCENT = 4;

/** Combatant floating idle animation variance Y-offset percentage. */
export const COMBATANT_IDLE_FLOAT_VAR_Y_PERCENT = 4;

/** Combatant floating idle animation base rotation angle in degrees. */
export const COMBATANT_IDLE_FLOAT_BASE_ROTATION_DEG = 1;

/** Combatant floating idle animation variance rotation angle in degrees. */
export const COMBATANT_IDLE_FLOAT_VAR_ROTATION_DEG = 2;

/** Combatant floating idle animation base duration in seconds. */
export const COMBATANT_IDLE_FLOAT_BASE_DURATION_SEC = 2.0;

/** Combatant floating idle animation variance duration in seconds. */
export const COMBATANT_IDLE_FLOAT_VAR_DURATION_SEC = 1.0;

/** Combatant grounded idle animation base scale X. */
export const COMBATANT_IDLE_GROUNDED_BASE_SCALE_X = 0.98;

/** Combatant grounded idle animation variance scale X. */
export const COMBATANT_IDLE_GROUNDED_VAR_SCALE_X = 0.04;

/** Combatant grounded idle animation base scale Y. */
export const COMBATANT_IDLE_GROUNDED_BASE_SCALE_Y = 0.98;

/** Combatant grounded idle animation variance scale Y. */
export const COMBATANT_IDLE_GROUNDED_VAR_SCALE_Y = 0.04;

/** Combatant grounded idle animation base rotation angle in degrees. */
export const COMBATANT_IDLE_GROUNDED_BASE_ROTATION_DEG = 0.5;

/** Combatant grounded idle animation variance rotation angle in degrees. */
export const COMBATANT_IDLE_GROUNDED_VAR_ROTATION_DEG = 1.0;

/** Combatant grounded idle animation base duration in seconds. */
export const COMBATANT_IDLE_GROUNDED_BASE_DURATION_SEC = 1.2;

/** Combatant grounded idle animation variance duration in seconds. */
export const COMBATANT_IDLE_GROUNDED_VAR_DURATION_SEC = 0.4;

/** Trainer grounded idle breathing animation base scale X. */
export const TRAINER_IDLE_BASE_SCALE_X = 0.99;

/** Trainer grounded idle breathing animation variance scale X. */
export const TRAINER_IDLE_VAR_SCALE_X = 0.02;

/** Trainer grounded idle breathing animation base scale Y. */
export const TRAINER_IDLE_BASE_SCALE_Y = 0.985;

/** Trainer grounded idle breathing animation variance scale Y. */
export const TRAINER_IDLE_VAR_SCALE_Y = 0.03;

/** Trainer grounded idle breathing animation base rotation angle in degrees. */
export const TRAINER_IDLE_BASE_ROTATION_DEG = 0.2;

/** Trainer grounded idle breathing animation variance rotation angle in degrees. */
export const TRAINER_IDLE_VAR_ROTATION_DEG = 0.3;

/** Trainer grounded idle breathing animation base duration in seconds. */
export const TRAINER_IDLE_BASE_DURATION_SEC = 1.8;

/** Trainer grounded idle breathing animation variance duration in seconds. */
export const TRAINER_IDLE_VAR_DURATION_SEC = 1.2;

/** Combatant fainting animation Y-offset downward displacement in pixels. */
export const COMBATANT_FAINT_Y_OFFSET = 60;

/** Combatant fainting animation total fall duration in seconds. */
export const COMBATANT_FAINT_DURATION_SEC = 1.0;

/** Physical attack dash forward distance in pixels. */
export const ATTACK_DASH_DISTANCE_PX = 60;

/** Physical attack windup preparation distance in pixels. */
export const ATTACK_PREP_DISTANCE_PX = -15;

/** Snappy physical attack windup duration in seconds (0.08s). */
export const ATTACK_PHYSICAL_PREP_DURATION_SEC = 0.08;

/** Snappy physical attack forward dash strike duration in seconds (0.14s). */
export const ATTACK_PHYSICAL_DASH_DURATION_SEC = 0.14;

/** Snappy physical attack return to seat duration in seconds (0.14s). */
export const ATTACK_PHYSICAL_RETURN_DURATION_SEC = 0.14;

/** Snappy combat damage hit shake duration in seconds (0.25s). */
export const COMBATANT_DAMAGE_SHAKE_DUR_SEC = 0.25;

/** Pokeball enter scale-in animation duration in seconds. */
export const POKEBALL_APPEAR_DURATION_SEC = 0.4;

/** Enemy side combatant display size scale multiplier (2.0x). */
export const COMBATANT_DISPLAY_SIZE_ENEMY_MULT = 2.0;

/** Player side combatant display size scale multiplier (1.5x). */
export const COMBATANT_DISPLAY_SIZE_PLAYER_MULT = 1.5;

/** Pokeball shadow canvas width in pixels. */
export const POKEBALL_SHADOW_CANVAS_WIDTH_PX = 10;

/** Pokeball shadow canvas height in pixels. */
export const POKEBALL_SHADOW_CANVAS_HEIGHT_PX = 7;

/** Particle count emitted during flee escape animation. */
export const SMOKE_PARTICLE_BURST_COUNT = 15;

/** Flee animation particle opacity decay rate per frame. */
export const SMOKE_PARTICLE_FADE_RATE = 0.03;

/** Flee animation particle scale expansion rate per frame. */
export const SMOKE_PARTICLE_EXPANSION_RATE = 0.02;

/** Flee animation horizontal slide distance off-screen in pixels. */
export const FLEE_SLIDE_DISTANCE_PX = 400;

/** Egg levitation Y axis float distance in pixels. */
export const EGG_LEVITATION_Y_OFFSET = -12;

/** Egg levitation floating cycle duration in seconds. */
export const EGG_LEVITATION_DURATION_SEC = 1.2;

/** Total shake repetitions during final egg hatch sequence. */
export const HATCH_SHAKE_REPEAT_COUNT = 26;

/** White flash transition duration upon hatching in seconds. */
export const HATCH_FLASH_DURATION_SEC = 0.2;

/** Particle count generated upon egg hatching burst. */
export const HATCH_PARTICLES_COUNT = 25;

/** Minimum burst distance for hatch particles in pixels. */
export const HATCH_PARTICLE_MIN_DISTANCE_PX = 80;

/** Pokeball catching/releasing transition duration in seconds. */
export const BALL_TRANSITION_DURATION_SEC = 0.5;

/** Recoil animation horizontal setback distance in pixels. */
export const RECOIL_HORIZONTAL_OFFSET_PX = 35;

/** Recoil animation vertical setback distance in pixels. */
export const RECOIL_VERTICAL_OFFSET_PX = 10;

/** Recoil animation push duration in seconds. */
export const RECOIL_PUSH_DURATION_SEC = 0.15;

/** Recoil animation recovery duration in seconds. */
export const RECOIL_RECOVERY_DURATION_SEC = 0.3;

/** Combatant heal pop float Y offset in pixels. */
export const COMBATANT_HEAL_Y_OFFSET_PX = -15;

/** Combatant heal animation duration per phase in seconds. */
export const COMBATANT_HEAL_PHASE_DURATION_SEC = 0.25;

/** Trainer back shadow vertical offset percentage (-75%). */
export const TRAINER_SHADOW_Y_PERCENT_OFFSET = -75;

/** Initial load delay duration for battle arena initialization in seconds. */
export const ARENA_INITIAL_LOAD_DELAY_SEC = 0.5;

/** Rival alert flicker duration per step in seconds. */
export const RIVAL_ALERT_FLICKER_DURATION_SEC = 0.05;

/** Rival alert flicker repeat count (7 repetitions). */
export const RIVAL_ALERT_FLICKER_REPEAT_COUNT = 7;

/** Rival exclamation pop scale multiplier (1.5x). */
export const RIVAL_EXCLAMATION_POP_SCALE = 1.5;

/** Rival exclamation pop duration in seconds. */
export const RIVAL_EXCLAMATION_POP_DURATION_SEC = 0.25;

/** Rival exclamation wobble Y offset per cycle. */
export const RIVAL_EXCLAMATION_WOBBLE_Y_OFFSET = -10;

/** Rival exclamation wobble duration per step in seconds. */
export const RIVAL_EXCLAMATION_WOBBLE_DURATION_SEC = 0.1;

/** Rival exclamation wobble repeat count (5 repetitions). */
export const RIVAL_EXCLAMATION_WOBBLE_REPEAT_COUNT = 5;

/** Rival exclamation fade out duration in seconds. */
export const RIVAL_EXCLAMATION_FADE_DURATION_SEC = 0.3;

/** Trainer entry animation duration in seconds. */
export const TRAINER_ENTER_DURATION_SEC = 0.8;

/** Trainer retreat target X offset in pixels. */
export const TRAINER_RETREAT_X_OFFSET_PX = 300;
export const TRAINER_RETREAT_Y_OFFSET_PX = -10;
export const TRAINER_RETREAT_SCALE = 0.8;

/** Trainer exit animation duration in seconds. */
export const TRAINER_EXIT_DURATION_SEC = 0.8;

/** Trainer exit X offset to move off-screen to the right in pixels. */
export const TRAINER_EXIT_X_OFFSET_PX = 600;

/** Battle HUD enter/leave transition X offset in pixels. */
export const HUD_TRANSITION_X_OFFSET_PX = 20;

/** Battle HUD enter/leave transition initial scale. */
export const HUD_TRANSITION_INITIAL_SCALE = 0.98;

/** Battle HUD enter/leave transition duration in seconds. */
export const HUD_TRANSITION_DURATION_SEC = 0.4;

/** Battle dialog enter initial Y offset in pixels. */
export const DIALOG_ENTER_Y_OFFSET_PX = 15;

/** Battle dialog leave initial Y offset in pixels. */
export const DIALOG_LEAVE_Y_OFFSET_PX = 10;

/** Battle dialog leave transition duration in seconds. */
export const DIALOG_LEAVE_DURATION_SEC = 0.3;

/** Avatar spin animation durations per trainer class level in seconds. */
export const AVATAR_CLASS_SPIN_DURATIONS_SEC: Record<string, number> = {
  fire: 1.5,
  water: 2.0,
  electric: 0.8,
  psychic: 2.5,
  dark: 3.0,
  ghost: 2.2,
  ice: 1.8,
  dragon: 1.2,
  legend: 1.0,
  master: 1.5,
  cazabichos: 2.0,
  criador: 2.2,
  rocket: 1.4,
  entrenador: 2.0,
  union: 2.5,
  poder: 1.8,
  admin: 1.0
};

/** Avatar spin animation durations per trainer type in seconds. */
export const AVATAR_TYPE_SPIN_DURATIONS_SEC: Record<string, number> = {
  normal: 2.0,
  fire: 1.5,
  water: 2.0,
  grass: 2.2,
  electric: 0.8,
  ice: 1.8,
  fighting: 1.2,
  poison: 2.2,
  ground: 2.5,
  flying: 1.5,
  psychic: 2.5,
  bug: 2.0,
  rock: 2.8,
  ghost: 2.2,
  dragon: 1.2,
  dark: 3.0,
  steel: 2.5,
  fairy: 1.8
};

/** Avatar shadow animation durations per element/class in seconds. */
export const AVATAR_SHADOW_DURATIONS_SEC: Record<string, number> = {
  fire: 1.0,
  water: 1.5,
  electric: 0.1,
  psychic: 1.25,
  dark: 2.0,
  ghost: 1.25,
  ice: 1.5,
  dragon: 1.0,
  legend: 1.0,
  master: 1.5,
  cazabichos: 1.5,
  criador: 1.25,
  rocket: 0.75,
  entrenador: 1.0,
  union: 1.25,
  poder: 1.1,
  admin: 0.75,
  normal: 1.75,
  steel: 1.75,
  grass: 1.5,
  fighting: 1.0,
  poison: 1.2,
  ground: 1.75,
  flying: 1.4,
  bug: 1.1,
  rock: 2.0,
  fairy: 1.05
};

/** Pokeball wobble/shake animation offset distance in pixels. */
export const POKEBALL_SHAKE_DISTANCE_PX = 4;

// --- Emerging (landing) animation ---
/** Combatant emerging squish Y offset in pixels (downward press). */
export const EMERGE_SQUISH_Y_PX = 8;
/** Combatant emerging squish X scale factor. */
export const EMERGE_SQUISH_SCALE_X = 1.2;
/** Combatant emerging squish Y scale factor. */
export const EMERGE_SQUISH_SCALE_Y = 0.75;
/** Combatant emerging squish phase duration in seconds. */
export const EMERGE_SQUISH_DURATION_SEC = 0.1;
/** Combatant emerging jump Y offset in pixels (upward). */
export const EMERGE_JUMP_Y_PX = -60;
/** Combatant emerging jump X scale factor. */
export const EMERGE_JUMP_SCALE_X = 0.85;
/** Combatant emerging jump Y scale factor. */
export const EMERGE_JUMP_SCALE_Y = 1.2;
/** Combatant emerging jump phase duration in seconds. */
export const EMERGE_JUMP_DURATION_SEC = 0.3;
/** Combatant emerging land X scale factor. */
export const EMERGE_LAND_SCALE_X = 1.1;
/** Combatant emerging land Y scale factor. */
export const EMERGE_LAND_SCALE_Y = 0.9;
/** Combatant emerging land phase duration in seconds. */
export const EMERGE_LAND_DURATION_SEC = 0.2;
/** Combatant emerging settle phase duration in seconds. */
export const EMERGE_SETTLE_DURATION_SEC = 0.1;

// --- SelfKO explosion animation ---
/** Number of shake iterations in selfKO animation. */
export const SELFKO_SHAKE_COUNT = 8;
/** Max shake displacement range in pixels for selfKO. */
export const SELFKO_SHAKE_RANGE_PX = 30;
/** SelfKO shake step duration in seconds. */
export const SELFKO_SHAKE_DURATION_SEC = 0.05;
/** SelfKO explosion scale up factor. */
export const SELFKO_EXPLODE_SCALE = 1.6;
/** SelfKO explosion brightness multiplier. */
export const SELFKO_EXPLODE_BRIGHTNESS = 1.8;
/** SelfKO explosion drop-shadow blur radius in pixels. */
export const SELFKO_EXPLODE_SHADOW_PX = 25;
/** SelfKO explosion color (phase 1). */
export const SELFKO_EXPLODE_PRIMARY_COLOR = '#ff4500';
/** SelfKO explosion up duration in seconds. */
export const SELFKO_EXPLODE_UP_DURATION_SEC = 0.25;
/** SelfKO explosion brightness multiplier (phase 2 – flash). */
export const SELFKO_EXPLODE_FLASH_BRIGHTNESS = 3;
/** SelfKO explosion drop-shadow blur radius in pixels (phase 2). */
export const SELFKO_EXPLODE_FLASH_SHADOW_PX = 35;
/** SelfKO explosion color (phase 2 – flash). */
export const SELFKO_EXPLODE_FLASH_COLOR = '#ffffff';
/** SelfKO explosion shrink duration in seconds. */
export const SELFKO_EXPLODE_DOWN_DURATION_SEC = 0.35;
/** SelfKO reset settle duration in seconds. */
export const SELFKO_SETTLE_DURATION_SEC = 0.01;

// --- Special attack animation ---
/** Pulse displacement distance for special attack animation in pixels. */
export const ATTACK_SPECIAL_PULSE_DISTANCE_PX = 15;
/** Special attack scale up factor. */
export const ATTACK_SPECIAL_SCALE = 1.15;
/** Special attack brightness multiplier. */
export const ATTACK_SPECIAL_BRIGHTNESS = 1.4;
/** Special attack pulse duration in seconds. */
export const ATTACK_SPECIAL_DURATION_SEC = 0.2;

// --- Status attack animation ---
/** Status attack rotation offset in degrees (absolute value; direction depends on side). */
export const ATTACK_STATUS_ROTATION_DEG = 12;
/** Status attack scale factor. */
export const ATTACK_STATUS_SCALE = 1.1;
/** Status attack brightness multiplier. */
export const ATTACK_STATUS_BRIGHTNESS = 1.2;
/** Status attack animation duration in seconds. */
export const ATTACK_STATUS_DURATION_SEC = 0.2;

// --- Default attack direction fallback ---
/** Default attack Y direction bias for player side (-0.5 = slightly upward). */
export const ATTACK_DEFAULT_NY_PLAYER = -0.5;
/** Default attack Y direction bias for enemy side (+0.5 = slightly downward). */
export const ATTACK_DEFAULT_NY_ENEMY = 0.5;

// --- Status effect flash on sprite ---
/** Drop-shadow blur radius in pixels when status condition flashes. */
export const STATUS_FLASH_SHADOW_PX = 20;
/** Status flash tween duration in seconds. */
export const STATUS_FLASH_DURATION_SEC = 0.25;
/** Status flash yoyo repeat count. */
export const STATUS_FLASH_REPEAT_COUNT = 3;
/** Status flash peak brightness multiplier. */
export const STATUS_FLASH_BRIGHTNESS = 2;

// --- Pokeball wobble keyframes ---
/** Pokeball shake angle step 1 in degrees. */
export const POKEBALL_WOBBLE_ANGLE_1_DEG = 18;
/** Pokeball shake angle step 2 in degrees. */
export const POKEBALL_WOBBLE_ANGLE_2_DEG = -18;
/** Pokeball shake angle step 3 in degrees. */
export const POKEBALL_WOBBLE_ANGLE_3_DEG = 12;
/** Pokeball shake angle step 4 in degrees. */
export const POKEBALL_WOBBLE_ANGLE_4_DEG = -12;
/** Pokeball shake step 1 duration in seconds. */
export const POKEBALL_WOBBLE_STEP1_SEC = 0.08;
/** Pokeball shake step 2 duration in seconds. */
export const POKEBALL_WOBBLE_STEP2_SEC = 0.16;
/** Pokeball shake steps 3 & 4 duration in seconds. */
export const POKEBALL_WOBBLE_STEP34_SEC = 0.14;
/** Pokeball blink brightness value for capture-success animation. */
export const POKEBALL_BLINK_BRIGHTNESS = 1.8;
/** Pokeball blink hue-rotate angle in degrees for capture-success. */
export const POKEBALL_BLINK_HUE_ROTATE_DEG = -10;
/** Pokeball blink tween duration in seconds for capture-success. */
export const POKEBALL_BLINK_DURATION_SEC = 0.25;
/** Number of repeat cycles for sprite shake during Pokeball wobble. */
export const POKEBALL_SPRITE_SHAKE_REPEAT = 5;

// --- Ball leave / dismiss animation ---
/** Scale factor target for Pokeball leave/dismiss animation. */
export const BALL_LEAVE_SCALE = 0.8;
/** Duration of Pokeball leave/dismiss animation in seconds. */
export const BALL_LEAVE_DURATION_SEC = 0.3;

/** Sparkle enter particle total rotation angle in degrees. */
export const SPARKLE_FULL_ROTATION_DEG = 720;

/** Sparkle enter particle horizontal animation duration in seconds. */
export const SPARKLE_HORIZONTAL_DURATION_SEC = 0.8;

/** Sparkle enter particle fountain-up phase duration in seconds. */
export const SPARKLE_FOUNTAIN_UP_DURATION_SEC = 0.3;

/** Sparkle enter particle fountain-down phase duration in seconds. */
export const SPARKLE_FOUNTAIN_DOWN_DURATION_SEC = 0.5;

/** Map card and aura GSAP animation thresholds and parameters. */
export const MAP_CARD_ANIMATIONS = {
  ENTER_DURATION_SEC: 0.8,
  DISMISS_DURATION_SEC: 0.4,
  HOVER_ENTER_SEC: 0.25,
  HOVER_LEAVE_SEC: 0.35,
  FISHING_BOB_UP_Y: -8,
  FISHING_BOB_DOWN_Y: 2,
  FISHING_ROTATION_UP: 5,
  FISHING_ROTATION_DOWN: -3,
  FISHING_PHASE_DURATION_SEC: 1.32,
  FISHING_RETURN_DURATION_SEC: 1.36,
  ARCHAEOLOGY_SWING_ANGLE_START: 25,
  ARCHAEOLOGY_SWING_ANGLE_END: -15,
  ARCHAEOLOGY_SWING_UP_DURATION_SEC: 0.8,
  ARCHAEOLOGY_SWING_DOWN_DURATION_SEC: 0.15,
  ARCHAEOLOGY_SWING_RESET_DURATION_SEC: 0.35,
  CROWN_SHINE_ROTATION_DURATION_SEC: 10,
  CROWN_SHINE_SCALE_MIN: 0.8,
  CROWN_SHINE_SCALE_MAX: 1.5,
  CROWN_SHINE_OPACITY_MIN: 0.35,
  CROWN_SHINE_OPACITY_MAX: 0.8,
  CROWN_SHINE_BREATHE_DURATION_SEC: 1.8,
  AURA_CYCLE_PERIOD_SEC: 2.0,
  RARE_SPAWN_SCALE_MAX: 1.05,
  ATMOS_SPAWN_SCALE_MAX: 1.08,
  SPAWN_SCALE_UP_DURATION_SEC: 0.4,
  SPAWN_SCALE_DOWN_DURATION_SEC: 0.8,
  LOW_POWER_AURA_SCALE: 2.2,
  STANDARD_AURA_SCALE_MIN: 0.1,
  STANDARD_AURA_SCALE_MAX: 3.375,
  AURA_FULL_CIRCLE_DEG: 360
} as const;

/** Hover strategies available for interactive card elements. */
export const HOVER_EFFECT_VARIANTS = {
  LIFT: 'lift',
  GLOW: 'glow',
  PULSE: 'pulse',
  POP: 'pop',
} as const;

/** Shared UI micro-interaction hover constants. */
export const HOVER_STRATEGIES = {
  SUBMENU_X_OFFSET: 6,
  SUBMENU_DURATION_SEC: 0.1,
  HUD_NAV_SCALE: 1.03,
  HUD_NAV_Y_OFFSET: -1.5,
  HUD_NAV_DURATION_SEC: 0.1,
  HUD_SQ_SCALE: 1.05,
  HUD_SQ_Y_OFFSET: -2,
  HUD_SQ_DURATION_SEC: 0.1,
  POKECENTER_BANNER_SCALE: 1.02,
  POKECENTER_BANNER_Y_OFFSET: -6,
  POKECENTER_BANNER_DURATION_SEC: 0.15,
  PC_BANNER_SCALE: 1.02,
  PC_BANNER_Y_OFFSET: -4,
  PC_BANNER_DURATION_SEC: 0.12,
  CATCH_BALL_SCALE: 1.1,
  CATCH_BALL_ROTATION_DEG: 5,
  CATCH_BALL_DURATION_SEC: 0.25,
  INVENTORY_ITEM_SCALE: 1.08,
  INVENTORY_ITEM_Y_OFFSET: -7,
  INVENTORY_ITEM_DURATION_SEC: 0.12,
  CARD_SCALE: 1.02,
  CARD_Y_OFFSET: -3,
  CARD_DURATION_SEC: 0.12,
  SHOP_CARD_SCALE: 1.02,
  SHOP_CARD_Y_OFFSET: -6,
  SHOP_CARD_DURATION_SEC: 0.15,
  ROW_X_OFFSET: 4,
  ROW_DURATION_SEC: 0.2,
  HUD_PILL_SCALE: 1.03,
  HUD_PILL_Y_OFFSET: -1.5,
  HUD_PILL_DURATION_SEC: 0.15,
  AVATAR_CONTAINER_SCALE: 1.1,
  AVATAR_CONTAINER_Y_OFFSET: -2,
  AVATAR_CONTAINER_DURATION_SEC: 0.2,
  BADGE_ICON_SCALE: 1.3,
  BADGE_ICON_DURATION_SEC: 0.12,
  MAIN_SPRITE_SCALE: 1.05,
  MAIN_SPRITE_Y_OFFSET: -5,
  MAIN_SPRITE_DURATION_SEC: 0.2,
  EDIT_NICK_SCALE: 1.2,
  EDIT_NICK_DURATION_SEC: 0.12,
  INFO_ITEM_SCALE: 1.02,
  INFO_ITEM_Y_OFFSET: -2.5,
  INFO_ITEM_DURATION_SEC: 0.15
} as const;

/** Modal initial scale factor for open animation. */
export const MODAL_ANIM_INITIAL_SCALE_MIN = 0.8;

/** Modal initial Y offset in pixels for open animation. */
export const MODAL_ANIM_INITIAL_Y_OFFSET = 20;
