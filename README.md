# Vista 3D: Urban Decay

A wasteland survival build in the Vista 3D series. The bomb fell east of downtown: a glassed crater, a ring of flattened stumps and bare steel frames, leaning and sheared towers, and a dead evacuation jammed bumper to bumper across every avenue. Your fallout shelter under **Meridian Tower**, at the center of the city, survived.

**Core loop:** prepare in the tower → pick an expedition → scavenge and survive → come home with supplies → build the next floor → push farther out.

## What's in it

- **Survival:** health, food, water, radiation, stamina, and day/night temperature swings (cold nights, scorching middays). Toxic storms roll in with a radio warning, thicken the air and raise radiation everywhere.
- **The tower:** ten gutted floors to rebuild, each with a purpose: Living Quarters, Storage Hall, Workshop, Kitchen, Water Purifier, Medical Room, Generator, Solar Deck, Hydroponic Farm, Defense Platform (roof turrets), Radio Room. Roof gear climbs as the tower grows.
- **Settlement:** power supply and demand, fuel burn, rain catchers, farming, survivors who arrive (Radio Room), eat, scavenge, and leave if you starve them. Night raids on the tower.
- **Crafting:** from a pry bar, snare line and boiled water at the shelter bench up to firearms, plate vests, rad suits, rucksacks, ammo presses and turret servos.
- **Expeditions:** landmarks with themed loot (hospital meds, MegaMart food, fuel stops, military checkpoints, a downed gunship, raider camps, the stadium stronghold, ground zero tech). Danger and loot scale with distance from home. Sealed bunkers in the outer wastes appear once you build a Radio Room.
- **Hostiles:** ghouls, rad hounds (hunt them for meat), raiders with rifles, and glowing brutes near the crater. Die out there and your pack is gone.

## Going inside

Every lamp-lit door in the city is a walk-in building, drawn room by room from floor plans in `js/rooms.js`.

- **Meridian Tower** is fully walkable: the fallout shelter (B1) with bunks, stash lockers, a radio table and the shelter bench, the fortified lobby with the tower plans board, and every floor you build (Living Quarters, Kitchen, Workshop, Medical Room, Farm, Generator and the rest), each with its own stations. The next floor up is a gutted construction site; build it from the plans board. Survivors you take in live on the floors and have things to say.
- **Stations:** walk up and press E. Benches craft from the stash at home; camp stoves and scrap workbenches found out in the city craft from your pack (boil water, roast meat, wasteland stew, hand-loaded ammo, pry bar, rebar machete, canteen filter). Beds let you sleep through the night once a building is clear.
- **Buildings:** houses, groceries, pharmacies, diners, hardware stores, pawn shops, office lobbies and warehouses, plus St. Jude Hospital, MegaMart, St. Brigid Church, the Public Library, the Palace Theater and the fuel stops. Search shelves, fridges, wardrobes, safes, med cabinets, ammo crates and gun racks; read the notes people left behind.
- **Vaults:** Vault Kilo, Bunker 7 and Shelter Delta in the outer wastes. Force the hatch with a pry bar, fight through the dark, and loot the armory, pantry and med bay. Gun racks hand over weapons and armor you do not have yet, and the vault radio logs the other bunkers. Once cleared, a vault makes a safe outpost with its own stove, bench and bunks.
- Hostiles inside hunt you along the floor plan; shots and sight lines stop at walls. Cleared buildings stay quiet for a few days, and searched containers restock slowly (vault stock never does).

## Controls

Desktop: mouse to look (click to lock), WASD move, Shift run, E to use, enter, climb and search (hold to search), click shoot, R reload, Q swap weapon, F flashlight, Tab pack, M map, Esc closes panels, 1–4 eat / drink / medkit / Rad-Away.
Phones: left thumb moves, right thumb looks, FIRE, USE for doors, stairs, benches and searching, tap the minimap for the full map.

## Files

- `index.html` · HUD, tower panel, overlays
- `js/core.js` · renderer, helpers, colliders, ground height
- `js/world.js` · procedural nuked city, crater, traffic, landmarks, loot spots, fires, smoke, crows
- `js/audio.js` · synthesized sound (WebAudio)
- `js/actors.js` · enemies, survivors, tracers
- `js/rooms.js` · floor plans for the tower and every walk-in building, notes, survivor lines
- `js/interior.js` · builds rooms from the plans, indoor collision and sight, lighting, indoor hostiles
- `js/game.js` · survival loop, tower building, crafting, combat, HUD, save

Built with three.js r128 from cdnjs as a static site. Progress saves to the browser's local storage.
