// generative chat, mood- and personality-driven. a line is an optional mood lead-in plus one
// complete hand-written core, chosen by a tone that matches the bot's mood and personality. offline.

let personality;
let mood;
function deps() {
    if (!personality) {
        personality = require('./personality');
        mood = require('./mood');
    }
}

function one(a) {
    return a[Math.floor(Math.random() * a.length)];
}

// mood-flavoured lead-ins (optional; each ends in a comma); weighted toward empty so most lines are lean
const LEADS = {
    up: ['', '', '', '', 'ha, ', 'oh, ', 'right, ', 'yes, ', 'well, ', 'aha, '],
    down: ['', '', '', '', 'ugh, ', 'tsk, ', 'honestly, ', 'great, ', 'ah, '],
    tired: ['', '', '', '', 'phew, ', 'ah, ', 'hmm, ', 'right, '],
    neutral: ['', '', '', '', '', 'well, ', 'so, ', 'right, ', 'hmm, ', 'anyway, ']
}

function leadBucket(m) {
    if (!m) return 'neutral';
    if (m.valence < 0.4) return 'down';
    if (m.energy < 0.35) return 'tired';
    if (m.valence > 0.6 && m.energy > 0.45) return 'up';
    return 'neutral';
}

// safe noun banks for when context doesn't supply one.
const FOES = ['that one', 'this brute', 'the beast', 'that thing', 'the monster', 'this lot'];
const PLACES = ['round here', 'these parts', 'this place', 'out here', 'this spot'];
const ITEMS = ['this', 'this loot', 'this haul', 'the goods', 'my haul'];

// situation -> tone -> complete lowercase cores (tidy capitalises the final line).
const G = {
    combat: {
        cocky: ["come on then, {foe}.", "you're not worth my time, {foe}.", "this won't take long.", "i'll make it quick.", "you should have run."],
        aggressive: ["have at you!", "no mercy, {foe}!", "i'll tear you apart!", "get over here!", "you're dead where you stand."],
        eager: ["let's do this!", "finally, some action.", "been waiting for a good fight.", "here we go!"],
        neutral: ["stand and fight.", "let's settle this.", "en garde, {foe}.", "here we go then."]
    },
    combatWin: {
        cocky: ["too easy.", "was that meant to be a challenge?", "i didn't even break a sweat.", "you never had a chance.", "is that all you've got?", "predictable.", "and stay down.", "who's next?", "barely a warm-up.", "they never learn.", "i'd say sorry, but i'm not."],
        pleased: ["got it! that felt good.", "another one down.", "clean kill, that.", "textbook.", "just as i planned.", "ha! got them.", "that's the way!", "clean, quick, done.", "another for the tally.", "that went well."],
        aggressive: ["stay down.", "that's what you get.", "don't get up.", "next.", "who else wants some?"],
        humble: ["that was a tough one.", "glad that's over.", "closer than i'd like.", "phew, done.", "phew. that was close.", "lucky, that.", "not my finest, but a win's a win."],
        neutral: ["down it goes.", "another kill.", "and that's that.", "job done.", "done.", "next.", "that's that sorted.", "right, moving on."]
    },
    combatLow: {
        panicked: ["this is bad, this is bad.", "i can't take much more!", "where's my food?!", "too close, way too close.", "food, food, where's my food!", "not like this, not like this!", "too much, too much!", "somebody, anybody!"],
        defiant: ["i'm not done yet!", "you'll have to do better than that.", "still standing.", "not today.", "still here.", "come on then!", "not going down easy."],
        weary: ["i'm fading here.", "running low...", "need a breather, badly.", "this is wearing me down.", "running on fumes here.", "this one's taking it out of me.", "need to eat. now.", "can't keep this up."],
        neutral: ["getting dicey.", "hold on now.", "careful, careful.", "that one hurt.", "that hurt.", "careful now.", "getting low.", "should eat."]
    },
    gather: {
        content: ["steady work, this.", "there's something calming about it.", "bit by bit it adds up.", "honest graft.", "no rush, no fuss.", "one more and then i'll rest. maybe.", "it's simple, this. i like simple.", "the pile grows.", "there's a rhythm to it once you're going.", "peaceful, this. just me and the work."],
        bored: ["this is dull work.", "same thing over and over.", "my mind's wandering.", "how long have i been at this?", "my hands know this by heart now.", "another one. and another.", "i could do this in my sleep. might be.", "is it home time yet?", "the excitement never stops. that's a joke."],
        diligent: ["keep at it, keep at it.", "efficiency is everything.", "another for the pile.", "this will pay off.", "no wasted motion.", "little and often, that's the way.", "each one counts.", "steady hands, steady gains.", "work now, rest later."],
        neutral: ["nice and steady.", "one more.", "getting there.", "getting on with it.", "chip, chip, chip.", "almost got a full load.", "not long now."]
    },
    tired: {
        weary: ["i'm worn out.", "could really use a rest.", "my arms are aching.", "long day, this.", "i've earned a break.", "could sleep standing up.", "everything aches.", "just five minutes. please.", "running on empty here."],
        neutral: ["bit tired now.", "need a sit down soon.", "slowing down a touch.", "bit tired.", "need a break soon.", "flagging a little."]
    },
    bank: {
        greedy: ["got to keep my riches safe.", "no one's touching my stash.", "into the vault it goes.", "can't be too careful with wealth.", "can't be too careful with my fortune.", "every coin in its place.", "the vault is my happy place."],
        practical: ["best stash this lot.", "off to the bank.", "keeping this safe.", "a quick deposit.", "don't want to lose {item}.", "stash first, then carry on.", "quick deposit and off.", "no point lugging all this about."],
        neutral: ["a bank run it is.", "storing the goods.", "safe and sound.", "bank run.", "dropping this lot off.", "into the bank it goes."]
    },
    shop: {
        greedy: ["let's see if there's a bargain.", "i love a good deal.", "spending to make more, that's the trick.", "everything has a price."],
        neutral: ["let's see the wares.", "a bit of shopping.", "what's in stock today?", "browsing the shelves.", "time to spend."]
    },
    sell: {
        greedy: ["{item} is worth a fortune.", "cha-ching.", "coin in my pocket.", "someone will pay well for {item}.", "a merchant's work is never done."],
        pleased: ["{item} fetched a fair price.", "a tidy little profit.", "turning {item} into gold.", "off it goes for coin."],
        neutral: ["cash for this lot.", "selling up.", "clearing out {item}."]
    },
    rich: {
        greedy: ["look at all this gold!", "rich, i tell you, rich!", "money is power.", "the coffers runneth over.", "never enough, but a fine start."],
        pleased: ["i'm doing rather well.", "a healthy purse, this.", "the savings are growing.", "comfortable at last."],
        neutral: ["got a fair bit saved now.", "the gold's adding up."]
    },
    alch: {
        pleased: ["magic straight into gold, lovely.", "a neat little trick, this.", "gold from thin air.", "why sell when you can alch?"],
        neutral: ["straight to gold.", "alch and move on.", "turning {item} to coin."]
    },
    explore: {
        wistful: ["i wonder what's out there.", "so much world, so little time.", "the horizon calls to me.", "there's always somewhere new.", "wonder what's over that hill.", "every road leads somewhere new.", "i could walk forever, some days.", "never seen this part before."],
        eager: ["i've never been {place}!", "adventure calls!", "let's see what's over the hill.", "somewhere new today, exciting.", "let's see what's out here!", "new ground! love it.", "somewhere i've never been. brilliant.", "adventure's this way, i can feel it."],
        neutral: ["let's have a look {place}.", "the world's a big place.", "off exploring then.", "just having a look around.", "wandering, mostly.", "seeing the sights.", "this way, i think."]
    },
    travel: {
        weary: ["a long road ahead.", "my feet are doing all the work today.", "miles to go yet.", "these journeys take it out of me.", "long way, this.", "my legs are done in.", "are we nearly there?", "one foot in front of the other."],
        neutral: ["on the move again.", "best get walking.", "off we go.", "the road it is.", "on the road again.", "not far now.", "heading over.", "just passing through."]
    },
    levelUp: {
        proud: ["level up! knew i had it in me.", "stronger by the day.", "all that work paid off.", "one step closer to the top.", "another level! told you i'd get there.", "stronger every day. look out, world.", "that's a milestone, that is.", "all that work, paying off.", "the grind was worth it."],
        pleased: ["another level, nice.", "feel the difference already.", "progress!", "onward and upward.", "oh, a level! lovely.", "well that's made my day.", "up we go! feels good.", "didn't even notice i was close. brilliant.", "ding! as they say."],
        neutral: ["level up.", "getting there, slowly.", "another step.", "onwards and upwards.", "good, that's done."]
    },
    pvp: {
        menacing: ["you shouldn't have come {place}.", "this is my wilderness.", "nowhere to run now.", "you picked the wrong day."],
        aggressive: ["fresh meat.", "time to PK.", "hand over your loot.", "you're mine."],
        neutral: ["a target, out here.", "someone to fight."]
    },
    pvpWin: {
        cocky: ["should've stayed home.", "easy loot.", "you were never a threat.", "another skull for the collection."],
        greedy: ["all mine now.", "thanks for the drop.", "your loss, my gain.", "loot is loot."],
        neutral: ["that's a wilderness kill.", "down they go."]
    },
    pvpFlee: {
        panicked: ["not today, not today!", "i'm off, i'm off!", "run, run, run!", "every man for himself!"],
        defiant: ["i'll be back for you.", "you win this round.", "count yourself lucky.", "next time is mine."],
        neutral: ["time to retreat.", "out of here."]
    },
    taunt: {
        menacing: ["you again, {name}. watch yourself.", "i haven't forgotten, {name}.", "you've got some nerve showing up, {name}.", "we've unfinished business, {name}."],
        cocky: ["come back for more, {name}?", "remember how last time went, {name}?", "still sore about our last meeting, {name}?"],
        bitter: ["i'm still cross with you, {name}.", "you owe me, {name}.", "i don't forget a slight, {name}."]
    },
    greet: {
        warm: ["hello there, lovely day.", "good to see a face about.", "well met, friend.", "always nice to have company.", "hello there, {name}! lovely to see a friendly face.", "well met, {name}. how's the road treating you?", "hey {name}! didn't expect company out here.", "{name}! good timing, i was getting bored of my own thoughts.", "oh, hello! mind if i say hi? hi.", "afternoon, {name}. or morning. i lose track out here.", "there you are, {name}. all good?", "hello hello! {name}, isn't it?"],
        gruff: ["hello, then.", "you again.", "afternoon.", "don't mind me.", "{name}.", "hm. hello.", "yes, hello, i see you.", "what do you want, {name}?", "hello, i suppose.", "keep it short, {name}, i'm busy."],
        neutral: ["hello there.", "good day to you.", "alright?", "morning.", "hello, {name}.", "hi there.", "greetings, {name}.", "hello. {name}, right?", "hey.", "good day, {name}.", "alright, {name}?"],
        cheerful: ["hiya {name}! what a day for it.", "hey hey! how's it going, {name}?", "look who it is! hello {name}!", "hello! grand to see you, {name}.", "ooh, company! hi {name}."]
    },
    greetFriend: {
        warm: ["{name}! so good to see you.", "ah, {name}, my friend, how goes it?", "{name}! it's been far too long.", "there's my favourite face, {name}!", "{name}! my favourite person. how are you?", "there's my mate {name}! good to see you.", "{name}, you old rogue. where've you been hiding?", "ah, {name}. the day just got better.", "hello, friend. missed you around here.", "{name}! come here, tell me everything."],
        cheerful: ["{name}! what a nice surprise.", "if it isn't {name}!", "good to see you, {name}.", "{name}, you old rascal!", "{name}!! about time you showed up.", "oi oi, {name}! what's new?", "the legend returns! hello {name}!", "hello {name}, you star. what's the plan today?"],
        neutral: ["hey, {name}.", "well met, {name}.", "{name}, good to see you.", "good to see you, {name}.", "hello again, {name}.", "{name}, hello. been a while.", "there you are, {name}."]
    },
    admire: {
        earnest: ["one day i'll be as good as you, {name}.", "teach me your ways, {name}!", "you're an inspiration, {name}.", "i can only dream of your skill, {name}.", "you're really something, {name}.", "i want to be like you when i grow up. sort of.", "how do you make it look so easy?"],
        humble: ["nice gear, {name}, wish i had the same.", "you make it look easy, {name}.", "how'd you get so strong, {name}?", "i've a lot to learn from you, {name}.", "i'll never be that good.", "you make the rest of us look slow."],
        neutral: ["impressive work, {name}.", "you're the real deal, {name}.", "nice work, {name}.", "impressive.", "well done, that."]
    },
    companion: {
        warm: ["mind if i tag along?", "good company makes the day.", "we should stick together.", "nice to share the road.", "hang in there, {name}. i've got you.", "eat something, {name}, you look pale.", "stay close, we'll get through this.", "i'm right here. breathe."],
        cheerful: ["this is fun, isn't it?", "good spot this, {place}.", "we make a decent team.", "let's do this together.", "you've got this, {name}!", "come on, nearly there!", "we don't quit, {name}!"],
        neutral: ["room for one more?", "heading the same way?", "careful, {name}.", "you alright?", "need a hand?", "watch yourself."]
    },
    tradeOpen: {
        greedy: ["got anything worth my coin?", "let's talk business.", "i drive a hard bargain, mind.", "show me what you've got."],
        neutral: ["fancy a trade?", "want to swap something?", "anything you need?", "let's deal."]
    },
    tradeThanks: {
        warm: ["a real pleasure doing business.", "thanks kindly, friend!", "we should trade again sometime.", "always good dealing with you."],
        pleased: ["a fair swap, that.", "nice trade!", "cheers for that.", "we both did well there."],
        neutral: ["good deal.", "trade done.", "thanks."]
    },
    tradeReject: {
        gruff: ["no deal.", "not a chance.", "keep your junk.", "you're wasting my time."],
        polite: ["no thanks, not for me.", "i'll pass on that one.", "sorry, that won't work for me.", "i'll hold onto my things, thanks."],
        greedy: ["that's not nearly enough.", "you insult me with that offer.", "come back when you're serious."]
    },
    idle: {
        content: ["nice day for it.", "a fine moment, this.", "life's good.", "no complaints here.", "nice to stand still for a minute.", "no rush today.", "just enjoying the view.", "peace and quiet. lovely.", "a moment to breathe."],
        bored: ["nothing much happening.", "i'm a bit restless.", "what to do, what to do.", "could use some excitement.", "so bored i could count blades of grass.", "nothing ever happens here.", "someone give me something to do.", "i've watched this same spot for ages.", "bored. bored, bored, bored."],
        neutral: ["just passing the time.", "another day {place}.", "right then.", "hmm.", "right. what next?", "thinking about my next move.", "a little pause won't hurt.", "let's see."]
    },
    lonely: {
        wistful: ["quiet round here.", "could use some company.", "bit lonely {place} today.", "wish someone would stop by.", "quiet out here. too quiet, maybe.", "wouldn't mind some company, truth be told.", "talking to myself again."],
        neutral: ["anyone about?", "all on my own again.", "just me, then.", "hello? no? okay."]
    },
    partyCallout: {
        cheerful: ["anyone want to team up?", "who's up for an adventure?", "party with me, it'll be fun!", "the more the merrier!", "anyone fancy teaming up?", "party going, who's in?", "looking for a crew! come on!"],
        neutral: ["looking for a group.", "team up with me?", "LFG, who's in?", "could use a partner.", "anyone want to group up?", "party? anyone?", "could use a hand, anyone free?"]
    },
    banter: {
        up: ["great work, team!", "we're on fire!", "best crew i've run with.", "nothing can stop us!", "you lot are alright, you know.", "this party could take on anything.", "who's carrying who here, then?", "best crew on the map, easily.", "i'd follow you lot anywhere. within reason.", "remind me why we're friends? oh right, this."],
        neutral: ["how's everyone holding up?", "sticking together, yeah?", "onward, team.", "nice one, all.", "anyone got spare food?", "how far now?", "we should bank soon.", "keep together, eh?", "what's the plan after this?", "anyone else's legs tired?"],
        down: ["let's not get sloppy.", "stay sharp, everyone.", "this is getting tough.", "watch each other's backs.", "are we there yet.", "this is taking forever.", "i've had better days.", "someone say something cheerful, please.", "if i die, tell my mum it was heroic."]
    },
    partyLeave: {
        warm: ["thanks for the good times, but i'm off.", "it's been fun, catch you later.", "i'll head out, take care all.", "been a pleasure, everyone. time for me to go.", "thanks for having me. off i pop.", "take care, all. see you around."],
        gruff: ["i'm done here.", "time i went my own way.", "had enough of the group.", "i'm done. bye.", "had enough. later.", "this isn't working. i'm off."],
        neutral: ["i'll head off on my own now.", "off to do my own thing.", "solo from here.", "leaving the party, cheers all.", "off i go. good luck.", "time to go my own way."]
    },
    // --- reactions: replies a bot gives when it hears someone ---
    reactGreetBack: {
        warm: ["oh, hello {name}!", "hi there, {name}!", "well hello!", "hey, good to see you!", "hello yourself, {name}!", "and a good day to you, {name}.", "hi {name}! how are you keeping?", "hello! what brings you my way?", "well hello, {name}. nice to be noticed.", "hey there. you alright, {name}?", "hello, hello. friendly sort, aren't you?"],
        cheerful: ["hey hey!", "hello, friend!", "hi!", "well met!", "hiya! lovely to meet you, {name}.", "hello {name}! grand day, isn't it?", "hey! nice one. how's things?", "ooh hello! didn't see you there, {name}."],
        gruff: ["hm. hi.", "yeah, hello.", "afternoon.", "hm. {name}.", "hello. that it?", "alright.", "hello, hello, no need to shout."],
        neutral: ["hello.", "hi there.", "hey.", "greetings.", "hello, {name}.", "hi.", "hello there.", "hey, {name}.", "hello. what can i do for you?", "good to meet you, {name}."]
    },
    reactThanks: {
        warm: ["you're very welcome!", "anytime, {name}!", "no trouble at all.", "my pleasure!", "any time, {name}. any time at all.", "that's what friends are for.", "don't mention it - really.", "happy to help, {name}.", "you'd do the same for me.", "my pleasure, {name}."],
        gruff: ["yeah, sure.", "don't mention it.", "whatever.", "yeah, yeah.", "don't make a thing of it.", "fine.", "just doing what needed doing."],
        neutral: ["no problem.", "happy to help.", "no worries.", "you're welcome, {name}.", "sure thing.", "no bother.", "glad it helped."]
    },
    reactCompliment: {
        proud: ["i know, right?", "cheers, i've earned it.", "you're not wrong!", "took years to get this good.", "you've got a good eye, {name}.", "finally, someone notices."],
        humble: ["oh, you're too kind.", "aw, thanks {name}.", "that means a lot.", "oh, stop it. but thank you.", "you're too kind, {name}.", "i just try my best.", "ah, i've a long way to go yet."],
        neutral: ["thanks!", "appreciated.", "kind of you to say.", "cheers, {name}.", "thanks, that's nice of you.", "much appreciated."]
    },
    reactInsult: {
        aggressive: ["say that to my face.", "big words for a nobody.", "you want to go, {name}?", "you couldn't beat me on your best day.", "say that again and see what happens.", "big words from someone standing that close.", "keep talking, {name}. i dare you.", "you want a fight? you've found one."],
        cocky: ["cute. run along.", "aw, someone's jealous.", "is that the best you've got?", "keep talking, it's adorable.", "jealous, are we?", "i've been insulted by better.", "cute. try harder.", "that the best you've got, {name}?"],
        menacing: ["you'll regret that, {name}.", "watch your mouth.", "i won't forget that."],
        gruff: ["whatever you say.", "get lost.", "not worth my time.", "whatever.", "go bother someone else."],
        neutral: ["that's a bit rude.", "no need for that.", "okay then.", "charming.", "and a good day to you too.", "alright, calm down."]
    },
    reactHurt: {
        panicked: ["hey, that's not nice!", "why would you say that?", "leave me alone, please.", "what did i do?", "that's... that's not fair.", "i was only trying to be friendly."],
        neutral: ["that stings a bit.", "harsh.", "if you say so.", "that's a bit harsh, {name}.", "ouch.", "no need to be like that.", "well. okay then."]
    },
    reactAgree: {
        up: ["couldn't agree more!", "exactly!", "yes, totally!", "you said it!", "exactly what i was thinking!", "you're not wrong, {name}.", "couldn't agree more.", "that's it exactly."],
        neutral: ["fair enough.", "true, that.", "aye.", "makes sense.", "fair point.", "true enough.", "i suppose so.", "can't argue with that."],
        down: ["i suppose so.", "if you say so.", "maybe.", "yeah. sadly.", "that's how it goes.", "i know. i know.", "tell me about it."]
    },
    reactLaugh: {
        up: ["haha, good one!", "ha! nice.", "that's a good laugh.", "you crack me up.", "ha! good one.", "you're a laugh, {name}.", "haha, stop, my sides.", "that's the spirit!", "ha, i needed that."],
        neutral: ["heh.", "ha, funny.", "not bad.", "ha.", "funny.", "that got a smile out of me."],
        gruff: ["hm.", "if you say so.", "hilarious.", "very funny."]
    },
    reactQuestion: {
        warm: ["good question! i'll help if i can.", "hmm, let me think...", "not sure, but let's find out.", "good question, {name}. not sure i know.", "hmm, let me think about that one.", "you've got me there, {name}.", "i'd love to say i know, but..."],
        gruff: ["how should i know?", "figure it out yourself.", "not my problem.", "ask someone else.", "no idea.", "not my area."],
        neutral: ["no idea, sorry.", "couldn't tell you.", "wish i knew.", "couldn't tell you, sorry.", "not sure, honestly.", "i don't know.", "beats me."]
    },
    reactTradeAsk: {
        greedy: ["i might have something, for the right price.", "depends what you're paying.", "let's see your coin first.", "depends what you're offering.", "show me the goods first.", "trade? if the price is right."],
        neutral: ["what are you after?", "sure, i could trade.", "show me what you've got.", "sure, what have you got?", "let's have a look.", "open a trade, then."]
    },
    reactPartyAsk: {
        cheerful: ["ooh, count me in!", "i'd love to join!", "a party? yes please!", "let's team up!", "ooh, yes! invite me!", "a party? count me in!", "love to!"],
        warm: ["i'm in, sounds fun!", "happy to join you.", "together then!", "i'd like that, {name}.", "happy to team up with you.", "sure, {name}, let's do it."],
        gruff: ["i work alone, sorry.", "not really a group type.", "i'll pass.", "not really my thing.", "i work alone.", "pass."],
        neutral: ["maybe, what's the plan?", "could do.", "what are we doing?", "maybe. what's the plan?", "who else is in?", "depends where we're going."]
    },
    reactFarewell: {
        warm: ["see you later, {name}!", "take care, {name}!", "bye for now, safe travels!", "take care of yourself, {name}.", "safe travels! come find me again.", "see you around, friend.", "don't be a stranger, {name}.", "bye for now! mind the goblins."],
        gruff: ["bye.", "later.", "off you go.", "right. bye.", "off you go, then.", "see you.", "mm. later."],
        neutral: ["farewell!", "see you around.", "catch you later.", "see you, {name}.", "cheerio.", "bye then.", "until next time."]
    },
    reactAffirm: {
        up: ["let's do it!", "i'm in!", "sounds great!", "absolutely!", "brilliant!", "that's what i like to hear.", "let's go then!", "excellent, {name}."],
        gruff: ["fine.", "if we must.", "suppose so.", "good.", "right then.", "about time."],
        neutral: ["sure, why not.", "alright then.", "okay, let's go.", "works for me.", "alright.", "okay, {name}.", "sure.", "good stuff."]
    },
    reactDeny: {
        gruff: ["nah, not interested.", "i'll pass.", "no thanks.", "hard pass.", "suit yourself.", "your loss.", "fine by me.", "whatever you say."],
        neutral: ["maybe later.", "not right now.", "perhaps another time.", "i'll sit this one out.", "fair enough.", "no worries.", "another time, maybe.", "okay, {name}."]
    },
    ackFollow: {
        warm: ["right behind you, {name}!", "lead the way!", "i'm with you!", "lead the way, {name}, i'm with you.", "right behind you.", "wherever you're going, i'm coming.", "let's go then!"],
        gruff: ["fine, i'll follow.", "lead on then.", "whatever, i'm coming.", "fine. keep up.", "alright, but don't dawdle.", "lead, then."],
        neutral: ["okay, following.", "after you.", "let's go then.", "following.", "on your heels, {name}.", "okay, after you."]
    },
    ackCome: {
        warm: ["coming, {name}!", "on my way, friend!"],
        neutral: ["on my way!", "coming!", "be right there.", "heading over."]
    },
    ackWait: {
        warm: ["sure, take your time!", "no rush, i'll wait."],
        neutral: ["okay, i'll wait.", "holding position.", "standing by.", "i'll hold here."]
    },
    refuseCommand: {
        gruff: ["you're not my boss.", "do it yourself.", "why should i?", "make me.", "no.", "i don't take orders from you.", "not happening."],
        cocky: ["ha, and why would i?", "in your dreams.", "nice try.", "and why would i do that?", "you're not the boss of me, {name}.", "make me."],
        neutral: ["i'd rather not.", "not right now, sorry.", "hmm, i'll stay put.", "maybe later, {name}.", "i'll pass."]
    },
    missionAccept: {
        up: ["great idea, let's go!", "i'm so up for that!", "yes, let's hunt it!", "onward!", "yes! {mission}, let's do it!", "now that's a plan. {mission}!", "count me in for {mission}."],
        warm: ["sounds good, i'm with you!", "count me in for that!", "{mission}? with you? gladly.", "sounds good, {name}. {mission} it is.", "i'm in. {mission}."],
        neutral: ["sure, i'll come along.", "alright, let's do it.", "okay, i'm in.", "alright, {mission}.", "fine, {mission} then.", "okay. {mission}."]
    },
    missionPropose: {
        eager: ["who's up for {mission}?", "let's do {mission}, come on!", "i say we go for {mission}!"],
        neutral: ["how about {mission}, team?", "shall we try {mission}?", "let's think about {mission}."],
        greedy: ["{mission} - could be good loot in it.", "there's profit in {mission}, i reckon."]
    },
    reactRepeatGreet: {
        warm: ["you already said hi, {name}!", "hi again then!", "yes yes, hello {name}!", "still here, {name}! hello again.", "you've said hello twice now. hello twice back!", "hello, hello, hello. that's three.", "we've done this bit, {name}. what's next?"],
        gruff: ["you said that already.", "yeah, i heard you.", "we've done this bit.", "you already said that.", "yes. hello. again.", "once was enough, {name}.", "i heard you the first time."],
        neutral: ["hello again, {name}.", "still here, still hi.", "greeting received, twice now.", "hello again.", "still hello, {name}.", "we've greeted. what's up?", "hi, again."]
    },
    reactBotAccusation: {
        cocky: ["a bot? how very rude.", "beep boop, sure.", "takes one to know one.", "a bot? i'm more real than you, mate.", "do bots have feelings? because that hurt.", "bleep bloop. happy now?"],
        gruff: ["do i look like a bot to you?", "charming. no.", "think what you like.", "rude.", "and you're a what, exactly?", "don't be daft."],
        neutral: ["haha, no, just focused.", "just a quiet player, me.", "nope, only human here.", "last time i checked, no.", "real as you are, {name}.", "why, what gave you that idea?"]
    },
    // --- reactions to things happening nearby (events.js) ---
    reactConcern: {
        warm: ["careful, {name}, you're low!", "watch your health, {name}!", "need a hand, {name}?"],
        neutral: ["ooh, that's low.", "cutting it close there.", "mind yourself."]
    },
    reactDrop: {
        greedy: ["ooh, nice drop! is that up for grabs?", "look at that loot!", "lucky find, that."],
        neutral: ["nice drop!", "ooh, shiny.", "lucky you!"]
    },
    reactCheer: {
        up: ["get 'em!", "you've got this!", "smash it!", "go on then!"],
        neutral: ["nice fighting.", "good swings.", "keep at it."]
    },
    reactGloat: {
        cocky: ["ha! serves them right.", "couldn't happen to a nicer person.", "down they go, love to see it."],
        neutral: ["oof, unlucky them.", "well, that happened.", "rough."]
    },
    // --- reputation-aware reactions ---
    reactPKerWary: {
        panicked: ["careful, {name}'s a known PKer!", "that's {name} - steer clear!", "watch out, {name} kills for fun."],
        cocky: ["oh, the great {name}. not scared.", "{name}, is it? bring it on.", "a PKer, eh? I've beaten better."],
        neutral: ["heard {name}'s dangerous in the wild.", "keep an eye on {name}."]
    },
    reactLegendAwe: {
        earnest: ["it's {name}! an actual legend!", "wow, {name}, I've heard so much about you!", "can't believe I'm meeting {name}!"],
        neutral: ["that's {name}, the famous one.", "a legend walks among us - {name}."]
    },
    reactMentor: {
        warm: ["keep at it, {name}, you're doing great!", "we all start somewhere, {name} - you've got this!", "need any tips, {name}? happy to help."],
        neutral: ["not bad for a beginner, {name}.", "stick with it, {name}, it gets easier.", "here, {name}, this'll help you along."]
    },
    // --- proactive conversation starters ---
    smallTalk: {
        warm: ["lovely day for it, isn't it {name}?", "good to have some company, {name}.", "how's your day going, {name}?", "quiet round here today, isn't it, {name}?", "you ever just stop and look at the sky out here? no? just me then.", "how's the day treating you, {name}?", "i like this spot. good company, too.", "been walking all morning. my feet have opinions.", "you look like you've had a day, {name}.", "funny how you bump into people out here.", "i could murder a bit of bread right now.", "{name}, do you ever get lost round here? i do. constantly.", "the weather's holding, at least."],
        cheerful: ["nice to see a friendly face, {name}!", "grand day, isn't it?", "having a good one, {name}?", "what a day! feel like i could run to varrock and back.", "you know what, {name}? life's alright.", "i'm in a good mood and i'm not sorry about it.", "got a spring in my step today, no idea why.", "come on, {name}, tell me something good."],
        gruff: ["quiet round here, innit.", "hm. alright, {name}?", "busy day.", "nothing much to say. you?", "long day.", "don't mind me, just passing through.", "not one for chit-chat, {name}.", "busy, busy."],
        neutral: ["not a bad day for it.", "how do, {name}.", "keeping busy, {name}?", "so, {name}. what's new?", "been here long?", "anything happening today?", "how's it going, then?", "you come here often, {name}?", "what's the word, {name}?"]
    },
    comment: {
        up: ["great spot this, {name}, love it here!", "plenty going on today, eh?", "good energy round here.", "not a bad spot, this.", "good crowd here today.", "the place is buzzing.", "someone's been busy round here.", "i like it here. might stay a while."],
        neutral: ["decent spot this, {name}.", "this place never changes.", "always something to do round here.", "quieter than i expected.", "this place has changed since i was last here.", "seen worse spots.", "there's always something going on here.", "not much left to gather here, mind."],
        gruff: ["could be quieter.", "seen better spots.", "does the job, I suppose.", "too many people about.", "this place is a mess.", "noisy lot round here.", "could do with fewer idiots about."]
    },
    askAbout: {
        warm: ["what are you up to today, {name}?", "been playing long, {name}?", "what's your favourite spot, {name}?", "seen anything good out there, {name}?", "what brings you out this way, {name}?", "so what's your story, {name}?", "what do you make of this place?", "where are you headed, if you don't mind me asking?", "what are you into, {name}? fighting, gathering, wandering?", "have you been at this long, {name}?", "any adventures lately? go on, tell me.", "what's the best thing you've found out here?"],
        cheerful: ["what are you working toward, {name}?", "any big plans, {name}?", "what's your story, {name}?", "ooh, what are you up to today, {name}?", "tell me you're doing something exciting!", "what's the plan, {name}? i want in.", "any good stories, {name}?"],
        neutral: ["what brings you here, {name}?", "you a regular round these parts, {name}?", "how's the grind treating you, {name}?", "what are you after round here?", "where are you off to?", "what do you do, {name}?", "how long have you been playing at this?", "you from around here?"]
    },
    opinion: {
        cocky: ["magic's the only way to fight, if you ask me.", "best spot in the game, this one.", "reckon I could take anything round here.", "skill beats luck every time, {name}.", "honestly? i could do it better.", "my way's the right way, you'll see.", "amateurs, the lot of them.", "i've forgotten more than most people know."],
        greedy: ["it's all about the gold, {name}, always has been.", "loot is everything, that's my motto.", "it all comes down to coin in the end.", "if it doesn't pay, i'm not interested.", "show me the profit and i'll show you interest.", "everything's for sale at the right price."],
        neutral: ["patience is everything in this game, {name}.", "slow and steady wins it, I say.", "you get out what you put in, {name}.", "each to their own, i say.", "i've no strong feelings, honestly.", "depends on the day, that.", "there's worse ways to spend an afternoon.", "can't say i've thought about it much."]
    },
    tellStory: {
        cocky: ["did I ever tell you about {topic}, {name}?", "that reminds me - {topic}. good times.", "I'll never forget {topic}.", "let me tell you about {topic}. spoiler: i was brilliant.", "you'll like this one - {topic}. nobody believes me, but it's true.", "{topic}? i've told this a hundred times and it gets better every time."],
        warm: ["reminds me of {topic}, {name}.", "you know, {topic} once - proper memory, that.", "sit down, {name}, let me tell you about {topic}.", "sit down a second, {name}. {topic}, that's a story.", "did i ever tell you about {topic}? no? well.", "i think about {topic} more than i should.", "{topic}. i still get a chill thinking about it."],
        neutral: ["{topic}, that was something.", "still think about {topic} sometimes.", "ever heard about {topic}, {name}?", "here's one: {topic}.", "you asked, so: {topic}.", "there was a time - {topic}. long story.", "{topic}. that's how it went."]
    },
    // --- faction/social situations (dynamic) ---
    factionPride: {
        cocky: ["{faction} runs this place.", "you're looking at {faction}, best crew around.", "nobody touches {faction}.", "{faction}, and don't you forget it.", "proud to fly with {faction}."],
        warm: ["good to be one of {faction}.", "{faction}'s my family, truth be told.", "wouldn't trade {faction} for anything.", "we look after our own in {faction}."],
        grim: ["{faction} sticks together, come what may.", "{faction}. we've been through it all.", "you don't leave {faction}. ever."],
        neutral: ["i ride with {faction}.", "{faction}, that's my crew.", "one of {faction}, me.", "{faction} for life."]
    },
    factionWarCry: {
        cocky: ["{faction} will crush {enemy}!", "{enemy} don't stand a chance against {faction}.", "we'll wipe {enemy} off the map!", "for {faction}! death to {enemy}!"],
        grim: ["it's {faction} or {enemy}. no quarter.", "this war with {enemy} ends in blood.", "{faction} holds the line against {enemy}.", "we bleed, but {faction} does not break."],
        aggressive: ["kill for {faction}! hunt {enemy} down!", "to arms - {enemy} are near!", "{enemy} in the wild? cut them down for {faction}!"]
    },
    factionAllyGreet: {
        warm: ["good to see {faction} - friends of ours.", "{faction}! well met, allies.", "always welcome, {faction}.", "stand with us, {faction}."],
        neutral: ["{faction}, our allies. well met.", "friends of {faction} are friends of mine.", "good, {faction}'s here."]
    },
    gossipPraise: {
        warm: ["{name}'s alright, they helped me out.", "you can trust {name}, good sort.", "{name}'s good people, that one.", "say what you like, {name}'s solid.", "i owe {name} one, decent of them."],
        cocky: ["{name}? yeah, {name}'s sound.", "stick with {name}, you'll be fine.", "{name} knows what they're doing."],
        neutral: ["heard {name}'s a good one.", "{name}'s dependable, they say.", "no complaints about {name}."]
    },
    gossipWarn: {
        grim: ["watch out for {name}, bad news.", "steer clear of {name}, i'm telling you.", "{name} did me dirty. don't trust them.", "{name}'s trouble, mark my words."],
        cocky: ["{name}? wouldn't trust them as far as i'd throw them.", "give {name} a wide berth.", "{name}'s all talk and worse."],
        bitter: ["{name} crossed me. remember the name.", "{name}'s no good, and that's the truth.", "you'll regret trusting {name}."]
    },
    titleBoast: {
        cocky: ["they call me {title}, and rightly so.", "you're in the presence of {title}.", "{title} - earned every letter of it.", "i didn't get called {title} for nothing.", "yeah, {title}. that's me."],
        warm: ["folk know me as {title} these days.", "i'm {title}, for my sins.", "{title}, if you can believe it."],
        neutral: ["they name me {title}.", "i go by {title} now.", "{title} - that's the name i carry."]
    },
    legendMention: {
        warm: ["you hear about {name}? proper legend.", "everyone's talking about {name} these days.", "they say {name}'s the real thing.", "one day they'll speak of me like {name}."],
        cocky: ["{name}? now THAT'S a name.", "even i'd tip my hat to {name}.", "{name}'s made a name, i'll give them that."],
        neutral: ["heard the stories about {name}?", "{name}'s got quite the reputation.", "the tales about {name} get taller every day."]
    },
    reactWarNews: {
        eager: ["war?! now it gets interesting.", "a proper war? i want to see this.", "blood in the water - about time.", "ha! this'll be worth watching."],
        grim: ["war. nothing good comes of it.", "here we go. more blood.", "war again? this place never learns.", "grim days ahead, then."],
        neutral: ["war, is it? word travels fast.", "so it's come to war.", "everyone's talking about the war now.", "a war breaking out - you don't say."]
    },
    reactFactionFall: {
        grim: ["gone, just like that. end of an era.", "so they're finished. sad, that.", "a whole crew, wiped out. tough world.", "pour one out for them."],
        cocky: ["finished? knew they wouldn't last.", "saw that coming a mile off.", "one less crew to worry about."],
        neutral: ["they've disbanded? word gets around.", "so that's the end of them.", "another crew falls. it happens."]
    },
    // --- life reflection: a bot musing on its own long story ---
    reflectJourney: {
        warm: ["started with nothing, look at me now.", "long road, this. glad i walked it.", "hard to believe how far i've come.", "every scar tells a story, and i've plenty.", "not bad, for someone who started in the dirt."],
        weary: ["long road it's been. i'm tired, if i'm honest.", "seen too much, some days.", "the years catch up with you out here.", "started so eager. funny how it wears you down."],
        neutral: ["been at this a long while now.", "the map and me, we've history.", "i've walked every road twice over.", "who'd have thought i'd last this long."]
    },
    reflectFriend: {
        warm: ["me and {name}, we go way back.", "{name}'s stuck by me through it all.", "don't know where i'd be without {name}.", "a friend like {name} is worth more than gold."],
        neutral: ["{name} and i have seen some things.", "good to have {name} around, all these years.", "{name}. now there's a true friend."]
    },
    reflectRival: {
        bitter: ["{name} and i still have a score to settle.", "one day i'll finish it with {name}.", "i haven't forgotten you, {name}. i never will.", "there's no peace between me and {name}."],
        cocky: ["{name} still thinks they can best me. cute.", "{name}'ll get theirs. mark it.", "me and {name}? that's not over."],
        neutral: ["{name} and i, we're not done.", "still no love lost between me and {name}."]
    },
    reflectDream: {
        warm: ["one day i'll get there - {topic}.", "still chasing {topic}. i'll make it.", "i can almost taste it - {topic}.", "everything i do is for {topic}."],
        weary: ["{topic}. feels further off some days.", "still no closer to {topic}. but i keep on.", "chasing {topic}. maybe i always will be."],
        neutral: ["{topic}. that's what keeps me going.", "i've a dream, you know - {topic}.", "it's all for {topic}, in the end."]
    },
    grieveFriend: {
        grim: ["no... {name}. not {name}.", "they got {name}. i can't believe it.", "{name}'s gone. a good friend, gone.", "why {name}? of all people...", "rest easy, {name}. you deserved better."],
        bitter: ["whoever did this to {name} will pay.", "{name}... i'll avenge you, i swear it.", "they'll answer for {name}. i'll see to it."],
        neutral: ["{name} down. this world takes the best of us.", "so long, {name}. you were one of the good ones."]
    },
    marketCry: {
        cocky: ["{item}! {price} coins, and you won't find better.", "best {item} on the map - {price} each!", "roll up, {item} going for {price}!", "{price} for {item}? a steal, and you know it.", "best {item} on the map, right here!", "you won't find a better {item} at this price!", "come on, {name}, you know you want it."],
        eager: ["{item} for sale! only {price}!", "who wants {item}? {price} coins!", "fresh {item}, {price} the lot!", "selling {item} - {price}, come and get it!", "selling {item}! good price!", "who wants a {item}? {price} coins!", "fresh {item}, get it while it's here!"],
        neutral: ["{item}, {price} coins.", "got {item} going, {price} each.", "{item} for sale here, {price}.", "anyone need {item}? {price}.", "{item} for sale, {price} coins.", "anyone need a {item}?", "selling {item}, make me an offer."]
    },
    // a bot voicing what it's off to do now ({topic} = a plain phrase)
    announceIntent: {
        eager: ["right, {topic}. let's get to it.", "off to {topic}, me.", "time to {topic}.", "{topic} - no time like the present.", "right, off to make some coin.", "time to hit the mines.", "let's get some levels in.", "fancy a fight. off i go.", "adventure calls!"],
        neutral: ["think i'll {topic}.", "reckon it's time to {topic}.", "{topic}, then. that's the plan.", "suppose i'd best {topic}.", "off to the bank.", "going to get supplies.", "heading out for a bit.", "back to work.", "time to move on."],
        weary: ["back to it, i s'pose - {topic}.", "{topic} again. no rest for the likes of us.", "may as well {topic}.", "suppose i'd better get on with it.", "one more trip, then a rest.", "back to the grind, then.", "no rest for the wicked."]
    },
    // a rogue's quiet aside as it works a mark ({name})
    thieve: {
        cocky: ["{name} won't miss a few coins.", "too easy - never even felt it.", "light fingers, me. always have been.", "a purse here, a purse there - it adds up."],
        neutral: ["just a little off the top of {name}.", "they won't miss what they don't count.", "quiet now - eyes on {name}.", "old habits, hard to break."],
        weary: ["a rogue's got to eat too.", "not proud of it, but coin's coin.", "one for me, none for {name}."]
    },
    // one bot in a crowd acknowledges the throng (only sometimes, one at a time)
    crowd: {
        neutral: ["busy round here today.", "lot of us about, eh?", "quite the crowd gathered here.", "never a quiet moment in this spot.", "everyone's had the same idea, it seems.", "bit of a queue, this.", "everyone had the same idea, then.", "mind your elbows."],
        warm: ["good to have a bit of company out here.", "nice to see a few friendly faces about.", "always better with folk around, isn't it?", "grand to share the spot with you all.", "good to see so many faces.", "the more the merrier, i suppose.", "hello all! room for one more?"],
        wry: ["getting crowded - save some for the rest of us!", "can't move for bodies round here.", "popular spot, this. too popular.", "elbow room's a luxury today, eh?", "popular spot. who knew.", "shall we take turns, or just shove?", "i love a crowd. said no one."]
    },
    // a bot that just brought down a boss shouts it to the world (spreads as news)
    bossKill: {
        cocky: ["i've slain {foe}! did you SEE that?!", "{foe} is DEAD - and i'm the one who did it!", "they said {foe} couldn't be beaten. they were wrong.", "put it in the tales: i killed {foe}!"],
        proud: ["i brought down {foe} with my own hands.", "{foe} falls at last. what a fight that was.", "i'll remember this day - the day i felled {foe}.", "i actually did it. i killed {foe}."],
        wry: ["well. {foe} won't be getting up again.", "one dead {foe}, courtesy of yours truly.", "{foe} picked the wrong day to meet me."]
    },
    // an ambitious bot calls out a famous name to make its own
    challengeFamous: {
        cocky: ["so you're the great {name}? you don't scare me.", "they all fear {name}. i don't.", "beating {name} - now THAT would be a story.", "{name}'s reputation ends the day it meets me."],
        hungry: ["i'll make my name on you, {name}.", "everyone knows {name}. soon they'll know the one who beat them.", "your legend's about to get a new ending, {name}.", "time someone took {name} down a peg."],
        cold: ["a big name makes a big target, {name}.", "fame won't save you from me, {name}."]
    },
    // felling a greater name than your own, the deed that makes a legend (spreads as news)
    felledName: {
        cocky: ["i just felled {name}! remember who did it!", "the mighty {name} - beaten by ME.", "they'll tell this one for years: i took down {name}!", "{name}'s legend ends here. mine begins."],
        proud: ["i bested {name}. i can scarcely believe it.", "{name} was the greater name. not any more.", "the day i felled {name} - i'll never forget it.", "a giant falls. i felled {name}."],
        wry: ["turns out {name} bleeds like the rest of us.", "so much for the great {name}.", "one less legend to worry about - {name}'s done."]
    },
    // an individual's low point: hard times, a run of bad luck
    despair: {
        grim: ["everything's falling apart lately.", "can't catch a break, me. not lately.", "i don't know how much more of this i can take.", "nothing's gone right in a long while.", "rock bottom, this. proper rock bottom.", "what's the point.", "nothing goes right.", "i should just go home."],
        weary: ["so tired of losing. so tired.", "starting to wonder why i bother.", "some days it's hard to keep going out here.", "feels like the whole world's against me.", "i'm so tired of this.", "can't catch a break.", "every day the same."],
        neutral: ["rough patch, this. a real rough patch.", "hard times. they come to us all, i suppose.", "not my finest hour, i'll admit.", "bad day.", "not going well.", "sigh."]
    },
    // the turnaround out of it: a comeback, back on their feet
    comeback: {
        up: ["i'm back on my feet! thought i was finished.", "down but never out, me. watch this.", "the worst is behind me now. onwards!", "picked myself up. that's what you do.", "you can't keep a good one down for long.", "right, i'm back! who missed me?", "down but never out.", "that's better. let's go again."],
        cocky: ["ha! back from the dead. told you i'd bounce.", "counted me out? big mistake.", "i've clawed my way back, and i'm hungrier than ever.", "did you think that would stop me?", "you can't keep me down.", "back and better."],
        warm: ["good days again, at last. felt like forever.", "the sun's out again, and so am i.", "back to my old self. it's a relief, honestly.", "thanks for waiting, {name}. i'm alright now.", "feeling myself again."]
    },
    // a taunt throwing a remembered wrong back in a rival's face ({topic} = the grievance)
    tauntGrudge: {
        menacing: ["you {topic}, {name}. i haven't forgotten.", "remember when you {topic}, {name}? i do.", "you {topic}, {name}. today you pay for it.", "i owe you for the time you {topic}, {name}."],
        bitter: ["you {topic}, {name}. that's not something i let go.", "i still remember you {topic}, {name}.", "you {topic} once, {name}. i've waited a long time for this."],
        cocky: ["you {topic}, {name}? big mistake. let me remind you.", "last time you {topic}, {name}. won't happen twice."]
    }
};

// score every tone for the bot's mood + personality; the highest-scoring tone the situation offers wins
function toneScores(bot) {
    deps();
    const p = personality.of(bot) || { aggression: 0.5, greed: 0.5, sociability: 0.5, curiosity: 0.5, diligence: 0.5, risk: 0.5, patience: 0.5 };
    const m = (bot && mood.of(bot)) || { valence: 0.5, energy: 0.5, confidence: 0.5 };
    const jit = () => (Math.random() - 0.5) * 0.5; // keep it non-deterministic
    return {
        cocky: (m.confidence - 0.5) * 2 + (p.aggression - 0.5) + jit(),
        aggressive: (p.aggression - 0.5) * 2.2 + (0.5 - m.valence) * 0.5 + jit(),
        eager: (m.energy - 0.5) * 1.5 + (p.aggression - 0.4) + jit(),
        menacing: (p.aggression - 0.5) * 2 + (m.confidence - 0.5) + jit(),
        defiant: (p.aggression - 0.5) + (m.confidence - 0.4) + jit(),
        panicked: (0.55 - m.confidence) * 2.5 + jit(),
        weary: (0.55 - m.energy) * 2.5 + jit(),
        humble: (0.5 - m.confidence) * 1.3 + (0.5 - p.aggression) + jit(),
        pleased: (m.valence - 0.5) * 2 + jit(),
        proud: (m.valence - 0.5) + (m.confidence - 0.5) + jit(),
        content: (m.valence - 0.45) * 1.5 + (p.patience - 0.5) + jit(),
        bored: (0.5 - m.energy) * 1.6 + (0.5 - p.diligence) + jit(),
        diligent: (p.diligence - 0.5) * 2 + jit(),
        greedy: (p.greed - 0.5) * 2.4 + jit(),
        practical: (p.diligence - 0.5) + (0.5 - p.aggression) * 0.5 + jit(),
        wistful: (p.curiosity - 0.5) * 1.6 + (0.5 - m.energy) * 0.5 + jit(),
        warm: (p.sociability - 0.5) * 2.2 + (m.valence - 0.5) + jit(),
        cheerful: (m.valence - 0.5) * 1.6 + (p.sociability - 0.5) + jit(),
        gruff: (0.5 - p.sociability) * 2.2 + (0.5 - m.valence) * 0.5 + jit(),
        polite: (p.sociability - 0.4) + (0.5 - p.aggression) + jit(),
        earnest: (p.sociability - 0.5) + (0.5 - p.aggression) + jit(),
        bitter: (0.5 - m.valence) * 2 + jit(),
        up: (m.valence - 0.5) * 2 + (m.energy - 0.5) + jit(),
        down: (0.5 - m.valence) * 2 + jit(),
        neutral: 0.12
    };
}

function chooseTone(bot, tonesAvailable) {
    const scores = toneScores(bot);
    let best = tonesAvailable[0];
    let bestScore = -Infinity;
    for (const t of tonesAvailable) {
        const s = t in scores ? scores[t] : 0;
        if (s > bestScore) {
            bestScore = s;
            best = t;
        }
    }
    return best;
}

function fillNoun(ctx, key, bank) {
    return (ctx && ctx[key]) || one(bank);
}

function resolve(tpl, ctx) {
    return tpl.replace(/\{(\w+)\}/g, (_, key) => {
        switch (key) {
            case 'foe':
                return fillNoun(ctx, 'foe', FOES);
            case 'place':
                return fillNoun(ctx, 'place', PLACES);
            case 'item':
                return fillNoun(ctx, 'item', ITEMS);
            case 'name':
                return (ctx && ctx.name) || 'friend';
            case 'mission':
                return (ctx && ctx.mission) || 'an adventure';
            case 'topic':
                return (ctx && ctx.topic) || 'the old days';
            case 'faction':
                return (ctx && ctx.faction) || 'the crew';
            case 'enemy':
                return (ctx && ctx.enemy) || 'that lot';
            case 'title':
                return (ctx && ctx.title) || 'a name to remember';
            case 'price':
                return (ctx && ctx.price != null) ? String(ctx.price) : 'a fair price';
            default:
                return '';
        }
    });
}

function tidy(s) {
    let out = s
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.!?])/g, '$1')
        .trim();
    out = out.replace(/\bi\b/g, 'I').replace(/\bi'/g, "I'");
    // capitalise the first letter and any letter after internal .!?
    out = out.replace(/([.!?]\s+)([a-z])/g, (mm, pfx, c) => pfx + c.toUpperCase());
    if (out.length) {
        out = out[0].toUpperCase() + out.slice(1);
        if (!/[.!?]$/.test(out)) {
            out += '.';
        }
    }
    return out;
}

// generate a mood/personality-flavoured line for a situation (bot optional); null if no grammar.
// opts.noVoice: return the clean line for the caller to voice once over a composed reply.
function generate(situation, ctx, bot, opts) {
    const tones = G[situation];
    if (!tones) {
        return null;
    }
    const keys = Object.keys(tones);
    const tone = bot ? chooseTone(bot, keys) : (tones.neutral ? 'neutral' : one(keys));
    const cores = tones[tone] || tones[one(keys)];
    if (!cores || !cores.length) {
        return null;
    }
    let m = null;
    try {
        if (bot) {
            deps();
            m = mood.of(bot);
        }
    } catch (e) {
        m = null;
    }
    const lead = one(LEADS[leadBucket(m)]);
    // don't hand a bot a core it used recently (last 24 lines, any situation)
    let core = one(cores);
    if (bot) {
        const recent = bot._recentCores || (bot._recentCores = []);
        for (let tries = 0; tries < 8 && recent.indexOf(core) !== -1 && cores.length > 1; tries++) {
            core = one(cores);
        }
        recent.push(core);
        if (recent.length > 24) recent.shift();
    }
    let line = tidy(lead + resolve(core, ctx || {}));
    // restyle in the bot's own voice (abbreviations, catchphrase); best-effort, falls back to the clean line
    if (bot && line && !(opts && opts.noVoice)) {
        try {
            line = require('./voice').apply(bot, line);
        } catch (e) {
            // voice optional
        }
    }
    return line && line.length ? line : null;
}


function has(situation) {
    return !!G[situation];
}

module.exports = { generate, has };
