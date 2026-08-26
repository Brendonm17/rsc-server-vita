
const NpcId = {
    GNOME_TRAINER_ENTRANCE: 576,
    GNOME_TRAINER_STARTINGNET: 577,
    GNOME_TRAINER_PLATFORM: 578,
    GNOME_TRAINER_ENDINGNET: 579
};

const TRAINER_IDS = new Set(Object.values(NpcId));

async function onTalkToNPC(player, npc) {
    if (!TRAINER_IDS.has(npc.id)) {
        return false;
    }

    if (npc.id === NpcId.GNOME_TRAINER_ENTRANCE) {
        await player.say('hello, what is this place?');
        await npc.say(
            'this my friend, is where we train',
            'it improves our agility, an essential skill'
        );
        await player.say('looks easy enough');
        await npc.say(
            'if you complete the course...',
            'from the slippery log to the end',
            'your agilty will increase much faster..',
            '.. than repeating one obstical'
        );
    } else if (npc.id === NpcId.GNOME_TRAINER_STARTINGNET) {
        await player.say('hello');
        await npc.say(
            "this isn't a granny's tea party",
            "let's see some sweat human",
            'go, go ,go ,go'
        );
    } else if (npc.id === NpcId.GNOME_TRAINER_PLATFORM) {
        await player.say('this is fun');
        await npc.say(
            'this is training soldier',
            'if you want fun, go make some cocktails'
        );
    } else if (npc.id === NpcId.GNOME_TRAINER_ENDINGNET) {
        await player.say('hello');
        await npc.say('hi');
        await player.say('how are you?');
        await npc.say(
            'im amazed by how much you humans chat',
            "the sign say's training area...",
            '..not pointless conversation area',
            'now move it soldier'
        );
    }

    return true;
}

module.exports = { onTalkToNPC };
