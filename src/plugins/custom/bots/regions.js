// named regions of the world with situational sayings, so a bot knows where it is by name
// regionAt(x, y) returns the most specific named place a tile falls in (specific to broad, first hit wins)

// { name, box:[minX,maxX,minY,maxY], type, says:[...] }
const REGIONS = [
    // lumbridge & around
    { name: 'Lumbridge Castle', box: [110, 135, 640, 670], type: 'town',
      says: ["Back at Lumbridge castle.", "The old starting grounds.", "Home sweet Lumbridge."] },
    { name: 'Lumbridge', box: [100, 165, 630, 700], type: 'town',
      says: ["Good old Lumbridge.", "Cows and chickens, the classics.", "Everyone starts here."] },
    { name: 'Lumbridge Swamp', box: [120, 200, 700, 760], type: 'wild',
      says: ["Watch your step in the swamp.", "Muddy down here.", "Big frogs about."] },
    { name: 'the Al-Kharid mine', box: [55, 95, 520, 570], type: 'skill',
      says: ["Good rocks in this mine.", "Plenty of ore here.", "Mining country."] },
    { name: 'Al-Kharid', box: [60, 140, 590, 705], type: 'town',
      says: ["Al-Kharid, gateway to the desert.", "Mind the toll gate.", "Scimitars and scorpions."] },
    { name: 'the Duel Arena', box: [60, 130, 560, 600], type: 'town',
      says: ["Fancy a duel?", "Stakes are high at the arena.", "Winner takes all."] },

    // draynor
    { name: 'Draynor Manor', box: [200, 235, 590, 620], type: 'town',
      says: ["Spooky old manor.", "Vampires and worse in there.", "Draynor Manor gives me chills."] },
    { name: 'Draynor Village', box: [195, 240, 620, 660], type: 'town',
      says: ["Draynor Village, willows by the water.", "Master Farmer's got the seeds.", "Wine of Zamorak country."] },

    // varrock & around
    { name: 'Varrock Palace', box: [130, 175, 440, 480], type: 'town',
      says: ["The palace of Varrock.", "Royalty lives well.", "Mind the guards."] },
    { name: 'Varrock', box: [95, 200, 440, 530], type: 'town',
      says: ["Varrock, the grand city.", "Busiest square in the land.", "Everything's for sale in Varrock.", "Sword shop, armour, you name it."] },
    { name: 'Barbarian Village', box: [210, 260, 490, 530], type: 'town',
      says: ["Barbarians and helmets here.", "Rowdy lot, the barbarians.", "Peksa does a good helm."] },
    { name: 'Edgeville', box: [200, 245, 440, 490], type: 'town',
      says: ["Edgeville, edge of the wild.", "Careful - the wilderness is right there.", "Bank up before you go north."] },

    // falador & west
    { name: 'Falador Park', box: [280, 330, 510, 545], type: 'town',
      says: ["Nice gardens in Falador park.", "Peaceful here for once.", "Smell the flowers."] },
    { name: 'Falador', box: [250, 360, 510, 580], type: 'town',
      says: ["Falador, city of white knights.", "The mining guild's near.", "Grand old Falador."] },
    { name: 'Port Sarim', box: [250, 300, 620, 680], type: 'town',
      says: ["Port Sarim, ships to everywhere.", "Smell that sea air.", "Fancy a boat to Karamja?", "Fishermen and sailors here."] },
    { name: 'Rimmington', box: [300, 360, 660, 710], type: 'town',
      says: ["Quiet little Rimmington.", "Good clay and copper nearby.", "Crafting guild's just west."] },

    // karamja (island)
    { name: 'Karamja', box: [300, 560, 690, 780], type: 'island',
      says: ["So this is Karamja.", "Jungle island, watch for scorpions.", "Volcano smoke on the air.", "Bit of an adventure, this."] },

    // wilderness bands (low y = deep)
    { name: 'the deep Wilderness', box: [40, 340, 90, 245], type: 'wild',
      says: ["Deep wild - this is where legends die.", "Only the brave come this far.", "Everyone out here wants me dead.", "No mercy this deep."] },
    { name: 'the mid Wilderness', box: [40, 340, 245, 360], type: 'wild',
      says: ["Mid wild, staying sharp.", "Good hunting, if you can survive it.", "Eyes on every shadow."] },
    { name: 'the Wilderness', box: [40, 340, 360, 426], type: 'wild',
      says: ["The wilderness proper now.", "PKers about, no doubt.", "One toe over the ditch and it's on."] },
    { name: 'the edge of the Wilderness', box: [40, 340, 408, 430], type: 'wild',
      says: ["Right on the wilderness edge.", "Careful past here.", "Last safe-ish spot before the wild."] }
];

// broad fallback by rough area when no named region matches.
const FALLBACKS = [
    { box: [40, 340, 90, 430], name: 'the Wilderness', type: 'wild',
      says: ["Somewhere in the wild.", "Dangerous ground.", "Keep moving out here."] },
    { box: [0, 700, 430, 800], name: 'the countryside', type: 'field',
      says: ["Out in the open country.", "Just the road and the fields.", "Nice and quiet out here."] }
];

function inBox(x, y, b) {
    return x >= b[0] && x <= b[1] && y >= b[2] && y <= b[3];
}

// most specific named place a tile is in (or a broad fallback / null).
function regionAt(x, y) {
    for (const r of REGIONS) {
        if (inBox(x, y, r.box)) {
            return r;
        }
    }
    for (const r of FALLBACKS) {
        if (inBox(x, y, r.box)) {
            return r;
        }
    }
    return null;
}

module.exports = { REGIONS, regionAt };
