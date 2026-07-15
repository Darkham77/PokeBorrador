# Battling Basics

This section will cover some of the fundamental concepts of the Pokémon battle system. It assumes no prior knowledge and works itself up to where you should be able to follow most discussions about battling or battle mechanics. It will _not_ go into technical details, formulas or numbers; the [Battle Mechanics](https://www.dragonflycave.com/mechanics/battle/) section covers that. This is thought more as an introduction for those who are mostly unfamiliar with Pokémon game mechanics or whose ideas about it are very vague, bridging the gap to where the Battle Mechanics section assumes you start off.

## Terminology Note

If you're not very familiar with the history of the Pokémon franchise, to be able to tell whether what I'm saying applies to the game you're playing, you'll need to know which _generation_ it is part of. The applicable games from each generation are the following:

1. **First Generation:** Pokémon Red, Blue and Yellow (+ Pokémon Green in Japan); Pokémon Stadium
2. **Second Generation:** Pokémon Gold, Silver and Crystal; Pokémon Stadium 2
3. **Third Generation:** Pokémon Ruby, Sapphire and Emerald; Pokémon FireRed and LeafGreen; Pokémon Colosseum and XD
4. **Fourth Generation:** Pokémon Diamond, Pearl and Platinum; Pokémon HeartGold and SoulSilver; Pokémon Battle Revolution
5. **Fifth Generation:** Pokémon Black and White; Pokémon Black 2 and White 2
6. **Sixth Generation:** Pokémon X and Y; Pokémon Omega Ruby and Alpha Sapphire
7. **Seventh Generation:** Pokémon Sun and Moon; Pokémon Ultra Sun and Ultra Moon; (Pokémon Let's Go, Pikachu! and Let's Go, Eevee!)
8. **Eighth Generation:** Pokémon Sword and Shield; Pokémon Brilliant Diamond and Shining Pearl
9. **Ninth Generation:** Pokémon Scarlet and Violet

If the game you're playing is not on this list, **this section does not necessarily apply to it**; you are playing a spin-off game whose mechanics are only roughly based on the main series, if at all. (A few console spin-off games are listed above, but unlike the various non-listed spin-offs, they have the same mechanics as the main series games.) While most Pokémon spin-offs including some form of battling will use concepts such as types and moves, this is not necessarily so with all the mechanics discussed here. Find a dedicated guide to the game you're playing instead (but do consider getting the main series games - they're why most of us love the franchise).

Generally, if I say that something changed or was added in a generation, the change or addition remained in the subsequent generations. The main exception would be if I specifically state otherwise or if I'm stating an exception to begin with (for example, if I say something works like A, and then that in the first and second generations it worked like B, then it works like B in the first two but like A in the third generation onwards). Let's Go, Pikachu! and Let's Go, Eevee! also removed various moves and features such as abilities and hold items, but otherwise function like the seventh-generation games battle-wise.

## What Is a Pokémon Battle?

Pokémon battles are the Pokémon games' combat mode. Rather than the playable character physically fighting his or her challengers, they will instead carry a team of up to six monsters, Pokémon, that will fight for them. Within the single-player mode of the games ( _in-game_), the player will battle both wild Pokémon, which usually appear one at a time (though not always) and can be captured by the player for use in future battles, and other non-playable human _trainers_, who can use up to six Pokémon like the player. Battling with other players in multiplayer _link battles_ is also possible, and due to the surprisingly deep strategic gameplay involved, there is a substantial _competitive battling_ community around the Pokémon games, with real-life video game tournaments.

So how do they work? Pokémon battles are _turn-based_: they consist of repeated phases or _turns_, each of which requires all participants to choose an action to take and then resolves the outcome of those actions. The resolution does not depend systematically on the timing of button presses or other input combinations; only your choice of actions to take can help you towards victory.

The original and simplest form of Pokémon battling is the _single battle_, where at any given moment there is a single active Pokémon on each side. On each turn, players may choose to switch their active Pokémon or to use any of the up to four techniques ( _moves_ or _attacks_) currently known by the active Pokémon. In-game battles additionally allow the use of items with in-battle effects. The third-generation games added _double battles_, where each trainer has two Pokémon active at a time, and _tag battles_, where four trainers face off in teams of two, each controlling one Pokémon in an otherwise normal double battle. The fifth-generation games introduced _triple battles_, where each trainer uses three Pokémon at a time, and _rotation battles_, where three Pokémon are out at a time but only one is active, adding the option to rotate which is the active Pokémon before a move is selected on any given turn, but these battle modes have not made a return in later generations.

The primary objective of regular Pokémon battling is to cause all of the opponent's Pokémon to _faint_ by reducing their _hit points_ (HP) to zero. Different moves may deal damage that reduces the HP directly, inflict [status ailments](https://www.dragonflycave.com/mechanics/status-ailments/) that hinder or hurt the opponent for a number of turns, change the battlefield conditions, improve the user's standing or sabotage the opponent's, or have any of countless other unique effects.

## Pokémon Variables

Many properties of the Pokémon in the battle - whether they derive from the Pokémon's species, its individual qualities, or both - directly affect the outcome and effectiveness of a move. These are the main such variables.

### Stats

All Pokémon have six statistics or _stats_: **Hit Points (HP)**, **Attack**, **Defense**, **Special Attack (Sp. Atk.)**, **Special Defense (Sp. Def.)**, and **Speed**. (In the first-generation games, the Special Attack and Special Defense stats were one stat, known as **Special**; any time I speak of either Special Attack or Special Defense, those games used the Special stat for both purposes.) They are shown on your Pokémon's summary screen inside and outside of battle, and though they are primarily a function of your Pokémon's level and species, they are also affected by individual factors that make no two Pokémon the same. For more information on how exactly out-of-battle stats are determined, see my [stat mechanics](https://www.dragonflycave.com/mechanics/stats/) page.

In battle, however, stats are not necessarily always the values on your Pokémon's summary screen: they can be temporarily modified by various means. The most obvious and common way is through [stat stages](https://www.dragonflycave.com/mechanics/stat-stages/). Such modifiers only last for the duration of the battle and do not affect the stats after the battle is over, nor the values you will see on the summary screen.

#### Hit Points

Your Pokémon's Hit Points stat, or HP, determines how much damage it can take before fainting and being unable to battle. Its _current_ HP represents its health at the moment, whereas the _maximum_ HP is the number it will revert to when healed and the upper limit of the current HP. When damage is dealt to a Pokémon, the game determines how many hit points should be lost, usually through the application of a special formula, and the resulting number is subtracted from its current HP. Once a Pokémon's current HP is reduced to zero, it faints and is unable to battle unless healed.

The maximum HP of a Pokémon can never change during battle, unlike many other games where certain effects can for instance double a character's maximum HP temporarily. Only the current HP changes as the battle goes on, being variously added to or subtracted from - though interestingly, most healing is dependent on the Pokémon's maximum HP, such that for instance the move Recover will heal your Pokémon by half of its maximum HP (rounded down), while damage is not (so that provided the target has the same Special Defense stat, a Flamethrower attack from the same attacker can deal the same range of HP in damage regardless of exactly what fraction of the target's maximum HP it represents). This means having a higher maximum HP, all else equal, means both being able to take a larger number of attacks and recovering more damage in absolute terms for each healing move you use.

#### Attack/Defense/Special Attack/Special Defense

These stats control how much damage is done when most damaging moves are used. Your Pokémon's Attack and Special Attack determine how much damage it does when it attacks with physical or special moves respectively, while its Defense and Special Defense determine how much damage it takes when it is attacked by a physical or special move respectively. (More on the physical/special classification of moves later.)

Because you can choose what moves your Pokémon use, the physical/special split actually means that in many cases only the higher attacking stat of a Pokémon matters - you can simply pick moves that run off that stat, and the lower stat will then only come into play at all under exceptional circumstances. A Pokémon with one extremely low attacking stat is therefore not necessarily hurt by it at all, provided its other attacking stat is decent and it learns good moves in that category. Conversely, if your opponent knows your Pokémon's Defense and Special Defense, they can choose to counter it with a Pokémon and moves that target the lower defensive stat, making the lower defensive stat somewhat more significant for a Pokémon's overall defensive ability than the higher one unless it is strategically played against opponents that can't exploit the lower stat.

The offensive and defensive stats are a multiplicand and a divisor respectively in the standard damage formula, which generally consists almost entirely of multiplying a lot of numbers together. This means that if your Pokémon's Attack is twice as high as its Special Attack, it will do roughly twice as much damage with physical moves as with special moves.

#### Speed

Speed determines how fast your Pokémon is, which effectively means it controls the order in which the Pokémon in battle will move each turn: most of the time, they will attack in descending order by their current Speed stat. Note, however, that this is not universal: the primary determinant of move order is actually _priority_, as explained later, and several other exceptions exist.

As Pokémon battling is wholly turn-based, having a high Speed does not allow you to attack more often than a Pokémon with a low Speed; all Pokémon get exactly one move per turn, barring special circumstances. There is thus no advantage to having a Speed 100 points higher than your opponent as opposed to one point higher. As a result, competitive battlers often aim to give their Pokémon a Speed value that is exactly one point higher than that of the fastest opponent they definitely want to be able to outspeed, allowing them to spend the rest of their effort points (see the [stat mechanics](https://www.dragonflycave.com/mechanics/stats/) section) on other stats.

### Types

Each Pokémon species has one or two out of eighteen _types_, while each move additionally has a single type (though a rare few moves act as if they had two types as of the sixth generation). Types are like elements or essences that define what kinds of moves the Pokémon is susceptible to and what kinds of moves it can shake off easily. Although they are shown in a set order for each dual-typed Pokémon and sometimes called "Type1" and "Type2", in reality the order of a Pokémon's types makes no substantial difference; they both behave the same way.

The types in the Pokémon games are **Normal**, **Fire**, **Water**, **Electric**, **Grass**, **Ice**, **Fighting**, **Poison**, **Ground**, **Flying**, **Psychic**, **Bug**, **Rock**, **Ghost**, **Dragon**, **Dark**, **Steel** and **Fairy**, although Dark and Steel were introduced in the second-generation games and Fairy in the sixth. Each type is _weak_ to some types (which causes moves of those types to deal double damage against Pokémon of this type), _resistant_ to other types (whose moves will deal half damage against Pokémon of this type), and _immune_ to yet other types (meaning moves of those types will deal no damage to Pokémon of this type at all), with those left over dealing normal damage against it. This information is frequently summarized in a _type chart_, a succinct table where the effectiveness of an attack type against a Pokémon type can be looked up (attack type on the left, targeted Pokémon types along the top):

| Target →<br>Attack<br>↓ | N<br>O<br>R<br>M<br>A<br>L | F<br>I<br>R<br>E | W<br>A<br>T<br>E<br>R | E<br>L<br>E<br>C<br>T<br>R<br>I<br>C | G<br>R<br>A<br>S<br>S | I<br>C<br>E | F<br>I<br>G<br>H<br>T<br>I<br>N<br>G | P<br>O<br>I<br>S<br>O<br>N | G<br>R<br>O<br>U<br>N<br>D | F<br>L<br>Y<br>I<br>N<br>G | P<br>S<br>Y<br>C<br>H<br>I<br>C | B<br>U<br>G | R<br>O<br>C<br>K | G<br>H<br>O<br>S<br>T | D<br>R<br>A<br>G<br>O<br>N | D<br>A<br>R<br>K | S<br>T<br>E<br>E<br>L | F<br>A<br>I<br>R<br>Y |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NORMAL | - | - | - | - | - | - | - | - | - | - | - | - | ×½ | ×0 | - | - | ×½ | - |
| FIRE | - | ×½ | ×½ | - | ×2 | ×2 | - | - | - | - | - | ×2 | ×½ | - | ×½ | - | ×2 | - |
| WATER | - | ×2 | ×½ | - | ×½ | - | - | - | ×2 | - | - | - | ×2 | - | ×½ | - | - | - |
| ELECTRIC | - | - | ×2 | ×½ | ×½ | - | - | - | ×0 | ×2 | - | - | - | - | ×½ | - | - | - |
| GRASS | - | ×½ | ×2 | - | ×½ | - | - | ×½ | ×2 | ×½ | - | ×½ | ×2 | - | ×½ | - | ×½ | - |
| ICE | - | ×½ | ×½ | - | ×2 | ×½ | - | - | ×2 | ×2 | - | - | - | - | ×2 | - | ×½ | - |
| FIGHTING | ×2 | - | - | - | - | ×2 | - | ×½ | - | ×½ | ×½ | ×½ | ×2 | ×0 | - | ×2 | ×2 | ×½ |
| POISON | - | - | - | - | ×2 | - | - | ×½ | ×½ | - | - | - | ×½ | ×½ | - | - | ×0 | ×2 |
| GROUND | - | ×2 | - | ×2 | ×½ | - | - | ×2 | - | ×0 | - | ×½ | ×2 | - | - | - | ×2 | - |
| FLYING | - | - | - | ×½ | ×2 | - | ×2 | - | - | - | - | ×2 | ×½ | - | - | - | ×½ | - |
| PSYCHIC | - | - | - | - | - | - | ×2 | ×2 | - | - | ×½ | - | - | - | - | ×0 | ×½ | - |
| BUG | - | ×½ | - | - | ×2 | - | ×½ | ×½ | - | ×½ | ×2 | - | - | ×½ | - | ×2 | ×½ | ×½ |
| ROCK | - | ×2 | - | - | - | ×2 | ×½ | - | ×½ | ×2 | - | ×2 | - | - | - | - | ×½ | - |
| GHOST | ×0 | - | - | - | - | - | - | - | - | - | ×2 | - | - | ×2 | - | ×½ | - | - |
| DRAGON | - | - | - | - | - | - | - | - | - | - | - | - | - | - | ×2 | - | ×½ | ×0 |
| DARK | - | - | - | - | - | - | ×½ | - | - | - | ×2 | - | - | ×2 | - | ×½ | - | ×½ |
| STEEL | - | ×½ | ×½ | ×½ | - | ×2 | - | - | - | - | - | - | ×2 | - | - | - | ×½ | ×2 |
| FAIRY | - | ×½ | - | - | - | - | ×2 | ×½ | - | - | - | - | - | - | ×2 | ×2 | ×½ | - |

Note that the above is the type chart from the sixth generation. Prior to that, in addition to the lack of the Fairy type, Steel was resistant to Ghost and Dark. Moreover, in the first generation, Bug and Poison were each weak against the other, Ice dealt neutral damage to Fire, and Psychic was immune to Ghost, as well as Dark and Steel being missing. The [Interactive Type Chart](https://www.dragonflycave.com/typechart.html) on this site provides a more in-depth way to analyze type relations with any generation's base chart.

If a Pokémon has two types, the damage from a given type of attack will be multiplied first by that attack type's effectiveness against one type and then by its effectiveness against the other, so that for instance, if you use a Fire move against a Water/Grass-type like Lotad, the damage will be halved because Water is resistant to Fire but then doubled because Grass is weak to Fire - the end result is normal, neutral damage. However, if you used the same Fire move against a Bug/Grass-type like Parasect, it would do four times its normal damage because both Bug and Grass are weak to Fire, doubling the damage twice. And if you used a Ground move against a Fire/Flying-type like Charizard, despite that Fire is weak to Ground and that should double the damage, the fact Flying is immune to Ground altogether renders the damage zero regardless.

When a Pokémon is hit by an attack it is weak to (whether that means it takes double or quadruple damage), the game will display the message, "It's super effective!" When a Pokémon is hit by an attack it is resistant to (again, that might mean it takes half or a quarter of the normal damage), the message will be "It's not very effective..." If a Pokémon is targeted with an attack that it is immune to, the message is "It doesn't affect \[Pokémon\]!" In Red, Blue and Yellow, an "It's super effective!" or "It's not very effective..." message would be erroneously displayed when one of the Pokémon's types was weak to the attack and the other resistant, even though the damage was neutral; which message was chosen depended on the order in which the type multipliers were coded into the game. See the [Experimentation](https://www.dragonflycave.com/experimentation/) section for more details.

Non-damaging moves or various moves with unusual damage calculation are not affected by type weaknesses or resistances, though they will still fail to affect a Pokémon that is immune to their type. In the first-generation games, even immunities were ignored for those moves.

In addition to type weaknesses/resistances, regular damaging moves deal 50% more damage when used by a Pokémon that shares one of its types with the type of the move, a bonus referred to as **STAB** (Same-Type Attack Bonus). The bonus is the same for single- and dual-typed Pokémon; that is, a single-typed Pokémon will get the same 50% bonus for its one type as a dual-typed Pokémon gets for each of its two types.

### Abilities

Ever since the third generation, every Pokémon has had an _ability_. Abilities are defined by the species; some Pokémon species have only one regular ability, whereas others have two (in which case each individual encountered or hatched will have one of them at random), and as of the fifth generation, most Pokémon species additionally have a _hidden ability_, available only on individuals obtained through some special means.

There are 298 existing Pokémon abilities as of the ninth generation. Many species have the same generic abilities, while others have unique abilities. There are no limits to what an ability can theoretically do - their effects are implemented wherever the game program needs them to be to function like the ability is intended. Some battle-relevant examples:

- **Iron Fist** boosts the power of the bearer's punching moves by 20%. There is a special internal flag (a bit that can be either on or off) for every move in the game indicating whether or not it is a punching move, just so that this ability (and the Punching Glove item) can do its thing. Similarly, **Soundproof** makes the bearer immune to sound moves, making use of an internal flag for each move indicating whether it is a sound move.
- Various abilities have something happen whenever the bearer is struck with a move that makes physical contact - for instance, **Rough Skin** damages the attacker by 1/8 of its total HP, **Mummy** changes the attacker's ability to Mummy, and **Poison Point** inflicts the poisoning [status ailment](https://www.dragonflycave.com/mechanics/status-ailments/). The physical contact flag is yet another flag, but a more generic one, utilized by many abilities and some hold items as well.
- Abilities can make certain effects fail regardless of whether they're induced by moves or something else - **Hyper Cutter**, for instance, prevents the bearer's Attack [stat stage](https://www.dragonflycave.com/mechanics/stat-stages/) from being lowered by any means, and **Limber** prevents the bearer from being paralyzed.
- Abilities can boost stats, or effectively boost stats, or boost the power of certain moves, when some condition is met: **Guts** raises the bearer's Attack by 50% when it has a major status ailment, **Swarm** raises the power of the bearer's Bug moves by 50% when the bearer is at less than a third of its total HP, and **Tangled Feet** makes attacks against the bearer 50% less accurate when it is confused.
- Abilities can activate some effect when the Pokémon comes into battle: **Intimidate** lowers all adjacent opponents' Attack by one stage when the bearer is sent out, and **Drizzle** makes the weather rainy when the bearer is sent out.
- Abilities can give information: **Anticipation** alerts the bearer when the opponent has a super-effective move or the moves Selfdestruct or Explosion, whereas **Forewarn** tells the bearer what the opponent's most powerful (in terms of base damage) move is.
- ...and so on and so on.

### Held Items

Since the second generation, Pokémon have been able to hold a single _item_ in battle. Like abilities, items can do any of a wide variety of things. There are two main categories of items: consumable items, which are consumed and activated under particular circumstances, have some immediate effect, and can then only be reused if they are specially recycled (by the move Recycle or the Pickup, Harvest or Cud Chew abilities); and passive items, which have some constant effect while the Pokémon is holding the item. Most, but not all, consumable items are berries.

Some common item effects include:

- The so-called "pinch berries" are consumed when the holder falls below 25% of its total HP and then bestow a beneficial effect upon the holder, such as healing or raising a stat.
- Weakness-relieving berries are consumed when the holder is hit with a super-effective attack of a particular type, halving the damage dealt.
- Status-healing berries are consumed as soon as a particular status condition is inflicted upon the holder and heal that status.
- "Choice items", **Choice Band**, **Choice Specs** and **Choice Scarf**, passively raise the holder's Attack, Special Attack or Speed respectively by 50%, but force it to use only the first move it uses after it is sent out.
- **King's Rock** and **Razor Fang** passively grant every move the holder uses that does not already have a chance of making the target flinch (see the [status ailments](https://www.dragonflycave.com/mechanics/status-ailments/) page) a 10% chance to do so.
- **Leftovers** passively heal the holder by 1/16 of its maximum HP at the end of every turn.
- The various 'type-boosting items' passively boost the power of any moves of one particular type used by the holder by 20% (used to be 10% for most of them and 5% for a couple prior to the fourth generation).

## Move Variables

The move being used is of course also a very important part of how turn resolution works out. These are the primary general properties of moves that influence their behaviour in battle.

Since types were discussed above in the Pokémon section, I will not repeat myself; go [there](https://www.dragonflycave.com/mechanics/battling-basics/#type) if you've forgotten.

### Move Category

Also known as the **physical/special classification**, this is what determines for a given damaging move whether the damage formula plugs in the user's Attack and the target's Defense or the user's Special Attack and the target's Special Defense. Various abilities and other effects may also apply only to physical moves or only special moves.

In the first three generations, this was determined by the type of the move, as follows:

#### Physical

- Normal
- Fighting
- Poison
- Ground
- Flying
- Bug
- Rock
- Ghost
- Steel

#### Special

- Fire
- Water
- Electric
- Grass
- Ice
- Psychic
- Dragon
- Dark

However, the fourth generation changed it so that this distinction is now on a move-by-move basis: moves whose power should reasonably depend on the physical strength of the Pokémon, such as Tackle or Fire Punch, are regarded as physical, and more supernatural-based attacks such as Psychic or Shadow Ball are regarded as special, regardless of their types. This is represented by one of these symbols when you look up the move, either on your Pokémon's summary screen in-game or in most online Pokédexes:

| Symbol | Meaning | Offensive stat | Defensive stat |
| --- | --- | --- | --- |
| ![Physical](https://www.dragonflycave.com/physical.png) | The move deals physical damage | Attack | Defense |
| ![Special](https://www.dragonflycave.com/special.png) | The move deals special damage | Sp. Atk. | Sp. Def. |
| ![Status](https://www.dragonflycave.com/status.png) | The move does not deal direct damage | None | None |

A few moves (Psyshock, Psystrike and Secret Sword) are classed as special and go off the user's Special Attack, but use the target's Defense in the calculation instead of Special Defense, as a gimmick that stirs up the usual physical/special separation by allowing a special attacker to effectively target Pokémon with high Special Defense but low Defense. There are no similar moves that go off Attack and Special Defense. The move Body Press will go off the user's _Defense_ rather than Attack (but uses the target's Defense as normal).

### Base Power

Also called **base damage**, this number represents how powerful a damaging move is. (For moves that do not deal direct damage, the base power is irrelevant and is coded as 0.) Weak moves with no additional effects generally have a base power of 35-40, while strong, accurate moves with no harmful side-effects generally top out at around 90-100 base power; powerful moves with drawbacks such as poor accuracy, recoil, needing to charge for a turn or lowering the user's stats after use tend to have 110-140 base power, and the most powerful move in the game, Explosion, has 250 base power but only at the steep price of making the user faint. (In fact, Explosion's base power was effectively 500 in generations 2-4, as the damage formula specially doubled the damage for Selfdestruct and Explosion; the first generation did the same, but then its base power was "only" 170, for an effective base power of 340.)

Some moves that obey the normal damage formula nonetheless have a _variable_ base power, where some kind of formula or other calculation is applied to determine the base power value before it is plugged into the damage formula. This includes moves like Grass Knot and Low Kick, whose power depends on the target's weight; Magnitude, whose power can randomly be one of several values with different probabilities; Gyro Ball, whose power equals `min(150, floor(1 + 25 * target's Speed stat / user's Speed stat))`; and more.

Yet other moves, however, bypass the regular damage formula completely and deal a number of hit points in damage that is determined through some other means. For example, a few moves such as **Night Shade** and **Seismic Toss** deal damage equal to the user's level; **Dragon Rage** always deals exactly 40 hit points of damage; and **Endeavor** deals damage equal to the target's current HP minus the user's current HP, in order to bring the target down to exactly the user's current HP.

### Target

Moves can have different _targets_ \- that is, they vary in what Pokémon they _can_ target when used. Most moves either target the _user_ \- usually beneficial moves that raise stats or the like - or a _single non-user_, in which case the trainer may select any of the other reachable participating Pokémon (even those on their own side) as the target. However, some moves target allies, some target all reachable Pokémon except the user or all reachable opponents, and a couple of still more idiosyncratic targetings exist.

When I say reachable, I refer to the fact that in a triple battle in the fifth generation, a Pokémon can only target targets that are _adjacent_ to the user, even for moves that are often described as targeting "all opponents" or "all except user". Every Pokémon on the field is adjacent to the middle fighter on each side; however, a Pokémon that is positioned on the left side of its trainer's team cannot target either the ally or opponent on the right side (from its point of view), and vice versa. Some moves, however - mostly Flying-type and wave-based moves - have a flag that allows them to target even non-adjacent Pokémon, for which this restriction does not apply. All Pokémon are considered adjacent in a single or double battle.

When a move targets multiple opponents but no allies, it will deal only 75% of its normal damage to each target, as the Pokémon has to spread out its attack further. This applies even if it doesn't actually hit every target, but if only one target was present (because the battle is a single battle or there is only one Pokémon that the user is able to target), the damage is normal. As with all other effects that modify damage, this has no effect on moves that do not deal direct damage.

### Accuracy

In addition to varying in power and effects, both damaging and non-damaging moves can also _miss_ and have no effect at all. The baseline chance that a given move will hit any given target is the move's _accuracy_, displayed as a simple percentage value when you examine the move (either when learning it or on the Pokémon's summary screen) since the third generation. This base accuracy value only varies between moves but is not dependent on the user's species or stats; the actual accuracy check, however, modifies the move's base accuracy value to obtain the final accuracy of the move, both according to the current accuracy and evasion [stat stages](https://www.dragonflycave.com/mechanics/stat-stages/) and certain abilities and items.

In the first two generations, the accuracy was a number out of 255, with the actual chance of hitting being the accuracy divided by 256, but the possible accuracy values were chosen to be close to the multiple-of-five percentage values we know: moves would have accuracies of 216 (84.4% accurate) or 178 (69.5% accurate) that in the later games became 85% and 70%, for instance. In the first-generation games, as the accuracy couldn't be 256, all moves intended to be 100% accurate had a tiny (1/256, or around 0.4%) chance of missing by default regardless; in the second generation, this was fixed.

Note that some moves do not go through an accuracy check at all and therefore cannot miss unless the target is in an invulnerable state (i.e. in the middle of using the two-turn moves Fly, Bounce, Dive, Dig, Shadow Force or Phantom Force - though in the first-generation games, such moves would hit even then). Most of these moves are moves that target the user or the field, where missing wouldn't make sense, but a few moves targeting other Pokémon have this distinction as well. As the archetypal example of such a move is **Swift**, these moves are often called _Swift-accurate_ or _sure-hit moves_. Moves that can ordinarily miss can sometimes be made Swift-accurate under special circumstances; for instance, Thunder and Hurricane are Swift-accurate during rain, Blizzard is Swift-accurate during hail, and any move becomes Swift-accurate (and able to hit Pokémon in an otherwise invulnerable state) if either the user or the target has the ability **No Guard** or if the user used **Lock-On** or **Mind Reader** on the previous turn.

### Priority

Every move has a _priority level_, which is the primary determinant of the order in which the Pokémon execute their moves each turn: moves with a higher priority are always executed before moves with a lower priority, save for a couple of exceptional cases where moves directly shift the turn order around during the turn. The overwhelming majority of Pokémon moves have the normal, neutral priority of 0, however, and when the moves being used have the same priority, the Speed stat of the Pokémon becomes the deciding factor.

The original and most familiar high-priority move is Quick Attack, whose priority level is 1. It was followed in the later generations by several other moves that share that priority and its base power of 40, namely the Fighting-type Mach Punch and Vacuum Wave, the Ghost-type Shadow Sneak, the Water-type Aqua Jet, the Steel-type Bullet Punch, the Ice-type Ice Shard, and the Rock-type Accelerock. The move Extremespeed has a priority of 2, so an Extremespeed user will always move before a Quick Attack user (in the fifth generation onwards, that is - Extremespeed had a priority of 1 like Quick Attack in the previous generations, so whether it moved before Quick Attack would then be down to Speed). Water Shuriken, Greninja's signature move, has a priority of 1 and hits 2-5 times, each hit having a base power of 20. Other damaging high-priority moves are gimmicky: Sucker Punch has a priority of 1 but fails if the target isn't about to use a damaging move; Fake Out has a priority of 3 and always makes the target flinch, but can only be used on the first turn after a Pokémon becomes active; Feint has a priority of 2 and hits through Protect and Detect (which otherwise make the user invulnerable for the turn) while having only 30 base power (50 prior to the fifth generation, but then it also failed altogether if the target _didn't_ use Protect/Detect); and Powder has a priority of 1 but only damages the target if it was about to use a Fire-type move. The non-damaging high-priority moves are generally 'meta-moves' that protect the user against subsequent attacks that turn, steal the target's moves, redirect their targets, help allies' moves or switch with allies, though the Fairy-type Baby-Doll Eyes is a run-of-the-mill Attack-lowering move that merely happens to have a priority of 1.

Low-priority moves are usually moves that force switches, depend on damage being or not being dealt to the user previously in that turn, or activate reality-warping field effects that wouldn't make sense coming into effect in the middle of a turn. The exception is Vital Throw, whose -1 priority is the price it pays for being slightly more powerful than most other Swift-accurate moves.

Some abilities can alter moves' priority - for instance, Prankster gives all status (non-damaging) moves used by the Pokémon +1 priority, and Gale Wings gives all Flying-type moves used by the Pokémon +1 priority when it's at full health.

### Critical Hit Ratio

Most moves have a 1/24 (~4.17%) chance of being a _critical hit_ (1/16 in the third through sixth generations, 17/256 in the second). A critical hit deals 1.5 times the damage it normally would (double prior to the sixth generation) and ignores unfavorable stat stages, i.e. positive Defense/Special Defense stat stages on the target and negative Attack/Special Attack stat stages on the user. (In the first generation, all offensive/defensive stat modifiers were ignored upon a critical hit, even if this led to the attack doing less damage than otherwise; in the second generation, all offensive/defensive stat modifiers were ignored if and only if the user's Attack stat stage was less than the target's Defense stat stage.) Some moves, however, such as Razor Leaf, Slash and Aeroblast, have a _high critical hit ratio_, which means that their base chance of being a critical hit is 1/8 (12.5%). In the second-generation games, these moves' base critical hit ratio was even higher, 1/4 (25%).

The first-generation games used a different method of determining critical hits altogether, based on the base Speed of the user's species, in which the high critical-hit ratio moves were eight times more likely to be a critical hit than normal.

The critical hit ratio can also be affected by various moves, abilities and items, which I won't go into here.

### Effect Chance

Some moves have _secondary effects_ that have a chance of being activated after they deal damage. These secondary effects may lower the target's stats, raise the user's own, inflict a status ailment on the target, or cause the target to flinch, depending on the effect defined for the move.

These effects can only happen if the move hits the target, and the chance that they will activate is the move's _effect chance_ (usually found in online Pokédexes under that name), unless changed by abilities or other effects or the secondary effect cannot happen (because the target is immune to the status ailment it should inflict, for instance). When a secondary effect cannot happen, it will simply fail silently. Note that even guaranteed secondary effects, with a 100% effect chance, are distinct from when the primary effect includes, for instance, lowering the user's stats after use, despite that the latter technically also have an effect chance of 100%; abilities, etc. that operate on secondary effects will not "count" these effects as such. My [Status Ailments](https://www.dragonflycave.com/mechanics/status-ailments/) and [Stat Stages](https://www.dragonflycave.com/mechanics/stat-stages/) sections denote explicitly when something is a secondary effect.

## Further Reading

My [battle mechanics](https://www.dragonflycave.com/mechanics/battle/) section picks up from where this one left off, explaining the main calculations of the battle system in far more detail. Check that out if you're interested. And if you haven't read the [Stat Mechanics](https://www.dragonflycave.com/mechanics/stats/), [Status Ailments](https://www.dragonflycave.com/mechanics/status-ailments/) and [Stat Stages](https://www.dragonflycave.com/mechanics/stat-stages/) sections, you should definitely check those out as well.

Page last modified November 20 2025 at 17:02 UTC

## You May Also Enjoy

[**Interactive Type Chart**\\
A type chart, except you can create your own types, or delete/edit existing ones, or visualize all kinds of type-related data.](https://www.dragonflycave.com/typechart.html)

[**Battle Mechanics**\\
An explanation of the inner workings of the mainline Pokémon battle system, including turn order, accuracy, critical hits, the damage formula, and secondary effects of moves.](https://www.dragonflycave.com/mechanics/battle/)

[**Stat Stages**\\
All about what's really going on behind the scenes when your game tells you your Pokémon's Attack fell.](https://www.dragonflycave.com/mechanics/stat-stages/)

[**Status Ailments**\\
Everything you ever wanted to know about status ailments in mainline Pokémon, how they function, and how to inflict them.](https://www.dragonflycave.com/mechanics/status-ailments/)

## Post comment

Inflammatory or off-topic comments will be deleted; please go to the [guestbook](https://www.dragonflycave.com/guestbook/) for discussion unrelated to this page. You can use [BBCode](https://www.dragonflycave.com/mechanics/battling-basics/#bbcode "Click for a list of formatting options.") (forum code) to format your messages.

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

![716](https://www.dragonflycave.com/sprites/gen8/home-thumb/716.png)Please type the name of the above Pokémon into this box ( [don't know it?](https://www.dragonflycave.com/mechanics/battling-basics/#))\*:The above sprite has a 1/8192 chance of being shiny. (Modern browsers will give it a yellow glow if so.)

Submit messageReset

## Comments

No comments on this page as of yet.