# Level Design — Biomes 4–8 (Cove · Orchard · Dunes · Tundra · Sky)

Deep, level-by-level design for the twelve non-boss levels and five bosses of the campaign's
back half: **Seashell Cove** 🏖️, **Amber Orchard** 🍂, **Golden Dunes** 🏜️, **Frostfang Tundra** ❄️,
and **Cloud Kingdom** ☁️. Companion to [`biome-design.md`](./biome-design.md) — that doc sets each
biome's theme and the system arc; this one lays out each level concretely enough to build, exactly
like [`level-design-b2-b3.md`](./level-design-b2-b3.md) does for biomes 2–3.

Every level is grounded in the existing data-driven pipeline: a `levels.json` entry
(terrain/augment by name, friends, npcs, enemies, critters, chests, quest) built generically by
[`levels/from-config.js`](../src/levels/from-config.js) `generate()`, plus a few new **code hooks**
flagged per level (a named `TERRAIN`/`AUGMENTS` builder in `levels/*.js`, `Entities.register` kinds,
a `QUEST_TYPES` win-type or a `Quests.TYPES` NPC quest, an item in `items.json`, or one new HUD/system
component). New clear-objectives are new `QUEST_TYPES` entries (a `describe()` + `isComplete()`),
exactly like `cheer-all`/`kindle`/`ritual`/`defeat`/`fetch-from`/`trap` today.

**Pacing recap** (from the bible): each biome introduces *one* headline system — Cove = **tides +
diving**, Orchard = **cooking + hub/reputation**, Dunes = **survival meter + puzzles + relics**,
Tundra = **matured warmth economy + elites**, Sky = **verticality/gliding + the finale**. A level
*introduces* its mechanic (L1), *complicates* it (L2), *tests* it (L3) into the boss.

**Per-level template:** Role · Theme & mood · Map & layout · Objective (+ side quests) · NPCs ·
Enemies & hazards · Critters & friends · Chests & loot · Features · Config sketch.

**Campaign wiring:** the real content currently ends at `woods-boss` (`next:null`). Shipping Biome 4
means pointing **`woods-boss.next → 'cove-1'`**, adding the twelve+five `levels.json` entries, flipping
the matching [`campaign.js`](../src/data/campaign.js) placeholders to `real:true`, and chaining
`cove-1 → … → cove-boss → orchard-1 → … → sky-boss` (with `sky-boss.next:null`). The finale of each
biome drops the golden-chest portal via `isFinalRealLevel` until the boss is built, then the boss
gates the next biome (same as Rocky/Woods today).

**Recurring cast** rides along per the bible: **Marla** (general goods, every biome's L1), **Fenwick**
(gear/upgrades), **Pip the Postpigeon** (`deliver` chains), and **the Keeper** 🦉 (debuts at the
Orchard hub; opens the journal/bestiary). **Economy curve:** treats (universal) → **shells** (B4) →
**reputation stock** (B5) → **relics** (B6) → **rare materials** (B7) → **legendary** (B8); XP targets
~L10 by end of B5, ~L15–20 by B8.

---

# Biome 4 · Seashell Cove 🏖️ — *Play & discovery*
**Boss:** The Giant Hermit Crab · **Palette:** sand golds (`#F0D9A8`), aqua shallows, coral pinks,
driftwood. A bright exhale after the woods — but the level physically **breathes with the tide**.

**Headline system — the tide cycle.** A level-level clock (`Tide.phase(t)` ∈ high↔low over ~90s) that
toggles which water bodies are passable and which sand/chests are exposed. Because world generation is
already seeded and deterministic (`level-manager.js` opens a seeded window around `generate()`), the
tide is a *pure function of a clock*, so it's save-safe: on reload you recompute the phase, not store
it. A small **tide clock** rides the HUD (a new gauge like the warmth meter). **Diving** upgrades the
existing swim (`update.js` `p.swimming` + the breed `swim` passive): dedicated **deep water** lets you
submerge to collect pearls and dodge jellyfish. **Shells** are a new secondary currency spent at
Shelly the Beachcomber.

## 4·1 — Tide Pools
- **Role.** Introduce the **tide cycle**: paths open and close, and shells/chests appear only at low tide.
- **Theme & mood.** Sun-warmed rock pools and wet-sand sheen; gulls, a gentle surf rhythm you learn to read.
- **Map & layout.** An open shore (~2000×1400) split by a broad **tidal channel**. At **high tide** the
  channel is deep water (a wall to walkers, a lane to divers); at **low tide** it drains to crossable
  wet sand revealing buried chests and a shell field. Rock-pool ponds dot the flats. Campfire-equivalent
  "dry rock" havens never flood.
- **Objective.** Keep the cozy spine — **cheer the shore friends** (5 lonely animals). *New side:* a
  **tide-timed treasure hunt** — dig 3 buried chests exposed only at low tide (teaches reading the clock).
- **NPCs.** **Marla's beach stall** (biscuits, a sun hat); **Shelly the Beachcomber** (trades **shells**
  for rare loot — the currency intro); a **lifeguard gull** with a greeting.
- **Enemies & hazards.** 1–2 **snapping crabs** (slow shore chasers); **riptide** zones in deep water
  that shove you; the **rising tide** itself can briefly strand you off the havens.
- **Critters & friends.** Gulls, a hermit-crablet, a lounging seal (greet); the 5 friends tucked around
  the pools (one only reachable at low tide).
- **Chests & loot.** wooden / iron / iron / silver — the silver buried in the channel (low-tide only).
  Loot: sun hat, shells, biscuits.
- **Features.** **Tide cycle** (terrain toggles on a clock) · **shell** currency preview · the tide **HUD clock**.
- **Config sketch.** `terrain:"tidepools"` *(new `TERRAIN` builder that tags water bodies with a `tidal`
  flag the tide system flips)*; `friends:[…5, one at a low-tide `fx/fy`]`; `npcs:[Marla, Shelly, gull]`;
  `enemies:[{kind:"crab",…}×2]` *(new kind)*; `chests:["wooden","iron","iron","silver"]`;
  `quest:{type:"cheer-all", label:"Cheer the shore friends"}`. *New hooks:* the **tide** system
  (`Tide.phase` + a `tidal` terrain tag + HUD clock), `Entities.register` `crab`, and a `shell`
  collectible/item in `items.json`. `next:"cove-2"`.

## 4·2 — Palm Boardwalk
- **Role.** A festival stretch of shops and mini-goals; introduces the **`deliver`** (soft-timer) quest.
- **Theme & mood.** Boardwalk planks, palms, bunting, food stalls — playful and generous.
- **Map & layout.** A long boardwalk spine (~2200×1200) over shallow water, branching to stall clusters;
  a couple of plank bridges gate movement. Less tide-dominated (this level is about the delivery loop).
- **Objective.** **New clear type `deliver`** — carry a **fragile item** (an ice-cream, a fish platter)
  between stalls before it "spoils" (a gentle countdown; failure just resets, never punishes). Side:
  cheer 2 stall-keepers.
- **NPCs.** **Pip the Postpigeon** returns setting the boardwalk deliveries; **Fenwick** (a beach cape,
  flippers preview); named stall vendors.
- **Enemies & hazards.** Thieving gulls that bump the fragile item (drop it → restart the timer);
  slippery wet planks; a snapping crab under the boardwalk.
- **Critters & friends.** Buskers, a ukulele otter (greet), boardwalk cats.
- **Chests & loot.** iron / silver; one on a stall roof (a small climb). Loot: flippers (dive aid), shells.
- **Features.** **`deliver`** soft-timer quest · first stall-economy stretch · shell sinks.
- **Config sketch.** `terrain:"boardwalk"` *(new — plank platforms + shallow water, no river)*;
  `npcs:[Pip{quest:{type:"deliver",item:"icecream",…}}, Fenwick, vendors]`; `enemies:[{kind:"crab",…}]`;
  `chests:["iron","silver"]`; `quest:{type:"deliver", label:"Run the boardwalk orders"}`. *New hooks:*
  `QUEST_TYPES["deliver"]` (carry `item` to a marked NPC before `spoilMs`; a per-level timer + HUD pip),
  a `deliver`-flavored `Quests.TYPES` for Pip's chain, `icecream`/`flippers` items. `next:"cove-3"`.

## 4·3 — Coral Sands
- **Role.** Introduce **diving** as real traversal; test the tide before the boss.
- **Theme & mood.** Turquoise shallows over a coral garden; light dapples the seabed. Serene, then jelly-lit tension.
- **Map & layout.** A wide lagoon (~2200×1500) of **deep-water** basins (dive zones) ringed by sand
  bars that the tide raises and lowers. Pearls sit on the seabed; a sunken **coral maze** hides the
  golden chest, reachable only diving at the right tide.
- **Objective.** **`fetch-from`** (reuse) — retrieve **3 pearls** from the deep and surface them. Side:
  cheer 2 reef friends; a tide-timed shortcut.
- **NPCs.** Shelly's reef stall (spend shells for a pearl-diver's charm); a stranded turtle to guide home
  (escort-flavored).
- **Enemies & hazards.** **Jellyfish** (contact = `soaked`/slow — reuse the `status` system with a new
  `soaked` DEF, or reuse `slow`); riptides; a lurking crab. Staying under too long isn't lethal (cozy) —
  it just surfaces you.
- **Critters & friends.** Clownfish schools (ambient), a dolphin (greet), sea otters.
- **Chests & loot.** silver / **golden** (in the coral maze, diving). Loot: pearl-charm, feasts for the boss.
- **Features.** **Diving** traversal · `soaked`/slow status · tide-gated deep routes.
- **Config sketch.** `terrain:"coralsands"` *(new — deep-water basins tagged `deep` for diving + `tidal`)*;
  `enemies:[{kind:"jellyfish",…}×n, {kind:"crab",…}]`; `mooncap`-style pearl pickups via
  `quest:{type:"fetch-from", item:"pearl", label:"Bring up 3 pearls"}`; `chests:["silver","golden"]`.
  *New hooks:* a `deep`-water dive mode in `update.js` (submerge in `deep` zones), `Entities.register`
  `jellyfish`, `Status.DEFS.soaked` (or reuse `slow`), a `pearl` pickup. `next:"cove-boss"`.

## Boss · The Giant Hermit Crab
- **Role.** Pay off the tide — you fight the **clock** as much as the crab.
- **Fight.** An arena boss ringed by rocks. At **high tide** it withdraws into an armored **shell**
  (invulnerable, only shoulder-charges); at **low tide** the shell is exposed and vulnerable. It
  telegraphs a **claw-sweep** and a **shell-charge** — **lure the charge into the arena rocks** to crack
  the shell (an environmental punish, echoing the Badger Baron's pits), then damage it during the low
  window. Below a third it panics, churning the tide faster. Cozy failure → Play Again.
- **Config sketch.** `terrain:"coralsands"` (reused arena, tidal on); `enemies:[{kind:"hermitcrab",
  maxHp:52}]`; `quest:{type:"defeat", label:"Crack the Hermit Crab's shell"}`; drops a **diving relic**
  preview + the biome-finale golden chest. *New hooks:* `Entities.register` `hermitcrab` (boss framework
  — `boss:true`, HP bar, telegraphed claw/charge, tide-gated armor; reuse `groundzone` for the sweep),
  add `hermitcrab` to `_ENEMY_KINDS` and `LOOT_DATA.enemies`. `next:"orchard-1"`.

**Biome-4 net-new code:** the **tide** system (clock + `tidal`/`deep` terrain tags + HUD clock) ·
**diving** (deep-water submerge) · **shell** secondary currency · quest type `deliver` · entity kinds
`crab`, `jellyfish`, `hermitcrab` · terrains `tidepools`, `boardwalk`, `coralsands` · status `soaked`
(or reuse `slow`) · items `shell`, `flippers`, `pearl`, `pearl-charm`.

---

# Biome 5 · Amber Orchard 🍂 — *Harvest & home*
**Boss:** The Scarecrow King · **Palette:** amber (`#E0A85A`), russet, pumpkin orange, hay gold, dusk
purple. Autumn, harvest, and the first sense of **belonging somewhere** — the midpoint that turns a
journey into a home.

**Headline system — cooking + a hub town + reputation.** Gather ingredients (pumpkin, apples, herbs),
**cook** them at a pot into **buff foods** (temporary speed/regen/warmth) via **recipes as pure data**
(a `recipes.json` like `loot.json`). A returnable **hub town** grows as you help locals, tracked by a
**reputation** number that unlocks shop stock, **gear upgrades** (Fenwick), and cosmetic town growth.
**The Keeper** 🦉 debuts and opens the **journal/bestiary**.

## 5·1 — Pumpkin Patch
- **Role.** Introduce **gathering & cooking**.
- **Theme & mood.** Golden-hour rows of pumpkins and apple trees; falling leaves, cider steam, long shadows.
- **Map & layout.** An open orchard (~2000×1400) with harvest nodes (pumpkin/apple/herb pickups) scattered
  among the trees; a central **cookpot** haven. Reuse the meadow water/tree substrate with an autumn palette.
- **Objective.** **New clear type `gather`/`cook`** — harvest **N ingredients** and **cook one dish** at
  the pot. Side: cheer 3 orchard friends.
- **NPCs.** **Marla** (autumn stall); the **cookpot keeper** who teaches recipes; the **Keeper** 🦉
  (opens the journal/bestiary and gives the storyline beat).
- **Enemies & hazards.** **Crow swarms** that steal a carried ingredient; a grumpy badger; brambles (slow).
- **Critters & friends.** Squirrels hoarding acorns (greet), a hedgehog, a wagon-pony.
- **Chests & loot.** wooden / iron / silver. Loot: a cook-pot upgrade, ingredients, a warm-food recipe.
- **Features.** **Cooking/crafting** (recipes = data) · buff foods · **journal/bestiary** debut.
- **Config sketch.** `terrain:"meadow"` + `augment:"pumpkinpatch"` *(new decoration augment — pumpkins,
  hay, leaf scatter)*; harvest pickups as new collectible `types:["pumpkin","apple","herb",…]` *(new
  item defs)*; `npcs:[Marla, Cookpot Keeper, The Keeper]`; `enemies:[{kind:"crow",…}]`;
  `quest:{type:"cook", label:"Cook a harvest dish"}`. *New hooks:* `AUGMENTS["pumpkinpatch"]`, a
  **cook** system (`Cooking.cook(recipe)` + `recipes.json` + a buff-food effect timer), `QUEST_TYPES
  ["gather"/"cook"]`, `Entities.register` `crow`, `cookpot` interactable, the **journal/bestiary** UI +
  data. `next:"orchard-2"`.

## 5·2 — Haybale Maze
- **Role.** A proper **maze/puzzle** level — the first built around navigation, not an arena.
- **Theme & mood.** A hay-bale labyrinth under a lengthening dusk; living scarecrows stir after dark.
- **Map & layout.** A tall walled maze (~1600×2000) of hay-bale colliders with **line-of-sight**
  corridors; **levers** open gates; scarecrow **patrols** sweep sight-cones between you and the exit.
- **Objective.** **`reach`/`ritual`-style** — pull **3 levers** to open the gate to the town, avoiding the
  patrols (reuse `patrol.js` sight-cones; caught = shoved back, cozy). Side: find a hidden friend in a dead end.
- **NPCs.** A trapped farmhand who trades a **lantern** (widens your safe view) for a rescue (escort-flavored).
- **Enemies & hazards.** **Scarecrows** (dormant by day, hostile at night — reuse the `dark` flag +
  detection), hay-bale line-of-sight, crow lookouts.
- **Critters & friends.** A barn owl (greet), field mice.
- **Chests & loot.** iron / silver; a golden behind the trickiest patrol. Loot: lantern, ingredients.
- **Features.** **Maze/line-of-sight** navigation · patrol stealth reused from Firefly Grove · lever gates.
- **Config sketch.** `terrain:"haybalemaze"` *(new — walled maze colliders)*; `dark:true` (night patrols);
  `enemies:[{kind:"scarecrow",…}, {kind:"patrol",range:…}]`; `shrinelanterns`-style levers OR a new
  `lever` entity; `chests:["iron","silver","golden"]`; `quest:{type:"levers", label:"Open the maze gate"}`.
  *New hooks:* `TERRAIN["haybalemaze"]`, `Entities.register` `scarecrow` + `lever`, `QUEST_TYPES
  ["levers"]` (reuses the `kindle`/`ritual` "activate all" shape). `next:"orchard-3"`.

## 5·3 — Cider Mill
- **Role.** A working level with a **timed production** minigame that funds the town; introduces **reputation**.
- **Theme & mood.** A creaking mill, cider presses, warm lit windows — the town coming to life.
- **Map & layout.** The **hub town** stub (~1800×1300): shops, the mill, townsfolk, and the road out. The
  town **grows** cosmetically as reputation rises across revisits.
- **Objective.** **`timed`** — keep the mill running / press N barrels of cider before the shift ends
  (a gentle production loop). Each helped local raises **reputation**. Side: 3 reputation quests.
- **NPCs.** **Fenwick now upgrades gear** here; named townsfolk with **reputation-gated** stock; the Keeper.
- **Enemies & hazards.** Crows raiding the barrels; a jammed press (a timing tap-target).
- **Critters & friends.** Mill cat, cider moths.
- **Chests & loot.** silver / **golden**. Loot: a gear **upgrade** token, buff-food ingredients, feasts.
- **Features.** **Reputation** system · returnable **hub town** · gear **upgrades** · `timed` minigame.
- **Config sketch.** `terrain:"cidermill"` *(new — town layout)*; `npcs:[Fenwick{upgrade}, townsfolk
  {quest:{type:"give"/"greet",…}}, The Keeper]`; `quest:{type:"timed", label:"Keep the mill running"}`.
  *New hooks:* `TERRAIN["cidermill"]`, a **Reputation** counter (persisted like treats), a **hub-town**
  revisit growth hook, Fenwick **upgrade** on `items.json` `mods`, `QUEST_TYPES["timed"]`. `next:"orchard-boss"`.

## Boss · The Scarecrow King
- **Role.** Theatrical multi-phase fight that rewards good **cooking**.
- **Fight.** Summons **straw minions** (reuse the summon pattern from the Alpha Wolf); a **fire-hazard
  phase** torches lanes of the field (telegraphed `groundzone` strips you weave through); a **"steal your
  buff-food"** mechanic (eats one active buff on contact — cook spares to stay ahead). Enrages below a third.
- **Config sketch.** `terrain:"cidermill"` (night arena); `enemies:[{kind:"scarecrowking", maxHp:60}]`;
  `quest:{type:"defeat", label:"Topple the Scarecrow King"}`; graduates the town to full size + finale
  golden chest. *New hooks:* `Entities.register` `scarecrowking` (boss framework; summons `scarecrow`,
  fire-lane `groundzone`s, buff-steal), `_ENEMY_KINDS` + loot entry. `next:"dunes-1"`.

**Biome-5 net-new code:** **cooking** (`Cooking` + `recipes.json` + buff-food timers) · **reputation** +
returnable **hub town** + gear **upgrades** · **journal/bestiary** · quest types `gather`/`cook`,
`levers`, `timed` · augment `pumpkinpatch`; terrains `haybalemaze`, `cidermill` · entity kinds `crow`,
`scarecrow`, `lever`, `cookpot`, `scarecrowking` · items: ingredients, buff foods, upgrade token.

---

# Biome 6 · Golden Dunes 🏜️ — *Endure & uncover*
**Boss:** The Sand Serpent · **Palette:** sun-bleached golds (`#E8C87A`), terracotta ruins, oasis teal,
dusk rose. The harshest and most mysterious biome so far — survival meets archaeology.

**Headline system — a hunger/thirst survival meter + puzzle dungeons + relics.** A HUD **survival
gauge** (reuse the `warmth.js` meter pattern, re-themed: heat/exertion drains it; **shade, the oasis,
and canteens** refill it; empty = a slow debuff, never death). **Sandstorms** cut visibility on a cycle
(reuse the `darkness.js` overlay as weather). The first true **puzzle dungeon** (pressure plates,
light-beam redirection, glyph doors, trapped tiles). **Relics/trinkets** debut: a new **active-item
equipment slot** (short-cooldown effects — a dash-dodge, a decoy, a lantern), distinct from stat-only
`wearables`.

## 6·1 — Dune Sea
- **Role.** Introduce the **hunger/thirst survival meter** and **sandstorms**.
- **Theme & mood.** Endless rolling dunes, heat-shimmer, a bright oasis jewel in the distance.
- **Map & layout.** A vast open dune field (~2400×1600), no water except a central **oasis** haven
  (refills the gauge) and scattered **shade** rocks; **canteen** pickups dot the route. **Sandstorms**
  sweep periodically, whiting out sight and nudging you off course.
- **Objective.** Survival-flavored **fetch** — **bring water to a stranded traveler** before dusk (reuse
  `fetch-from`/`deliver`). Side: cheer 3 sun-weary friends near shade.
- **NPCs.** **Marla's caravan** (rotating desert stock); a **stranded traveler**; the **relic vendor**
  (teases the relic slot).
- **Enemies & hazards.** **Scarab swarms** (fast, weak); **quicksand** (slows/sinks — cozy escape);
  **heatstroke** if the gauge empties (slow debuff); the sandstorm itself.
- **Critters & friends.** Fennec fox (greet), a camel, dune lizards.
- **Chests & loot.** wooden / iron / silver. Loot: canteen, a wide-brim hat (slows heat drain), shells→relic-coin.
- **Features.** **Survival meter** (heat) · **sandstorm** weather (darkness overlay) · shade/oasis havens.
- **Config sketch.** `terrain:"dunesea"` *(new — dune field, `river:null`, an oasis pond + shade rocks)*;
  `dark:true`-**style** sandstorm cycle *(new weather toggle rather than a permanent dark flag)*;
  `enemies:[{kind:"scarab",…}]`; `npcs:[Marla, Traveler{quest}, Relic Vendor]`;
  `quest:{type:"fetch-from", item:"water", label:"Water the stranded traveler"}`. *New hooks:* the
  **survival** meter (reuse `warmth.js` component, re-themed), a **sandstorm** weather cycle (reuse
  `darkness.js`), `Entities.register` `scarab` + `quicksand` zone, `canteen`/`sunhat` items. `next:"dunes-2"`.

## 6·2 — Hidden Oasis
- **Role.** A lush safe haven and social hub; introduces **relics/trinkets** (the active-item slot).
- **Theme & mood.** Palm shade, cool teal water, caravan bustle — a green jewel in the sand.
- **Map & layout.** A compact oasis town (~1700×1300): the relic vendor, caravan traders, a well; the
  survival gauge stays topped here (respite between the harsh L1/L3).
- **Objective.** Reputation-free social loop — help 3 caravaners (`give`/`greet`) and **equip your first
  relic**. Side: an archaeologist sets up the L3 puzzle chain.
- **NPCs.** **Relic Vendor** (sells the first **relic** + a relic slot tutorial); an **archaeologist**
  (puzzle chain); Fenwick with desert gear.
- **Enemies & hazards.** None inside the oasis (a breather); scarabs at the edges.
- **Critters & friends.** Parrots, a tortoise sage (greet), oasis frogs.
- **Chests & loot.** iron / silver; a golden down the well. Loot: **relic** (dash-dodge or lantern), map fragment.
- **Features.** **Relics/trinkets** active-item slot · a calm hub between survival stretches.
- **Config sketch.** `terrain:"oasis"` *(new — town + water)*; `npcs:[Relic Vendor{gives relic},
  Archaeologist{quest chain}, Fenwick]`; `chests:["iron","silver","golden"]`;
  `quest:{type:"greet", label:"Meet the caravan"}`. *New hooks:* the **relic** equipment slot (a new
  `p.relic` + an active-use key like R, distinct from `wearables`/abilities), 2–3 `relic` item defs
  (`dashdodge`, `decoy`, `lantern`). `next:"dunes-3"`.

## 6·3 — Ancient Ruins
- **Role.** The first true **puzzle dungeon**; test survival + relics before the boss.
- **Theme & mood.** Half-buried sandstone corridors, glyph-lit gloom, the hum of old mechanisms.
- **Map & layout.** An interior ruin (~1900×1500) of rooms joined by **glyph doors**; **pressure plates**
  open gates, a **light-beam** you redirect with the relic **lantern** to hit glyph sensors, and **trapped
  tiles** (telegraphed). Combat is secondary to solving.
- **Objective.** **New clear type `puzzle`/`solve`** — activate the ruin's mechanism (all pressure plates
  + the beam sequence). Side: recover a relic-hunt artifact for the archaeologist (chain finale).
- **NPCs.** The archaeologist at the entrance (hints); a nomad shortcut vendor.
- **Enemies & hazards.** **Ruin sentinels** (ranged — reuse the `toadstool` spitter shape); trapped
  tiles (reuse `rockfall`/`groundzone` telegraph); a collapsing-sand choke.
- **Critters & friends.** Glow-scarabs (ambient), a ruin gecko (greet).
- **Chests & loot.** silver / **golden** (behind the final glyph door). Loot: a signature **relic**, feasts.
- **Features.** **Puzzle dungeon** (plates/beams/glyph doors/traps) · ranged sentinels · relic-gated solve.
- **Config sketch.** `terrain:"ruins"` *(new — room/corridor colliders)*; `enemies:[{kind:"sentinel",…}]`;
  pressure-plate/beam/door entities; `quest:{type:"solve", label:"Unseal the ruins"}`;
  `chests:["silver","golden"]`. *New hooks:* `TERRAIN["ruins"]`, `Entities.register` `sentinel`,
  `pressureplate`, `lightbeam`, `glyphdoor`, `trappedtile`; `QUEST_TYPES["solve"]` (all mechanisms
  active). `next:"dunes-boss"`.

## Boss · The Sand Serpent
- **Role.** A burrowing arena boss — use ruins/relics to expose and stagger it.
- **Fight.** It **dives under the sand** (invulnerable) and surfaces via **telegraphed mounds** (reuse
  `groundzone`/`rockfall` warn→strike); erupts in a line you sidestep. Trigger a **pressure plate / relic
  decoy** to bait a surface and open a punish window. Enrages below a third (more mounds, faster dives).
- **Config sketch.** `terrain:"ruins"` (sand arena); `enemies:[{kind:"sandserpent", maxHp:64}]`;
  `quest:{type:"defeat", label:"Bring down the Sand Serpent"}`; drops a signature relic + finale chest.
  *New hooks:* `Entities.register` `sandserpent` (burrow/erupt via `groundzone` mounds), `_ENEMY_KINDS`
  + loot. `next:"tundra-1"`.

**Biome-6 net-new code:** **survival meter** (heat; reuse `warmth.js` pattern) · **sandstorm** weather
(reuse `darkness.js`) · **relic** active-item slot + relic items · **puzzle dungeon** kit
(`pressureplate`/`lightbeam`/`glyphdoor`/`trappedtile`) · quest type `solve` · terrains `dunesea`,
`oasis`, `ruins` · entity kinds `scarab`, `quicksand`, `sentinel`, `sandserpent` · items `water`,
`canteen`, `sunhat`, relics.

---

# Biome 7 · Frostfang Tundra ❄️ — *Cold & scarcity*
**Boss:** The Ice Yeti · **Palette:** icy whites & blues (`#CFE0EC`), aurora greens/violets, deep-shadow
indigo. The endgame's proving ground: every prior system turned up, with **scarcity** as the theme.

**Headline system — the warmth/fire economy matured.** The `warmth.js` meter from Rocky Mountains is now
a *core loop*: you **gather wood** and **build/relight campfires** to cross (reuse `firepit.js` + the
`kindle` objective + the `cold` flag), **blizzards** whiteout the map on a cycle (reuse `darkness.js`),
and **ice is slippery**. **Elite enemies** (frost wolves — tougher, status attacks) drop **rare
materials** for an endgame **gear tier**.

## 7·1 — Icy Flats
- **Role.** Mature the **warmth/fire economy** — build the route with fire.
- **Theme & mood.** A vast silent killing cold; wind-scoured flats, breath fog, a far aurora shimmer.
- **Map & layout.** Open flats (~2200×1500), `cold:true`. **Cold zones** drain warmth; you **gather
  firewood** and **relight waystation firepits** to warm a corridor across; **slippery ice** patches slide
  you; sun-patches and lit fires are havens.
- **Objective.** **`kindle`** (reuse) — relight all waystation fires to open the way. Side: cheer 2
  shivering friends near fires; an escort (a lost lamb → fire).
- **NPCs.** **Fenwick** (warm endgame coat, gloves); **Rusk the Ranger** returns (callback, survival tips);
  a **frozen traveler** to thaw at a fire (rescue).
- **Enemies & hazards.** **Frost wolves** (elite — buffed `wolf` with a `chilled` bite); cold zones,
  thin ice, a snow-choke.
- **Critters & friends.** Snow hare, ptarmigan (greet), an arctic fox.
- **Chests & loot.** iron / iron / silver. Loot: warm coat (real warmth-drain reduction), firewood, **rare material**.
- **Features.** **Warmth/fire economy** as the loop · `chilled` status matured · **elite** frost wolves.
- **Config sketch.** `terrain:"icyflats"` *(new — snow flats + ice patches)*; `cold:true`;
  `firepits:[…3 waystations]`; `enemies:[{kind:"frostwolf",…}]`; `quest:{type:"kindle", label:"Warm the
  frozen flats"}`; `chests:["iron","iron","silver"]`. *New hooks:* `TERRAIN["icyflats"]`, a **firewood**
  item + build/relight loop (extend `firepit.js`), `Entities.register` `frostwolf` (elite `wolf` variant
  that applies `chilled`), **slippery-ice** movement in `update.js`, `rarematerial` drop. `next:"tundra-2"`.

## 7·2 — Aurora Fields
- **Role.** A hauntingly beautiful stealth-survival stretch; **elite enemies** + **rare materials** debut fully.
- **Theme & mood.** The aurora paints the sky over glassy snow — awed and lonely; mastery expected.
- **Map & layout.** A wide night field (~2200×1500), `cold:true`, `dark:true`-ish aurora dim; frost-wolf
  packs prowl light/shadow (reuse the woods stealth-by-light). Warmth + stealth at once.
- **Objective.** **`defeat`** (reuse) — thin the elite pack (drive off N frost wolves), or a `gather` of
  **rare materials** for endgame gear. Side: keep a beacon lit through a blizzard (survival chain).
- **NPCs.** A **hermit** at a lone cabin (best crafting recipes, rare-material trades).
- **Enemies & hazards.** Frost-wolf **elites** (status attacks); **ice sprites** (ranged, `chilled` — reuse
  the spitter shape); blizzard whiteout; crevasses.
- **Critters & friends.** Aurora moths (ambient), a reindeer (greet).
- **Chests & loot.** silver / **golden**. Loot: rare materials, endgame gear, feasts.
- **Features.** **Elite enemies** + **rare crafting materials** · blizzard (darkness) weather peak · stealth reprise.
- **Config sketch.** `terrain:"aurorafields"` *(new)*; `cold:true`; `dark:true` (aurora dim + blizzard);
  `enemies:[{kind:"frostwolf",hp:…}, {kind:"icesprite",…}]`; `quest:{type:"defeat", label:"Thin the frost
  pack"}` or `{type:"gather", item:"rarematerial"}`; `chests:["silver","golden"]`. *New hooks:*
  `TERRAIN["aurorafields"]`, `Entities.register` `icesprite`, a **blizzard** weather cycle, the
  rare-material **gather** economy (reuse B5 `gather`). `next:"tundra-3"`.

## 7·3 — Glacier Cave
- **Role.** An interior level — light matters again + thin-ice puzzles; an ambush gauntlet before the summit.
- **Theme & mood.** Dark ice caverns glowing from within, breath fog, the crunch of thin ice.
- **Map & layout.** A cave interior (~1800×2000, tall), `dark:true` (lanterns/glowing crystals pool light —
  reuse the woods darkness overlay); **thin-ice** puzzle floors that crack if you linger; a crystalline
  treasure vault; a final ambush ledge.
- **Objective.** **`defeat`-gauntlet** (reuse) — clear the ambush to open the summit gate. Side: a
  thin-ice `reach` to a crystal chest.
- **NPCs.** Rusk at the mouth (pep talk / last shop before the boss — feasts, a warmth-relic).
- **Enemies & hazards.** Frost wolves + ice sprites in the dark; **thin ice** (reuse the Frozen-Pass idea);
  falling ice (reuse `rockfall`).
- **Critters & friends.** Cave bats (ambient), a glow-newt (greet).
- **Chests & loot.** silver + **golden** (crystal vault). Loot: warmth-relic, endgame gear, feasts for the boss.
- **Features.** **Interior dark cave** (light reprise) · **thin-ice** puzzles · pre-boss ambush + shop.
- **Config sketch.** `terrain:"glaciercave"` *(new — cave colliders)*; `dark:true`; `lanterns:[…]`;
  `rockfalls:[…falling ice]`; `enemies:[{kind:"frostwolf",…}, {kind:"icesprite",…}]`;
  `quest:{type:"defeat", label:"Fight to the glacier summit"}`; `chests:["silver","golden"]`. *New hooks:*
  `TERRAIN["glaciercave"]`, **thin-ice** floor entity (crack-on-linger). `next:"tundra-boss"`.

## Boss · The Ice Yeti
- **Role.** A heavy arena-shaker where **warmth management + your Ultimate** decide the fight.
- **Fight.** **Ground-pound shockwaves** (reuse `groundzone` rings); an **"encase in ice"** mechanic
  (freezes you briefly — mash to break free, like a heavy `stunned`); a **blizzard enrage** below a third
  where warmth drains fast and only fires/your Ultimate keep you going.
- **Config sketch.** `terrain:"glaciercave"`/a snow arena; `cold:true`; `enemies:[{kind:"iceyeti",
  maxHp:70}]`; `quest:{type:"defeat", label:"Fell the Ice Yeti"}`; drops rare-material cache + finale chest.
  *New hooks:* `Entities.register` `iceyeti` (ground-pound `groundzone`, encase = a heavy `stunned`/new
  `frozen` status, blizzard enrage), `_ENEMY_KINDS` + loot. `next:"sky-1"`.

**Biome-7 net-new code:** **warmth/fire economy** matured (firewood + build/relight loop) · **elite**
enemy tier + **rare materials** + endgame gear · **blizzard** weather · **slippery ice** + **thin-ice**
floors · quest reuse (`kindle`/`defeat`/`gather`) · terrains `icyflats`, `aurorafields`, `glaciercave` ·
entity kinds `frostwolf`, `icesprite`, `thinice`, `iceyeti` · status `frozen` (or reuse `stunned`) ·
items `firewood`, `warmcoat`, `rarematerial`, warmth-relic.

---

# Biome 8 · Cloud Kingdom ☁️ — *Ascension & climax*
**Boss:** The Storm Eagle · **Palette:** lavender/periwinkle skies (`#C9BEF0`), gold sun-shafts, white
cloud, storm slate. The finale — everything the player has learned, in the sky, culminating in the
campaign's climactic fight and the credits.

**Headline system — verticality/gliding.** A **height/jump or glide toggle** for sky platforming: hop
between rising **cloud platforms**, ride **updrafts**, and get pushed by **wind-gust** zones. **Falling
is a soft reset** (return to the last platform), never a death. The capstone traversal mechanic, and the
last biome combines *every* prior system for a victory-lap.

## 8·1 — Sky Steps
- **Role.** Introduce **verticality/gliding**.
- **Theme & mood.** Weightless wonder — floating stone isles and cloud platforms in a sunlit sky.
- **Map & layout.** An ascent (~1600×2200, tall) of **cloud platforms** separated by gaps you **glide/hop**
  across; **updrafts** boost you up, **wind-gust** bands push sideways. Off-platform = a soft reset to the
  last safe cloud.
- **Objective.** **`reach`** (reuse) — glide to the summit platform. Side: collect floating sky-treats.
- **NPCs.** **Marla's sky-market stall** (a glide charm, feasts); a wind-sprite guide (greet).
- **Enemies & hazards.** **Sky-sprites** (ranged — reuse the spitter shape); wind gusts; collapsing
  platforms (telegraphed, then re-form).
- **Critters & friends.** Cloud lambs, a sky-whale (ambient), a sparrow (greet).
- **Chests & loot.** iron / silver; a golden on a hard updraft climb. Loot: glide charm, feasts.
- **Features.** **Verticality/gliding** · updrafts + wind zones · soft-reset falling.
- **Config sketch.** `terrain:"skysteps"` *(new — platform colliders + gaps, `river:null`)*; `enemies:
  [{kind:"skysprite",…}]`; `quest:{type:"reach", label:"Glide to the summit"}`; `chests:["iron","silver",
  "golden"]`. *New hooks:* `TERRAIN["skysteps"]`, a **glide/height** system in `update.js` (a jump/glide
  toggle + gap/fall detection + soft-reset), **updraft**/**windzone**/**cloudplatform** entities,
  `Entities.register` `skysprite`, `QUEST_TYPES["reach"]` (arrive at a marked point). `next:"sky-2"`.

## 8·2 — Floating Isles
- **Role.** A hub-like sky archipelago that combines **everything** — a victory lap of systems.
- **Theme & mood.** A sunlit island chain; shops, a puzzle bridge, a windy stretch, a small fight — all at once.
- **Map & layout.** A branching archipelago (~2200×1600) linking a **combat** isle, a **puzzle** bridge
  (reuse plates/beams), a **survival** stretch (wind chill — reuse the meter), and a **shop** isle. The
  full recurring cast has a cameo send-off here.
- **Objective.** A capstone **quest chain** revisiting earlier NPCs' threads (deliver for Pip, cook for
  the Keeper, a relic puzzle, an elite hunt). Side: optional `defeat`/`solve` challenge rooms for **legendary gear**.
- **NPCs.** **Marla, Fenwick, Rusk, Pip, the Keeper** cameo (the send-off); a legendary-gear smith.
- **Enemies & hazards.** A mix — sky-sprites, an elite, wind gusts, a puzzle lock.
- **Critters & friends.** The whole menagerie cameo (greets), for the warm farewell.
- **Chests & loot.** silver / **golden**; **legendary** in the challenge rooms. Loot: legendary gear, Ultimate feasts.
- **Features.** **Systems victory-lap** · **legendary gear** tier · recurring-cast send-off.
- **Config sketch.** `terrain:"floatingisles"` *(new — archipelago)*; `npcs:[full cast cameo, Smith]`;
  `quest:{type:"cheer-all", label:"Farewell the friends"}` as the level clear, with the **capstone chain**
  stitched from existing NPC quest types (`give`/`greet`/`deliver`/`solve`) across the cameo NPCs;
  `chests:["silver","golden"]`. *New
  hooks:* `TERRAIN["floatingisles"]`, a **legendary** loot tier in `loot.json`, a small quest-chain
  stitch (reuse existing quest types). `next:"sky-3"`.

## 8·3 — Storm Peak
- **Role.** The gauntlet — a linear storm ascent straight to the summit and the finale.
- **Theme & mood.** A darkening storm gathering toward the peak; wind, rain streaks, distant lightning.
- **Map & layout.** A linear vertical climb (~1500×2400) through wind, ranged sky-sprites, and
  platforming under a **building storm**; no shops — just the ascent.
- **Objective.** **`reach`/`defeat`-gauntlet** — survive the climb to the peak gate.
- **NPCs.** None (a wordless, tense ascent); Rusk's voice-line at the base.
- **Enemies & hazards.** Sky-sprite volleys, **lightning strikes** (telegraphed `groundzone`), collapsing
  platforms, the storm wind pushing hard.
- **Critters & friends.** None — the world holds its breath.
- **Chests & loot.** a single **golden** at the peak. Loot: an Ultimate feast + a legendary before the boss.
- **Features.** **Final gauntlet** structure · lightning telegraphs (`groundzone`) · storm wind at its peak.
- **Config sketch.** `terrain:"stormpeak"` *(new — linear tall climb)*; `enemies:[{kind:"skysprite",…}]`;
  lightning via `groundzone`/a `stormbolt` entity; `quest:{type:"reach", label:"Reach Storm Peak"}`;
  `chests:["golden"]`. *New hooks:* `TERRAIN["stormpeak"]`, a `stormbolt` telegraphed strike (reuse
  `groundzone`). `next:"sky-boss"`.

## Boss · The Storm Eagle
- **Role.** The grand multi-phase finale — demands **Ultimate + relics + gear + everything the campaign taught**.
- **Fight.** **Aerial phases** — it wheels above and **dives** across the platforms and rains
  **lightning** (telegraphed `groundzone` strikes to dodge between); a **grounded phase** where it lands
  and you punish; a final **storm crescendo** enrage combining dives, lightning lanes, and wind — where
  your Ultimate, a relic dodge, and endgame gear decide it. Victory = the **credits** beat.
- **Config sketch.** `terrain:"stormpeak"`/a sky arena; `enemies:[{kind:"stormeagle", maxHp:90}]`;
  `quest:{type:"defeat", label:"Defeat the Storm Eagle"}`; `next:null` — the end of the campaign;
  clearing it rolls **credits**. *New hooks:* `Entities.register` `stormeagle` (aerial dive + lightning
  `groundzone` lanes + grounded punish + crescendo enrage), `_ENEMY_KINDS` + loot, a **credits** hook on
  the final clear.

**Biome-8 net-new code:** **verticality/gliding** (jump/glide + updrafts + wind zones + soft-reset) ·
**legendary gear** tier · a **credits** payoff · terrains `skysteps`, `floatingisles`, `stormpeak` ·
entity kinds `skysprite`, `updraft`, `windzone`, `cloudplatform`, `stormbolt`, `stormeagle` · quest type
`reach` (shared with earlier reuse).

---

## Build-order suggestion (these five biomes)
Each biome is additive and mostly data + a few hooks — build a biome fully (3 levels → boss), verify,
then chain the next. Some **systems unlock across biomes**, so front-load the reusable ones:

1. **Biome 4 · Seashell Cove** — stands up the **tide cycle** (a save-safe clock + terrain toggle) and
   **diving**; the tide/clock tech and the `deliver` quest generalize to later timed content.
2. **Biome 5 · Amber Orchard** — the **cooking + hub-town + reputation + journal** layer; the hub/rep
   and cook-buff systems are reused by the Tundra (crafting) and Sky (send-off hub).
3. **Biome 6 · Golden Dunes** — the **survival meter** (reuse `warmth.js`), the **relic** active-item
   slot, and the **puzzle-dungeon** kit (plates/beams/doors) — all of which the Tundra and Sky reuse.
4. **Biome 7 · Frostfang Tundra** — turns up the **warmth/fire economy** and adds **elites + rare
   materials + endgame gear** (leaning on cooking/relics/meter already built).
5. **Biome 8 · Cloud Kingdom** — **verticality/gliding**, the **legendary** tier, and the **final
   gauntlet + credits** — the victory-lap that combines everything above.

As with biomes 1–3, a biome is: new `levels.json` entries + a named terrain builder per level + a
handful of `Entities.register` kinds + (occasionally) one new `QUEST_TYPES`/`Quests.TYPES` entry +
flipping the `campaign.js` placeholders to `real:true` and chaining `next` — the same shape the first
three biomes already prove out. Bosses reuse the boss framework (`boss:true` + HP bar + `groundzone`
telegraphs + `defeat` clear) established by the Alpha Wolf and Old Grizzly.
