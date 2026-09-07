# Single-player `::` commands

The embedded server accepts OpenRSC-style `::` commands. Type them into the
**chat box** with a leading `::`. On the Vita, tap the chat keyboard button,
type e.g. `::item 10 1000`, and send. The client routes any `::` input as a
COMMAND packet, so typed chat and UI buttons both work.

Source of truth: [`src/plugins/custom/player-commands.js`](src/plugins/custom/player-commands.js)
(the safe set) and [`src/packet-handlers/command.js`](src/packet-handlers/command.js)
(the debug/cheat console). Keep this file in sync when either changes.

## Who can run what

`isHost(socket)` (command.js) gates the cheat console:

- **Single-player**: you are the host (`sp` socket), so **every command below
  works**, including the full cheat console.
- **Co-op guests** (`g0`..`g6`): only the **safe set** works; the cheat console
  is refused with `Unknown command. Try ::commands`.

## Safe set (informational + social)

`::commands` prints these in-game (the cheat console is intentionally *not*
listed there). Aliases in parentheses.

| Command | Effect |
|---|---|
| `::commands` | List the safe commands |
| `::gameinfo` | Position + combat level + total level |
| `::coords` | Your x, y (and facing) |
| `::players` (`::online`) | Names of everyone in the world |
| `::g <msg>` (`::global <msg>`) | Global chat to every player (co-op) |
| `::time` (`::date`) | Server clock |
| `::kc` (`::kills`) | Your total NPC kills |
| `::achieve` (`::achievements`) | Achievement report |
| `::skiptutorial` | Finish the tutorial (teleports to Lumbridge) |
| `::pinvite <name>` / `::partyaccept` / `::party` / `::p <msg>` / `::leaveparty` | Party (co-op) |
| `::clan create <name>` / `::claninvite <name>` / `::clanaccept` / `::c <msg>` / `::clanleave` | Clan (co-op) |

## Cheat / debug console (host-only, i.e. you, in single-player)

These are the classic RSC dev-console commands. Ids are RSC item/npc/quest ids.

| Command | Effect |
|---|---|
| `::item <id> [amount]` | Add an item to your inventory (`::item 10 1000` = 1000 coins) |
| `::give <name> <id> [amount]` | Give an item to another player (co-op) |
| `::teleport <x> <y>` | Teleport to coordinates |
| `::teleport <region>` | Teleport to a named region (e.g. `::teleport lumbridge`) |
| `::goto <name>` | Teleport to a player |
| `::gotoentity <npcs\|gameObjects\|...> <id>` | Teleport to an entity by id |
| `::addexp <skill> <amount>` | Add experience (real XP; e.g. `::addexp strength 1000`) |
| `::setqp <n>` | Set quest points |
| `::setquest <name\|id> <stage>` | Set a quest's stage |
| `::npc <id>` | Spawn an NPC next to you (no respawn) |
| `::npcchase <id>` | Make a nearby NPC attack you |
| `::shop <name>` | Open a shop by name |
| `::bank` | Open the bank |
| `::dmg <amount>` | Damage yourself (`::dmg 9999` to test death) |
| `::fatigue` | Set fatigue near max (test the sleep screen) |
| `::clearinventory` | Empty your inventory |
| `::clearentities` | Clear local entities (resync) |
| `::droprandom <count>` | Drop N random items on the ground |
| `::appearance` | Reopen the appearance screen |
| `::sound <name>` / `::bubble <id>` / `::say <words>` | Play a sound / think bubble / overhead say |
| `::step <dx> <dy>` / `::face <dx> <dy>` | Walk / face a direction |
| `::coords` / `::npccoords <x> <y>` | Debug position readouts |
| `::kick <name>` | Kick a player (co-op) |
| `::setcache <key> <json>` | Set a raw player-cache value (advanced) |

### Handy for testing this build
- `::dmg 9999`: verify death → respawn (full HP at Lumbridge).
- `::npc <id>` then attack it: verify NPCs die and disappear.
- `::addexp hits 100000`: push Hitpoints past the level-10 floor and watch it
  level up correctly.
- `::teleport lumbridge`: get off Tutorial Island quickly.
