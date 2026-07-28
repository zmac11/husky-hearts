# Level Design — Biomes 2 & 3 (non-boss levels)

Deep, level-by-level design for the six non-boss levels of **Rocky Mountains** (⛰️) and
**Whispering Woods** (🌲). Companion to [`biome-design.md`](./biome-design.md) — that doc sets
the biome themes and system arc; this one lays out each level concretely enough to build.

Every level is grounded in the existing data-driven pipeline: a `levels.json` entry
(terrain/augment by name, friends, npcs, enemies, critters, chests, quest) built generically
by [`levels/from-config.js`](../src/levels/from-config.js), plus a few new **code hooks**
(terrain builders, `Entities.register` kinds, `Quests.TYPES` entries, HUD systems) flagged per
level. New clear-objectives are new `QUEST_TYPES` entries (a `describe()` + `isComplete()`),
exactly like `cheer-all`/`none` today.

**Pacing recap:** each biome introduces one headline system — Rocky = **combat + a warmth
meter**; Woods = **status effects + light/stealth**, climaxing in the **Ultimate unlock**. A
level *introduces* its mechanic (L1), *complicates* it (L2), and *tests* it (L3) into the boss.

**Per-level template:** Role · Theme & mood · Map & layout · Objective (+ side quests) · NPCs ·
Enemies & hazards · Critters & friends · Chests & loot · Features · Config sketch.

---

# Biome 2 · Rocky Mountains ⛰️

Abilities just awakened at the Badger Baron; here they finally *matter*. Cold and predators
turn the cozy walk into a real adventure. New systems this biome: **combat that matters**, an
**Exposure/warmth meter**, and the first **status effect** (`chilled/slow`).

## 2·1 — Rocky Mountains *(already implemented; extend)*

- **Role.** First true combat: a safe-ish valley to learn kiting, cooldowns, and that the
  world now fights back — with your freshly-awakened Q/E.
- **Theme & mood.** A lush Canadian-Rockies valley: snow-veined peaks, turquoise glacial
  lakes, waterfalls, a river, campfires as warm havens. Awed wonder with a wolf-shaped edge.
- **Map & layout.** *(current)* A big open valley (2400×1600) — deliberately roomy so combat
  has space to kite around lakes and boulders. Campfires are safe landmarks; river bridges
  gate movement. Enemies spawn away from the entrance so the first fight is a choice, not an
  ambush.
- **Objective.** Keep the cozy spine: **cheer every mountain friend** (the 6 lonely animals).
  *Add* a first optional **`defeat`** side-quest from Rusk — *"Thin the Pack: drive off 3
  wolves."* — so combat is introduced as opt-in, then rewarded.
- **NPCs.** **Rusk the Ranger** (shop + the level's combat tutor — explains hearts, fleeing vs
  fighting, and hands out the defeat quest). Marla's stall stocking warm gear + heals.
- **Enemies & hazards.** 2–3 wolves (fast pack-hunters), 1 badger; open ground, cold water.
  One wolf deliberately guards a chest — teaching "treasure can be defended."
- **Critters & friends.** Loons on the lakes, a lakeshore beaver, a forest moose (greet); the
  6 friends: Rusty Fox, Old Billy Goat, Hoot Owl, Pip Marmot, Bramble Cub, Ridge Raven.
- **Chests & loot.** wooden / iron / iron / silver; the silver behind the guarding wolf.
- **Features.** First real use of **Q/E in combat**; the `defeat` quest type debuts.
- **Config sketch.** `terrain:"rocky"` (existing `buildRockyWorld`). *New hook:* `defeat`
  quest type. Otherwise already in `levels.json`.

## 2·2 — Frozen Pass *(implemented — first build)*

> **Status:** shipped. `frozenpass` terrain, the **warmth meter** + `chilled` slow/chip
> (`src/warmth.js` + HUD gauge), relightable **firepit** entity, the **`kindle`** clear
> objective, and the `rocky-2` config are all in and verified. *Deferred to a follow-up:* the
> Warm Coat's actual warmth-drain reduction (the coat is sold but cosmetic for now), the
> firewood *item* loop (relighting is currently a stand-close hold, no item needed),
> snowdrift-slow, thin-ice, and the escort mini-quest.

- **Role.** Introduce the **Exposure/warmth meter** and coordinated packs in tight terrain.
- **Theme & mood.** The trail climbs out of the valley into a wind-scoured, snow-swept pass.
  Colder, narrower, lonelier — the mountain stops being scenic and starts being a test.
- **Map & layout.** A **winding, corridor-like pass** (≈2000×1400) — switchbacks between rock
  walls rather than an open arena, so wolves can flank you. **Cold zones** (the shaded, windy
  stretches) drain warmth; **campfires and sun-patches** are spaced havens that refill it.
  Snowdrifts **slow** movement; a **frozen-lake** shortcut has **thin ice** that cracks if you
  linger. Three ruined **waystation fires** sit along the route — relighting them is the goal.
- **Objective.** **New clear type `kindle`** — *"Relight the pass"*: rekindle all **3
  waystation fires** (stand at each with **firewood** and hold action). Doing so warms the
  route and opens the frozen gate onward. *(Shares tech with the woods-3 shrine relight.)*
  Optional: cheer 2 stranded critters; an `escort` mini-quest guiding a lost lamb to a fire.
- **NPCs.** **Fenwick the Tailor** debuts here selling the **Warm Coat** (a wearable that
  slows warmth drain) and gloves; a **Stranded Climber** who trades **firewood** for a rescue
  (escort). Rusk may reappear at the top waystation.
- **Enemies & hazards.** A **coordinated wolf pack** (2–3 that split to flank in the
  corridors — a light "aggro" so they converge); cold zones, thin ice, snowdrifts (slow), a
  small falling-snow choke (preview of rockfalls). Letting warmth hit zero applies
  **`chilled`** (slow + light chip) until you reach a fire.
- **Critters & friends.** Ptarmigan, a white mountain hare (greet); a couple of shivering
  friends near fires.
- **Chests & loot.** iron / iron / silver; one **hidden off a side ledge** (rewards
  detouring despite the cold). Loot: Warm Coat, firewood bundles, biscuits/trailmix.
- **Features.** **Warmth meter** (HUD gauge) · `chilled` **status** · `kindle` clear
  objective · protective **gear** starts mattering · pack **flanking**.
- **Config sketch.** *New hooks:* `TERRAIN["frozenpass"]` (narrow switchbacks + snow); the
  **warmth system** (HUD meter + cold-zone entity + `chilled` status); `Entities.register`
  for `coldzone`, `thinice`, `campfire`(interactable relight), `firewood` pickup;
  `QUEST_TYPES["kindle"]` and `escort`; `warmcoat` item in `items.json`.
  `levels.json`: `terrain:"frozenpass"`, `chests:["iron","iron","silver"]`,
  `quest:{type:"kindle", label:"Relight the frozen pass"}`.

## 2·3 — Cliffside Climb *(implemented — first build)*

> **Status:** shipped. `cliffside` terrain (a tall map of switchback ledge-walls with
> alternating gaps), the **rockfall** hazard entity (telegraph → roll → damage + knockback →
> reset), the **`defeat`** clear objective (drive off every guardian), a buffed **pack-leader**
> wolf (a wolf with higher hp/speed/dmg — no new kind needed), the **Cliffside Lookout**
> last-shop, and the `rocky-3` config are in and verified. *Deferred to a follow-up:*
> crumbling ledges, wind-gust zones, the golden side-climb `reach` sub-quest, and a distinct
> pack-leader sprite.

- **Role.** Verticality-lite + dodging telegraphed hazards + a combat gauntlet that hands you
  to the Alpha Wolf. The biome's skill check.
- **Theme & mood.** A sheer cliff face under a bruising sky — a white-knuckle climb to the
  summit where the pack leader waits. Wind, exposure, a very long way down.
- **Map & layout.** A **tall, narrow map** (≈1400×2100 — taller than wide, read as a climb).
  Switchback **ledges** at stacked "heights" connected by ramps and **one-way drops**
  (fall = shortcut down, never death); the eye reads it as ascending even top-down.
  **Falling-rock lanes**: boulders spawn at the top of marked chutes and roll down on a
  timer — dodge between them. **Crumbling ledges** drop a beat after you step on them.
  **Wind-gust** bands nudge you toward the edge. A final **summit ledge** gauntlet precedes
  the portal to the boss.
- **Objective.** **`defeat`-gauntlet** clear — *"Fight to the summit"*: best the ledge
  guardians (incl. a **mini-elite pack leader**, a boss preview) to open the summit gate.
  Optional: a risky side-climb to a golden chest (`reach` a marked ledge).
- **NPCs.** A **Lookout** at the last safe ledge — the classic **"last shop before the boss"**
  (feasts, a gear piece, a heart-refill). Rusk at the base with a warning/pep talk.
- **Enemies & hazards.** Wolves on the ledges; a **Pack-Leader mini-elite** (tougher, a
  telegraphed lunge — trains you for boss tells); **falling rocks**, **crumbling ledges**,
  **wind gusts**, lingering cold zones.
- **Critters & friends.** Eagles wheeling overhead (ambient), a marmot on a safe ledge (greet
  + a hint about the rockfall timing).
- **Chests & loot.** silver + a **golden** reachable only via the daring side-climb. Pre-boss
  loot: Feast, a strong wearable.
- **Features.** **Falling-rock/crumbling-ledge hazards** (telegraph → dodge, prep for boss) ·
  **wind gusts** · **verticality-lite** layout · **mini-elite** enemy · pre-boss shop.
- **Config sketch.** *New hooks:* `TERRAIN["cliffside"]` (ledge/ramp layout via colliders +
  visual layering); `Entities.register` for `rockfall` (timed roller), `crumbleledge`,
  `windzone`, `wolf` variant `packleader` (elite stats + telegraph); reuse `defeat` +
  `QUEST_TYPES["reach"]` (arrive at a marked point). `levels.json`: `terrain:"cliffside"`,
  `enemies:[…wolves…, {kind:"packleader",…}]`, `chests:["silver","golden"]`,
  `quest:{type:"defeat", label:"Fight your way to the summit"}`, `next:"rocky-boss"`.

**Biome-2 net-new code:** warmth meter + `chilled` status; entity kinds `coldzone`,
`thinice`, `rockfall`, `crumbleledge`, `windzone`, `packleader`; terrains `frozenpass`,
`cliffside`; quest types `defeat`, `kindle`, `escort`, `reach`; items `warmcoat`, `firewood`.

---

# Biome 3 · Whispering Woods 🌲

An ancient forest of hush and half-light. Danger becomes *atmosphere* — watchful, not cruel.
New systems: a **status-effect system** (poison/slow), **night/light & stealth**, **quest
chains**, and the payoff — the **Ultimate (R)** unlock at Firefly Grove.

## 3·1 — Mossy Trail *(new)*

- **Role.** Introduce **light & darkness** and stealth (built on the existing noise/detection).
- **Theme & mood.** Stepping under a canopy that swallows the sun. The world contracts to a
  soft glow around you; every rustle is a maybe. Eerie but gentle — a place of secrets.
- **Map & layout.** A **winding forest trail** (≈1800×1300) through dense trees. A **darkness
  overlay** limits sight to a **light radius** around the dog; **lantern posts** and **glowing
  mushrooms** pool light along the path. **Off-trail is darker** and hides both treasure and
  lurkers. The trail **lightly branches** (the first non-linear hint) — one fork toward a dark
  grove chest, one toward a lantern-lit clearing of friends.
- **Objective.** Return to the cozy spine after the harsh mountains: **cheer the woodland
  friends** (4–5 lonely animals), a couple tucked **off-trail in the dark** so you learn to
  carry/seek light. Side: Pip's **delivery** to woods-2 (starts a cross-level chain).
- **NPCs.** **Bramble the Alchemist** debuts (sells **lantern oil** and a **Torch** wearable
  that widens your light; teases antidotes); **Pip the Postpigeon** debuts (a `deliver` quest
  to Fungus Hollow); a **Lantern-Keeper** who relights posts for treats.
- **Enemies & hazards.** **Shadow-lurkers** — only aggressive **in the dark**, they freeze or
  flee in light (teaches the whole mechanic directly, 1–2 of them). Brambles (**slow**), a
  **will-o'-wisp** that lures you off-path into the dark.
- **Critters & friends.** Fireflies (ambient + a greet), a hedgehog, a shy deer (greet).
- **Chests & loot.** wooden / iron; one **hidden in a dark grove** you can only find with a
  light source (Torch or a led firefly). Loot: Torch, lantern oil.
- **Features.** **Darkness overlay + light sources** · **stealth via light/shadow** on the
  detection system · `deliver` quest + first **cross-level chain**.
- **Config sketch.** *New hooks:* `TERRAIN["mossytrail"]`; the **darkness/light system** (a
  view-radius overlay + light-emitter entities); `Entities.register` for `lanternpost`,
  `shadowlurker` (dark-only aggro), `willowisp`; `Torch` wearable + `lanternoil` item;
  `QUEST_TYPES["deliver"]`. `levels.json`: `terrain:"mossytrail"`, friends (some at dark
  `fx/fy`), `quest:{type:"cheer-all", label:"Cheer the woodland friends"}`.

## 3·2 — Fungus Hollow *(new)*

- **Role.** Introduce the **poisoned** status and ranged enemies; the first properly
  **branching** level; middle of the Alchemist chain.
- **Theme & mood.** A damp, glowing hollow of giant mushrooms and drifting spores —
  bioluminescent beauty that quietly hurts you. Deeper into the woods' strangeness.
- **Map & layout.** A **branching cavern-forest** (≈1900×1400) — genuinely non-linear:
  several routes, dead-ends with loot, and **spore-cloud choke points** you must time or
  detour around. Glowing mushrooms light the space (less pure-dark than 3·1 — this level is
  about **hazard navigation**, not sight). A guarded inner chamber holds the **Mooncap**.
- **Objective.** **New clear type `fetch-from`** — *"Bramble's Mooncap"*: retrieve the rare
  **Mooncap mushroom** from the guarded inner chamber and bring it back, advancing the
  Alchemist chain toward the shrine in 3·3. Side: **cure a poisoned traveler** with an
  antidote (teaches the cure loop).
- **NPCs.** **Bramble the Alchemist** (chain step 2 — sets the Mooncap request; sells
  **antidotes** and a **Spore Mask**/scarf that resists poison); a **Poisoned Traveler**.
- **Enemies & hazards.** **Toadstool Spitters** (stationary/slow **ranged** — lob spore globs
  that leave **poison puddles**); spore-moths; a **Myconid mini-elite** guarding the Mooncap.
  **Spore clouds** apply **`poisoned`** (damage-over-time + HUD icon); **bounce-caps**
  knockback; toxic pools.
- **Critters & friends.** Glow-beetles, a shy salamander (greet).
- **Chests & loot.** iron / silver; a **hidden chest behind a spore-choke** (risk/reward).
  Loot: antidotes, Spore Mask, Mooncap (quest item).
- **Features.** **Status system: `poisoned`** (DoT + resist gear + cure items) · **ranged
  enemies** · **branching layout** · `fetch-from` clear objective · quest chain continues.
- **Config sketch.** *New hooks:* `TERRAIN["fungushollow"]` (branching); the **status system**
  (`poisoned` timer + HUD + resistances); `Entities.register` for `toadstool` (ranged
  spitter), `sporecloud` (poison zone), `bouncecap`, `myconid` (mini-elite);
  `QUEST_TYPES["fetch-from"]`; items `antidote`, `sporemask`, `mooncap`. `levels.json`:
  `terrain:"fungushollow"`, `enemies:[{kind:"toadstool",…}×n, {kind:"myconid",…}]`,
  `quest:{type:"fetch-from", label:"Fetch the Mooncap for Bramble"}`.

## 3·3 — Firefly Grove *(new)*

- **Role.** **The Moonlit Rite → Ultimate (R) unlock**; a stealth-ritual climax before the
  Grizzly. The biome's power payoff.
- **Theme & mood.** A serene moonlit clearing adrift with fireflies, ringed by an ancient
  shrine of three lanterns. Hushed, sacred, luminous — the held breath before the boss.
- **Map & layout.** An **open grove** (≈1700×1300) centered on the **shrine**: three unlit
  **lanterns** in a triangle around a central altar. **Firefly swarms** drift through — you
  **lead** them (move gently; sprinting scatters the swarm) to each lantern to relight it.
  A **patrolling threat** (the Grizzly's roaming shadow / a Guardian-beast) sweeps the grove
  with a **sight cone**; **firefly-light pools are safe**, its cone is danger — pure stealth
  built on the light system from 3·1.
- **Objective.** **New clear type `ritual`** (shares tech with 2·2's `kindle`) — **"The
  Moonlit Rite"**: relight all **3 shrine lanterns** while avoiding the patrol. Completing it
  makes the **Grove Guardian awaken your dog's Ultimate (R)** — implemented like the Boss-1
  ability unlock (an `ultimateUnlocked` flag + an **"Ultimate Awakened!"** tip) — and opens
  the path to the Old Grizzly. The Mooncap from 3·2 is consumed in the rite (chain finale).
- **NPCs.** The **Grove Guardian** (owl/forest spirit — sets the rite, delivers lore, and
  awakens the Ultimate); **Bramble the Alchemist** (chain finale, brings the Mooncap into the
  rite); Marla's woodland stall.
- **Enemies & hazards.** The **patrolling Guardian-beast / Grizzly-shadow** — a stealth threat
  to **avoid, not fight** (its sight cone; getting caught knocks you back and re-darkens a
  lantern). Dark gaps between firefly pools; the **firefly-scatter** penalty for moving fast.
- **Critters & friends.** Fireflies (the central mechanic + ambient), owls, a fawn (greet).
- **Chests & loot.** silver + a **golden "shrine offering"** chest revealed when the rite
  completes. Loot: a light-relic preview, feasts for the boss.
- **Features.** **The Moonlit Rite** stealth-ritual · **Ultimate (R) unlock** (the milestone)
  · **firefly-swarm leading** mechanic · sight-cone **stealth** payoff of the light system.
- **Config sketch.** *New hooks:* `TERRAIN["fireflygrove"]`; `Entities.register` for
  `shrinelantern` (interactable, lit/unlit), `fireflyswarm` (leadable light), `patrol`
  (sight-cone stealth enemy), `groveguardian` NPC; `QUEST_TYPES["ritual"]`; the **Ultimate
  unlock** hook (`ultimateUnlocked` flag on the player + wire the reserved **R** slot + an
  `'ultimate'` Tip). `levels.json`: `terrain:"fireflygrove"`,
  `npcs:[{name:"Grove Guardian",…, quest:{type:"ritual", …}}]`, `chests:["silver","golden"]`,
  `quest:{type:"ritual", label:"Complete the Moonlit Rite"}`, `next:"woods-boss"`.

**Biome-3 net-new code:** darkness/light overlay + stealth-by-light; status system
(`poisoned`); entity kinds `lanternpost`, `shadowlurker`, `willowisp`, `toadstool`,
`sporecloud`, `bouncecap`, `myconid`, `shrinelantern`, `fireflyswarm`, `patrol`,
`groveguardian`; terrains `mossytrail`, `fungushollow`, `fireflygrove`; quest types
`deliver`, `fetch-from`, `ritual`; items `torch`, `lanternoil`, `antidote`, `sporemask`,
`mooncap`; **the Ultimate/R-slot unlock** (`ultimateUnlocked` + tip), mirroring the existing
`abilitiesUnlocked` pattern.

---

## Build-order suggestion (these six levels)

1. **2·2 Frozen Pass** — stands up the **warmth meter + `chilled` status + `kindle`**
   objective; the reusable meter/relight tech underpins the tundra and the woods shrine.
2. **2·3 Cliffside Climb** — hazard-dodging (**rockfall/crumble/wind**) + **mini-elite**;
   feeds directly into the first real boss.
3. **3·1 Mossy Trail** — the **darkness/light + stealth** system, reused by 3·3 and the caves
   of later biomes.
4. **3·2 Fungus Hollow** — the **status system (`poisoned`)** + ranged enemies + branching.
5. **3·3 Firefly Grove** — the **ritual objective + Ultimate unlock**, reusing the light
   system (patrol cone) and the relight tech from 2·2.
6. Backfill **2·1** with the `defeat` side-quest + Rusk's combat tutorial once combat tuning
   from 2·2/2·3 settles.

Each is additive: mostly a new `levels.json` entry + a named terrain builder + a handful of
`Entities.register` kinds + (occasionally) one `Quests.TYPES` entry — the same shape the first
biome already proves out.
