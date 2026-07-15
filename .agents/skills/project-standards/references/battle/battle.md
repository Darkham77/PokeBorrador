# Battle Mechanics

The heart and soul of the Pokémon franchise is in many ways the battle system, and though the details have changed back and forth, the fundamentals of it have been faithfully retained since the the first Game Boy games. Here I will explain the most significant parts of the Pokémon battle system.

## Prerequisites

This section assumes you know the concepts it is going to discuss. In particular, you should be familiar with the basic idea of:

- [Pokémon levels and stats](https://www.dragonflycave.com/mechanics/stats/)
- [Stat stages](https://www.dragonflycave.com/mechanics/stat-stages/)
- Type matchups
- Abilities
- Hold items
- [Status ailments](https://www.dragonflycave.com/mechanics/status-ailments/)
- Physical vs. special moves
- Move base power and accuracy
- Move priority
- Move targeting
- Critical hits
- Secondary effects
- Weather
- Field effects

Stats, stat stages and status ailments have their own sections; most of the other concepts are introduced in the [Battling Basics](https://www.dragonflycave.com/mechanics/battling-basics/) section. You don't need to know exactly how they work (that's what this section is for, after all), only roughly what they are so you'll have some idea what I'm talking about. Most avid Pokémon fans will have absorbed an awareness of most of these concepts through their own experience playing the games and osmosis from internet discussions.

## Contents

I'm not going to go into every minute facet of the battle system here; this section is intended to be interesting and give a sense of how things work more than to serve as a reference for damage calculators. However, I will cover the main mechanics that come into play during a typical turn of a battle:

- **[Turn Order](https://www.dragonflycave.com/mechanics/battle/#turnorder):** how the game decides in what order the Pokémon will make their moves.
- **[Accuracy Checks](https://www.dragonflycave.com/mechanics/battle/#accuracy):** how the game determines whether a move will hit a given target.
- **[Critical Hits](https://www.dragonflycave.com/mechanics/battle/#critical):** how the game decides whether a move will be a critical hit.
- **[Damage Calculation](https://www.dragonflycave.com/mechanics/battle/#damage):** how the game decides how much damage will be done to the target.
- **[Secondary Effects](https://www.dragonflycave.com/mechanics/battle/#sideeffects):** how the game decides whether secondary effects of moves should activate.

These sections are mostly self-contained and vary in length, but are designed to be read in order. Finally, for those who want to know the details in more depth, there is a **[Further Reading](https://www.dragonflycave.com/mechanics/battle/#furtherreading)** section pointing you to where you can satisfy your curiosity.

## Turn Order

When every player has chosen an action for a turn, the game determines in what order the Pokémon should move, according to the following rules (earlier rules on the list take precendence over later rules):

01. _Switching_ Pokémon will always happen before any other action, unless an opponent used the move **Pursuit** on the Pokémon being switched out, in which case the Pursuit user moves first and strikes the Pokémon (dealing double the usual damage) before the switch happens.
02. In a rotation battle, _rotation_ happens after switching but before moves are used. The Pokémon that is rotated in can use a move (but not switch out) on the same turn the rotation happens.
03. _Mega evolution_ happens after switching/rotation, just before any moves are executed. In the sixth-generation games, it does not affect turn order - that is, if a Pokémon's Speed is different upon Mega evolution, its new Speed only comes into effect the turn after the Mega evolution happens, since by the time the Mega evolution happens the turn order has already been determined. This is fixed in the seventh-generation games onwards.
04. Pokémon that are using higher-priority moves move before Pokémon that are using lower-priority moves.
05. Any Pokémon that is holding a **Quick Claw** which activates on that turn (20% chance, or 23.4% in the second generation), has the ability **Quick Draw** and has it activate on that turn (30% chance), or has consumed a **Custap Berry** on this turn (happens at the beginning of the turn if the Pokémon's current HP is less than 25% of its maximum HP) moves before other Pokémon whose moves have the same priority. If multiple Pokémon activate Quick Claw, Quick Draw or a Custap Berry in the same turn, they will move in descending order by their calculated Speed stat (see below).
06. Any Pokémon holding a **Full Incense** or a **Lagging Tail** moves after any other Pokémon using a move of the same priority. If multiple Pokémon are holding a Full Incense or a Lagging Tail, they will move in _ascending_ order by their calculated Speed stat.
07. Any Pokémon with the ability **Stall** moves after other Pokémon whose moves have the same priority and which are not holding a Full Incense or a Lagging Tail. If there are multiple such Pokémon, they will move in ascending order by their calculated Speed stat.
08. Any Pokémon with the ability **Mycelium Might** that is using a status move will move after other Pokémon in the same priority bracket. If there are multiple such Pokémon, they will move in ascending order by their calculated Speed stat.
09. Any other Pokémon will move in descending order by their calculated Speed stat, unless **Trick Room** is in effect, in which case they will move in ascending order by their calculated Speed stat. (In the fifth generation, Pokémon with a calculated Speed of 1809 or above are considered to have a Speed of 0 under Trick Room due to a bug.)
10. If multiple Pokémon to which no previous rule applies have the same calculated Speed, the tie is broken at random.

Note that some abilities can affect the priority of moves: a Pokémon with **Prankster** will have the priority of all its status moves increased by one; a Pokémon with **Gale Wings** will have the priority of its Flying-type moves increased by one when its HP is full (the HP restriction was not present prior to the seventh generation); and a Pokémon with **Triage** will have the priority of all its healing moves increased by three.

However, the turn order can also be tweaked from this order during the execution of the turn itself:

- If more than one Pokémon uses the move **Round**, then as soon as the first one has successfully used it, all the remaining Round users will be moved to immediately after it in the queue (in the same relative order as before).
- If a Pokémon has the ability **Dancer**, then any time a dance move is used, that Pokémon will repeat the move immediately after it is used, in addition to its own selected move.
- If a Pokémon is targeted with the move **Instruct**, then it will immediately perform the last move that it made, in addition to its own selected move.
- If two Pokémon on the same side are each using a different one of Fire Pledge, Grass Pledge and Water Pledge this turn, the slower one will move immediately after the first has moved to create the appropriate combo field effect.
- If a Pokémon successfully targets another Pokémon that has yet to make its move with **After You**, the target will be moved to immediately after the user in the turn order.
- If a Pokémon successfully targets another Pokémon that has yet to make its move with **Quash**, the target will be made last in the turn order.

These changes are completely independent of move priority, Speed, Trick Room and so on; they just modify the turn order directly. As all of them involve regular 0-priority moves and cannot affect moves that have already happened when the triggering move is used, however, high-priority moves will in practice indeed always strike first; only low- and neutral-priority moves can have their order scrambled as a result of these moves.

#### Calculated Speed

Your Pokémon's "calculated Speed" is its Speed stat with all appropriate Speed modifiers applied, as follows (note that this list is ordered mostly arbitrarily and due to rounding errors you could be off by a few points if you were to actually do the calculation if any non-integers are involved; if you need exact accuracy, I'm afraid this is not the page you're looking for):

- Initially, consider the Speed to be the Pokémon's out-of-battle Speed stat as shown on its summary screen.
- Multiply the Speed by the multiplier corresponding to the Pokémon's current Speed [stat stage](https://www.dragonflycave.com/mechanics/stat-stages/).
- In the first three generations, if the Pokémon's trainer has a particular badge from the game's primary region (Koga's Soulbadge in R/B/Y/FR/LG, Whitney's Plain Badge in G/S/C or Wattson's Dynamo Badge in R/S/E) and the battle is not a link battle, multiply its Speed by 1.125 (in first- and second-generation games) or 1.1 (in third-generation games).
- If the Pokémon is paralyzed and does not have the **Quick Feet** ability, halve its Speed (prior to the seventh generation, divide it by four). [Note that in R/B/Y, stat modification was buggy and could lead to strange results.](https://www.dragonflycave.com/mechanics/gen-i-stat-modification/)
- If the Pokémon is holding a **Choice Scarf**, multiply its Speed by 1.5.
- If the Pokémon is holding an **Iron Ball**, **Macho Brace**, **Power Bracer**, **Power Belt**, **Power Lens**, **Power Band**, **Power Anklet** or **Power Weight**, divide its Speed by two.
- If **Tailwind** is in effect on the Pokémon's side, multiply its Speed by two.
- If the Pokémon is an untransformed Ditto and is holding a **Quick Powder**, multiply its Speed by two.
- If the Pokémon has the **Swift Swim** ability and the weather is rainy, or the Pokémon has the **Chlorophyll** ability and the weather is sunny, or the Pokémon has the **Sand Rush** ability and a sandstorm is raging, or the Pokémon has the **Slush Rush** ability and it is hailing/snowing, multiply its Speed by two.
- If the Pokémon has the **Unburden** ability, has consumed or lost a held item since it became active and is now holding no item, multiply its Speed by two.
- If the Pokémon has the **Surge Surfer** ability and Electric Terrain is in effect, multiply its Speed by two.
- If the Pokémon has the **Quick Feet** ability and currently has a major status ailment, multiply its Speed by 1.5.
- If the Pokémon has the **Slow Start** ability and has been active for five consecutive turns or less, divide its Speed by two.

This means the calculated Speed stat can at most be 4 \* 1.5 \* 2 \* 2 = 24 times the Pokémon's out-of-battle Speed stat; this would be if it has a Speed stat stage of 6, is holding a Choice Scarf, has a 2x Speed ability bonus, and is under the effects of Tailwind. The lowest it could get is 1/4 \* 1/4 \* 1/2 \* 1/2 or 1/64 of the out-of-battle Speed, if it has a Speed stat stage of -6, is paralyzed (pre-Gen VII), holding an Iron Ball or a power item, and has the Slow Start ability.

In the first two generations, calculated stats were capped at 999, so any result above that number would be made 999 instead.

In Red, Blue and Yellow, stat modification was buggy, so this may not always be accurate in those games. See the [R/B/Y Stat Modification](https://www.dragonflycave.com/mechanics/gen-i-stat-modification/) section for more information.

## Accuracy Check

If the move being used can miss, the game will perform an _accuracy check_ \- independently for each target, if the move has multiple targets - to determine if it will hit the target.

First, determine the move's calculated accuracy, as follows:

- Initially, the accuracy is the base accuracy of the move, unless it is a non-damaging move and the target has the ability **Wonder Skin**, in which case the initial accuracy is 50.
- The target's evasion [stat stage](https://www.dragonflycave.com/mechanics/stat-stages/) is subtracted from the user's accuracy stat stage (capping the result at -6/6) and the multiplier corresponding to the modified accuracy stat stage is applied. In the first two generations, the accuracy was multiplied by the multiplier corresponding to the user's accuracy stat stage and then by the multiplier corresponding to the target's evasion stat stage (note that the multipliers were also different in R/B/Y).
- If the target is holding a **Brightpowder** or a **Lax Incense**, the accuracy is multiplied by 0.9. In the third generation, it would be multiplied by 0.95 for the Lax Incense. In the second generation, 20 would be subtracted from the accuracy instead.
- If the user is holding a **Wide Lens**, the accuracy is multiplied by 1.1.
- If the user is holding a **Zoom Lens** and the target has already made a move this turn, the accuracy is multiplied by 1.2.
- If the user has the ability **Compoundeyes**, the accuracy is multiplied by 1.3.
- If the user or one of its allies has the ability **Victory Star**, the accuracy is multiplied by 1.1.
- If the target has the ability **Sand Veil** and a sandstorm is raging, or it has the ability **Snow Cloak** and it is hailing, the accuracy is multiplied by 0.8.
- If it is foggy (the "weather effect" on a couple of routes in the fourth generation that was cleared by Defog), the accuracy is multiplied by 0.6.
- If the user has the ability **Hustle** and the move is physical, the accuracy is multiplied by 0.8.
- If the target has the ability **Tangled Feet** and is currently confused, the accuracy is halved.
- If the move **Gravity** is in effect, the accuracy is multiplied by 10/6.

The final calculated accuracy is an integer out of 100 (if it is higher than 100, it is made 100 instead). If a random integer between 0 and 99 inclusive is less than the calculated accuracy, the move hits; otherwise, it misses.

In the first two generations, the base accuracy and thus the final calculated accuracy was an integer capped at 255. In G/S/C, if the calculated accuracy was exactly 255, the move would automatically hit. Otherwise (and always in R/B/Y), a random number between 0 and 255 inclusive was generated; if it was less than the calculated accuracy, the move would hit, and otherwise it would miss. This meant that in R/B/Y, every normally 100% accurate move had a 1/256 chance of missing.

## Critical Hit?

If a damaging move that uses the standard damage formula hits the target, it may be a _critical hit_ and deal 1.5x damage (double prior to the sixth generation) in addition to ignoring some or all stat stages on the relevant offensive/defensive stats. The mechanics of critical hits were overhauled completely between the first and second generations, so I will split this coverage into two.

#### First-Generation Critical Hits

In Red, Blue and Yellow, the odds of a critical hit were, strangely enough, based on the base Speed of the user. This is not the calculated Speed stat or even the out-of-battle Speed, note, but the base stat of the species (see the [stat mechanics](https://www.dragonflycave.com/mechanics/stats/) page). Specifically, the critical hit rate of a move was determined as follows:

- Initially, the critical hit rate is half of the user's species' base Speed stat, rounded down.
- If the user has used the move Focus Energy (or had the Dire Hit item used on it), divide the critical hit rate by four and round down. (This is a bug; it was fixed in Stadium, where Focus Energy correctly _increases_ the critical hit rate instead of reducing it.)
- If the move has a "high critical hit ratio", multiply the critical hit rate by eight.

The result was then made 255 if it was greater than 255. Finally, a random number between 0 and 255 inclusive would be generated; if the random number was less than the critical hit rate, the attack would be a critical hit. In other words, the chance that the move would hit critically was the critical hit rate divided by 256.

This meant that speedy Pokémon would score far more critical hits than slow Pokémon, and in particular, any Pokémon with a base Speed of at least 64 would have a 255/256 chance of scoring a critical hit whenever it used a move with a high critical hit ratio. This is especially noteworthy because 64 base Speed isn't actually that much; it's around the average base Speed of all Pokémon. Moves like Slash, which are very mediocre today, were extremely powerful on fast Pokémon: an otherwise weakish Pokémon like Persian could effectively have a move with a base power of 210 (since in addition to the damage being doubled for a critical hit, it also shared Persian's Normal-type and would get a same-type attack bonus of 1.5x).

In Stadium, the formula was slightly different. Instead of starting with half of the base Speed, the critical hit ratio would effectively start at the base Speed divided by four and rounded down plus 19, or the base Speed divided by four and rounded down plus 59 if the user had used Focus Energy. High critical-hit ratio moves would still multiply this value by eight. All in all, this meant a far more balanced critical hit system, where fast Pokémon were still more likely to score critical hits but much less drastically so - Persian, with a base Speed of 115, would in Stadium have a default critical hit rate of (28 + 19) / 256 or just over 18%, compared to a Slowpoke's (3 + 19) / 256 or ~9%, whereas in R/B/Y Persian's default would have been 57 / 256 = ~22% and Slowpoke's 7 / 256 = ~3%.

#### Later-Generation Critical Hits

From G/S/C onwards, critical hits have nothing to do with Speed. Instead, the critical hit rate is represented by a critical hit stage variable C, calculated as follows:

01. Set C to 0.
02. If the user is a Farfetch'd holding a **Stick** or **Leek** or a Chansey holding a **Lucky Punch**, set C to 2. (In G/S/C, skip every subsequent step if this is the case.)
03. If the move has a high critical hit ratio, add 1 to C (2 in G/S/C).
04. If the user has had **Dragon Cheer** used on it by an ally (if the user is not a Dragon-type), add 1 to C.
05. If the user has used **Focus Energy**, has had **Dragon Cheer** used on it by an ally (if the user is a Dragon-type), or has a **Dire Hit** used on it since becoming active, add 2 to C (1 in G/S/C).
06. If the user has had a **Dire Hit 2** used on it once, add 1 to C; if it has had a Dire Hit 2 used on it more than once, add 2 to C.
07. If the user has had a **Dire Hit 3** used on it at least once, add 2 to C.
08. If the user has the ability **Super Luck**, add 1 to C.
09. If the user is holding a **Scope Lens** or a **Razor Claw**, add 1 to C.
10. If the user has consumed a **Lansat Berry** since becoming active, add 2 to C.

The critical hit ratio is then determined from C, as follows:

| C | Gen II | Gen III-V | Gen VI | Gen VII+ |
| --- | --- | --- | --- | --- |
| 0 | 17/256 | 1/16 | 1/16 | 1/24 |
| 1 | 1/8 | 1/8 | 1/8 | 1/8 |
| 2 | 1/4 | 1/4 | 1/2 | 1/2 |
| 3 | 85/256 | 1/3 | 1/1 | 1/1 |
| 4+ | 1/2 | 1/2 | 1/1 | 1/1 |

When this change was made in the second generation, it meant the default critical hit ratio became quite low compared to the first generation - 1/16 would have been the ratio for a Pokémon with an extremely poor base Speed of 32 in R/B/Y, for instance, and the critical hit ratio could now never become higher than 50%, with even that maximum only reachable through the contribution of several different factors. Moves with a high critical hit ratio went from being eight times more likely to score a critical hit to being four times more likely in G/S/C and then to only twice as likely in the third generation - the difference became barely noticeable.

In the sixth generation, while critical hits were made less powerful, they were made a bit easier to take advantage of again: while high critical-hit ratio moves were still only twice as likely to hit critically by default, boosting C to 2 would now jump straight to a 50% critical hit ratio, and 3 or above would result in guaranteed critical hits. The seventh generation then lowered the default critical hit chance to 1/24, giving high critical-hit ratio moves a somewhat more significant advantage again.

When a Pokémon has full affection (five hearts) in Pokémon-Amie/Pokémon Refresh or high friendship in the eighth and ninth generations, its critical hit ratio is doubled, resulting in ratios of 1/8 (Gen VI) or 1/12 (Gen VII+) by default, 1/4 with C = 1, and 1/1 for guaranteed critical hits with C = 2.

Certain other conditions can affect whether a move is a critical hit:

- If the target has the ability **Shell Armor** or **Battle Armor**, the move cannot be a critical hit.
- If **Lucky Chant** is in effect on the target's side, the move cannot be a critical hit.
- If the move is **Storm Throw**, **Frost Breath** or **Flower Trick**, it will always be a critical hit unless prevented by one of the above.
- If the user used **Laser Focus** on its last turn, this move will always be a critical hit unless prevented by one of the above.
- If the user has the ability **Merciless** and the target is poisoned, this move will always be a critical hit unless prevented by one of the above.

More on what it means for a move to be a critical hit in the damage calculation section.

## Damage Calculation

This is what we've all been waiting for: the calculation of how much HP the target loses when hit with a damaging attack. Note that in this section I will sometimes use "attacker" in place of "user" because we are dealing exclusively with damaging moves; don't let the different terminology confuse you. It means the same thing.

Some moves, I hasten to mention, don't obey the main damage formula at all but instead deal _set damage_. "Set" doesn't mean it's necessarily fixed - it can be calculated from various factors, but they won't take into account types (except for immunities, in G/S/C onwards) or any stats other than HP. For instance, **Seismic Toss** and **Night Shade** deal damage equal to the user's level; **Endeavor** deals damage equal to the target's current HP minus the user's current HP (and fails if the former isn't greater than the latter); one-hit KO moves such as **Horn Drill** and **Fissure** deal damage equal to the target's current HP; and **Dragon Rage** always deals exactly 40 hit points of damage.

Most damaging moves, however, follow the same basic formula, a formula that has been the same in its fundamentals since the dawn of the franchise.

`Damage = floor(floor(floor(2 * L / 5 + 2) * A * P / D) / 50) + 2`

The letters stand for the following variables:

#### L (Level)

The level of the attacker. This factor is likely in the formula separately from the offensive stat to counterbalance the fact that as the game progresses and levels rise, while the offensive and defensive stats of the Pokémon will be rising in tandem, the HP of the defending Pokémon will also be rising. While moves also become somewhat more powerful as the game goes on, this would lead to battles being far longer and more tedious at higher levels than lower ones if not for including the attacker's level itself in the formula.

#### P (Base Power)

The base power of the move being used. If the attack has a variable base power, the appropriate base power to use will be determined beforehand.

#### A (Offensive Stat) and D (Defensive Stat)

The calculated Attack or Special Attack (Special in R/B/Y) stat of the attacker (though for the move Foul Play, the target's Attack stat is used instead of the attacker's), and the calculated Defense or Special Defense (also Special in R/B/Y) stat of the target, as appropriate for the move. Note the "calculated": the values used in the formula will generally have had several modifiers applied to them. The ones that are persistent and consistently modify stats, rather than merely doing so as an implementation detail in some generations, are the following:

- If the attack is not a critical hit, each stat will have its [stat stage multiplier](https://www.dragonflycave.com/mechanics/stat-stages/) applied. If the attack is a critical hit, positive defensive stat modifiers and negative offensive stat modifiers will be treated as zero. In the first generation, all stat modifiers (including badges and more detailed below) were ignored indiscriminately for a critical hit; in the second generation, all stat modifiers (including badges and more detailed below) were ignored for a critical hit if and only if the attacker's offensive stat stage was less than the target's defensive stat stage.
- If the battle is not a link battle and all stat modifiers are not being ignored due to a critical hit, then each stat may be multiplied by 1.125 (first two generations) or 1.1 (third generation) if the player who controls the Pokémon has the appropriate badge. In R/B/Y/FR/LG, Brock's Boulderbadge raises Attack, Lt. Surge's Thunderbadge raises Defense, and Blaine's Volcanobadge raises Special (R/B/Y) or Special Attack and Special Defense (FR/LG); in G/S/C, Falkner's Zephyr Badge raises Attack, Jasmine's Mineralbadge raises Defense, and Pryce's Glacierbadge raises the special stats (though this is buggy, such that whether it actually boosts Special Defense depends on the exact value of the boosted Special Attack stat); and in R/S/E, Roxanne's Stone Badge raises Attack, Norman's Balancebadge raises Defense, and Liza & Tate's Mind Badge raises the special stats.
- In the fourth generation onwards, if the target is a Rock-type and a sandstorm is raging, its Special Defense is multiplied by 1.5.
- If the target is an Ice-type and a snowstorm is raging, its Defense is multiplied by 1.5.
- If the attacker has the ability **Huge Power** or **Pure Power**, its Attack is doubled.
- If either Pokémon or one of its allies has the ability **Flower Gift** and the weather is sunny, its Attack and Special Defense are multiplied by 1.5.
- If the attacker has the ability **Plus** or **Minus** and at least one of its allies has one of those abilities as well, its Special Attack is multiplied by 1.5. (Prior to the fifth generation, the ally must have the opposite ability in order for this to take effect.)
- If the attacker has the ability **Hustle** or **Gorilla Tactics**, its Attack is multiplied by 1.5.
- If the attacker has the ability **Guts** and has a major status ailment, its Attack is multiplied by 1.5.
- If the target has the ability **Marvel Scale** and has a major status ailment, its Defense is multiplied by 1.5.
- If the attacker has the ability **Solar Power** and the weather is sunny, its Special Attack is multiplied by 1.5.
- If the attacker has the ability **Slow Start** and five turns or less have passed since it became active, its Attack is halved.
- If the attacker has the ability **Defeatist** and is at half of its maximum HP or less, its Attack and Special Attack are halved.
- If the target has the ability **Grass Pelt** and Grassy Terrain is in effect, its Defense is multiplied by 1.5.
- If some other Pokémon on the field has the ability **Vessel of Ruin**, the attacker's Special Attack is multiplied by 0.75.
- If some other Pokémon on the field has the ability **Tablets of Ruin**, the attacker's Attack is multiplied by 0.75.
- If some other Pokémon on the field has the ability **Sword of Ruin**, the target's Defense is multiplied by 0.75.
- If some other Pokémon on the field has the ability **Beads of Ruin**, the target's Special Defense is multiplied by 0.75.
- If the attacker has the ability **Orichalcum Pulse** and the weather is sunny, its Attack is multiplied by ~1.33.
- If the attacker has the ability **Hadron Engine** and Electric Terrain is in effect, its Special Attack is multiplied by ~1.33.
- If the attacker is holding a **Choice Band** or **Choice Specs**, its Attack or Special Attack respectively is multiplied by 1.5.
- If the target is holding an **Assault Vest**, its Special Defense is multiplied by 1.5.
- If the attacker is a Pikachu holding a **Light Ball**, its Attack and Special Attack (Special Attack only prior to the fourth generation) are doubled.
- If the attacker is a Cubone or Marowak holding a **Thick Club**, its Attack is doubled.
- If either Pokémon is a Latios or Latias holding a **Soul Dew**, its Special Attack and Special Defense are multiplied by 1.5 prior to the seventh generation (in the seventh generation onwards, the Soul Dew instead boosts the power of Dragon and Psychic moves by 20%).
- If the attacker is a Clamperl holding a **Deepseatooth**, its Special Attack is doubled.
- If the target is a Clamperl holding a **Deepseascale**, its Special Defense is doubled.
- If the target is an untransformed Ditto holding a **Metal Powder**, its Defense is doubled. In G/S/C, even when transformed, a Ditto holding a Metal Powder will have both its Defense and Special Defense multiplied by 1.5 instead.
- If the target is not fully evolved and is holding an **Eviolite**, its Defense and Special Defense are multiplied by 1.5.

Note that in Red, Blue and Yellow, the implementation of stat modifiers was extremely buggy and thus this was not always accurate. For more information, see the [R/B/Y Stat Modification](https://www.dragonflycave.com/mechanics/gen-i-stat-modification/) section.

In the first two generations, each stat was capped at 999, and during the actual damage calculation, if either the offensive or defensive stat exceeded 255, both stats would be divided by four to fit into an 8-bit register before continuing, as a result of the limitations of the system. This would be fine - dividing both a multiplier and a divisor by the same number will yield approximately the same result, and 999 divided by four and rounded down is 249, which fits just fine within an 8-bit register - if not for the developers making a small oversight in G/S/C: the offensive stat is capped _before_ the item modifier (Pikachu with Light Ball and Cubone/Marowak with Thick Club) is applied, and after that the game makes no checks to ensure that dividing by four will be enough.

If you've read my [second-generation capture mechanics](https://www.dragonflycave.com/mechanics/gen-ii-capturing/) section, you'll be familiar with what happens next: if a Pikachu's Special Attack or a Cubone/Marowak's Attack is 512 or more before the item modifier is applied, the stat will become 1024 or greater after the boost, and the division by four won't be enough to bring the stat down below 256. The value plugged into the damage formula will be only the low byte of the result, which will equal floor(the stat's actual value / 4) % 256, i.e. the remainder if you divided the quartered value by 256. While Pikachu has no legal way to raise its Special Attack to that stage in G/S/C, Marowak could learn Swords Dance, and competitive players bumped into this annoying fact often enough that the bug became common wisdom: if you used a Marowak with a Thick Club and a maxed-out Attack stat, using Swords Dance to double its Attack would result in its Attack being treated as being 8 instead. Instead, competitive players in G/S/C would use Marowak with an Attack IV of 13 rather than 15, so that its unmodified Attack stat at level 100 would be 254 rather than 258, preventing the overflow. This was fixed in Stadium 2 and subsequent games, of course.

### Other Modifiers

In addition to the variables shown in the basic formula above, there are a myriad other modifiers in the "full" formula. However, while this core formula has stayed the same throughout every generation, how and when those extra modifiers are applied has been all over the place. Throughout the history of the franchise, various damage modifiers have been applied by multiplying the level, stats, base power, squeezed into the formula before the final +2, or applied at the very end; the same modifier has routinely been applied in different places in different generations even when the actual multiplier has stayed the same, and in the fifth generation onwards the game applies modifiers with precision to the nearest 1/4096, unlike the previous games where the entire calculation was done with integers.

In short, it would massively bloat this section to detail all these erratic changes. It's clear Game Freak doesn't really care where or how some given multiplier is applied in the formula, and realistically, you probably don't care either unless you want to be doing exact damage calculations: when was the last time you heard someone attach caveats about rounding errors and additions of two when explaining that super-effective moves do double damage? Thus, I will treat all these modifiers the same way here: I will speak of the power or damage of moves being modified in such-and-such ways, and it should always be understood to mean simply that at _some_ stage in the formula the stated multiplier is applied. Yet again, if you want exact precision, I direct you to the Further Reading section.

I will note specially when the placement of the modifier changes more than rounding errors, however: specifically, because of the cap and truncation on stats in the first two generations, it is significant whether a given modifier is actually applied to the stat and when, so I will note those cases where it was.

Finally, I will not be including most modifiers to the power of individual moves under particular circumstances that happen not to be applied simply as a variable base power, as those belong more with the description of those individual moves than in a section about damage calculation in general. Same with abilities, moves, etc. that don't themselves affect damage calculation but can instead prevent some of the effects listed here.

#### Ability Modifiers

- If the attacker has the ability **Technician** and the calculated base power of the move is 60 or less, the power is multiplied by 1.5.
- If the attacker has the ability **Flash Fire**, has previously been targeted with a Fire-type move that activated the ability's effect, and the move being used is a Fire-type move, the damage is multiplied by 1.5.
- If the target has the ability **Thick Fat** and the move being used is Fire- or Ice-type, the damage is halved.
- If the target has the ability **Heatproof** and the move being used is Fire-type, the damage is halved.
- If the target has the ability **Dry Skin** and the move being used is Fire-type, the damage is multiplied by 1.25.
- If the attacker has the ability **Overgrow**, **Blaze**, **Torrent** or **Swarm** and its current HP is a third of its maximum HP or less, its Grass-, Fire-, Water- or Bug-type attacks respectively have their power multiplied by 1.5.
- If the attacker has the ability **Rivalry**, the damage is multiplied by 1.25 if the attacker and target are both of the same (non-genderless) gender, and multiplied by 0.75 if the attacker and target are of opposite (non-genderless) genders.
- If the attacker has the ability **Reckless** and the move can cause recoil (including Jump Kick and Hi Jump Kick), or the attacker has the ability **Iron Fist** and the move is a punching move, the power is multiplied by 1.2.
- If the move is super effective against the target and the target's ability is **Solid Rock**, **Filter** or **Prism Armor**, the damage is multiplied by 3/4.
- If the move is not very effective against the target and the attacker's ability is **Tinted Lens**, the damage is doubled.
- If one of the target's allies has the ability **Friend Guard**, the damage is multiplied by 3/4.
- If the target has the ability **Multiscale** or **Shadow Shield** and is currently at full HP, the damage is halved.
- If the attack is physical and the attacker is poisoned and has the ability **Toxic Boost**, or if the attack is special and the attacker is burned and has the ability **Flare Boost**, the damage is multiplied by 1.5.
- If the attacker has the ability **Analytic** and is the last Pokémon to move this turn, the damage is multiplied by 1.3.
- If the attacker has the ability **Sand Force** and a sandstorm is raging, the damage is multiplied by 1.3.
- If the attacker has the ability **Sheer Force** and the move has a secondary effect, the damage is multiplied by 1.3.
- If the attacker has the ability **Sniper** and the attack is a critical hit, the damage is multiplied by 1.5 (in addition to the regular critical hit boost).
- If the attacker has the ability **Aerilate**, **Pixilate**, **Refrigerate** or **Galvanize** and the move is Normal-type, its type is changed to Flying, Fairy, Ice or Electric respectively and its damage is multiplied by 1.2 (1.3 prior to the seventh generation).
- If the target has the ability **Fur Coat** and the move is physical, the damage is halved.
- If any active Pokémon has the ability **Dark Aura** or **Fairy Aura** and the move's type is Dark or Fairy respectively, the damage is multiplied by 1.33, unless any active Pokémon has the ability **Aura Break**, in which case the damage is divided by 1.33 instead.
- If the attacker has the ability **Mega Launcher** and the move is an aura or pulse move (Aura Sphere, Dark Pulse, Dragon Pulse or Water Pulse), the damage is multiplied by 1.5.
- If the attacker has the ability **Parental Bond** (which grants an automatic second hit with any move used) and this is the second attack, the damage is halved.
- If the attacker has the ability **Strong Jaw** and the move is a biting move (Bite, Bug Bite, Crunch, Fire Fang, Ice Fang, Poison Fang or Thunder Fang), the damage is multiplied by 1.5.
- If the attacker has the ability **Tough Claws** and the move makes physical contact, the damage is multiplied by 1.33.
- If one of the attacker's allies has the ability **Battery** and the move is special, the damage is multiplied by 1.3.
- If the target has the ability **Fluffy**, then if the attack is Fire-type the damage is doubled, and if the attack makes contact the damage is halved. (Fire-type moves that make contact deal regular damage.)
- If the attacker has the ability **Neuroforce** and the attack is super effective, the damage is multiplied by 1.25.
- If the attacker has the ability **Stakeout** and the target switched in on this turn, the damage is doubled.
- If the attacker has the ability **Steelworker** or **Steely Spirit**, or an ally of the attacker has Steely Spirit, and the move is Steel-type, the damage is multiplied by 1.5.
- If the target has the ability **Water Bubble** and the attack is Fire-type, the damage is halved.
- If the attacker has the ability **Water Bubble** and the attack is Water-type, the damage is doubled.
- If the attacker has the ability **Punk Rock** and the attack is sound-based, the damage is multiplied by 1.3.
- If the target has the ability **Punk Rock** and the attack is sound-based, the damage is halved.
- If the target has the ability **Ice Scales** and the attack is special, the damage is halved.
- If an ally of the attacker has the ability **Power Spot**, the damage is multiplied by 1.3.
- If the attacker has the ability **Transistor** and the attack is Electric-type, the damage is multiplied by 1.5.
- If the attacker has the ability **Dragon's Maw** and the attack is Dragon-type, the damage is multiplied by 1.5.
- If the target has the ability **Purifying Salt** and the attack is Ghost-type, the damage is halved.
- If the attacker has the ability **Rocky Payload** and the attack is Rock-type, the damage is multiplied by 1.5.
- If the attacker has the ability **Sharpness** and the attack is slicing-based, the damage is multiplied by 1.5.
- If the attacker has the ability **Supreme Overlord**, the damage is multiplied by (1 + 0.1 \* the number of Pokémon that have fainted in the battle on the attacker's side).

#### Item Modifiers

- If the attacker is holding a **Muscle Band** or **Wise Glasses**, the damage is multiplied by 1.1 if the attack is physical or special respectively.
- If the attacker is holding a type-boosting item (Mystic Water etc., Plates, or certain types of Incense items) matching the type of the attack, the damage is multiplied by 1.2. Prior to the fourth generation, the damage was multiplied by 1.1, except in the case of Sea Incense, which multiplied the damage by 1.05.
- If the attacker is a Dialga, Palkia or Giratina holding its respective Orb ( **Adamant Orb**, **Lustrous Orb** or **Griseous Orb** respectively) and the attack matches one of that legendary's types, the damage is multiplied by 1.2.
- If the attacker is a Latios or Latias holding a **Soul Dew** and the attack is Dragon- or Psychic-type, the damage is multiplied by 1.2 in the seventh generation onwards (prior to the seventh generation, the Soul Dew instead multiplied Special Attack and Special Defense by 1.5).
- If the attacker is holding a type gem and the move is of the corresponding type, the gem is consumed and the damage is multiplied by 1.5.
- If the attacker is holding a **Life Orb**, the damage is multiplied by 1.3.
- If the attacker is holding a **Metronome**, the damage is multiplied by 1.1 if the attacker used this move on the previous turn, 1.2 if the attacker used this move on the previous two turns, 1.3 if the attacker used this move on the previous three turns, and so on to a maximum multiplier of 2.0.
- If the move is super effective against the target and the attacker is holding an **Expert Belt**, the power is multiplied by 1.2.
- If the attacker is holding a **Punching Glove** and the move is a punching move, its power is multiplied by 1.1.
- If the move is super effective against the target and the target is holding the type-reducing berry corresponding to the type of the move (or the move's type is Normal and the target is holding a Chilan Berry), the berry is consumed and the damage is halved.

#### Other Modifiers

- If the attacker is **burned** and the attack is physical, its power is halved. In the first two generations, this modifier was applied directly to the Attack stat before the cap of 999 came into effect for the stat and would be ignored for a critical hit that ignored stat modifiers (see above). Note that R/B/Y stat modification was buggy and this could lead to unexpected results.
- In the first four generations, if the move being used was **Selfdestruct** or **Explosion**, the damage would be doubled. In the first two generations, this specifically halved the target's Defense post-capping, but was not ignored for a critical hit.
- If **Reflect** is in effect for the target and the attack is physical, or **Light Screen** is in effect for the target and the attack is special, the damage will be halved if there is only one Pokémon on the target's side or multiplied by 2/3 if there is more than one Pokémon on the target's side. This effect is ignored if the attack is a critical hit.
- If the attack is a critical hit (see above), the damage is multiplied by 1.5 (2 prior to the sixth generation), or by 2 (3 prior to the sixth generation) if the attacker has the ability **Sniper**.
- If the attack has more than one target, the damage is multiplied by 3/4.
- If the weather is sunny and the move is Fire-type, or the weather is rainy and the move is Water-type, the damage is multiplied by 1.5; if the weather is sunny and the move is Water-type, or the weather is rainy and the move is Fire-type, the damage is halved.
- If the move shares a type with the attacker, the damage is multiplied by 1.5 (Same-Type Attack Bonus), unless the attacker has the ability **Adaptability**, in which case it is doubled.
- For each unique type the target has, if that type is weak to the move, the damage is doubled; if that type is resistant to the move, the damage is halved.
- If the attack is being used with **Me First**, the damage is multiplied by 1.5.
- In the second generation, if the attacker's trainer had obtained the badge from the Gym featuring the type of the move being used (there was no Dark-type Gym, but every other type had one in either Johto or Kanto), its power would be multiplied by 1.125 in in-game battles.
- If **Helping Hand** has been used on the attacker previously on this turn, the damage is multiplied by 1.5.
- If the attacker used **Charge** last turn or received a charge via being hit with a move while having the **Electromorphosis** ability or being targeted with a wind move while having the **Wind Power** ability and the attack is Electric-type, the damage is doubled.
- If **Water Sport** or **Mud Sport** has been used and the move is Fire- or Electric-type respectively, the damage is halved.
- If **Grassy Terrain** is in effect and the move is Grass-type, or if **Electric Terrain** is in effect and the move is Electric-type, or if **Psychic Terrain** is in effect and the move is Psychic-type, the damage is multiplied by 1.3 (1.5 prior to the eighth generation).
- If **Misty Terrain** is in effect and the move is Dragon-type, the damage is halved.
- If **Tar Shot** has been used on the target and the move is Fire-type, the damage is doubled.
- If the target's last move was **Glaive Rush**, the damage is doubled.
- The damage is multiplied by a random factor ranging between 85 and 100 inclusive (217 and 255 inclusive in the first two generations) and then divided by 100 (255 in the first two generations).

## Secondary Effects

Once a damaging move has hit the target, the game must determine whether its secondary effect, if any, will take place. The base chance of a secondary effect happening is the move's effect chance (usually found in online Pokédexes under that name); however, the following effects can affect the effect chance:

- If the attacker has the ability **Sheer Force**, the secondary effect chance is nullified.
- If the attacker is holding a **King's Rock** or **Razor Fang** or has the ability **Stench**, and the move does not have a secondary effect of making the target flinch (any secondary effect in the second and third generations), the move will gain a 10% chance of making the target flinch as a secondary effect.
- If the attacker has the ability **Serene Grace**, the effect chance is doubled, unless the move is Secret Power.
- If the attacker has the ability **Poison Touch** and the move makes physical contact, the move will gain a 30% chance of poisoning the target.
- If the target has the ability **Shield Dust** and the secondary effect should affect the target, its effect will be nullified.

## Further Reading

If you would like to know more nitty-gritty details about how the battle system works, a now-defunct website named Ultimate Pokémon Center had extensive sections on the mechanics of every main series game (and Mystery Dungeon) up until the sixth generation:

- **Timing notes**, explanations of the process of how battles play out: [Gen I](https://web.archive.org/web/20140711082447/http://www.upokecenter.com/content/pokemon-red-version-blue-version-and-yellow-version-timing-notes), [Gen II](https://web.archive.org/web/20140712063943/http://www.upokecenter.com/content/pokemon-gold-version-silver-version-and-crystal-version-timing-notes), [Gen III](https://web.archive.org/web/20140711213032/http://www.upokecenter.com/content/pokemon-ruby-version-sapphire-version-and-emerald-version-timing-notes), [Gen IV](https://web.archive.org/web/20140712043417/http://www.upokecenter.com/content/pokemon-diamond-version-pearl-version-and-platinum-version-timing-notes), [Gen V](https://web.archive.org/web/20140422133645/http://www.upokecenter.com/content/pokemon-black-version-and-pokemon-white-version-timing-notes).
- **Attack explanations**, supplementary notes on the battle system: [Gen I](https://web.archive.org/web/20140419033534/http://www.upokecenter.com/content/pokemon-red-version-blue-version-and-yellow-version-attack-explanations), [Gen II](https://web.archive.org/web/20140712033108/http://www.upokecenter.com/content/pokemon-gold-version-silver-version-and-crystal-version-attack-explanations), [Gen III](https://web.archive.org/web/20140711030746/http://www.upokecenter.com/content/pokemon-ruby-version-sapphire-version-and-emerald-version-attack-explanations), [Gen IV](https://web.archive.org/web/20140712063835/http://www.upokecenter.com/content/pokemon-diamond-version-pearl-version-and-platinum-version-attack-explanations), [Gen V](https://web.archive.org/web/20140712055955/http://www.upokecenter.com/content/pokemon-black-version-and-pokemon-white-version-attack-explanations)

It also features sections on out-of-battle mechanics, detailed attack lists, and so on. It has occasional errors or typos, but they're very occasional, and usually it's the most accurate, detailed info you can find on the effects of moves and so on. It tends to lean on the side of too technical rather than not technical enough, so beginners may get a little lost, however.

Smogon also has [a very thorough, detailed breakdown of the fifth-generation damage formula](http://www.smogon.com/bw/articles/bw_complete_damage_formula), which again may be a bit technical for beginners but also comprehensively covers things like calculation of the base power of moves with a variable base power. And [Pokémon Showdown's damage calculator](http://pokemonshowdown.com/damagecalc/) will perform accurate damage calculation for any generation.

Alternatively, if you'd like to know about how capturing Pokémon works in extreme detail, I have very detailed, accurate (more accurate than UPC, by the way) breakdowns of the process from every main series game: [Gen I](https://www.dragonflycave.com/mechanics/gen-i-capturing/), [Gen II](https://www.dragonflycave.com/mechanics/gen-ii-capturing/), [Gen III/IV](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/), [Gen V](https://www.dragonflycave.com/mechanics/gen-v-capturing/), [Gen VI/VII](https://www.dragonflycave.com/mechanics/gen-vi-vii-capturing/), [Gen VIII](https://www.dragonflycave.com/mechanics/gen-viii-capturing/), [Gen IX](https://www.dragonflycave.com/mechanics/gen-ix-capturing/).

Page last modified June 1 2026 at 21:20 UTC

## You May Also Enjoy

[**Battling Basics**\\
All about the basics of the Pokémon battle system, in the unlikely case you're not already familiar with them.](https://www.dragonflycave.com/mechanics/battling-basics/)

[**Stat Mechanics**\\
The nitty-gritty details of everything you never wanted to know about your Pokémon's Special Attack or HP.](https://www.dragonflycave.com/mechanics/stats/)

[**Stat Stages**\\
All about what's really going on behind the scenes when your game tells you your Pokémon's Attack fell.](https://www.dragonflycave.com/mechanics/stat-stages/)

[**Status Ailments**\\
Everything you ever wanted to know about status ailments in mainline Pokémon, how they function, and how to inflict them.](https://www.dragonflycave.com/mechanics/status-ailments/)

## Post comment

Inflammatory or off-topic comments will be deleted; please go to the [guestbook](https://www.dragonflycave.com/guestbook/) for discussion unrelated to this page. You can use [BBCode](https://www.dragonflycave.com/mechanics/battle/#bbcode "Click for a list of formatting options.") (forum code) to format your messages.

Giving an e-mail address is optional; if it is given, you will be notified by e-mail if I respond to your post. If you fill in a website (this should be your own website, blog or social media profile), it will be linked publicly on your post; however, messages obviously posted solely as a pretext for advertising, or advertising shady or inappropriate websites, will be deleted.

- \[b\] **Bold**\[/b\]
- \[i\] _Italic_\[/i\]
- \[u\]Underlined\[/u\]
- \[s\]Strikethrough\[/s\]
- \[url=http://www.dragonflycave.com\] [Link](http://www.dragonflycave.com/)\[/url\]
- \[spoiler\]Spoiler\[/spoiler\]

Name\*

E-mail

Website address

Website name

Comments\*

![387](https://www.dragonflycave.com/sprites/gen8/home-thumb/387.png)Please type the name of the above Pokémon into this box ( [don't know it?](https://www.dragonflycave.com/mechanics/battle/#))\*:The above sprite has a 1/8192 chance of being shiny. (Modern browsers will give it a yellow glow if so.)

Submit messageReset

## Comments

No comments on this page as of yet.