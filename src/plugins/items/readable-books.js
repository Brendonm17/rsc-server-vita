// flavour text for read-only books, notes and certificates (many items, one file)

const DIARY_ID = 537;
const TOURIST_GUIDE_ID = 706;
const SCRUFFY_NOTE_ID = 781;
const TREE_GNOME_TRANSLATION_ID = 918;
const GLOUGHS_JOURNAL_ID = 921;
const INVOICE_ID = 922;
const GLOUGHS_NOTES_ID = 926;
const OLD_JOURNAL_ID = 1005;
const NULODIONS_NOTES_ID = 1056;
const TECHNICAL_PLANS_ID = 1060;
const INSTRUCTION_MANUAL_ID = 1073;
const BOOK_OF_EXPERIMENTAL_CHEMISTRY_ID = 1141;
const LEVEL_1_CERTIFICATE_ID = 1142;
const LEVEL_2_CERTIFICATE_ID = 1143;
const LEVEL_3_CERTIFICATE_ID = 1144;
const DIGSITE_SCROLL_ID = 1173;
const STONE_TABLET_ID = 1174;

async function sayLines(player, lines) {
    for (const line of lines) {
        player.message(line);
    }
}

async function handleInstructionManual(player) {
    player.message('@que@the manual has four pages');
    await player.world.sleepTicks(3);

    const option = await player.ask(
        ['Constructing the cannon', 'Making ammo', 'firing the cannon', 'warrenty'],
        false
    );

    if (option === 0) {
        await sayLines(player, [
            'Constructing the cannon',
            ' ',
            'To construct the cannon, firstly set down Dwarf cannon base on the ground.',
            ' ',
            'Next add the Dwarf cannon stand to the Dwarf cannon base.',
            ' ',
            'Then add the Dwarf cannon barrels (this can be tiring work).',
            ' ',
            'Last of all add the Dwarf cannon furnace which powers the cannon.',
            ' ',
            'You should now have a fully set up dwarf multi cannon ready to go splat some nasty creatures.',
            ' ',
            ' ',
            '@red@WARNING: You should be well rested before attempting to @red@lift the heavy cannon'
        ]);
    } else if (option === 1) {
        await sayLines(player, [
            'Making ammo',
            ' ',
            'The ammo for the cannon is made from steel bars.',
            ' ',
            'Firstly you must heat up a steel bar in a furnace',
            ' ',
            'Then pour the molten steel into a cannon ammo mould',
            ' ',
            'You should now have a ready to fire multi cannon ball'
        ]);
    } else if (option === 2) {
        await sayLines(player, [
            'Firing the cannon',
            ' ',
            'The cannon will only fire when monsters are available to target.',
            ' ',
            'If you are carrying enough ammo the multi cannon will fire up to 20 rounds before stopping.',
            ' ',
            'The cannon will automatically target non friendly creatures.',
            ' ',
            '@red@Warning - firing the cannon is exhausting work and can @red@leave adventurers too fatigued to carry the cannon, so @red@rest well before using'
        ]);
    } else if (option === 3) {
        await sayLines(player, [
            '@red@Dwarf cannon warrenty',
            ' ',
            'If your cannon is stolen or lost, after or during being set up, the dwarf engineer will happily replace the parts',
            ' ',
            'However cannon parts that were given away or dropped will not be replaced for free',
            ' ',
            'It is only possible to operate one cannon at a time',
            ' ',
            ' ',
            ' ',
            'by order of the dwarwven black guard'
        ]);
    }
}

async function handleTouristGuide(player) {
    const { world } = player;

    player.message('@que@You read the guide');
    await world.sleepTicks(3);
    await player.say(
        'This book is your guide to the vibrant city of Ardougne',
        'Ardougne is an exciting modern city',
        'Located on the sunny south coast of Kandarin'
    );
    player.message('@que@Pick a chapter to read');
    await world.sleepTicks(3);

    const chapter = await player.ask(
        [
            'Ardougne city of shopping',
            'Ardougne city of history',
            'Ardougne city of fun',
            'The area surrounding Ardougne',
            "I don't want to read this rubbish"
        ],
        false
    );

    if (chapter === 0) {
        const lines = [
            'Ardougne city of shopping',
            'Come sample the delights of the Ardougne market',
            'The biggest in the known world',
            'From spices to silk',
            'There is something here for everyone',
            'Other popular shops in the area include Zeneshas the armourer',
            'And the adventurers supply store'
        ];
        for (const line of lines) {
            player.message('@que@' + line);
            await world.sleepTicks(3);
        }
    } else if (chapter === 1) {
        const lines = [
            'Ardougne, city of history',
            'Ardougne is an important historical city',
            'One historic building is the magnificent Handelmort mansion',
            'Currently owned by Lord Franis Bradley Handelmort',
            'Ardougne castle in the east side of the city',
            'Is now open to the public',
            'and members of the holy order of ardougne paladins',
            'Still wander the streets'
        ];
        for (const line of lines) {
            player.message('@que@' + line);
            await world.sleepTicks(3);
        }
    } else if (chapter === 2) {
        const lines = [
            'Ardougne city of fun',
            "If you're looking for entertainment in Ardougne",
            'Why not pay a visit to Ardougne city zoo',
            'Or relax for a drink in the flying horse inn',
            'Or slaughter rats in Ardougne sewers'
        ];
        for (const line of lines) {
            player.message('@que@' + line);
            await world.sleepTicks(3);
        }
    } else if (chapter === 3) {
        const lines = [
            'The area surrounding Ardougne',
            'If you want to go further afield',
            'Why not have a look at the pillars of Zanash',
            'The mysterious marble pillars west of the city',
            'Or the town of Brimhaven, on exotic Karamja',
            'Is only a short boat ride away',
            'Ships leaving regularily from Ardougne harbour'
        ];
        for (const line of lines) {
            player.message('@que@' + line);
            await world.sleepTicks(3);
        }
    } else if (chapter === 4) {
        await player.say("I don't want to read this rubbish");
    }
}

async function handleTreeGnomeTranslation(player) {
    const { world } = player;

    player.message('@que@the book contains the alphabet...');
    await world.sleepTicks(3);
    player.message('@que@translated into the old gnome tounge');
    await world.sleepTicks(3);

    await sayLines(player, [
        '@yel@A = @red@:v  @yel@B = @red@x:   @yel@C = @red@za',
        '@yel@D = @red@qe  @yel@E = @red@:::   @yel@F = @red@hb',
        '@yel@G = @red@qa  @yel@H = @red@x   @yel@I = @red@xa',
        '@yel@J = @red@ve  @yel@K = @red@vo   @yel@L = @red@va',
        '@yel@M = @red@ql  @yel@N = @red@ha   @yel@O = @red@ho',
        '@yel@P = @red@ni  @yel@Q = @red@na   @yel@R = @red@qi',
        '@yel@S = @red@sol  @yel@T = @red@lat   @yel@U = @red@z',
        '@yel@V = @red@::  @yel@W = @red@h:   @yel@X = @red@:i:',
        '@yel@Y = @red@im  @yel@Z = @red@dim'
    ]);
}

async function handleGloughsJournal(player) {
    player.message('the book contains several hurried notes');

    const menu = await player.ask(
        ['the migration failed', 'they must be stopped', 'gaining support'],
        false
    );

    if (menu === 0) {
        await sayLines(player, [
            '@red@The migration failed',
            ' ',
            ' ',
            'After spending half a century hiding underground you would think that the great migration would have improved life on runescape for tree gnomes. However, rather than the great liberation promised to us by king Healthorg at the end of the last age, we have been forced to live in hiding ,up trees or in the gnome maze, laughed at and mocked by man. Living in constant fear of human aggression, we are in a no better situation now then when we lived in the caves',
            ' ',
            'Change must come soon'
        ]);
    } else if (menu === 1) {
        await sayLines(player, [
            '@red@They must be stopped',
            ' ',
            ' ',
            "Today I heard of three more gnomes slain by Khazard's human troops for fun, I cannot control my anger",
            ' ',
            ' ',
            'Humanity seems to have aquired a level of arrogance comparable to that of zamorak, killing and pillaging at will. We are small and at heart not warriors, but something must be done, we will pickup arms and go forth into the human world. We will defend ourselves and we will pursue justice for all gnomes who fell at the hands of humans'
        ]);
    } else if (menu === 2) {
        await sayLines(player, [
            '@red@gaining support',
            ' ',
            ' ',
            'Some of the local gnomes seem strangly deluded about humans, many actually believe that humans are not all naturally evil but instead vary from person to person',
            ' ',
            ' ',
            'This sort of talk could be the end for the tree gnomes and i must continue to convince my fellow gnome folk the cold truth about these human creatures, how they will not stop until all gnome life is destroyed - unless  we can destroy them first'
        ]);
    }
}

async function handleInvoice(player) {
    const { world } = player;

    player.message('@que@you open the invoice');
    await world.sleepTicks(3);

    await sayLines(player, [
        '@red@Order',
        ' ',
        ' ',
        '30 karamja battleships to be constructed in karamja',
        ' ',
        ' ',
        'Timber needed - 2000 tons',
        ' ',
        ' ',
        'Troops to be carried - 300'
    ]);
}

async function handleGloughsNotes(player) {
    const { world } = player;

    player.message('@que@the notes contain sketched maps and diagrams');
    await world.sleepTicks(3);
    player.message('@que@the text reads');
    await world.sleepTicks(3);

    await sayLines(player, [
        '@red@invasion',
        ' ',
        ' ',
        'Troops board three fleets at karamja',
        ' ',
        ' ',
        'Fleet one attacks misthalin from south',
        ' ',
        ' ',
        'Fleet two groups at crandor and attacks Asgarnia from west coast',
        ' ',
        ' ',
        'Fleet three sails north attack Kandarin from south rienforced by gnome foot soldiers leaving gnome stronghold',
        ' ',
        ' ',
        'All prisoners to be slain'
    ]);
}

async function handleDiary(player) {
    const { world } = player;
    const lines = [
        'Pentember the 3rd',
        'The experiment is going well - moved it to the wooden shed in the garden',
        'It does too much damage in the house',
        'Pentember the 6th',
        "Don't want people getting in back garden to see the experiment",
        'A guy called Professer Odenstein is fitting me a new security system',
        'Pentember the 8th',
        'The security system is done - by zamorak is it contrived!',
        'Now to open my own back door',
        'I lure a rat out of a hole in the back porch',
        'I fit a magic curved piece of metal to its back',
        'The rat goes back in the hole, and the door unlocks',
        'The prof tells me that this is cutting edge technology!'
    ];

    for (const line of lines) {
        player.message('@que@' + line);
        await world.sleepTicks(3);
    }
}

async function handleScruffyNote(player) {
    const { world } = player;
    const lines = [
        'The handwriting on this note is very scruffy',
        'as far as you can make out it says',
        'Got a bncket of nnlk',
        'Tlen qrind sorne lhoculate',
        'vnith a pestal and rnortar',
        'ald the grourd dlocolate to tho milt',
        'fnales add 5cme snape gras5',
        'you guess it really says something slightly different'
    ];

    for (const line of lines) {
        player.message('@que@' + line);
        await world.sleepTicks(3);
    }
}

async function handleTechnicalPlans(player) {
    const { world } = player;
    const lines = [
        'The plans look very technical!',
        'But you can see that this item will require ',
        'a bronze bar and at least 10 feathers.'
    ];

    for (const line of lines) {
        player.message('@que@' + line);
        await world.sleepTicks(3);
    }
}

async function handleBookOfExperimentalChemistry(player) {
    await sayLines(player, [
        'Volatile chemicals - Notes on experimental chemistry.',
        ' ',
        ' ',
        'In order to ease the mining Process, my colleagues and I decided we needed something stronger than picks to delve under the digsite. As I already had an intermediate knowledge of herblaw, I experimented on certain chemicals, and invented a compound of tremendous power, which, if subjected to a spark would literally explode. We used vials of this compound with great results, as it enabled us to reach further than ever before. Here is what I have left of the compound\'s recipe:',
        ' ',
        ' ',
        '1 measure of ammonium nitrate powder,',
        '1 measure of nitroglycerin,',
        '1 measure of ground charcoal.',
        '1 measure of ?',
        'Unfortunately the last ingredient was not written down, but we understand that a certain root grows around these parts that was used to very good effect...'
    ]);
}

async function handleNulodionsNotes(player) {
    player.message('the note reads....');

    await sayLines(player, [
        'Ammo for the dwarf multi cannon must be made from steel bars',
        ' ',
        ' ',
        'The bars must be heated in a furnace and used with the cannon ball mould.',
        ' ',
        ' ',
        "Due to the cannon ball's extreame weight only so many can be carried before one must rest"
    ]);
}

// old journal lore, 7 chapters (0-2 top level, 3-6 under "the four elements")
async function readJournalChapter(player, chapter) {
    if (chapter === 0) {
        player.message("@que@you turn to the page titled 'intro'");
        await sayLines(player, [
            ' ',
            ' ',
            '@red@Gather round, all ye followers of the dark arts.',
            ' ',
            '@red@Read carefully the words that I hereby inscribe,',
            ' ',
            '@red@as I detail the heady the brew that is responsible for my @red@',
            ' ',
            '@red@greatest creation yet. @red@I am Kardia, the most wretched ',
            ' ',
            '@red@witch in all the land,scorned by beauty and the world.',
            ' ',
            '@red@See what I have created: @red@the most powerful force',
            ' ',
            '@red@of darkness ever to be seen in human form!'
        ]);
    } else if (chapter === 1) {
        player.message("@que@you turn to the page titled 'iban'");
        await sayLines(player, [
            '@red@Iban was a Black Knight who had learned to fight under the',
            '@red@great Darkquerius himself. Together they had taken on the @red@might of the White Knights, and the blood of a hundred @red@soldiers had been wiped from Iban\'s sword.',
            ' ',
            ' ',
            '@red@In many respects Iban was not so different from the White @red@Knights that he so mercilessly slaughtered: noble and @red@educated@red@ with a taste for the finer things in life. But there @red@was something that made him different: ambition. No, not @red@the simple desire to succeed or lead one\'s fellow @red@man. @red@This was an ambition that hungered for something beyond @red@the @red@mortal @red@realm'
        ]);

        const cont = await player.ask(['continue reading', 'close book'], false);

        if (cont === 0) {
            await sayLines(player, [
                ' ',
                '@red@..that was almost godlike in its insatiability.',
                ' ',
                ' ',
                "@red@But therein lay the essence of his darkness. @red@At its most @red@base level, Iban's fundamental impulse@red@ was a desire to @red@control the hearts and minds of his fellow man.@red@ To take @red@them beyond the @red@pale of mere allegiance,@red@ and corrupt @red@them into a pure force for evil.",
                ' ',
                ' ',
                '@red@ This was the fantasy that chased him in his dreams. A @red@whole legion of soul-less beings, their minds demented @red@from the sheer power that he had channelled through to @red@them.',
                '@red@But dreams was all they ever were.@red@ As a mere mortal- @red@heroic though he was- this @red@was an ambition that Iban was @red@unable to achieve. Meeting his demise in the White @red@Knights\' now @red@famous Dawn Ascent, Iban died with the @red@bitter taste of @red@failure in his mouth. Little did he know that @red@his death was only the beginning.'
            ]);
        }
    } else if (chapter === 2) {
        player.message("@que@you turn to the page titled 'the ressurection'");
        await sayLines(player, [
            ' ',
            ' ',
            "@red@I knew of Iban's life, though of course we had never met.",
            ' ',
            '@red@And @red@using the power of my dark arts, I vowed @red@to ',
            ' ',
            '@red@resurrect this @red@once great warrior. I would raise @red@him again,',
            ' ',
            '@red@to fulfill @red@the @red@promise of his human life: to be a',
            ' ',
            '@red@Master of the Undead.'
        ]);
    } else if (chapter === 3) {
        player.message("@que@you turn to the page titled 'flesh'");
        await sayLines(player, [
            '@red@Ibans Flesh',
            ' ',
            ' ',
            '@red@Taking a small doll to represent Iban, I smeared my effigy ',
            ' ',
            '@red@with the four crucial elements that constitute a life.',
            ' ',
            '@red@Rooting around the desolate battlefield, I had been able to',
            ' ',
            "@red@steal a piece of Iban's cold flesh.",
            ' ',
            '@red@Now clasping some in my own hand, I smeared it over',
            ' ',
            "@red@my miniature idol, all the while chanting Iban's name."
        ]);
    } else if (chapter === 4) {
        player.message("@que@you turn to the page titled 'blood'");
        await sayLines(player, [
            '@red@Ibans Blood',
            ' ',
            ' ',
            "@red@I also needed some blood. By now, Iban's body was just a",
            ' ',
            '@red@hardened vessel-his life blood had literally drained from ',
            ' ',
            '@red@him. But these caverns are home to the giant spider,',
            ' ',
            '@red@a venomous creature that is known to feed on human ',
            ' ',
            '@red@blood.  Killing one of these spiders, I wiped my carved doll ',
            ' ',
            '@red@in its blood.'
        ]);
    } else if (chapter === 5) {
        player.message("@que@you turn to the page titled 'shadow'");
        await sayLines(player, [
            '@red@Ibans Shadow',
            ' ',
            '@red@Then came the hard part: recreating the parts of a man @red@that cannot be seen or touched: those intangible things @red@that are life itself. Using all the mystical force that I could @red@muster, I performed the ancient ritual of Incantia, a spell @red@so powerful that it nearly stole the life from my frail and @red@withered body. Opening my eyes again, I saw the three @red@demons that had been summoned. Standing in a triangle, @red@their energy @red@was focused on the doll. These demons @red@would be the keepers of @red@Iban\'s shadow. Black as night, @red@their shared spirit @red@would follow his undead body like an @red@angel of death.'
        ]);
    } else if (chapter === 6) {
        player.message("@que@you turn to the page titled 'conscience'");
        await sayLines(player, [
            '@red@Ibans conscience',
            ' ',
            "@red@Finally, I had to construct that most unique thing, the one @red@element which seperates man from every other beast- his @red@conscience. A zombie does not need a mind: his is a @red@mindless destruction, borne of simple bloodlust. But for all @red@of Iban's life, he himself choose to take the evil path- @red@driven by such a monstrous ambition. This is what gave @red@him such potential- potential that I would now harness to @red@the fullest."
        ]);
    }

    if (chapter >= 3 && chapter <= 6) {
        player.message('@que@there are four more chapters');
        await player.world.sleepTicks(3);

        const chapterOpt = await player.ask(
            ['flesh', 'blood', 'shadow', 'conscience'],
            false
        );

        if (chapterOpt >= 0) {
            await readJournalChapter(player, chapterOpt + 3);
        }
    }
}

async function handleOldJournal(player) {
    const { world } = player;

    player.message('@que@the journal is old and covered in dust');
    await world.sleepTicks(3);
    player.message('@que@inside are several chapters...');
    await world.sleepTicks(3);

    const chapter = await player.ask(
        ['intro', 'iban', 'the ressurection', 'the four elements'],
        false
    );

    if (chapter === 0) {
        await readJournalChapter(player, 0);
    } else if (chapter === 1) {
        await readJournalChapter(player, 1);
    } else if (chapter === 2) {
        await readJournalChapter(player, 2);
    } else if (chapter === 3) {
        player.message("@que@you turn to the page titled 'the four elements'");
        await world.sleepTicks(3);
        player.message('@que@there are four more chapters');
        await world.sleepTicks(3);

        const offset = await player.ask(
            ['flesh', 'blood', 'shadow', 'conscience'],
            false
        );

        if (offset >= 0 && offset <= 3) {
            await readJournalChapter(player, offset + 3);
        }
    }
}

async function onInventoryCommand(player, item) {
    switch (item.id) {
        case INSTRUCTION_MANUAL_ID:
            await handleInstructionManual(player);
            return true;
        case TOURIST_GUIDE_ID:
            await handleTouristGuide(player);
            return true;
        case TREE_GNOME_TRANSLATION_ID:
            await handleTreeGnomeTranslation(player);
            return true;
        case GLOUGHS_JOURNAL_ID:
            await handleGloughsJournal(player);
            return true;
        case INVOICE_ID:
            await handleInvoice(player);
            return true;
        case GLOUGHS_NOTES_ID:
            await handleGloughsNotes(player);
            return true;
        case DIARY_ID:
            await handleDiary(player);
            return true;
        case SCRUFFY_NOTE_ID:
            await handleScruffyNote(player);
            return true;
        case TECHNICAL_PLANS_ID:
            await handleTechnicalPlans(player);
            return true;
        case BOOK_OF_EXPERIMENTAL_CHEMISTRY_ID:
            await handleBookOfExperimentalChemistry(player);
            return true;
        case LEVEL_1_CERTIFICATE_ID:
            await player.say(
                'It says:',
                'The holder of this certificate has passed the level 1 exam in earth sciences'
            );
            return true;
        case LEVEL_2_CERTIFICATE_ID:
            await player.say(
                'It says:',
                'The holder of this certificate has passed the level 2 exam in earth sciences'
            );
            return true;
        case LEVEL_3_CERTIFICATE_ID:
            await player.say(
                'It says:',
                'The holder of this certificate has passed the level 3 exam in earth sciences'
            );
            return true;
        case DIGSITE_SCROLL_ID:
            await player.say(
                "It says 'I give permission for the bearer to use the mineshafts on site",
                'Signed Terrance Balando, Archaeological expert, City of Varrock'
            );
            return true;
        case STONE_TABLET_ID:
            await player.say(
                'It says:',
                'Tremble mortal, before the altar of our dread lord zaros'
            );
            return true;
        case NULODIONS_NOTES_ID:
            await handleNulodionsNotes(player);
            return true;
        case OLD_JOURNAL_ID:
            await handleOldJournal(player);
            return true;
        default:
            return false;
    }
}

module.exports = { onInventoryCommand };
