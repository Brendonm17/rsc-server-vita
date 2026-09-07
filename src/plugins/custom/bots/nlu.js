// analyze(text, ctx) turns one chat line into a structured reading: normalised text,
// clauses, one act per clause, entities, addressee, yes/no and sentiment. pure, side-effect free
'use strict';

// chat abbreviations -> plain words (per token)
const ABBREV = {
    u: 'you', ur: 'your', urs: 'yours', r: 'are', y: 'why', ya: 'you', yah: 'yes', yea: 'yes',
    yeh: 'yes', yh: 'yes', ye: 'yes', yep: 'yes', yup: 'yes', nah: 'no', nope: 'no', pls: 'please',
    plz: 'please', thx: 'thanks', thnx: 'thanks', ty: 'thanks', tyvm: 'thanks', tysm: 'thanks',
    wanna: 'want to', gonna: 'going to', gotta: 'got to', lemme: 'let me', omw: 'on my way',
    gz: 'congrats', gratz: 'congrats', grats: 'congrats', lvl: 'level', lvls: 'levels', cb: 'combat',
    cmb: 'combat', wc: 'woodcutting', fm: 'firemaking', atk: 'attack', att: 'attack', str: 'strength',
    def: 'defence', hp: 'hits', kk: 'ok', k: 'ok', okay: 'ok', idk: "i don't know", ikr: 'i know right',
    tbh: 'to be honest', np: 'no problem', wb: 'welcome back', sup: "what's up", hru: 'how are you',
    hyd: 'how are you', wyd: 'what are you doing', wud: 'what are you doing', gj: 'good job',
    nvm: 'never mind', ppl: 'people', sum: 'some', m8: 'mate', l8r: 'later', cya: 'see you',
    bc: 'because', cuz: 'because', cos: 'because', dunno: "don't know", ima: "i'm going to",
    imma: "i'm going to", u2: 'you too', gtg: 'got to go', g2g: 'got to go', brb: 'be right back',
    afk: 'away for a bit', rn: 'right now', atm: 'right now', omg: 'wow', lmao: 'haha', lol: 'haha',
    rofl: 'haha', xd: 'haha', ne1: 'anyone', any1: 'anyone', sum1: 'someone', some1: 'someone',
    every1: 'everyone', evry1: 'everyone', wat: 'what', wot: 'what', wut: 'what', dat: 'that',
    da: 'the', dis: 'this', dere: 'there', der: 'there', tho: 'though', thru: 'through', yr: 'your',
    ive: "i've", im: "i'm", dont: "don't", cant: "can't", wont: "won't", didnt: "didn't", isnt: "isn't",
    whats: "what's", wheres: "where's", hows: "how's", lets: "let's", thats: "that's", youre: "you're",
    ill: "i'll", id: "i'd", theres: "there's", hes: "he's", shes: "she's", ive: "i've", ur: 'your',
    coz: 'because', bout: 'about', prolly: 'probably', prob: 'probably', wit: 'with', abt: 'about',
    smth: 'something', sth: 'something', sry: 'sorry', soz: 'sorry', ofc: 'of course', wtf: 'what',
    nite: 'night', gn: 'good night', gm: 'good morning', hbu: 'how about you', wbu: 'what about you',
    fren: 'friend', gud: 'good', gr8: 'great', luv: 'love', kewl: 'cool', ne: 'any', nething: 'anything',
    sec: 'second', min: 'minute', mins: 'minutes', b4: 'before', tmrw: 'tomorrow', tho: 'though'
};

// keywords a typo can be corrected to (edit distance 1; token must be 4+ letters)
const LEXICON = [
    'hello', 'thanks', 'please', 'follow', 'fishing', 'mining', 'woodcutting', 'smithing', 'cooking',
    'crafting', 'magic', 'prayer', 'ranged', 'level', 'party', 'trade', 'bank', 'quest', 'dragon',
    'giant', 'demon', 'where', 'what', 'when', 'which', 'wearing', 'doing', 'going', 'help', 'wait',
    'stop', 'come', 'here', 'there', 'friend', 'money', 'gold', 'armour', 'weapon', 'sword', 'shield',
    'later', 'morning', 'night', 'again', 'sorry', 'nice', 'awesome', 'strong', 'weak', 'dead', 'kill',
    'attack', 'join', 'team', 'group', 'want', 'need', 'like', 'love', 'hate', 'good', 'great', 'fine',
    'well', 'everyone', 'anyone', 'someone', 'about', 'think', 'know', 'mate', 'adventure', 'explore',
    'train', 'grind', 'sell', 'price', 'cheap', 'coins', 'tired', 'bored', 'ready', 'fight', 'safe',
    'danger', 'careful', 'quick', 'slow', 'back', 'home', 'castle', 'church', 'mine', 'river', 'tree',
    'forest', 'swamp', 'desert', 'tower', 'village', 'town', 'road', 'bridge', 'gate', 'door', 'shop',
    'store', 'chop', 'wood', 'logs', 'fish', 'cook', 'smith', 'craft', 'bones', 'bury', 'cows', 'goblin',
    'chicken', 'lumbridge', 'varrock', 'draynor', 'falador', 'kharid', 'sarim', 'docks', 'boat', 'guild',
    'your', 'yours', 'thing', 'things', 'today', 'tonight', 'always', 'never', 'maybe', 'really', 'very',
    'better', 'worse', 'best', 'worst', 'first', 'last', 'next', 'people', 'player', 'name', 'game',
    'world', 'place', 'spot', 'stuff', 'gear', 'food', 'bread', 'lobster', 'trout', 'shrimp', 'salmon'
];
const LEX_SET = new Set(LEXICON);
// ordinary english the corrector leaves alone though one edit from a lexicon word
const COMMON = new Set(('the a an and or but so then if of to in on at by for with from into onto over under about ' +
    'i me my mine you your yours he him his she her hers it its we us our they them their this that these those ' +
    'am is are was were be been being have has had do does did done will would shall should can could may might must ' +
    'not no yes ok okay all any some none each every both few many much more most other another such only own same ' +
    'than too very just also even still already again always never often sometimes now soon later once ' +
    'here there where when why how what which who whom whose why because as until while during before after ' +
    'above below up down out off away back over through between around near far along across ' +
    'come came comes coming go goes went gone going get got gets getting give gave given giving take took taken ' +
    'make made makes making see saw seen seeing look looked looking find found finding know knew known think thought ' +
    'want wanted wants need needed needs like liked likes love loved hate hated feel felt say said says tell told ' +
    'ask asked keep kept let put set run ran walk walked talk talked play played work worked try tried use used ' +
    'help helped show showed start started stop stopped turn turned move moved live lived stay stayed wait waited ' +
    'meet met bring brought hold held sit sat stand stood leave left call called mean meant seem seemed ' +
    'good bad big small long short high low old new young hot cold nice fine great little large right wrong ' +
    'day days night time times year years week hour hours minute minutes second seconds today tonight tomorrow ' +
    'man men woman women boy girl guy guys people person friend friends mate mates name thing things way ways ' +
    'home house place places world game games life hand hands head eyes face word words part parts side ' +
    'one two three four five six seven eight nine ten first last next same ' +
    'something anything nothing everything someone anyone everyone nobody somewhere anywhere ' +
    'been being were was mine sure yeah yep nope maybe please thanks sorry hello hi hey bye ' +
    'gold coins money food fish ore logs bones bank shop mine tree river road cave town city ' +
    'ever once since story stories tale tales joke jokes news lately recently earlier today tonight yesterday ' +
    'kill killed fight fought seen met beat beaten done finished ' +
    'hell hella heck damn bell yell cell sell tell fell well busy free bored').split(/\s+/));
const LEX_BY_LEN = {};
for (const w of LEXICON) { (LEX_BY_LEN[w.length] = LEX_BY_LEN[w.length] || []).push(w); }

const GROUP_WORDS = /\b(everyone|everybody|anyone|anybody|guys|lads|all of you|you all|you lot|people|folks|team|party)\b/;
const YES = /^(?:ok(?:ay)?|yes|yeah|yep|yup|sure|aye|alright|fine|absolutely|definitely|course|of course|why not|sounds good|i'm in|count me in|let's do it|deal|agreed|for sure|go on then|please|i'd love to|love to|gladly|obviously|totally|yes please|ok then|sure thing|will do|on it)\b/;
const NO = /^(?:no|nah|nope|not really|i'll pass|pass|maybe later|not now|no thanks|no thank you|hard pass|no way|never|can't|cannot|busy|another time|rather not|not today|not right now|i'm good|i'm fine thanks|don't think so|i don't think so)\b/;
const POSITIVE = /\b(good|great|nice|awesome|love|like|cool|amazing|happy|glad|fun|best|brilliant|lovely|sweet|wicked|epic|legend|fantastic|wonderful|excellent|perfect|enjoy|enjoying|thanks|cheers|yay|woo)\b/g;
const NEGATIVE = /\b(bad|hate|boring|bored|sucks|terrible|awful|annoying|sad|tired|worst|stupid|dumb|ugh|meh|rubbish|crap|angry|hurt|dying|lost|died|dead|scared|worried|stuck|broke|poor)\b/g;

const SKILL_PATTERNS = [
    [/\b(woodcutting|woodcut|chopping|chop|logs)\b/, 'woodcutting'],
    [/\b(fishing|fish)\b/, 'fishing'],
    [/\b(mining|mine|ores?)\b/, 'mining'],
    [/\b(smithing|smith|smelt(ing)?|anvil)\b/, 'smithing'],
    [/\b(cooking|cook)\b/, 'cooking'],
    [/\b(crafting|craft)\b/, 'crafting'],
    [/\b(fletching|fletch)\b/, 'fletching'],
    [/\b(firemaking|fire making|fires?)\b/, 'firemaking'],
    [/\b(magic|mage|spells?|runes)\b/, 'magic'],
    [/\b(ranged|range|archery|bows?|arrows)\b/, 'ranged'],
    [/\b(prayer|pray|praying|altar)\b/, 'prayer'],
    [/\b(attack)\b/, 'attack'],
    [/\b(strength)\b/, 'strength'],
    [/\b(defence|defense)\b/, 'defence'],
    [/\b(hits|hitpoints|health)\b/, 'hits'],
    [/\b(thieving|thieve|pickpocket(ing)?|steal(ing)?)\b/, 'thieving'],
    [/\b(agility)\b/, 'agility'],
    [/\b(herblaw|herblore|herbs?|potions?)\b/, 'herblaw'],
    [/\b(runecraft(ing)?)\b/, 'runecraft'],
    [/\b(combat|fighting|training)\b/, 'combat']
];

// act rules, checked in order; first match wins. entry: [type, regex]
const ACT_RULES = [
    ['story', /\b(tell me a (story|tale|joke)|tell us a (story|tale|joke)|got a (story|tale|joke)|got any (stories|tales|jokes)|any (stories|tales|jokes)|tell me something (interesting|funny|good|exciting)|entertain me|tell me about your (day|adventures|travels))\b/],
    ['whatsNew', /\b(what's new|anything new|any news|what have you been up to|what you been up to|how have you been|how've you been|how you been|what did you do today|what have you done today|been up to much|up to much|what's been happening|what happened today|any adventures|done anything (good|fun|exciting)|what's the latest)/],
    ['howAreYou', /\b(how are you|how're you|how you doing|how are things|how's it going|how is it going|you ok\b|you alright|you good\b|are you ok\b|are you alright|are you well|what's up\b|how's life|how's things|how do you do|how goes it|how are we)/],
    ['whatDoing', /\b(what are you doing|what you doing|what are you up to|what you up to|whatcha doing|what are you working on|what's the plan|what you on\b|what are you on\b|what are you after|what brings you|you busy|u busy|are you busy|busy\?|keeping busy|what you been doing)/],
    ['whoAreYou', /\b(who are you|what's your name|your name\b|who is this|who's this|who's that|introduce yourself|who am i talking to|do i know you)/],
    ['askLevel', /\b(what level are you|what's your level|your level|how strong are you|your combat|combat level|what level\b|how good are you|how high are you|what are your stats|your stats)/],
    ['askGear', /\b(what are you wearing|what you wearing|your weapon|what weapon|your gear|what gear|what are you wielding|what you wielding|what armour|your armour|what sword|what shield)/],
    ['help', /\b(help me|can you help|could you help|would you help|will you help|need (a hand|some help|help with|backup|a partner|a mate)|give me a hand|lend (me )?a hand|come help|help with|help please|any help|assist me)/],
    ['invite', /\b(join (my|our|the) party|party up|team up|join me|join us|want to join|group up|lfg|lfm|lfp|need (a|one) more|be in my party|can i join|let me join|invite me|party\?|wanna party|want to party|fancy a party|party with (me|us)|up for a party|in a party)/],
    ['offer', /\b(want this|want it\b|take this|take it\b|you can have|have this|here you go|here, take|i'll give you|i can give you|fancy this|my spare|got a spare|yours if you like|this is for you|a gift for you|present for you|i'll trade you)/],
    ['request', /\b(can i have|could i have|give me|gimme|lend me|can you give|could you give|could you spare|spare me|got any|have you got any|do you have any|any spare|need (a|an|some|any) (?!hand|help|partner|mate|sec|second|minute)\w+|can i borrow|hand over|i want your)/],
    ['follow', /\b(follow me|come with me|come with|stick with me|on me\b|stay with me|walk with me|tag along with me|follow)\b/],
    ['come', /\b(come here|come over|over here|get over here|come to me|this way|come on over|come on\b|come\b.*\bhere)/],
    ['wait', /\b(wait|hold on|hold up|stop\b|stay\b|halt|one sec|hang on|give me a sec|stay here|stay there|hold it)/],
    ['propose', /\b(let's|shall we|want to|fancy|up for|how about we|why don't we|we should|we could|wanna|come (fishing|mining|hunting|chopping|questing|training|exploring|with me to)|join me (for|at|in)|go (fishing|mining|chopping|hunting|exploring|training)|do you want to)/],
    ['goto', /\b(let's go|go to|head to|meet (me|us) at|to the\b|off to|going to the)/],
    ['askAbout', /\b(did you (ever|once) (fight|kill|beat|see|meet|do|finish|find)|where are you from|where you from|where do you live|what do you do\b|what's your (dream|goal|story|thing)|tell me about (you|yourself)|how long have you|do you have a|have you (ever|got|been|done|seen|killed|beaten|finished)|are you (from|a |an |in |going|new|here often)|what's your favourite|what's your favorite|are you a (bot|robot|real|human|npc)|you a bot|you real|been here long|what are you into)/],
    ['askLocationOf', /\b(where is|where's|where are (the|some|any|all)|where can i (find|get)|where do i (find|get)|how do i get to|how to get to|which way|directions to|where to find|nearest|closest|where do i go|where to go|how do i reach|how to reach|way to the)/],
    ['askHowTo', /\b(how do i|how to\b|how can i|how does|how do you|how would i|how should i|any tips|got a tip|advice)/],
    ['askOpinion', /\b(do you like|what do you think|do you think|your opinion|any good\b|thoughts on|worth it|is it good|is that good|do you prefer|which is better|which do you|do you enjoy|do you rate|rate this|do you reckon)/],
    ['askWhatIs', /\b(what is|what's a|what's an|what's the|what are|what does|what do\b|what kind|what sort|what item|what monster|what quest|what skill|which quest|which skill|which monster|which item|what's this|what's that)/],
    ['status', /\b(be right back|back now|i'm back|low hits|low health|low hp|out of (food|runes|arrows|prayer)|need food|dying|save me|poisoned|i'm hurt|so tired|i'm tired|away for a bit|i'm away|one moment|two secs)/],
    ['celebrate', /\b(level \d+|ding|just hit|levelled up|leveled up|reached \d+|new record|finally got|i got \d+|got 99|hit 99|just got|new best|first ever|got my)/],
    // a state report answering how are you
    ['wellbeing', /^(?:i'm |i am |i'm doing |doing |pretty |very |quite |really |all |just |yeah |yes |oh )*(good|great|fine|ok|alright|not bad|well|grand|brilliant|fantastic|tired|bad|rough|meh|so so|bored|sad|happy|knackered|exhausted|hungry|busy|not great|not too bad|could be better|been better|amazing|awesome|lovely)\b(?:[ ,]*(thanks|thank you|ta|cheers|mate|and you|you\?|hbu|and yourself))*[.!?]*$/],
    ['thanks', /\b(thanks|thank you|cheers|appreciate|appreciated|much obliged|thanks a lot|thanks so much|ta\b|nice one thanks|thank u)/],
    ['apology', /\b(sorry|my bad|apologies|oops|my mistake|didn't mean|forgive me|excuse me)/],
    ['farewell', /\b(bye|goodbye|see you|see ya|later\b|laters|got to go|logging|good ?night|night\b|farewell|take care|peace out|off now|heading off|i'm off|catch you later|until next time|have a good one)/],
    ['acknowledge', /\b(no problem|no worries|it's fine|all good|that's ok|that's okay|don't worry|no bother|fair enough|i see\b|makes sense|gotcha|understood|right then|noted)/],
    ['compliment', /\b(nice|awesome|cool|amazing|impressive|good job|well done|congrats|legend|goat|pro\b|skilled|strong|great work|love your|you're good|you're great|you're the best|so cool|epic|brilliant|nice work|good work|well played|gg\b)/],
    ['insult', /\b(noob|nub|trash|loser|idiot|stupid|dumb|ez\b|scrub|clown|suck|sucks|garbage|rekt|owned|weak|pathetic|coward|useless|you're bad|shut up|get lost|go away|piss off|moron|fool|rubbish)/],
    ['greet', /^(?:hi|hello|hey|yo|hiya|heya|howdy|greetings|hallo|ello|oi|good (morning|afternoon|evening|day)|morning|evening|afternoon|wassup|hey there|hi there|hello there|hey you|hi all|hello all|hi everyone|hello everyone|hey everyone|hi guys|hey guys|hello guys|hey all)\b|\b(hi|hello|hey) (there|everyone|guys|all|lads|folks|mate|friend)\b|\bhello\b|\bhi\b|\bhey\b|\bgreetings\b|\bhiya\b|\bheya\b|\bhowdy\b/],
    ['laugh', /\b(haha+|hehe+|lmao|funny|hilarious|jokes|joking|kidding|good one|classic|that's funny|so funny)\b|:\)|:d\b|\^\^/],
    ['affirm', /^(?:yes|yeah|yep|yup|sure|ok|aye|alright|fine|absolutely|definitely|course|of course|why not|sounds good|i'm in|count me in|let's do it|deal|agreed|for sure|go on then|please|i'd love to|love to|gladly|obviously|totally|yes please|ok then|sure thing|will do|on it|true|indeed|exactly|right\b|yes it is|it is)\b/],
    ['deny', /^(?:no|nah|nope|not really|i'll pass|pass|maybe later|not now|no thanks|no thank you|hard pass|no way|never|can't|cannot|busy|another time|rather not|not today|not right now|i'm good|don't think so|i don't think so|wrong|false|no it isn't|it isn't)\b/],
    ['question', /\?|^(?:who|what|where|when|why|how|which|is|are|do|does|did|can|could|would|will|should|have|has|anyone|anybody)\b/]
];

// normalisation
function collapseRepeats(tok) {
    // hellooo -> hello, yesss -> yes, but keep double letters (hello, good)
    return tok.replace(/(.)\1{2,}/g, '$1$1');
}

function within1(a, b) {
    // levenshtein distance <= 1
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < la && j < lb) {
        if (a[i] === b[j]) { i++; j++; continue; }
        if (++edits > 1) return false;
        if (la > lb) i++;
        else if (lb > la) j++;
        else { i++; j++; }
    }
    if (i < la || j < lb) edits++;
    return edits <= 1;
}

// words from game names registered by dialogue.js so they aren't "corrected"
const KNOWN_EXTRA = new Set();
function addKnownWords(words) {
    for (const w of words) {
        if (!w) continue;
        for (const part of String(w).toLowerCase().split(/[^a-z0-9']+/)) {
            if (part.length >= 3) KNOWN_EXTRA.add(part);
        }
    }
}

function correct(tok) {
    if (tok.length < 4 || LEX_SET.has(tok) || COMMON.has(tok) || KNOWN_EXTRA.has(tok) || /\d|'/.test(tok)) return tok;
    // a plural of a known word is known too
    if (tok.endsWith('s') && (LEX_SET.has(tok.slice(0, -1)) || COMMON.has(tok.slice(0, -1)) || KNOWN_EXTRA.has(tok.slice(0, -1)))) return tok;
    // lexicon is in priority order: the first word within one edit wins
    for (let i = 0; i < LEXICON.length; i++) {
        const w = LEXICON[i];
        if (Math.abs(w.length - tok.length) <= 1 && within1(tok, w)) return w;
    }
    return tok;
}

// lowercase, expand abbreviations, collapse runs, fix typos, keep clause punctuation
function normalize(text) {
    const lower = String(text).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
    const parts = lower.split(/(\s+|[.!?,;:]+)/);
    const out = [];
    for (let i = 0; i < parts.length; i++) {
        let p = parts[i];
        if (!p) continue;
        if (/^\s+$/.test(p)) { out.push(' '); continue; }
        if (/^[.!?,;:]+$/.test(p)) { out.push(p); continue; }
        const stripped = p.replace(/^[^a-z0-9']+|[^a-z0-9'?!]+$/g, '');
        if (!stripped) continue;
        let tok = collapseRepeats(stripped);
        if (Object.prototype.hasOwnProperty.call(ABBREV, tok)) tok = ABBREV[tok];
        else tok = correct(tok);
        out.push(tok);
    }
    // drop an interjection between the question word and its verb
    return out.join('').replace(/\s+/g, ' ').trim()
        .replace(/\b(what|who|where|how|why|when|which)( the)? (hell|heck|fuck|f|tf|wtf|on earth|in the world)\b ?/g, '$1 ')
        .replace(/\s+/g, ' ').trim();
}

function splitClauses(norm) {
    const raw = norm.split(/[.!?;]+|,\s*(?=(?:and|but|then|so|also|or)\b)|\b(?:and then|but|then)\b/);
    const clauses = [];
    for (let r of raw) {
        r = r.replace(/^[\s,]+|[\s,]+$/g, '');
        if (!r) continue;
        // "hi, want to go fishing" -> a leading greeting is its own clause
        const m = r.match(/^(hi|hello|hey|yo|hiya|heya|howdy|greetings|morning|evening)(?:\s+(there|everyone|guys|all|lads|folks|mate|friend|\w+))?,\s+(.+)$/);
        if (m && m[3] && m[3].length > 2) { clauses.push(m[0].slice(0, m[0].length - m[3].length).replace(/,\s*$/, '')); clauses.push(m[3]); continue; }
        clauses.push(r);
    }
    return clauses.length ? clauses : [norm];
}

function classify(clause) {
    for (let i = 0; i < ACT_RULES.length; i++) {
        if (ACT_RULES[i][1].test(clause)) return ACT_RULES[i][0];
    }
    return 'statement';
}

function sentimentOf(norm) {
    const pos = (norm.match(POSITIVE) || []).length;
    const neg = (norm.match(NEGATIVE) || []).length;
    const s = pos - neg;
    return s > 1 ? 1 : s < -1 ? -1 : s;
}

function yesNo(firstClause) {
    if (NO.test(firstClause)) return 'no';
    if (YES.test(firstClause)) return 'yes';
    return null;
}

// nearby player names in the line (exact or one edit off for 4+ letter names)
function findNames(norm, names) {
    const found = [];
    if (!names || !names.length) return found;
    const toks = norm.split(/[^a-z0-9']+/);
    // exact matches first ("bot9" must never be read as "bot0")
    for (const n of names) {
        if (!n) continue;
        const ln = String(n).toLowerCase();
        if (toks.indexOf(ln) !== -1) found.push(ln);
    }
    if (found.length) return found;
    // then a typo of a longer name, but only when exactly one name fits
    for (const t of toks) {
        if (t.length < 5) continue;
        let hit = null, hits = 0;
        for (const n of names) {
            const ln = String(n).toLowerCase();
            if (ln.length >= 5 && within1(t, ln)) { hit = ln; hits++; }
        }
        if (hits === 1) { found.push(hit); break; }
    }
    return found;
}

function findSkills(norm) {
    const out = [];
    for (const [re, skill] of SKILL_PATTERNS) {
        if (re.test(norm) && out.indexOf(skill) === -1) out.push(skill);
    }
    return out;
}

// name table (Map name -> id) -> Map firstWord -> [[name, id], ...], built once per table
const NAME_INDEX = new WeakMap();
function nameIndex(table) {
    let idx = NAME_INDEX.get(table);
    if (idx) return idx;
    idx = new Map();
    for (const [name, id] of table) {
        if (!name || name.length < 3) continue;
        const first = name.split(/[^a-z0-9']+/)[0];
        if (!first) continue;
        let list = idx.get(first);
        if (!list) { list = []; idx.set(first, list); }
        list.push([name, id]);
    }
    NAME_INDEX.set(table, idx);
    return idx;
}

// the reading
// ctx: { nearbyNames, helpers: { placeKeyword, findBoss, findActivity, findQuest }, knowledge: { itemByName, npcByName } }
function analyze(text, ctx) {
    ctx = ctx || {};
    const norm = normalize(text);
    const clauses = splitClauses(norm);
    const acts = clauses.map((c) => ({ type: classify(c), clause: c }));
    {
        // leading yes/no: "no thanks" / "yes please" / "sure, let's go"
        const first = clauses[0];
        const lead = first.match(/^(no thanks|no thank you|yes please|ok then|sure thing|yes|yeah|yep|yup|sure|ok|aye|alright|no|nah|nope)\b[,!. ]*(.*)$/);
        if (lead) {
            const rest = lead[2].trim();
            const answer = /^(no|nah|nope)/.test(lead[1]) ? 'deny' : 'affirm';
            if (!rest || /^(thanks|thank you|please|mate|then|ok|sure|it is|i am|i will|i do|i can|i can't|i'm not|not really)$/.test(rest)) {
                acts[0] = { type: answer, clause: first };
            } else {
                acts[0] = { type: classify(rest), clause: rest };
                acts.unshift({ type: answer, clause: lead[1] });
            }
        }
    }

    // a proposal/goto needs something to propose; without a target it is an opinion ask or a statement
    const helpers = ctx.helpers || {};
    const know = ctx.knowledge || {};
    const entities = { players: [], items: [], npcs: [], places: [], skills: [], quests: [], numbers: [] };
    entities.players = findNames(norm, ctx.nearbyNames);
    entities.skills = findSkills(norm);
    entities.numbers = (norm.match(/\b\d+\b/g) || []).map((n) => parseInt(n, 10));
    // longest name present as whole words; tables indexed by first word so only a few names are checked
    const findEntity = (table) => {
        const index = nameIndex(table);
        const toks = norm.split(/[^a-z0-9']+/);
        let best = null, bestLen = 0;
        for (let ti = 0; ti < toks.length; ti++) {
            const cands = index.get(toks[ti]);
            if (!cands) continue;
            for (let ci = 0; ci < cands.length; ci++) {
                const name = cands[ci][0];
                if (name.length <= bestLen) continue;
                const at = norm.indexOf(name);
                if (at === -1) continue;
                const before = at === 0 ? ' ' : norm[at - 1];
                const after = at + name.length >= norm.length ? ' ' : norm[at + name.length];
                if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) continue;
                best = { name, id: cands[ci][1] }; bestLen = name.length;
            }
        }
        return best;
    };
    try {
        if (know.itemByName) { const it = findEntity(know.itemByName); if (it) entities.items.push(it); }
        if (know.npcByName) { const np = findEntity(know.npcByName); if (np) entities.npcs.push(np); }
    } catch (e) {}
    let placeHit = null, boss = null, activity = null, quest = null;
    try { placeHit = helpers.placeKeyword ? helpers.placeKeyword(norm) : null; } catch (e) { placeHit = null; }
    try { boss = helpers.findBoss ? helpers.findBoss(norm) : null; } catch (e) { boss = null; }
    try { activity = helpers.findActivity ? helpers.findActivity(norm) : null; } catch (e) { activity = null; }
    try { quest = helpers.findQuest ? helpers.findQuest(norm) : null; } catch (e) { quest = null; }
    if (placeHit) entities.places.push(placeHit.kw);
    if (quest) entities.quests.push(quest);

    const hasTarget = !!(placeHit || boss || activity || quest || entities.skills.length || entities.npcs.length);
    for (const a of acts) {
        // "i have some bread for you" / "got a spare pickaxe, want it" -> an offer
        if (a.type === 'statement' && entities.items.length && /\b(for you|you can have|you want it|if you want|take it|have it)\b/.test(a.clause)) a.type = 'offer';
        if (a.type === 'propose' && !hasTarget) a.type = /\?/.test(text) ? 'askOpinion' : 'statement';
        if (a.type === 'goto' && !placeHit) a.type = 'statement';
        if (a.type === 'askLocationOf' && !placeHit && !entities.npcs.length && !entities.items.length &&
            !/\b(bank|anvil|furnace|range|altar|spinning|shop|store|mine|docks|boat|tree|trees|get to|way to|directions|reach)\b/.test(a.clause)) a.type = 'question';
    }

    // the primary act: the first substantive one; a lone greeting stays a greeting
    const SOFT = { greet: 1, laugh: 1, affirm: 1, deny: 1, acknowledge: 1, statement: 1 };
    let primary = acts[0];
    for (const a of acts) { if (!SOFT[a.type]) { primary = a; break; } }

    let addressee = null;
    if (entities.players.length) addressee = { name: entities.players[0] };
    else if (GROUP_WORDS.test(norm)) addressee = 'all';

    return {
        text: String(text),
        norm,
        clauses,
        acts,
        primary,
        isQuestion: /\?/.test(text) || acts.some((a) => /^(ask|question|howAreYou|whatDoing|whoAreYou)/.test(a.type)),
        yesno: yesNo(clauses[0]),
        sentiment: sentimentOf(norm),
        addressee,
        entities,
        placeHit,
        boss,
        activity,
        quest,
        mentionsYou: /\byou\b/.test(norm),
        mentionsMe: /\b(i|me|my|i'm|i've|i'll|mine)\b/.test(norm)
    };
}

module.exports = { analyze, normalize, classify, splitClauses, within1, addKnownWords, YES, NO, ABBREV };
