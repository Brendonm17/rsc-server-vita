// kebab: random effect on eating

const KEBAB_ID = 210;
const BOOSTABLE_SKILLS = ['attack', 'strength', 'defense'];

function random(low, high) {
    return low + Math.floor(Math.random() * (high - low + 1));
}

// only boosts a stat that isn't already above its base
function boostSkill(player, skillName, boost) {
    const skill = player.skills[skillName];

    if (skill.current <= skill.base) {
        skill.current += boost;
    }
}

function healHits(player, amount) {
    if (amount <= 0) {
        return;
    }

    const hits = player.skills.hits;

    if (hits.current < hits.base) {
        hits.current = Math.min(hits.current + amount, hits.base);
    }
}

async function onInventoryCommand(player, item) {
    if (item.id !== KEBAB_ID) {
        return false;
    }

    player.inventory.remove(KEBAB_ID);
    player.sendSound('eat');

    const { world } = player;

    player.message('@que@You eat the Kebab');

    let hpRestored = 0;
    const rand = random(0, 31);

    if (rand === 0) {
        // 1/32: 2-4 damage, can never kill (floor at 1)
        player.message('@que@That tasted a bit dodgy');
        player.message('You feel a bit ill');

        const hits = player.skills.hits;

        if (hits.current > 2) {
            const dmg = random(2, 4);
            hits.current = Math.max(hits.current - dmg, 1);
        }
    } else if (rand <= 1) {
        // 1/32: stat boost + 30 hp heal
        player.message('@que@Wow that was an amazing kebab!');
        player.message('You feel slightly invigorated');

        const boost = random(1, 3);

        for (const skillName of BOOSTABLE_SKILLS) {
            boostSkill(player, skillName, boost);
        }

        hpRestored = 30;
    } else if (rand <= 8) {
        // 7/32: heal 10-20
        player.message('@que@That was a good kebab');
        await world.sleepTicks(2);
        player.message('You feel a lot better');
        hpRestored = random(10, 20);
    } else if (rand <= 28) {
        // 20/32: heal 10% of max hits
        player.message('@que@It heals some health');
        hpRestored = Math.floor((player.skills.hits.base * 10) / 100);
    } else {
        // 3/32: nothing
        player.message("@que@The kebab didn't seem to do a lot");
    }

    healHits(player, hpRestored);
    player.sendStats();

    return true;
}

module.exports = { onInventoryCommand };
