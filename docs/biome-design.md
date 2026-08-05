# Husky Hearts — Biome Design Bible

A per-biome design reference for the eight-environment campaign. Biome 1 is the cozy
tutorial that already ships; from Biome 2 on, the game grows into a real RPG, each
environment adding one or two signature systems on top of the last.

This doc is **design intent**, not a build spec — but every idea is written to sit on the
game's existing, data-driven seams so it can be implemented incrementally:

- **Levels** are declared in [`src/config/levels.json`](../src/config/levels.json) and built
  generically by [`levels/from-config.js`](../src/levels/from-config.js); terrain/decoration
  are named code hooks (`TERRAIN` / `AUGMENTS` in `levels/index.js`).
- **Quests** are one entry per type in `Quests.TYPES`
  ([`src/quests.js`](../src/quests.js)); today `give` + `greet` exist.
- **Actors** (enemies, NPCs, critters, hazards) are `Entities.register(kind, …)`
  ([`src/entities/`](../src/entities/)).
- **Abilities** live in the per-breed Mastery tree, unlocked at the first boss; the **R /
  Ultimate** slot is reserved and not yet used.
- **Loot / XP** are tuned in [`src/config/loot.json`](../src/config/loot.json); **gear** is
  item `mods` in [`src/config/items.json`](../src/config/items.json).

---

## The campaign arc

| # | Biome | Icon | Boss | Emotional beat | Headline system introduced |
|---|-------|------|------|----------------|----------------------------|
| 1 | Sunny Meadows | 🌳 | The Badger Baron | *Learn & befriend* | The basics (collect, cheer, greet, dig, shop) — **abilities awaken at the boss** |
| 2 | Rocky Mountains | ⛰️ | The Alpha Wolf | *The world bites back* | **Real combat** + **Exposure/warmth** meter |
| 3 | Whispering Woods | 🌲 | The Old Grizzly | *Fear of the dark* | **Status effects** + **night/light** + **quest chains** + the **Ultimate (R)** unlock (a shrine quest) |
| 4 | Seashell Cove | 🏖️ | The Giant Hermit Crab | *Play & discovery* | **Tides** (the map changes) + **diving** traversal |
| 5 | Amber Orchard | 🍂 | The Scarecrow King | *Harvest & home* | **Cooking/crafting** + a **hub town** + **reputation** |
| 6 | Golden Dunes | 🏜️ | The Sand Serpent | *Endure & uncover* | **Hunger/thirst survival** + **puzzle ruins** + **relics** (trinkets) |
| 7 | Frostfang Tundra | ❄️ | The Ice Yeti | *Cold & scarcity* | **Campfire/warmth economy** + **elite enemies** + **rare materials** |
| 8 | Cloud Kingdom | ☁️ | The Storm Eagle | *Ascension & climax* | **Verticality/gliding** + the **final gauntlet** (all systems combined) |

**Pacing rule:** each biome teaches its new system in level 1, complicates it in level 2,
tests it in level 3, and pays it off in the boss. Never introduce two headline systems in
the same biome — cozy games earn their depth slowly.

---

## Recurring cast (continuity across biomes)

A few faces travel with the player so the world feels lived-in:

- **Marla the Merchant** 🧺 — the wandering general-goods trader. Appears in every biome's
  first level with wares that scale to the region. Her running gag: she always beats you to
  the next biome ("Oh, you made it! I set up shop days ago.").
- **Fenwick the Tailor** 🧵 — gear/wearables merchant; from Biome 2 he sells the region's
  protective gear (warm coats, sun hats, etc.) and later *upgrades* your gear.
- **Pip the Postpigeon** 🕊️ *(new, Biome 3+)* — carries **delivery quests** between biomes
  and hints at what's ahead; the connective tissue of quest chains.
- **The Keeper** 🦉 *(new, Biome 5+)* — a lore owl at the hub town who unlocks the
  **journal/bestiary** and gives the main storyline beats.

Local NPCs (below) are unique to their biome and rarely reappear.

---

## New systems glossary

Concise notes on the mechanics the campaign introduces, and where each hangs on the code.

- **Real combat (B2).** Abilities are already gated to unlock at Boss 1; Biome 2 is the
  first place they *matter*. Enemies gain simple archetypes (chaser, pack-hunter, ranged,
  ambusher) via new `Entities.register` kinds. Add an **aggro/threat** notion so packs
  coordinate loosely.
- **Ultimate (R) ability.** Wire the reserved third ability slot. One high-impact,
  long-cooldown move per breed (Dinno: a stationary thunderstorm; Lolla: a cannon barrage;
  Ťapka: a frenzy). Unlocked **not by a boss but by a special quest in Biome 3** — *"The
  Moonlit Rite"* at Firefly Grove — so power milestones alternate between combat (Q/E from
  Boss 1) and story (the Ultimate from a quest). Implement it exactly like the existing
  ability gate: an `ultimateUnlocked` flag on the player (saved) that the R slot checks, set
  when that quest completes, with an "Ultimate Awakened!" tip mirroring "Abilities Awakened!".
- **Status effects (B3).** Generalize the existing `e.fearedT` timer into a small status
  system on both dogs and entities: `poisoned`, `chilled/slow`, `soaked`, `burning`,
  `stunned`. Each is a timer + a per-tick hook + an HUD icon. Wearables and consumables can
  grant resistance.
- **Environmental meters (B2 warmth, B6 hunger/thirst, B7 cold).** A small HUD gauge that
  drains over time or in a zone and is refilled by items/fires. Reaching empty applies a
  debuff (slow, chip damage), never instant death — keep it cozy. One reusable "meter"
  component, themed per biome.
- **Tides / cycles (B4).** A level-level time cycle that toggles terrain (water in/out,
  paths open/close). Reuses the seeded, deterministic generation: the cycle is a function of
  a clock, so it's save-safe.
- **Cooking/crafting (B5).** Combine gathered ingredients at a campfire/cookpot into
  consumables (better heals, temporary buffs). Recipes are pure data, like loot tables.
- **Reputation & hub (B5).** A small home town you return to between biomes; helping locals
  raises reputation that unlocks shop stock, gear upgrades, and cosmetic town growth.
- **Relics/trinkets (B6).** A new equipment slot for **active** artifacts (short-cooldown
  effects: a dash-dodge, a decoy, a lantern) — distinct from stat-only wearables.
- **Verticality/gliding (B8).** Height/jump or a glide toggle for sky platforming; the
  capstone traversal mechanic.

---

## 1 · Sunny Meadows 🌳 — *Learn & befriend*
**Boss:** The Badger Baron · **Palette:** spring greens (`#9ED87A`), wildflower pastels, warm dirt.

The tutorial, and it stays cozy on purpose: no combat, no danger you can't walk away from.
(Already implemented — documented here for completeness and as the tone anchor.)

- **Theme & mood.** A sun-dappled patchwork of meadows and orchards. Everyone is lonely and
  kind; the whole biome is about *approaching* the world, not fighting it.
- **Levels.**
  - *Sunny Meadow* — pure basics: wander, collect treats, cheer lonely friends. No NPCs.
  - *Wildflower Field* — introduces shops, the first fetch quest, and friendly critters to
    **greet** (ducks, squirrels).
  - *Old Orchard Path* — eases toward danger: a single slow badger you *cannot* kill (a
    teaching moment — abilities are still dormant), the first locked chest, both merchants.
- **NPCs.** Marla (shop), Nella the Nurse (fetch quest), Wade & Acorn (greet quests).
- **Quests.** `give` (bring bones), `greet` (say hi to the wildlife). All optional; clearing
  a level is always "cheer every friend."
- **Boss — The Badger Baron.** *(implemented — first build.)* A fight you win with your
  **wits, not your teeth**: your abilities don't awaken until *after* this den, so the Baron
  literally can't be damaged. He's all brawn — he **telegraphs a charge** and barrels in a
  straight line — and the meadow is dotted with leaf-covered **pit traps**. Line a covered pit
  up between you and him, bait the charge, and he crashes in, losing a third of his bluster;
  **three sprung pits** and he yields. He can still shoulder-barge *you*, so losing is the
  normal cozy Game Over → Play Again. Reuses the boss framework (HP bar, knockback-resist,
  defeat banner, loot/XP) but is won by a trap-fall, not a hit; being the meadow's final level
  it drops the biome-finale golden chest, and stepping through the exit portal is the moment
  your abilities **awaken** (world-map.js), the doorway to the real game. *(Deferred: a bespoke
  den arena — it reuses the meadow terrain — and a distinct multi-attack move-set.)*
  *New code:* `entities/badgerbaron.js`, `entities/pittrap.js`, the `trap` clear objective, and
  the `badgerbaron` loot table.
- **Signature.** Teaching the verbs — and the deliberately withheld promise of power.

---

## 2 · Rocky Mountains ⛰️ — *The world bites back*
**Boss:** The Alpha Wolf · **Palette:** slate greys, turquoise glacial lakes, evergreen, first snow.

The tone flips. You have abilities now, and for the first time the world expects you to use
them. **This is where the RPG starts.**

- **Theme & mood.** A high, beautiful, indifferent wilderness. Cold, thin air, and a wolf
  pack that treats you as prey. Wonder laced with real stakes.
- **Visual identity.** Snow-veined peaks, cascading waterfalls into turquoise lakes, log
  fences, campfires as safe havens. Snow begins to streak the ground in level 3.
- **Levels.**
  - *Rocky Mountains* — first true combat: a wolf or two, wide-open ground to learn kiting
    and cooldowns. A ranger NPC explains hearts, fleeing, and fighting back.
  - *Frozen Pass* — introduces the **Exposure/warmth** meter: away from fire and sun you
    chill (a slow debuff); campfires and a new "warm coat" wearable restore it. Narrow paths
    force you past a coordinated pack.
  - *Cliffside Climb* — verticality-lite: switchback ledges, falling-rock hazards, a gauntlet
    of enemies before the summit. Rewards a silver/gold chest.
  - **Boss — The Alpha Wolf.** The first *real* boss fight: a large wolf plus two summoned
    pack-mates, telegraphed lunges, a "howl" that buffs the pack (interrupt it). Defeating it
    opens the pass onward and drops the biome's first strong gear (a warm cloak / signature
    wearable) — a milestone of *survival*, with new **power** saved for the woods quest ahead.
- **NPCs.** Rusk the Ranger (gear + survival tips, recurring mentor), Marla (now stocking
  warm gear + healing), a stranded climber to rescue (first **escort**-flavored moment).
- **Quests.** New type **`defeat`** ("thin the pack — drive off 3 wolves"); `give` (bring
  firewood to relight a camp) that ties into the warmth meter.
- **Enemies & hazards.** Wolves (fast pack-hunters), falling rocks, cold zones, thin ice.
- **New features.** Combat that matters · **Exposure/warmth meter** · first **status effect**
  (`chilled/slow`) · a strong gear reward from the boss.

---

## 3 · Whispering Woods 🌲 — *Fear of the dark*
**Boss:** The Old Grizzly · **Palette:** deep mossy greens, bioluminescent teal/violet, lantern amber.

An ancient forest that plays with light and dread. The first biome with a real *atmosphere*
of tension rather than open danger.

- **Theme & mood.** Towering trees, hush and creaks, eyes in the dark. Not cruel — but
  watchful. A place of secrets and old magic.
- **Visual identity.** A **darkness overlay** with a soft light radius around the dog;
  glowing mushrooms, fireflies, and lanterns punch holes in the gloom. Drifting spores.
- **Levels.**
  - *Mossy Trail* — introduces **light & darkness**: your vision is a circle; fireflies and
    lanterns extend it. Enemies detect you less in shadow (stealth depth on the existing
    noise/detection system).
  - *Fungus Hollow* — introduces **`poisoned`** status from spore clouds and toadstool
    enemies; an alchemist NPC sells antidotes and teaches resistances. A branching layout —
    the first level that isn't a single arena.
  - *Firefly Grove* — a gorgeous, secretly-**stealth** breather built around the biome's
    signature quest, **"The Moonlit Rite"**: guide fireflies to relight the three ancient
    shrine lanterns (avoiding a patrolling threat between them). Completing the rite
    **awakens your dog's Ultimate (R)** — the biome's *power* milestone, echoing how the
    Badger Baron's den awakened Q/E. It's a story beat, not a boss drop.
  - **Boss — The Old Grizzly.** A slow, immense bear that guards the grove. Phases: it sleeps
    (sneak past hazards to reach vulnerable moments), wakes enraged, then a final stand.
    Rewards a light-source relic preview.
- **NPCs.** Bramble the Alchemist (status cures/crafting seeds), a lost cub (**escort**
  quest — protect it back to its den), Pip the Postpigeon debuts (cross-biome delivery), and
  the **Grove Guardian** — an old forest spirit at the shrine who sets *"The Moonlit Rite"*
  and awakens your Ultimate when it's done.
- **Quests.** New types **`escort`** (protect an NPC along a path) and the first **quest
  chain** (a three-step Alchemist storyline across the three levels). `fetch-from` (retrieve
  a rare mushroom guarded by enemies). And the headline **"The Moonlit Rite"** at Firefly
  Grove — a `greet`/`fetch`-flavored shrine ritual (relight the three lanterns) whose reward
  is the **Ultimate (R)** unlock, the biome's climactic moment.
- **Enemies & hazards.** Toadstool spitters (ranged, apply poison), shadow-lurkers (only
  aggressive in the dark), spore clouds, brambles that slow.
- **New features.** **Status-effect system** (poison/slow) · **night/light & stealth** ·
  **multi-step quest chains** · recurring courier NPC · the **Ultimate (R)** unlock via
  *"The Moonlit Rite"*.

---

## 4 · Seashell Cove 🏖️ — *Play & discovery*
**Boss:** The Giant Hermit Crab · **Palette:** sand golds, aqua shallows, coral pinks, driftwood.

A bright exhale after the woods — but its gimmick is that **the level physically changes**
around you.

- **Theme & mood.** Sun, surf, and treasure. Playful and generous, with a rhythm you learn
  to read. The cove *breathes* with the tide.
- **Visual identity.** Wet-sand sheen, tide lines, boardwalks, palms, coral gardens visible
  underwater. A subtle **tide clock** on the HUD.
- **Levels.**
  - *Tide Pools* — introduces the **tide cycle**: every ~90s the water advances and retreats,
    opening/closing paths and revealing shells & buried chests only at low tide.
  - *Palm Boardwalk* — a festival-ish stretch of shops and mini-goals; introduces **`deliver`**
    quests (carry a fragile item between stalls before it "spoils" — a soft timer).
  - *Coral Sands* — introduces **diving**: dedicated deep water where you submerge to collect
    pearls and dodge jellyfish, upgrading the existing swim mechanic into real traversal.
  - **Boss — The Giant Hermit Crab.** An arena boss tied to the tide: it's armored (shell)
    at high tide and vulnerable at low tide, so you fight the *clock* as much as the crab.
    Lure it to smash its own shell on rocks.
- **NPCs.** Shelly the Beachcomber (trades shells for rare loot — a **secondary currency**),
  a lifeguard gull, Marla's beach stall.
- **Quests.** `deliver` (timed, gentle), `fetch-from` (dive for a specific pearl), a tide-
  timed treasure hunt.
- **Enemies & hazards.** Jellyfish (contact = `soaked`/slow), snapping crabs, riptides,
  rising tide that can strand you.
- **New features.** **Tide/environment cycle** that reshapes levels · **diving** traversal ·
  a **secondary currency** (shells) preview of the economy layer.

---

## 5 · Amber Orchard 🍂 — *Harvest & home*
**Boss:** The Scarecrow King · **Palette:** amber, russet, pumpkin orange, hay gold, dusk purple.

Autumn, harvest, and the first sense of *belonging somewhere*. The midpoint that turns a
journey into a home.

- **Theme & mood.** Golden-hour orchards, hay bales, cider steam, a friendly harvest festival
  with an uncanny edge after dark (living scarecrows). Warm, but the nights lengthen.
- **Visual identity.** Falling leaves, long shadows, jack-o'-lanterns, a **hub town** with
  lit windows that grows as you help it.
- **Levels.**
  - *Pumpkin Patch* — introduces **gathering & cooking**: harvest ingredients (pumpkin,
    apples, herbs) and cook at a pot into buff foods (temporary speed, regen, warmth).
  - *Haybale Maze* — a proper **maze/puzzle level**: line-of-sight hide-and-seek with
    scarecrow patrols; levers open gates. First level built around navigation, not an arena.
  - *Cider Mill* — a working level with a **timed production** minigame (keep the mill
    running / press cider) that funds the town; introduces **reputation**.
  - **Boss — The Scarecrow King.** A theatrical, multi-phase fight: summons straw minions,
    a fire-hazard phase (torch the fields), a "steal your buff-food" mechanic that rewards
    good cooking. Beating it graduates the hub town to full size.
- **NPCs.** The Keeper (lore owl, opens the **journal/bestiary**), a town of named locals
  with reputation-gated stock, Fenwick now **upgrades** gear here.
- **Quests.** New type **`gather`/`cook`** (bring N ingredients, cook a dish), **reputation**
  quests (help 3 townsfolk), a `timed` mill-repair. Quest chains that build the town.
- **Enemies & hazards.** Scarecrows (dormant by day, hostile at night), crow swarms, field
  fires, hay-bale line-of-sight.
- **New features.** **Cooking/crafting** · a returnable **hub town** · **reputation** system
  · **journal/bestiary** · gear **upgrades**.

---

## 6 · Golden Dunes 🏜️ — *Endure & uncover*
**Boss:** The Sand Serpent · **Palette:** sun-bleached golds, terracotta ruins, oasis teal, dusk rose.

The harshest environment so far, and the most mysterious. Survival meets archaeology.

- **Theme & mood.** Endless dunes, ancient half-buried ruins, mirages, a sleeping serpent
  legend. Beautiful and punishing; water is life.
- **Visual identity.** Heat-shimmer, blowing sand, sunbeaten stone glyphs, a bright oasis
  jewel in the middle. Day/night matters (scorching noon, cold night).
- **Levels.**
  - *Dune Sea* — introduces the **hunger/thirst** survival meter: heat drains you; shade,
    the oasis, and canteens refill it. **Sandstorms** periodically cut visibility (reuses the
    darkness overlay tech) and push you off course.
  - *Hidden Oasis* — a lush safe haven and social hub: caravan traders, a **relic vendor**,
    and the intro to **relics/trinkets** (active artifacts in a new equipment slot).
  - *Ancient Ruins* — the first true **puzzle dungeon**: pressure plates, light-beam
    redirection, key-glyph doors, trapped corridors. Combat is secondary to solving.
  - **Boss — The Sand Serpent.** A burrowing arena boss: it dives under the sand (telegraphed
    mounds), erupts, and you use ruins/relics to expose and stagger it. Rewards a signature
    relic.
- **NPCs.** A nomad caravan (rotating stock), an archaeologist (**puzzle** quest chain),
  the relic vendor.
- **Quests.** New type **`puzzle`/`solve`** (activate the mechanism), survival-flavored
  fetch ("bring water to a stranded traveler before dusk"), relic-hunt chain.
- **Enemies & hazards.** Scarab swarms, ruin sentinels (ranged), quicksand, heatstroke,
  sandstorms, trapped tiles.
- **New features.** **Hunger/thirst survival** · **puzzle dungeons** · **relics/trinkets**
  (active-item slot) · weather (sandstorm) as a gameplay layer.

---

## 7 · Frostfang Tundra ❄️ — *Cold & scarcity*
**Boss:** The Ice Yeti · **Palette:** icy whites & blues, aurora greens/violets, deep-shadow indigo.

The endgame's proving ground: every prior system turned up, with scarcity as the theme.

- **Theme & mood.** A vast, silent, killing cold — awed and lonely. Survival is constant;
  the aurora is a rare mercy of beauty. This is where mastery is expected.
- **Visual identity.** Blizzard whiteouts, glassy ice, breath fog, the aurora painting the
  sky, glacial caves glowing from within.
- **Levels.**
  - *Icy Flats* — the **warmth economy** matures: you must *build/relight* campfires from
    gathered wood to cross; **blizzards** whiteout the map on a cycle. Slippery ice movement.
  - *Aurora Fields* — a hauntingly beautiful stealth-survival stretch; **elite enemies**
    debut (frost wolves that are tougher, have status attacks, and drop **rare materials**).
  - *Glacier Cave* — an interior level: dark ice caverns (light matters again), thin-ice
    puzzles, crystalline treasure, an ambush gauntlet before the summit.
  - **Boss — The Ice Yeti.** A heavy, arena-shaking brawler: ground-pound shockwaves, an
    "encase in ice" mechanic (break free), an enrage in a blizzard phase where warmth
    management and your Ultimate decide the fight.
- **NPCs.** A hermit at a lone cabin (best crafting recipes, rare-material trades), Rusk the
  Ranger returns for a callback, a frozen traveler to thaw and rescue.
- **Quests.** `defeat` (elite hunts), `gather` (rare materials for endgame gear),
  survival-chain ("keep the beacon lit through the night").
- **Enemies & hazards.** Frost wolves (elite), ice sprites (ranged, `chilled`), crevasses,
  blizzards, thin ice, avalanches.
- **New features.** **Warmth/fire economy** as a core loop · **elite enemies** & **rare
  crafting materials** · endgame gear tier · weather (blizzard) pushed to its peak.

---

## 8 · Cloud Kingdom ☁️ — *Ascension & climax*
**Boss:** The Storm Eagle · **Palette:** lavender/periwinkle skies, gold sun-shafts, white cloud, storm slate.

The finale. Everything the player has learned, in the sky, culminating in the campaign's
climactic fight.

- **Theme & mood.** Weightless wonder turning to a storm-lashed showdown. Triumphant and
  epic — the payoff for the whole journey.
- **Visual identity.** Floating stone isles and cloud platforms, sunbeams, wind streaks,
  waterfalls into nothing, a darkening storm gathering toward the peak.
- **Levels.**
  - *Sky Steps* — introduces **verticality/gliding**: hop between rising cloud platforms;
    updrafts and wind gusts that push you. Falling is a soft reset, never a death.
  - *Floating Isles* — a hub-like sky archipelago that combines *everything*: combat, a
    puzzle bridge, a survival stretch (wind chill), and shops — a victory-lap of systems.
  - *Storm Peak* — the gauntlet: a linear ascent through wind, ranged sky-sprites, and
    platforming under a building storm, straight to the summit.
  - **Boss — The Storm Eagle.** The grand multi-phase finale: aerial phases (dodge dives &
    lightning across platforms), a grounded phase, and a final storm crescendo that demands
    Ultimate, relics, gear, and everything the campaign taught. Victory = the credits beat.
- **NPCs.** The full recurring cast makes a cameo send-off (Marla, Fenwick, Rusk, Pip, the
  Keeper) at a sky-market before the peak.
- **Quests.** A capstone chain that revisits earlier NPCs' threads; optional `defeat`/`puzzle`
  challenge rooms for legendary gear.
- **Enemies & hazards.** Sky-sprites (ranged), wind gusts, lightning strikes, collapsing
  platforms, the storm itself.
- **New features.** **Verticality/gliding** traversal · a **final-boss gauntlet** structure ·
  **legendary gear** tier · narrative payoff / credits.

---

## Boss design principles

Bosses are the spine of the RPG feel. Guidelines:

- **Every boss teaches or tests the biome's system.** Hermit Crab = tides; Yeti = warmth;
  Eagle = everything.
- **Multi-phase, telegraphed, interruptible.** Readable wind-ups; a punish window; one
  "mechanic" to respect (a howl to interrupt, a shell to break, ice to escape).
- **Unlock beats.** Boss 1 → Q/E abilities (done). The **Ultimate (R)** unlocks via a
  special **quest** in Biome 3 (*"The Moonlit Rite"*), *not* a boss — power milestones
  alternate between combat and story so neither track owns all the rewards. Bosses gate the
  next biome and drop signature gear / **relics**.
- **Cozy failure.** Losing a boss sends you back to the biome entrance with your gear, not a
  brutal restart — this is a warm game with teeth, not a soulslike.

## Difficulty & economy curve

- **Enemies:** wander-only (B1) → chasers/packs (B2) → status/ranged (B3) → environmental
  (B4) → puzzle-adjacent (B5–6) → elites (B7) → aerial gauntlet (B8).
- **XP:** already nerfed so B1 ends ~level 3. Target ~level 5 entering B3, ~level 10 by B5,
  ~level 15–20 by B8 (mastery points at every 5th level pace ability growth to match).
- **Gear/currency:** treats (universal) → shells (B4) → reputation stock (B5) → rare
  materials (B7) → legendary (B8). Each biome's chests roll region-appropriate loot tables.

## Implementation order (suggested)

1. **Biome 2 first** — it's the "RPG starts" hinge: real combat tuning, the first
   environmental meter, one status effect. (Wire the **Ultimate/R slot's plumbing** here too,
   but leave it gated behind an `ultimateUnlocked` flag — it's actually unlocked by *"The
   Moonlit Rite"* quest in Biome 3.) Everything after reuses these.
2. Then **status effects (B3)** and the **quest-chain / new quest types** framework, since
   most later biomes lean on them.
3. **Environmental cycle (B4 tides)** and the **meter/weather** components generalize to
   B6–B7.
4. **Hub + reputation + cooking (B5)** as the mid-game connective layer.
5. **Puzzles/relics (B6)**, **elites/materials (B7)**, **verticality/finale (B8)** last.

Each is additive and data-driven: a new biome is mostly new `levels.json` entries + a few
new `Entities.register` kinds + (occasionally) one new `Quests.TYPES` entry — the same shape
the first biome already proves out.
