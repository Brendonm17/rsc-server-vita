// https://classic.runescape.wiki/w/Monastery_(Prayer_Guild)
// https://classic.runescape.wiki/w/Transcript:Brother_Jered

const ABBOT_LANGLEY_ID = 174;
const LADDER_ID = 198;

async function onGameObjectCommandOne(player, gameObject) {
    if (gameObject.id !== LADDER_ID) {
        return false;
    }

    const { world } = player;
    const joinedPrayerGuild = !!player.cache.joinedPrayerGuild;

    if (joinedPrayerGuild) {
        player.climb(gameObject, true);
    } else {
        const abbotLangley = world.npcs.getByID(ABBOT_LANGLEY_ID);

        if (!abbotLangley || abbotLangley.interlocutor) {
            player.message('Abbot Langley is busy at the moment.');
        } else {
            player.engage(abbotLangley);

            await abbotLangley.say('Only members of our order can go up there');

            const choice = await player.ask(
                ['Well can i join your order?', 'Oh sorry'],
                false
            );

            switch (choice) {
                case 0: // join
                    await player.say('Well can I join your order?');

                    if (player.skills.prayer.current >= 31) {
                        await abbotLangley.say(
                            'Ok I see you are someone suitable for our order',
                            'You may join'
                        );

                        player.cache.joinedPrayerGuild = true;
                        player.climb(gameObject, true);
                    } else {
                        await abbotLangley.say(
                            'No I feel you are not devout enough'
                        );

                        player.message('You need a prayer level of 31');
                    }
                    break;
                case 1: // sorry
                    await player.say('Oh sorry');
                    break;
            }

            player.disengage();
        }
    }

    return true;
}

// Brother Jered talk handling moved to npcs/edgeville/brother-jered.js;
// the inline copy here registered first and shadowed it

module.exports = { onGameObjectCommandOne };
