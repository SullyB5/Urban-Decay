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

## Controls

Desktop: mouse to look (click to lock), WASD move, Shift run, click shoot, R reload, Q swap weapon, hold E to search, F flashlight, Tab pack, M map, 1–4 eat / drink / medkit / Rad-Away.
Phones: left thumb moves, right thumb looks, FIRE, hold USE to search, tap the minimap for the full map.

## Files

- `index.html` · HUD, tower panel, overlays
- `js/core.js` · renderer, helpers, colliders, ground height
- `js/world.js` · procedural nuked city, crater, traffic, landmarks, loot spots, fires, smoke, crows
- `js/audio.js` · synthesized sound (WebAudio)
- `js/actors.js` · enemies, survivors, tracers
- `js/game.js` · survival loop, tower building, crafting, combat, HUD, save

Built with three.js r128 from cdnjs as a static site. Progress saves to the browser's local storage.
