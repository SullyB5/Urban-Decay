/* Urban Decay · rooms: floor plans for every building you can walk into.
   One character is a 2 m square.
     #  wall        =  window       X  door out        ^ v  stairs up / down
     .  floor       :  survivor spot (tower)            1 2 3 4  ghoul · rad hound · raider · glowing brute
   Searchable:  f food shelf · w water · m medicine · a ammo crates · g gun rack · s scrap · t electronics
                c wardrobe · u fuel drums · $ safe · n fridge · e drawers
   Stations:    B shelter bench · W workshop · K kitchen · M medical · L stash lockers · T tower plans · R radio
                P purifier · G power · H farm · D turret console · Z bed · C camp stove · V scrap workbench
   Furniture:   o table · d desk · N desk with a note · k shelf · p pillar · x rubble · y cot · j pew · q crates */
(function(){
'use strict';
const UD=window.UD;if(!UD||UD.failed)return;

/* ---------- Meridian Tower: 11 x 11, stairs in the north-west corner, the street door on the south face ---------- */
const TF={
  shelter:['^#Z.Z.Z.L','........L','.:...o...','.....o.:.','k.......R','k...o....','.........','B.......C','B..qq.q..'],
  lobby:  ['^v.......','.........','qq..:...T','.........','.o.....R.','.o.......','.........','L.......q','L..d.d..q'],
  quarters:['^v.......','.........','Z.Z.Z.Z.k','.........','..:...:..','.........','Z.Z.Z.Z.k','.........','oo..:..oo'],
  storage:['^v.......','.........','.qq.L.qq.','.qq.L.qq.','.........','.qq.L.qq.','.qq...qq.','.........','k.k.:.k.k'],
  workshop:['^v.......','.........','WW...q.WW','.........','..o...o..','..o.:.o..','.........','q.......W','qq.k.k..W'],
  kitchen:['^v.......','.........','KK.kk.KK.','.........','.oo...oo.','.oo.:.oo.','.........','k........','kk.:...kk'],
  purifier:['^v.......','.........','.P.P.P.P.','.........','.........','.P.P.:.P.','.........','.........','G.q...q.k'],
  medbay:['^v.......','.........','y.y.y...k','.........','....:....','M...M....','.........','y.y.y..:k','.......kk'],
  generator:['^v.......','.........','.GG...GG.','.GG...GG.','.........','....:....','.q.q.....','.........','qq.....kk'],
  solar:['^v.......','.........','..G......','.........','.q.q.q.q.','.........','.q.q.q.q.','.........','....:....'],
  farm:['^v.......','.........','HH.HH.HH.','.........','HH.HH.HH.','.........','HH.HH.HH.','.........','P..:...kk'],
  defense:['^v.......','.........','....D....','.........','q.d...d.q','.........','..:...:..','.........','kk.....kk'],
  radio:['^v.......','.........','RR.....RR','.........','..o.o.o..','..o.o.o..','.....:...','.........','kk.d.d.kk'],
  gutted:['^v.......','.........','..x...x..','.x.......','.....x...','..T......','.x....xx.','.........','x..x.....'],
};
// fl: -1 shelter · 0 lobby · 1..n built floors · n+1 the gutted floor you build next
function towerMap(kind,fl,canUp){
  const inner=TF[kind].map(r=>r.split(''));
  if(!canUp)inner[0][0]='#';
  if(fl===-1)inner[0][1]='#';
  const rows=[];
  for(let j=0;j<11;j++){let r='';
    for(let i=0;i<11;i++){
      const edge=i===0||j===0||i===10||j===10;
      if(!edge){r+=inner[j-1][i-1];continue;}
      if(fl===0&&j===10&&i===5){r+='X';continue;}
      const corner=(i===0||i===10)&&(j===0||j===10);
      const win=fl>=1&&!corner&&((j===0||j===10)?[3,4,6,7].includes(i):[3,4,6,7].includes(j))&&!(i===0&&j<3)&&!(j===0&&i<3);
      r+=win?'=':'#';}
    rows.push(r);}
  return rows;}

/* ---------- places out in the city ---------- */
const P={
  houseA:{name:'Abandoned house',theme:'house',map:[
    '#########',
    '#Z.c#n.C#',
    '#...#...#',
    '#e..#..f#',
    '##.###.##',
    '=.......=',
    '#o.1..Nw#',
    '####X####']},
  houseB:{name:'Burnt-out house',theme:'house',map:[
    '##########',
    '#c.Z##n.C#',
    '#....#...#',
    '#e...#.o.#',
    '###.##...#',
    '=k.......=',
    '#o..1..eN#',
    '#####X####']},
  grocery:{name:'Corner grocery',theme:'shop',map:[
    '############',
    '#uq#ff.ff.w#',
    '#..........#',
    '#q.#ff.ff.w#',
    '####.......#',
    '#N.d.d..1..#',
    '#..........#',
    '#####X######']},
  pharmacy:{name:'Pharmacy',theme:'clinic',map:[
    '##########',
    '#m.m#.$.N#',
    '#...#....#',
    '#m.m##.###',
    '#........#',
    '#dd...1.w#',
    '=........=',
    '#####X####']},
  diner:{name:'Roadside diner',theme:'shop',map:[
    '##########',
    '#nC.k#f.e#',
    '#....#...#',
    '#dd.d###.#',
    '=........=',
    '#o.o..o.o#',
    '#....1...#',
    '####X#####']},
  hardware:{name:'Hardware store',theme:'industrial',map:[
    '##########',
    '#ss.tt.uu#',
    '#........#',
    '#k.k.k.k.#',
    '#........#',
    '#V...1..d#',
    '#.......N#',
    '###X######']},
  pawn:{name:'Pawn shop',theme:'shop',map:[
    '##########',
    '#$.#g..t.#',
    '#..#.....#',
    '#.##.e.e.#',
    '#........#',
    '#d.d.d.3.#',
    '=........=',
    '#####X####']},
  office:{name:'Office lobby',theme:'office',map:[
    '############',
    '#d.d.#$..N.#',
    '#....#.....#',
    '#d.d.##.####',
    '#..........#',
    '#e.o.o..1..#',
    '#.....p....#',
    '#t..e...d..#',
    '######X#####']},
  warehouse:{name:'Warehouse',theme:'industrial',map:[
    '##############',
    '#qq.ss.uu.qq.#',
    '#............#',
    '#qq.qq..qq.qV#',
    '#.......2....#',
    '#qq.qq..qq.q.#',
    '#.1..........#',
    '#s...u.....aN#',
    '#######X######']},
  gasshop:{name:'Fuel stop shop',theme:'shop',map:[
    '#########',
    '#ff.w.uu#',
    '#.......#',
    '#ff.d.N.#',
    '=.......=',
    '#..1...C#',
    '####X####']},
  hospital:{name:'St. Jude Hospital',theme:'clinic',map:[
    '################',
    '#y.y.y#m.m#Z.N.#',
    '#.....#...#....#',
    '#y.y.y##.###.#.#',
    '#....1.........#',
    '#.d.d......2...#',
    '=..............=',
    '#m#.###.##.###.#',
    '#e#.#m..#..#c..#',
    '#...#...#.4#...#',
    '#######X########']},
  market:{name:'MegaMart',theme:'shop',map:[
    '##################',
    '#uq.s.q#n.n.n.n.w#',
    '#......#.........#',
    '#q.1...#.ff.ff.f.#',
    '####.###.........#',
    '#f.......ff.ff.f.#',
    '#f..2............#',
    '#f.......ww.ww.w.#',
    '#w......1........#',
    '#..dd.dd.........#',
    '#.N.........3....#',
    '#######X##########']},
  church:{name:'St. Brigid Church',theme:'church',map:[
    '#############',
    '#c.e#.N.#f.w#',
    '#...#.d.#...#',
    '##.##...##.##',
    '=...........=',
    '#jj.jj.jj.jj#',
    '=...........=',
    '#jj.jj.jj.jj#',
    '=.....1.....=',
    '#jj.jj.jj.jj#',
    '#...........#',
    '######X######']},
  library:{name:'Public Library',theme:'library',map:[
    '##############',
    '#kkk.kkk.#N..#',
    '#........#..$#',
    '#kkk.kkk.##.##',
    '=............=',
    '#.o.o..kk.kk.#',
    '#.o.o..1.....#',
    '=......kk.kk.=',
    '#e..d.....t..#',
    '######X#######']},
  theater:{name:'Palace Theater',theme:'theater',map:[
    '##############',
    '#c.c#.N..#u.s#',
    '#...#....#...#',
    '##.###..###.##',
    '#............#',
    '#.dddddddddd.#',
    '#............#',
    '#jjj.jjjj.jjj#',
    '#.....2......#',
    '#jjj.jjjj.jjj#',
    '#.....1......#',
    '######X#######']},
  vaultKilo:{name:'Vault Kilo',theme:'vault',vault:true,map:[
    '####################',
    '#a.g.#f.f.w#Z.Z.Z.c#',
    '#....#.....#.......#',
    '#a..g#..1..#.Z..ZN.#',
    '###.###.#######.####',
    '#.......2..........#',
    '#.p....p....p....p.#',
    '#....1.............#',
    '###.#####.##.#######',
    '#m..#u.t..#..V.C..R#',
    '#...#.....#........#',
    '#m.$#.4..t#...e.o..#',
    '#...#.....###.######',
    '#############X######']},
  vault7:{name:'Bunker 7',theme:'vault',vault:true,map:[
    '##################',
    '#R.t.#.......#g.a#',
    '#....#..p.p..#...#',
    '#N.e.#...2...#a.g#',
    '##.###.......##.##',
    '#......p...p.....#',
    '#..1.........1...#',
    '####.###.###.#####',
    '#f.f.#Z.Z#m.....$#',
    '#....#...#...4...#',
    '#w.w.#Z.c#m......#',
    '#....#...#####.###',
    '#.V.C.........1..#',
    '########X#########']},
  vaultDelta:{name:'Shelter Delta',theme:'vault',vault:true,map:[
    '################',
    '#g.a.#c.Z.Z.Z.N#',
    '#....#.........#',
    '#a.g.###.#######',
    '##.#...........#',
    '#..#.p..p..p.2.#',
    '#..#...........#',
    '#..#####.####.##',
    '#f.f.w.#..1#...#',
    '#......#...#.4.#',
    '#f.f.w.#.m.#.$.#',
    '#..1...#.m.#...#',
    '#.C.V...R......#',
    '#######X########']},
};

/* ---------- notes left behind (shown when you read a desk) ---------- */
const NOTES={
  house:['Grocery list on the back of a power bill: rice, candles, batteries, the good dog food. Underlined three times: GAS FOR THE CAR.',
    'Kids drew the house in crayon. Someone added a stick figure on the roof waving at a helicopter that never came.',
    'If you find this, the spare key to the cellar is taped under the stove. There is nothing down there now. We took it all.'],
  shop:['Till receipt, last sale 6:41 PM. Bottled water x24, canned beans x12. Paid in cash, no change given.',
    'Staff notice: DO NOT open the back door after dark. The noises are just the wind. Probably.'],
  clinic:['Triage board, half wiped: burns left, rad sickness right, walking wounded go home. Nobody went home.',
    'Inventory: iodide tablets OUT. Saline OUT. Morphine — locked cabinet, key with Dr. Ames. Dr. Ames gone.'],
  office:['Quarterly targets memo, coffee ring on the corner. Someone wrote across it in red: it does not matter now.',
    'Building announcement: in the event of an emergency, proceed calmly to Meridian Tower civil defense shelter.'],
  industrial:['Shift log: forklift 3 out of service, generator fuel at half, night crew did not show. Locking up early.',
    'Scrawled on a clipboard: the water main on Harbor is still clean if you run it ten minutes first.'],
  church:['Hand-lettered sign: soup at noon, cots after dark, no weapons past the doors. Signed Father Reyes.',
    'A list of names pinned by the altar. Some crossed out. Some circled with the word FOUND.'],
  library:['Return slip for a book on water purification, three weeks overdue. Under it: thanks for the book, sorry about the fee.',
    'Reading room log: 14 people slept here night one, 9 night two, 3 night three. The rest of the page is blank.'],
  theater:['Program for the last show. On the back, in pencil: the stage door sticks, lift and push.',
    'Usher\'s note: if the alarms go, take the crowd out through the lobby. Do not use the basement. Flooded.'],
  vault:['Vault directive: the door seals at T+40 minutes regardless of who is still outside. Do not reopen for any reason.',
    'Day 19. Air scrubber 2 failed. Kessler went topside to look for parts. The door would not let him back in.',
    'Armory count is short. Somebody has been taking rounds one at a time. I know who. I am not saying.',
    'Radio log: we hear Meridian on the short band every night at 21:00. They are still alive up there.'],
};
const NPC_LINES=['Raiders were scouting the east side again last night.','Ten floors up and you can see the whole dead city. Keep building.',
  'I found canned peaches once. Best day since the bomb.','The storms come in from the crater side. Watch the sky to the east.',
  'If you go into the old vaults, take a pry bar and a lot of ammo.','Boil anything you drink. Anything.',
  'The hounds hunt in packs at night. Go out by day if you can.','We heard engines out past the highway. Could be raiders, could be trade.',
  'Somebody has to keep the generator fed. Bring fuel when you can.','Glad you came back. Not everybody does.'];

UD.ROOMS={towerMap,TF,P,NOTES,NPC_LINES};
})();
