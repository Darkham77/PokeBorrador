# Stat Stages

While the [stat mechanics](https://www.dragonflycave.com/mechanics/stats/) page on this site explains how the values you see when you look up your Pokémon's stats on its summary screen are calculated, this isn't the whole story for the non-HP stats. The values actually used for calculations in battle can be modified in various ways from their out-of-battle values, and out of these ways, the most familiar and common type of modifier is _stat stages_. In particular, whenever you use a move that raises your stats or lowers your opponent's, it's stat stages that are being modified behind the scenes.

A stat stage is an integer value that starts out at zero but can range from -6 to 6. Each Pokémon in battle has a separate stat stage for each of its stats. Moves and other effects in battle can change a Pokémon's stat stages, usually raising or lowering them by one or two but occasionally more; when people say something raises or lowers a stat "by one stage" or "by two stages", it is the stat stage for that stat that is rising or falling by one or two.

Whenever a Pokémon is switched in, its stat stages are all reset to zero, unless it is replacing a Pokémon that just used Baton Pass, in which case it will start out with the same stat stages as the Baton Passer. If not using Baton Pass, all accumulated stat stages are therefore lost when you switch out a Pokémon. (In rotation battles, being rotated out does not count as switching.)

In Red, Blue and Yellow, the implementation of stat stages was quite buggy and resulted in bizarre side-effects when stat stages were modified and other counterintuitive results. See the [R/B/Y Stat Modification](https://www.dragonflycave.com/mechanics/gen-i-stat-modification/) section for more information.

With only a couple of exceptions, you can tell when a stat stage is being modified by the familiar messages the game uses to notify you:

| Message | Stat stage change |
| --- | --- |
| \[Pokémon\]'s \[stat\] rose! (all gens except 2)<br>\[Pokémon\]'s \[stat\] went up! (gen 2) | +1 |
| \[Pokémon\]'s \[stat\] greatly rose! (gen 1)<br>\[Pokémon\]'s \[stat\] went way up! (gen 2)<br>\[Pokémon\]'s \[stat\] sharply rose! (gen 3 onwards) | +2 |
| \[Pokémon\]'s \[stat\] rose drastically! (gen 5 onwards) | +3 or more |
| \[Pokémon\]'s \[stat\] fell! (all gens) | -1 |
| \[Pokémon\]'s \[stat\] greatly fell! (gen 1)<br>\[Pokémon\]'s \[stat\] sharply fell! (gen 2)<br>\[Pokémon\]'s \[stat\] harshly fell! (gen 3 onwards) | -2 |
| \[Pokémon\]'s \[stat\] severely fell! (gen 5 onwards) | -3 or more |

If the stat stage is already at -6 or 6, moves or effects that should lower or raise the stat stage respectively as a primary effect will bring up a "Nothing happened!"/"\[Pokémon\]'s \[stat\] won't go higher/lower!" message. (If it is a secondary effect of a move, it will simply fail silently.)

In battle, the effective stats of each Pokémon are multiplied by a fraction corresponding to the current stat stage for that stat: if the value of the stat stage is s, the multiplier is max(2, 2 + s)/max(2, 2 - s), where max(x, y) stands for taking the higher out of x or y. (In the first generation, the multipliers used are technically approximations of these ideal multipliers.) If math confuses you, this amounts to the following table:

| Stat stage | Ideal Multiplier (gen 2+) | Approximated Multiplier (gen 1) |
| --- | --- | --- |
| -6 | 2/8 (1/4) | 0.25 |
| -5 | 2/7 | 0.28 |
| -4 | 2/6 (1/3) | 0.33 |
| -3 | 2/5 | 0.40 |
| -2 | 2/4 (1/2) | 0.50 |
| -1 | 2/3 | 0.66 |
| 0 | 2/2 (1) | 1 |
| 1 | 3/2 | 1.5 |
| 2 | 4/2 (2) | 2 |
| 3 | 5/2 | 2.5 |
| 4 | 6/2 (3) | 3 |
| 5 | 7/2 | 3.5 |
| 6 | 8/2 (4) | 4 |

This means that if you have, for instance, a Scyther whose Attack is shown as 250 on the stat screen, and you make it use Swords Dance (which raises its Attack stat stage by two), its Attack will in fact be regarded as being 500 (250 \* 4/2). If its opponent subsequently used Growl, this would bring its Attack stat stage down by one, to 1, and its effective Attack would become 375 (250 \* 3/2).

In the first two generations, the maximum value a calculated stat could have was 999, so any time a stat would go over that due to stat stages, it would be made 999 instead. Thus, although if that Scyther had an Attack stat stage of 6 it should have an Attack of 1000, it will actually only be 999 in the pre-Advance games. The later games don't have this limitation.

#### Accuracy and Evasion

You may have noticed that the same messages you get for normal stat stages will also pop up when a Pokémon's accuracy or evasion changes, such as when Sand-Attack or Double Team are used. Accuracy and evasion are essentially stat stages whose corresponding "stat" is the base accuracy of the moves the Pokémon uses. (In the first two generations, the base accuracy of a move was a number out of 255, with the chance of hitting being that number divided by 256; in the third generation onwards, the base accuracy is internally a number out of 100 straightforwardly representing the percentage chance of hitting.)

Like other stat stages, they start out at zero, can range from -6 to 6 and will be reset when you switch unless Baton Pass was used. In Red, Blue and Yellow, the accuracy and evasion stat stage multipliers were the same as for the other stats, save for evasion being inverted (i.e. the multiplier corresponding to the negation of the actual evasion stat stage will be applied): having used Sand-Attack or Double Team six times (but not both) meant the opponent's chance of hitting with its moves was a quarter of its original value, and if both had been used six times the opponent had a mere 1/16 of its usual chance of hitting. In Gold, Silver and Crystal, accuracy and evasion were depowered slightly by changing how the multiplier corresponding to the accuracy/evasion stat stages was calculated: it was now approximately max(3, 3 + s)/max(3, 3 - s) for an accuracy stat stage of s (and the inverse for the evasion modifier). This meant each multiplier would max out at ~1/3 and 3, with six Double Teams and Sand-Attacks resulting in an accuracy of ~1/9 of the original value. As with the regular stat stage multipliers, the multipliers were originally only approximations, and not always entirely accurate ones at that:

| Stat stage | Ideal Multiplier (gen 5+) (Accuracy) | Approximated Multiplier (gen 2-4) (Accuracy) | Ideal Multiplier (gen 5+) (Evasion) | Approximated Multiplier (gen 2-4) (Evasion) |
| --- | --- | --- | --- | --- |
| -6 | 3/9 (1/3) | 0.33 | 9/3 (3) | 3 |
| -5 | 3/8 | 0.36 | 8/3 | 2.66 |
| -4 | 3/7 | 0.43 | 7/3 | 2.33 (G/S/C) / 2.5 (gen 3/4) |
| -3 | 3/6 (1/2) | 0.5 | 6/3 (2) | 2 |
| -2 | 3/5 | 0.6 | 5/3 | 1.66 |
| -1 | 3/4 | 0.75 | 4/3 | 1.33 |
| 0 | 3/3 (1) | 1 | 3/3 (1) | 1 |
| 1 | 4/3 | 1.33 | 3/4 | 0.75 |
| 2 | 5/3 | 1.66 | 3/5 | 0.6 |
| 3 | 6/3 (2) | 2 | 3/6 (1/2) | 0.5 |
| 4 | 7/3 | 2.33 (G/S/C) / 2.5 (gen 3/4) | 3/7 | 0.43 |
| 5 | 8/3 | 2.66 | 3/8 | 0.36 |
| 6 | 9/3 (3) | 3 | 3/9 (1/3) | 0.33 |

All this meant that if an opponent used Sand-Attack on my Scyther in G/S/C, my Scyther's accuracy stat stage would be -1, and its chance of hitting with a Fury Cutter (base accuracy 242) would be floor(242 \* 0.75) / 256 = ~70.7%, where floor(x) stands for rounding down x. If the opponent also used Double Team twice on top of the Sand-Attack, for an evasion stat stage of 2, then Scyther's chances of hitting with a Slash (base accuracy 255) would become floor(floor(255 \* 0.75) \* 0.6) / 256 = ~44.5%. Ouch. (You'll notice the combination of both lowering accuracy and raising evasion is here more effective than doing one or the other, because of how the two multipliers stack: three Double Teams or three Sand-Attacks would have made it ~49.6%.)

However, the third-generation games depowered evasion and accuracy even further: now, instead of being two multipliers that stack, the evasion stat stage will simply be subtracted from the accuracy stat stage when the accuracy check is performed (with the result capped at -6/6) and the single multiplier corresponding to the modified accuracy stat stage will be applied. In other words, once you've used Sand-Attack six times, using Double Team six times too won't actually make the opponent miss more, since the modified accuracy stat stage can't go below -6. And using Double Team three times will now have exactly the same effect upon the opponent's chance of missing as using Double Team twice and Sand-Attack once - although of course, if the opponent switches to another Pokémon without Baton Pass, you'll keep your Double Team boosts but they'll be rid of the Sand-Attack.

Thus, if my Scyther were using that Slash in a post-Advance game, the game would subtract the evasion stat stage (2) from the accuracy stat stage (-1) for a modified accuracy stat stage of -3, and then it would calculate the final accuracy as floor(100 \* 0.5) = 50%.

As of the fifth generation, the multipliers used for accuracy checks are no longer those weird approximations but instead the actual ideal multipliers shown in the table above.

## Stat Stage Modification and Usage

There are a lot of moves, items and abilities that affect or are affected by stat stages, but this should be a comprehensive list of them. If you notice anything I missed, please [contact me](https://www.dragonflycave.com/contact-me/).

### General

This includes all effects that involve stat stages but do not modify them in addition to general stat stage-modifying effects.

- Any **critical hit**, including those from moves that always hit critically, will ignore the user's Attack or Special Attack stat stage if it is negative, as well as the target's Defense or Special Defense stat stage if it is positive. In Gold, Silver and Crystal, critical hits ignored all stat stages (and other, non-stat stage modifiers) if and only if the user's Attack/Special Attack stat stage was lower than the target's Defense/Special Defense stat stage. In Red, Blue and Yellow, critical hits always ignored all stat stages and other non-stat stage modifiers.
- The move **Haze** resets all stat stages of all active Pokémon to zero. In Red, Blue and Yellow, it also cured the opponent's major status ailments, confusion and Leech Seed (but not the user's), and set all the actual stats to their initial unmodified values such that other, non-stat stage modifiers were also negated until recalculated.
- The move **Clear Smog** resets all of the target's stat stages to zero.
- The move **Mist** and the item **Guard Spec.**, when used in battle, protect all Pokémon on the user's side from having their stat stages lowered by another Pokémon's moves and abilities for five turns. This includes the moves or abilities of allies. Moves and abilities that raise stat stages are unaffected, as are any of the Pokémon's own moves and abilities that affect stat stages, and any moves that set stat stages to specific values rather than raising/lowering them. In Red, Blue and Yellow, only moves that lowered stat stages as a primary effect were affected.
- The move **Heart Swap** swaps all of the user's current stat stages with the opponent's.
- The moves **Chip Away**, **Darkest Lariat**, **Sacred Sword** and **Nihil Light** ignore the target's stat stages when performing the accuracy check and damage calculation for the move.
- The moves **Power Trip** and **Stored Power** have a base damage of 20, but it is increased by 20 times the total sum of the user's positive stat stages: that is, if one of the user's stat stages is 3 and another is 1, its base damage will be 20 + 20\*4 = 100.
- The move **Punishment**'s base damage is increased by 20 times the total sum of the target's positive stat stages, up to a maximum of 200 total base damage. That is, from its initial base damage of 60, if one of the target's stat stages is 2, one is 4 and one is 1, Punishment's base damage will be the maximum of 60 + 20\*7 = 200.
- The moves **Foresight** and **Odor Sleuth** cause the target's evasion stat stage to be treated as zero if it is greater than zero during subsequent accuracy checks against it, and additionally negate its immunity to Normal- and Fighting-type moves if it is a Ghost-type.
- The move **Miracle Eye** causes the target's evasion stat stage to be treated as zero if it is greater than zero during subsequent accuracy checks against it, and additionally negates its immunity to Psychic-type moves if it is a Dark-type.
- The move **Baton Pass** allows the user to switch the current Pokémon out for another Pokémon, retaining the current Pokémon's stat stages for its replacement.
- The move **Psych Up** sets all of the user's stat stages to the target's respective stat stages. The target's stat stages are unaffected.
- The move **Acupressure** raises a random stat stage of the targeted user/ally (evasion and accuracy included) by two as a primary effect.
- The move **Topsy-Turvy** inverts all stat stages of the target, so that for example an Attack stat stage of 2 will turn into -2.
- The move **Spectral Thief** steals any positive stat stages of the target (adding them to the user's stat stages) before inflicting damage. If stealing the full stat stage would bring the user past +6 in that stat, it will only steal as many boosts as it needs (and the target will retain the rest).
- The move **Burning Jealousy** inflicts damage on all opponents as well as burning those that have had their stat stages raised this turn.
- The move **Alluring Voice** inflicts damage as well as confusing those that have had their stat stages raised this turn.
- The move **Lash Out** deals double damage if any of the user's stat stages have been lowered this turn.
- The Z-moves **Z-Acid Armor**, **Z-Agility**, **Z-Amnesia**, **Z-Attract**, **Z-Autotomize**, **Z-Barrier**, **Z-Baton Pass**, **Z-Calm Mind**, **Z-Coil**, **Z-Cotton Guard**, **Z-Cotton Spore**, **Z-Dark Void**, **Z-Disable**, **Z-Double Team**, **Z-Dragon Dance**, **Z-Endure**, **Z-Floral Healing**, **Z-Follow Me**, **Z-Heal Order**, **Z-Heal Pulse**, **Z-Helping Hand**, **Z-Iron Defense**, **Z-King's Shield**, **Z-Leech Seed**, **Z-Milk Drink**, **Z-Minimize**, **Z-Moonlight**, **Z-Morning Sun**, **Z-Nasty Plot**, **Z-Perish Song**, **Z-Protect**, **Z-Quiver Dance**, **Z-Rage Powder**, **Z-Recover**, **Z-Rest**, **Z-Rock Polish**, **Z-Roost**, **Z-Shell Smash**, **Z-Shift Gear**, **Z-Shore Up**, **Z-Slack Off**, **Z-Soft-Boiled**, **Z-Spore**, **Z-Substitute**, **Z-Swagger**, **Z-Swallow**, **Z-Swords Dance**, **Z-Synthesis** and **Z-Tail Glow** reset any lowered stat stages of the user as a Z-Power effect (before applying the base move's regular effect).
- The abilities **Clear Body**, **White Smoke** and **Full Metal Body** prevent the bearer from having its stat stages lowered by another Pokémon's moves and abilities, including the moves or abilities of allies. Moves and abilities that raise stat stages are unaffected, as are any of the Pokémon's own moves and abilities that affect stat stages, and any moves that set stat stages to specific values rather than raising/lowering them.
- The ability **Contrary** causes effects that raise or lower stat stages to be reversed on this Pokémon: any effect that ought to raise one of its stat stages will instead lower it by the same amount and vice versa. Moves that set stat stages to specific values (e.g. Psych Up) rather than raising/lowering them are unaffected. (Note that on this page, descriptions of effects are worded with this in mind: if it says "raises" or "lowers", then it will lower or raise that stat respectively by the same number of stages for a Contrary Pokémon, but otherwise it will be affected normally.)
- The ability **Big Pecks** prevents the bearer from having its Defense stat stage lowered by another Pokémon's moves and abilities, including the moves and abilities of allies.
- The ability **Hyper Cutter** prevents the bearer from having its Attack stat stage lowered by another Pokémon's moves and abilities, including the moves and abilities of allies.
- The ability **Keen Eye** prevent the bearer from having its accuracy stat stage lowered by another Pokémon's moves and abilities, including the moves and abilities of allies.
- The ability **Mind's Eye** prevents the bearer from having its accuracy stat stage lowered by another Pokémon's moves and abilities, including the moves and abilities of allies, and causes other Pokémon's evasion stat stage to be ignored when this Pokémon attacks.
- The ability **Flower Veil** prevents friendly Grass-type Pokémon (including the bearer) from having any of their stat stages lowered by another Pokémon's moves and abilities, including the moves and abilities of other allies.
- The ability **Moody** raises one of the bearer's stats at random by two stages and lowers another stat at random by one stage at the end of each turn.
- The ability **Simple** causes all modifications to stat stages to be doubled on this Pokémon, such that any effect that ought to raise or lower one of its stats by one stage will instead raise/lower it by two stages, effects that ought to raise or lower by two stages will instead raise or lower by four, and so on. In the fourth generation, the ability achieved a similar effect through different means: the bearer's stat stages simply _acted_ as if they were double their true value, so that having an Attack stat stage of -1 would actually cut its Attack in half as if it were -2. Stat stages less than -3 or greater than 3 would still only act as if they were -6/6. The main difference this makes lies in what happens when this Pokémon uses Baton Pass or is switched in to replace a Pokémon that uses Baton Pass.
- The ability **Unaware** causes other Pokémon's stat stages to be ignored during accuracy checks and damage calculation for moves used by or targeting this Pokémon.
- The ability **Beast Boost** raises the Pokémon's highest stat by one stage whenever it causes another Pokémon to faint by using a damaging move.
- The ability **Mirror Armor** causes effects that would lower the bearer's stat stages to be reflected back at the opponent that inflicted them instead.
- The ability **Curious Medicine** causes the stat stages of all active Pokémon to be reset to zero when the bearer enters battle.
- The ability **Opportunist** causes the bearer to copy any effect that raises an opponent's stat stages.
- The ability **Costar** causes the bearer to copy the stat stages of its ally when it enters battle.
- The item **White Herb**, when held by a Pokémon, will be consumed at the end of any turn where the user has at least one negative stat stage and restore those stat stages to zero.
- The item **Starf Berry**, when held by a Pokémon, will be consumed when it falls below a quarter of its maximum HP to raise a random stat stage of that Pokémon (evasion and accuracy included) by two.

### Attack

#### Raise user's stat stage

- The moves **Howl**, **Meditate** and **Sharpen** raise the user's Attack by one stage as a primary effect.
- The move **Bulk Up** raises the user's Attack and Defense by one stage as a primary effect.
- The move **Coil** raises the user's Attack, Defense and accuracy by one stage as a primary effect.
- The move **Curse**, when used by a non-Ghost-type, raises the user's Attack and Defense by one stage as a primary effect but also lowers its Speed by one stage.
- The move **Work Up** raises the user's Attack and Special Attack by one stage as a primary effect.
- The move **Growth** raises the user's Attack and Special Attack by one stage as a primary effect (two stages in sunny weather in the fifth generation). Prior to the fifth generation, it only raised Special Attack.
- The move **Dragon Dance** raises the user's Attack and Speed by one stage as a primary effect.
- The move **Tidy Up** raises the user's Attack and Speed by one stage as a primary effect, as well as clearing away any entry hazards, and Substitutes on both sides of the field.
- The move **Shift Gear** raises the user's Attack by one stage and its Speed by two stages as a primary effect.
- The move **Hone Claws** raises the user's Attack and accuracy by one stage as a primary effect.
- The move **Victory Dance** raises the user's Attack, Defense and Speed by one stage as a primary effect.
- The move **No Retreat** raises the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a primary effect, but prevents the user from switching out.
- The move **Clangorous Soul** raises the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage at the cost of one third of its maximum HP.
- The move **Order Up** will raise a stat by one stage along with dealing damage as a primary effect if performed by a Dondozo with a Tatsugiri in its mouth: Attack if it's a Curly Form Tatsugiri, Defense if it's a Droopy Form Tatsugiri, and Speed if it's a Stretchy Form Tatsugiri.
- The move **Swords Dance** raises the user's Attack by two stages as a primary effect.
- The move **Shell Smash** raises the user's Attack, Special Attack and Speed by two stages as a primary effect but also lowers its Defense and Special Defense by one stage.
- The move **Fillet Away** raises the user's Attack, Special Attack and Speed by two stages as a primary effect in exchange for sacrificing half of the user's maximum HP.
- The move **Rage** causes the user's Attack to be raised by one stage every time it is hit with a damaging move until it takes an action other than using Rage, even if Rage misses. The Attack boost is announced by a different message from usual, "\[Pokémon\]'s rage is building!", even though this is a regular stat stage modification that will continue to apply even if you go on to use other moves. In Red, Blue and Yellow, using Rage would also force the user to continue using Rage until it fainted or won the battle.
- The move **Belly Drum** raises the user's Attack stat stage by six minus its current Attack stat stage (so if it's at 4, it will raise it by two stages, whereas if it's at 0, it will raise it by six, and if it's at -6, it will raise it by twelve) in exchange for sacrificing half of the user's maximum HP.
- The moves **Power-Up Punch** (100%), **Meteor Mash** (20%) and **Metal Claw** (10%) have the indicated chances of raising the user's Attack by one stage as a secondary effect.
- The moves **Ancientpower**, **Ominous Wind** and **Silver Wind** have a 10% chance of raising the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a secondary effect.
- The Z-move **Extreme Evoboost** raises the user's Attack, Defense, Special Attack, Special Defense and Speed by two stages as a primary effect.
- The Z-move **Clangorous Soulblaze** deals damage and raises the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a primary effect.
- The move **Fell Stinger** raises the user's Attack by three stages (two prior to the seventh generation) as a secondary effect if it causes the target to faint.
- The Z-moves **Z-Celebrate**, **Z-Conversion**, **Z-Forest's Curse**, **Z-Geomancy**, **Z-Happy Hour**, **Z-Hold Hands**, **Z-Purify**, **Z-Sketch** and **Z-Trick-or-Treat** raise the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a Z-Power effect (before applying the move's regular effect).
- The Z-moves **Z-Bulk Up**, **Z-Curse** (when used by a non-Ghost-type), **Z-Hone Claws**, **Z-Howl**, **Z-Laser Focus**, **Z-Leer**, **Z-Meditate**, **Z-Odor Sleuth**, **Z-Power Trick**, **Z-Rototiller**, **Z-Screech**, **Z-Sharpen**, **Z-Tail Whip**, **Z-Taunt**, **Z-Topsy-Turvy**, **Z-Will-O-Wisp** and **Z-Work Up** raise the user's Attack by one stage as a Z-Power effect (before applying the base move's regular effect). **Z-Mirror Move** raises the user's Attack by two stages as a Z-Power effect. **Z-Splash** raises the user's Attack by three stages as a Z-Power effect.
- The Max Move **Max Knuckle** inflicts damage and raises the Attack of the user and its allies by one stage as a primary effect.
- The ability **Sap Sipper** raises the bearer's Attack by one stage when it is targeted by a Grass-type move, even a non-damaging one, and negates the effects of the move.
- The ability **Justified** raises the bearer's Attack by one stage whenever it is hit by a damaging Dark-type move.
- The ability **Moxie** raises the bearer's Attack by one stage whenever it deals the finishing blow to another Pokémon.
- The ability **Download**, provided there is at least one active Pokémon on the opponent's side when the bearer becomes active, raises the bearer's Attack by one stage if the current total Defense of all opposing active Pokémon is less than their current total Special Defense, or its Special Attack otherwise.
- The ability **Defiant** will raise the bearer's Attack by two stages whenever any of its other stat stages are lowered. (If multiple stat stages are lowered by the same effect, each of them will independently raise Attack.)
- The ability **Intrepid Sword** will raise the bearer's Attack by one stage the first time it enters battle.
- The ability **Chilling Neigh** will raise the bearer's Attack by one stage whenever it knocks out a target with a damaging move.
- The ability **Thermal Exchange** will raise the bearer's Attack by one stage whenever it is hit by a Fire-type move.
- The ability **Anger Shell** will raise the bearer's Attack, Special Attack and Speed by one stage while lowering the bearer's Defense and Special Defense when the bearer goes below 50% HP.
- The ability **Wind Rider** will raise the bearer's Attack by one stage whenever Tailwind takes effect, or whenever it is hit by a wind move, as well as negating the damage from that attack.
- The ability **Guard Dog** will raise the bearer's Attack by one stage instead of lowering it whenever a Pokémon with the ability Intimidate enters battle.
- The ability **Embody Aspect** will raise the bearer Ogerpon's Attack by one stage if it is holding the Hearthflame Mask.
- The item **X Attack** raises the user's Attack by two stages (one prior to the seventh generation). Its Wonder Launcher-exclusive derivatives in the fifth generation, **X Attack 2**, **X Attack 3** and **X Attack 6**, raise the user's Attack by two, three or six stages respectively when used in battle.
- The item **Cell Battery**, when held by a Pokémon, will be consumed and raise its Attack by one stage when it is hit by a damaging Electric-type attack.
- The item **Snowball**, when held by a Pokémon, will be consumed and raise its Attack by one stage when it is hit by a damaging Ice-type attack.
- The item **Weakness Policy**, when held by a Pokémon, will be consumed and raise its Attack and Special Attack by two stages when it is hit by a super-effective attack.
- The item **Liechi Berry**, when held by a Pokémon, will be consumed when it falls below a quarter of its maximum HP to raise its Attack by one stage.

#### Lower target's stat stage

- The move **Play Nice** (never misses) lowers the target's Attack by one stage as a primary effect.
- The move **Baby-Doll Eyes** (100% accurate) lowers the target's Attack by one stage as a primary effect with a priority of 1.
- The move **Strength Sap** (100% accurate) heals the user by the value of the target's current Attack stat and then lowers the target's Attack by one stage as a primary effect.
- The move **Growl** (100% accurate) lowers all opponents' Attack by one stage as a primary effect.
- The move **Tickle** (100% accurate) lowers the target's Attack and Defense by one stage as a primary effect.
- The moves **Noble Roar** (100% accurate) and **Tearful Look** (never misses) lowers the target's Attack and Special Attack by one stage as a primary effect.
- The move **Parting Shot** (100% accurate) lowers the target's Attack and Special Attack by one stage as a primary effect and then forces the user to be switched out.
- The move **Venom Drench** (100% accurate) lowers the target's Attack, Special Attack and Speed by one stage as a primary effect if the target is poisoned.
- The moves **Charm** (100% accurate), **Featherdance** (100% accurate) and **Eerie Impulse** (100% accurate) lower the target's Attack by two stages as a primary effect.
- The move **Memento** (100% accurate) lowers the target's Attack and Special Attack by two stages as a primary effect, but also causes the user to faint.
- The moves **Trop Kick** (100%), **Lunge** (100%), **Bitter Malice** (100%), **Chilling Water** (100%), **Play Rough** (30%), **Springtide Storm** (30%) and **Aurora Beam** (10%) have the indicated chances of lowering the target's Attack by one stage as a secondary effect.
- The move **Secret Power**, when used on water (but not puddles in the fifth generation), has a 30% chance of lowering the target's Attack by one stage as a secondary effect.
- The Max Move **Max Wyrmwind** inflicts damage and lowers the Attack of all opponents by one stage as a primary effect.
- The ability **Intimidate** lowers the Attack of all adjacent opponents by one stage when the bearer becomes active.

#### Other

- The move **Power Swap** swaps the current Attack and Special Attack stat stages of the user with the target's.
- The move **Superpower** lowers the user's Attack and Defense by one stage after inflicting damage.
- The move **Swagger** (90% accurate) raises the target's Attack by two stages as a primary effect and additionally confuses the target.
- The move **Rototiller** raises the Attack and Special Attack of every Grass-type in play as a primary effect.
- The move **Gear Up** raises the Attack and Special Attack of all friendly Pokémon (including the user) that have the Plus or Minus ability by one stage.
- The move **King's Shield** protects the user against damaging moves for this turn and causes any Pokémon that targets it on that turn to have its Attack lowered by two stages.
- The move **Decorate** raises the Attack and Special Attack of the target by two stages as a primary effect.
- The ability **Anger Point** sets the user's Attack stat stage to 6 when a move scores a critical hit against it.
- The move **Coaching** raises the Attack and Defense of all allies by one stage as a primary effect.
- The move **Spicy Extract** (cannot miss) raises the Attack of the target by two stages as well as lowering its Defense by two stages as a primary effect.

### Defense

#### Raise user's stat stage

- The moves **Defense Curl** (also causes the power of Ice Ball and Rollout subsequently used by the user to be doubled), **Harden** and **Withdraw** raise the user's Defense by one stage as a primary effect.
- The move **Skull Bash** raises the user's Defense by one stage as a primary effect on the turn it is used, and deals damage on the second turn. (In Red, Blue and Yellow, it did not raise Defense.)
- The move **Bulk Up** raises the user's Attack and Defense by one stage as a primary effect.
- The move **Coil** raises the user's Attack, Defense and accuracy by one stage as a primary effect.
- The move **Curse**, when used by a non-Ghost-type, raises the user's Attack and Defense by one stage as a primary effect but also lowers its Speed by one stage.
- The moves **Cosmic Power** and **Defend Order** raise the user's Defense and Special Defense by one stage as a primary effect.
- The move **Stockpile** raises the user's Defense and Special Defense by one stage from the fourth generation onwards. The move can only store energy up to three times, however, before it has to be unleashed using Spit Up or Swallow, and when that happens, the stat boosts are lost.
- The move **No Retreat** raises the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a primary effect, but prevents the user from switching out.
- The move **Clangorous Soul** raises the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage at the cost of one third of its maximum HP.
- The move **Victory Dance** raises the user's Attack, Defense and Speed by one stage as a primary effect.
- The moves **Acid Armor**, **Barrier**, **Iron Defense** and **Shelter** raise the user's Defense by two stages as a primary effect.
- The move **Cotton Guard** raises the user's Defense by three stages as a primary effect.
- The move **Order Up** will raise a stat by one stage along with dealing damage as a primary effect if performed by a Dondozo with a Tatsugiri in its mouth: Attack if it's a Curly Form Tatsugiri, Defense if it's a Droopy Form Tatsugiri, and Speed if it's a Stretchy Form Tatsugiri.
- The moves **Psyshield Bash** (100%) and **Steel Wing** (10%) have the indicated chances of raising the user's Defense by one stage as a secondary effect.
- The moves **Ancientpower**, **Ominous Wind** and **Silver Wind** have a 10% chance of raising the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a secondary effect.
- The move **Stuff Cheeks** causes the user to eat its held Berry and raise its Defense by two stages in addition to the Berry's effect.
- The Z-move **Extreme Evoboost** raises the user's Attack, Defense, Special Attack, Special Defense and Speed by two stages as a primary effect.
- The Z-move **Clangorous Soulblaze** deals damage and raises the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a primary effect.
- The Z-moves **Z-Celebrate**, **Z-Conversion**, **Z-Forest's Curse**, **Z-Geomancy**, **Z-Happy Hour**, **Z-Hold Hands**, **Z-Purify**, **Z-Sketch** and **Z-Trick-or-Treat** raise the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a Z-Power effect (before applying the move's regular effect).
- The Z-moves **Z-Aqua Ring**, **Z-Baby-Doll Eyes**, **Z-Baneful Bunker**, **Z-Block**, **Z-Charm**, **Z-Defend Order**, **Z-Fairy Lock**, **Z-Feather Dance**, **Z-Flower Shield**, **Z-Grassy Terrain**, **Z-Growl**, **Z-Harden**, **Z-Mat Block**, **Z-Noble Roar**, **Z-Pain Split**, **Z-Play Nice**, **Z-Poison Gas**, **Z-Poison Powder**, **Z-Quick Guard**, **Z-Reflect**, **Z-Roar**, **Z-Spider Web**, **Z-Spikes**, **Z-Spiky Shield**, **Z-Stealth Rock**, **Z-Strength Sap**, **Z-Tearful Look**, **Z-Tickle**, **Z-Torment**, **Z-Toxic**, **Z-Toxic Spikes**, **Z-Venom Drench**, **Z-Wide Guard** and **Z-Withdraw** raise the user's Defense by one stage as a Z-Power effect (before applying the base move's regular effect).
- The Max Move **Max Steelspike** inflicts damage and raises the Defense of the user and its allies by one stage as a primary effect.
- The ability **Stamina** raises the bearer's Defense by one stage any time it is hit by a damaging attack.
- The ability **Water Compaction** raises the brearer's Defense by two stages any time it is hit by a Water-type attack.
- The ability **Dauntless Shield** will raise the bearer's Defense by one stage the first time it enters battle.
- The ability **Well-Baked Body** will raise the bearer's Defense by two stages whenever it is hit by a Fire-type attack, as well as negating the damage from that attack.
- The ability **Embody Aspect** will raise the bearer Ogerpon's Defense by one stage if it is holding the Cornerstone Mask.
- The item **X Defend** raises the user's Defense by two stages (one prior to the seventh generation). Its Wonder Launcher-exclusive derivatives in the fifth generation, **X Defend 2**, **X Defend 3** and **X Defend 6**, raise the user's Defense by two, three or six stages respectively when used in battle.
- The item **Ganlon Berry**, when held by a Pokémon, will be consumed when it falls below a quarter of its maximum HP to raise its Defense by one stage.
- The items **Electric Seed**, **Psychic Seed**, **Misty Seed** and **Grass Seed**, when held by a Pokémon, will be consumed if Electric Terrain, Psychic Terrain, Misty Terrain or Grassy Terrain respectively are activated to raise the holder's Defense by one stage.

#### Lower target's stat stage

- The moves **Leer** (100% accurate) and **Tail Whip** (100% accurate) lower all opponents' Defense by one stage as a primary effect.
- The move **Tickle** (100% accurate) lowers the target's Attack and Defense by one stage as a primary effect.
- The move **Venom Drench** (100% accurate) lowers the target's Attack, Special Attack and Speed by one stage as a primary effect if the target is poisoned.
- The move **Screech** (85% accurate) lowers the target's Defense by two stages as a primary effect.
- The move **Spicy Extract** (Swift-accurate) raises the Attack of the target by two stages as well as lowering its Defense by two stages as a primary effect.
- The moves **Fire Lash** (100%), **Grav Apple** (100%), **Thunderous Kick** (100%), **Rock Smash** (50%), **Crush Claw** (50%), **Razor Shell** (50%), **Triple Arrows**, **Iron Tail** (30%), **Crunch** (20%), **Liquidation** (20%) and **Shadow Bone** (20%) have the indicated chances of lowering the target's Defense by one stage as a secondary effect.
- The move **Octolock** will lower the target's Defense and Special Defense at the end of every turn as well as preventing it from switching while the user is on the field.
- The move **Obstruct** will cause the Defense of any Pokémon that tries to attack the user with a move that makes physical contact on that turn to be lowered by two stages, as well as negating the effects of that move.
- The Max Move **Max Phantasm** inflicts damage and lowers the Defense of all opponents as a primary effect.

#### Other

- The move **Shell Smash** raises the user's Attack, Special Attack and Speed by two stages as a primary effect but also lowers its Defense and Special Defense by one stage.
- The move **Guard Swap** swaps the current Defense and Special Defense stat stages of the user with the target's.
- The moves **Clanging Scales** and **Hyperspace Fury** lower the user's Defense by one stage after inflicting damage.
- The move **Superpower** lowers the user's Attack and Defense by one stage after inflicting damage.
- The moves **Close Combat**, **Headlong Rush** and **Armor Cannon** lower the user's Defense and Special Defense by one stage after inflicting damage.
- The move **V-create** lowers the user's Defense, Special Defense and Speed by one stage after inflicting damage.
- The move **Flower Shield** raises the Defense of every Grass-type in play as a primary effect.
- The move **Magnetic Flux** raises the Defense and Special Defense of all friendly Pokémon (including the user) that have the Plus or Minus ability by one stage.
- The ability **Weak Armor** lowers the bearer's Defense by one stage and raises its Speed by two stages (one prior to the seventh generation) whenever it is hit by a physical move.
- The ability **Anger Shell** will raise the bearer's Attack, Special Attack and Speed by one stage while lowering the bearer's Defense and Special Defense when the bearer goes below 50% HP.

### Special Attack

#### Raise user's stat stage

- The move **Work Up** raises the user's Attack and Special Attack by one stage as a primary effect.
- The move **Growth** raises the user's Attack and Special Attack by one stage as a primary effect (two stages in sunny weather in the fifth generation). Prior to the fifth generation, it only raised Special Attack.
- The moves **Calm Mind** and **Take Heart** raise the user's Special Attack and Special Defense by one stage as a primary effect.
- The move **Quiver Dance** raises the user's Special Attack, Special Defense and Speed by one stage as a primary effect.
- The move **No Retreat** raises the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a primary effect, but prevents the user from switching out.
- The move **Nasty Plot** raises the user's Special Attack by two stages as a primary effect.
- The move **Shell Smash** raises the user's Attack, Special Attack and Speed by two stages as a primary effect but also lowers its Defense and Special Defense by one stage.
- The move **Fillet Away** raises the user's Attack, Special Attack and Speed by two stages as a primary effect in exchange for sacrificing half of the user's maximum HP.
- The move **Geomancy** charges for one turn before raising the user's Special Attack, Special Defense and Speed by two stages as a primary effect.
- The move **Tail Glow** raises the user's Special Attack by three stages as a primary effect. Prior to the fifth generation, it raised it by two stages.
- The moves **Mystical Power** (100%), **Torch Song** (100%), **Charge Beam** (70%) and **Fiery Dance** (50%) have the indicated chances of raising the user's Special Attack by one stage as a secondary effect.
- The moves **Ancientpower**, **Ominous Wind** and **Silver Wind** have a 10% chance of raising the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a secondary effect.
- The moves **Meteor Beam** and **Electro Shot** raise the user's Special Attack by one stage as a primary effect on the turn they are used and then deal damage on the second turn.
- The Z-move **Extreme Evoboost** raises the user's Attack, Defense, Special Attack, Special Defense and Speed by two stages as a primary effect.
- The Z-move **Clangorous Soulblaze** deals damage and raises the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a primary effect.
- The Z-moves **Z-Celebrate**, **Z-Conversion**, **Z-Forest's Curse**, **Z-Geomancy**, **Z-Happy Hour**, **Z-Hold Hands**, **Z-Purify**, **Z-Sketch** and **Z-Trick-or-Treat** raise the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a Z-Power effect (before applying the move's regular effect).
- The Z-moves **Z-Confuse Ray**, **Z-Electrify**, **Z-Embargo**, **Z-Fake Tears**, **Z-Gear Up**, **Z-Gravity**, **Z-Growth**, **Z-Instruct**, **Z-Ion Deluge**, **Z-Metal Sound**, **Z-Mind Reader**, **Z-Miracle Eye**, **Z-Nightmare**, **Z-Psychic Terrain**, **Z-Reflect Type**, **Z-Simple Beam**, **Z-Soak**, **Z-Sweet Kiss**, **Z-Teeter Dance** and **Z-Telekinesis** raise the user's Special Attack by one stage as a Z-Power effect (before applying the base move's regular effect). The Z-moves **Z-Heal Block** and **Z-Psycho Shift** raise the user's Special Attack by two stages as a Z-Power effect.
- The Max Move **Max Ooze** inflicts damage and raises the Special Attack of the user and its allies by one stage as a primary effect.
- The abilities **Lightningrod** and **Storm Drain** raise the bearer's Special Attack by one stage when it is targeted by an Electric- or Water-type move, respectively, even a non-damaging one, and negate the effects of the move. All moves of the relevant type that target a single non-user target will also be redirected to target the bearer (and thus activate the ability's effect) in a multi-battle. Prior to the fifth generation, they did not negate the attacks or raise Special Attack, only redirect attacks of their types towards the bearer.
- The ability **Download**, provided there is at least one active Pokémon on the opponent's side when the bearer becomes active, raises the bearer's Attack by one stage if the current total Defense of all opposing active Pokémon is less than their current total Special Defense, or its Special Attack otherwise.
- The ability **Berserk** raises the bearer's Special Attack by one stage whenever its HP drops below one half of its maximum.
- The ability **Soul-Heart** raises the bearer's Special Attack by one stage whenever any Pokémon faints.
- The ability **Competitive** will raise the bearer's Special Attack by two stages whenever any of its stat stages are lowered, including Special Attack. (If multiple stat stages are lowered by the same effect, each of them will independently raise Special Attack.)
- The ability **Grim Neigh** will raise the bearer's Special Attack by one stage whenever it knocks out a target with a damaging move.
- The ability **Anger Shell** will raise the bearer's Attack, Special Attack and Speed by one stage while lowering the bearer's Defense and Special Defense when the bearer goes below 50% HP.
- The item **X Special** raises the user's Special Attack by two stages (one prior to the seventh generation). Its Wonder Launcher-exclusive derivatives in the fifth generation, **X Special 2**, **X Special 3** and **X Special 6**, raise the user's Special Attack by two, three or six stages respectively when used in battle.
- The item **Absorb Bulb**, when held by a Pokémon, will be consumed and raise its Special Attack by one stage when it is hit by a damaging Water-type attack.
- The item **Weakness Policy**, when held by a Pokémon, will be consumed and raise its Attack and Special Attack by two stages when it is hit by a super-effective attack.
- The item **Petaya Berry**, when held by a Pokémon, will be consumed when it falls below a quarter of its maximum HP to raise its Special Attack by one stage.

#### Lower target's stat stage

- The move **Confide** (never misses) lowers the target's Special Attack by one stage as a primary effect.
- The move **Noble Roar** (100% accurate) lowers the target's Attack and Special Attack by one stage as a primary effect.
- The move **Venom Drench** (100% accurate) lowers the target's Attack, Special Attack and Speed by one stage as a primary effect if the target is poisoned.
- The move **Parting Shot** (100% accurate) lowers the target's Attack and Special Attack by one stage as a primary effect and then forces the user to be switched out.
- The move **Memento** (100% accurate) lowers the target's Attack and Special Attack by two stages as a primary effect, but also causes the user to faint.
- The moves **Mystical Fire** (100%), **Snarl** (100%), **Struggle Bug** (100%), **Spirit Break** (100%), **Skitter Smack** (100%), **Mist Ball** (50%) and **Moonblast** (30%) have the indicated chances of lowering the target's Special Attack by one stage as a secondary effect.
- The Max Move **Max Flutterby** inflicts damage and lowers the Special Attack of all opponents by one stage as a primary effect.

#### Other

- The move **Power Swap** swaps the current Attack and Special Attack stat stages of the user with the target's.
- The move **Make It Rain** lowers the user's Special Attack by one stage after inflicting damage.
- The moves **Draco Meteor**, **Fleur Cannon**, **Leaf Storm**, **Overheat** and **Psycho Boost** lower the user's Special Attack by two stages after inflicting damage.
- The move **Flatter** (100% accurate) raises the target's Special Attack by one stage as a primary effect and additionally confuses the target.
- The move **Rototiller** raises the Attack and Special Attack of every Grass-type in play as a primary effect.
- The move **Gear Up** raises the Attack and Special Attack of all friendly Pokémon (including the user) that have the Plus or Minus ability by one stage.
- The move **Decorate** raises the Attack and Special Attack of the target by two stages as a primary effect.

### Special Defense

#### Raise user's stat stage

- The move **Charge** raises the user's Special Defense by one stage as a primary effect and additionally boosts the power of the user's Electric moves on the following turn.
- The moves **Cosmic Power** and **Defend Order** raise the user's Defense and Special Defense by one stage as a primary effect.
- The move **Stockpile** raises the user's Defense and Special Defense by one stage from the fourth generation onwards. The move can only store energy up to three times, however, before it has to be unleashed using Spit Up or Swallow, and when that happens, the stat boosts are lost.
- The moves **Calm Mind** and **Take Heart** raise the user's Special Attack and Special Defense by one stage as a primary effect.
- The move **Quiver Dance** raises the user's Special Attack, Special Defense and Speed by one stage as a primary effect.
- The move **Geomancy** charges for one turn before raising the user's Special Attack, Special Defense and Speed by two stages as a primary effect.
- The move **No Retreat** raises the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a primary effect, but prevents the user from switching out.
- The moves **Ancientpower**, **Ominous Wind** and **Silver Wind** have a 10% chance of raising the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a secondary effect.
- The move **Amnesia** raises the user's Special Defense by two stages as a primary effect.
- The Z-move **Extreme Evoboost** raises the user's Attack, Defense, Special Attack, Special Defense and Speed by two stages as a primary effect.
- The Z-move **Clangorous Soulblaze** deals damage and raises the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a primary effect.
- The Z-moves **Z-Celebrate**, **Z-Conversion**, **Z-Forest's Curse**, **Z-Geomancy**, **Z-Happy Hour**, **Z-Hold Hands**, **Z-Purify**, **Z-Sketch** and **Z-Trick-or-Treat** raise the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a Z-Power effect (before applying the move's regular effect).
- The Z-moves **Z-Charge**, **Z-Confide**, **Z-Cosmic Power**, **Z-Crafty Shield**, **Z-Eerie Impulse**, **Z-Entrainment**, **Z-Flatter**, **Z-Glare**, **Z-Ingrain**, **Z-Light Screen**, **Z-Magic Room**, **Z-Magnetic Flux**, **Z-Mean Look**, **Z-Misty Terrain**, **Z-Mud Sport**, **Z-Spotlight**, **Z-Stun Spore**, **Z-Thunder Wave**, **Z-Water Sport**, **Z-Whirlwind**, **Z-Wish** and **Z-Wonder Room** raise the user's Special Defense by one stage as a Z-Power effect (before applying the base move's regular effect). The Z-Moves **Z-Aromatic Mist**, **Z-Captivate**, **Z-Imprison**, **Z-Magic Coat** and **Z-Powder** raise the user's Special Defense by two stages as a Z-Power effect.
- The ability **Embody Aspect** will raise the bearer Ogerpon's Special Defense by one stage if it is holding the Wellspring Mask.
- The item **X Sp. Def** raises the user's Special Defense by two stages (one prior to the seventh generation). Its Wonder Launcher-exclusive derivatives in the fifth generation, **X Sp. Def 2**, **X Sp. Def 3** and **X Sp. Def 6**, raise the user's Special Defense by two, three or six stages respectively when used in battle.
- The item **Luminous Moss**, when held by a Pokémon, will be consumed and raise its Special Defense by one stage when it is hit by a damaging Water-type attack.
- The item **Apicot Berry**, when held by a Pokémon, will be consumed when it falls below a quarter of its maximum HP to raise its Special Defense by one stage.

#### Lower target's stat stage

- The moves **Fake Tears** (100% accurate) and **Metal Sound** (85% accurate) lower the target's Special Defense by two stages as a primary effect.
- The moves **Apple Acid** (100%), **Luster Purge** (50%), **Shadow Ball** (20%), **Acid** (10%), **Bug Buzz** (10%), **Earth Power** (10%), **Energy Ball** (10%), **Flash Cannon** (10%), **Focus Blast** (10%) and **Psychic** (10%) and have the indicated chances of lowering the target's Special Defense by one stage as a secondary effect.
- The moves **Acid Spray** (100%), **Lumina Crash** (100%) and **Seed Flare** (40%) have the indicated chances of lowering the target's Special Defense by two stages as a secondary effect.
- The move **Octolock** will lower the target's Defense and Special Defense at the end of every turn as well as preventing it from switching while the user is on the field.
- The Max Moves **Max Quake** and **Max Darkness** inflict damage and lower the Special Defense of all opponents by one stage as a primary effect.

#### Other

- The move **Shell Smash** raises the user's Attack, Special Attack and Speed by two stages as a primary effect but also lowers its Defense and Special Defense by one stage.
- The move **Guard Swap** swaps the current Defense and Special Defense stat stages of the user with the target's.
- The moves **Close Combat**, **Headlong Rush** and **Armor Cannon** lower the user's Defense and Special Defense by one stage after inflicting damage.
- The move **V-create** lowers the user's Defense, Special Defense and Speed by one stage after inflicting damage.
- The move **Aromatic Mist** raises the targeted ally's Special Defense by one stage.
- The move **Magnetic Flux** raises the Defense and Special Defense of all friendly Pokémon (including the user) that have the Plus or Minus ability by one stage.
- The ability **Anger Shell** will raise the bearer's Attack, Special Attack and Speed by one stage while lowering the bearer's Defense and Special Defense when the bearer goes below 50% HP.

### Speed

#### Raise user's stat stage

- The move **Dragon Dance** raises the user's Attack and Speed by one stage as a primary effect.
- The move **Tidy Up** raises the user's Attack and Speed by one stage as a primary effect, as well as clearing away any entry hazards, and Substitutes on both sides of the field.
- The move **Quiver Dance** raises the user's Special Attack, Special Defense and Speed by one stage as a primary effect.
- The moves **Agility**, **Autotomize** (also halves the user's weight) and **Rock Polish** raise the user's Speed by two stages as a primary effect.
- The move **Shift Gear** raises the user's Attack by one stage and its Speed by two stages as a primary effect.
- The move **No Retreat** raises the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a primary effect, but prevents the user from switching out.
- The move **Victory Dance** raises the user's Attack, Defense and Speed by one stage as a primary effect.
- The move **Order Up** will raise a stat by one stage along with dealing damage as a primary effect if performed by a Dondozo with a Tatsugiri in its mouth: Attack if it's a Curly Form Tatsugiri, Defense if it's a Droopy Form Tatsugiri, and Speed if it's a Stretchy Form Tatsugiri.
- The move **Shell Smash** raises the user's Attack, Special Attack and Speed by two stages as a primary effect but also lowers its Defense and Special Defense by one stage.
- The move **Geomancy** charges for one turn before raising the user's Special Attack, Special Defense and Speed by two stages as a primary effect.
- The move **Fillet Away** raises the user's Attack, Special Attack and Speed by two stages as a primary effect in exchange for sacrificing half of the user's maximum HP.
- The moves **Flame Charge**, **Aura Wheel**, **Esper Wing**, **Aqua Step** and **Trailblaze** have a 100% chance of raising the user's Speed by one stage as a secondary effect.
- The moves **Ancientpower**, **Ominous Wind** and **Silver Wind** have a 10% chance of raising the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a secondary effect.
- The Z-move **Extreme Evoboost** raises the user's Attack, Defense, Special Attack, Special Defense and Speed by two stages as a primary effect.
- The Z-move **Clangorous Soulblaze** deals damage and raises the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a primary effect.
- The Z-moves **Z-Celebrate**, **Z-Conversion**, **Z-Forest's Curse**, **Z-Geomancy**, **Z-Happy Hour**, **Z-Hold Hands**, **Z-Purify**, **Z-Sketch** and **Z-Trick-or-Treat** raise the user's Attack, Defense, Special Attack, Special Defense and Speed by one stage as a Z-Power effect (before applying the move's regular effect).
- The Z-moves **Z-After You**, **Z-Aurora Veil**, **Z-Electric Terrain**, **Z-Encore**, **Z-Gastro Acid**, **Z-Grass Whistle**, **Z-Guard Split**, **Z-Guard Swap**, **Z-Hail**, **Z-Hypnosis**, **Z-Lock-On**, **Z-Lovely Kiss**, **Z-Power Split**, **Z-Power Swap**, **Z-Quash**, **Z-Rain Dance**, **Z-Role Play**, **Z-Safeguard**, **Z-Sandstorm**, **Z-Scary Face**, **Z-Sing**, **Z-Skill Swap**, **Z-Sleep Powder**, **Z-Speed Swap**, **Z-Sticky Web**, **Z-String Shot**, **Z-Sunny Day**, **Z-Supersonic**, **Z-Toxic Thread**, **Z-Worry Seed** and **Z-Yawn** raise the user's Speed by one stage as a Z-Power effect (before applying the base move's regular effect). The Z-Moves **Z-Ally Switch**, **Z-Bestow**, **Z-Me First**, **Z-Recycle**, **Z-Snatch**, **Z-Switcheroo** and **Z-Trick** raise the user's Speed by two stages as a Z-Power effect.
- The Max Move **Max Airstream** inflicts damage and raises the Speed of the user and its allies by one stage as a primary effect.
- The ability **Speed Boost** raises the bearer's Speed by one stage at the end of every turn where the user was active for the entire turn.
- The ability **Motor Drive** raises the bearer's Speed by one stage when it is targeted by an Electric-type move, even a non-damaging one, and negates the effects of the move.
- The ability **Steadfast** raises the bearer's Speed by one stage whenever it flinches.
- The ability **Rattled** raises the bearer's Speed by one stage whenever it is hit by a damaging Bug-, Ghost- or Dark-type move.
- The ability **Weak Armor** lowers the bearer's Defense by one stage and raises its Speed by two stages (one prior to the seventh generation) whenever it is hit by a physical move.
- The ability **Steam Engine** will raise the bearer's Speed by six stages when it is hit by a Fire- or Water-type move.
- The ability **Anger Shell** will raise the bearer's Attack, Special Attack and Speed by one stage while lowering the bearer's Defense and Special Defense when the bearer goes below 50% HP.
- The ability **Embody Aspect** will raise the bearer Ogerpon's Speed by one stage if it is holding the Teal Mask.
- The item **X Speed** raises the user's Speed by two stages (one prior to the seventh generation). Its Wonder Launcher-exclusive derivatives in the fifth generation, **X Speed 2**, **X Speed 3** and **X Speed 6**, raise the user's Speed by two, three or six stages respectively when used in battle.
- The item **Salac Berry**, when held by a Pokémon, will be consumed when it falls below a quarter of its maximum HP to raise its Speed by one stage.

#### Lower target's stat stage

- The move **Toxic Thread** (100% accurate) poisons the target and lowers its Speed by one stage as a primary effect.
- The move **Venom Drench** (100% accurate) lowers the target's Attack, Special Attack and Speed by one stage as a primary effect if the target is poisoned.
- The move **Tar Shot** (100% accurate) lowers the target's Speed by one stage as a primary effect, as well as doubling the effectiveness of Fire-type moves on the target.
- The move **Syrup Bomb** (85% accurate) causes the target's Speed to be lowered by one stage at the end of each turn for three turns.
- The moves **Cotton Spore** (100% accurate), **Scary Face** (100% accurate; was 90% prior to the fifth generation) and **String Shot** (95% accurate; lowered Speed by one stat stage prior to the sixth generation) lower the target's Speed by two stages as a primary effect.
- The moves **Drum Beating** (100%), **Bulldoze** (100%), **Electroweb** (100%), **Glaciate** (100%), **Icy Wind** (100%), **Low Sweep** (100%), **Mud Shot** (100%), **Rock Tomb** (100%), **Pounce** (100%), **Bleakwind Storm** (30%), **Bubble** (10%), **Bubblebeam** (10%) and **Constrict** (10%) have the indicated chances of lowering the target's Speed by one stage as a secondary effect.
- The Max Move **Max Strike** inflicts damage and lowers the Speed of all opponents by two stages as a primary effect.
- The Max Move **G-Max Foam Burst** inflicts damage and lowers the Speed of all opponents by two stages as a primary effect.
- The abilities **Gooey** and **Tangling Hair** cause any Pokémon that uses a move that makes physical contact on the bearer to have its Speed lowered by one stage.
- The ability **Cotton Down** causes all other Pokémon's Speed to be lowered by one stage when the bearer is hit by a damaging move.
- The move **Silk Trap** will cause the Defense of any Pokémon that tries to attack the user with a move that makes physical contact on that turn to be lowered by one stage, as well as negating the effects of that move.

#### Other

- The move **Curse**, when used by a non-Ghost-type, raises the user's Attack and Defense by one stage as a primary effect but also lowers its Speed by one stage.
- The moves **Hammer Arm** and **Ice Hammer** lower the user's Speed by one stage after inflicting damage.
- The move **Spin Out** lowers the user's Speed by two stages after inflicting damage.
- The move **V-create** lowers the user's Defense, Special Defense and Speed by one stage after inflicting damage.
- The move **Secret Power**, when used on puddles in the fifth generation, has a 30% chance of lowering the target's Speed by one stage as a secondary effect.
- The move **Sticky Web** causes any non-Flying/Levitating Pokémon that switches in on the opponent's side for the rest of the battle to have its Speed lowered by one stage.

### Accuracy

#### Raise user's stat stage

- The move **Coil** raises the user's Attack, Defense and accuracy by one stage as a primary effect.
- The move **Hone Claws** raises the user's Attack and accuracy by one stage as a primary effect.
- The Z-moves **Z-Copycat**, **Z-Defense Curl**, **Z-Defog**, **Z-Focus Energy**, **Z-Mimic**, **Z-Sweet Scent** and **Z-Trick Room** raise the user's accuracy by one stage as a Z-Power effect (before applying the base move's regular effect).
- The item **X Accuracy** and its Wonder Launcher-exclusive derivatives **X Accuracy 2**, **X Accuracy 3** and **X Accuracy 6** raise the user's accuracy by one, two, three or six stages respectively when used in battle. Prior to the third generation, X Accuracy made the user's moves pass every accuracy check (effectively becoming Swift-accurate) but did not modify stat stages.

#### Lower target's stat stage

- The moves **Flash** (100% accurate; was 70% prior to the fourth generation), **Kinesis** (80% accurate), **Sand-Attack** (100% accurate) and **Smokescreen** (100% accurate) lower the target's accuracy by one stage as a primary effect.
- The moves **Leaf Tornado** (50%), **Mirror Shot** (30%), **Mud Bomb** (30%), **Muddy Water** (30%), **Mud-Slap** (100%), **Night Daze** (40%) and **Octazooka** (50%) have the indicated chances of lowering the target's accuracy by one stage as a secondary effect.
- The move **Secret Power**, when used on rocky ground or sand or in fifth-generation link battles, has a 30% chance of lowering the target's accuracy by one stage as a secondary effect.

### Evasion

#### Raise user's stat stage

- The move **Double Team** raises the user's evasion by one stage as a primary effect.
- The move **Minimize** raises the user's evasion by two stages as a primary effect (was one stage prior to the fifth generation), but also causes the certain moves to deal double damage against it: Stomp as of the second-generation games, Steamroller as of the fifth generation, and Dragon Rush as of the sixth generation.
- The Z-moves **Z-Camouflage**, **Z-Detect**, **Z-Flash**, **Z-Kinesis**, **Z-Lucky Chant**, **Z-Magnet Rise**, **Z-Sand Attack** and **Z-Smokescreen** raise the user's evasion by one stage as a Z-Power effect (before applying the base move's regular effect).

#### Lower target's stat stage

- The move **Sweet Scent** (100% accurate) lowers all opponents' evasion by one stage as a primary effect.
- The move **Defog** (never misses) lowers the target's evasion by one stage as a primary effect, in addition to clearing Reflect, Light Screen, Mist, Safeguard, Spikes, Stealth Rock and Toxic Spikes from the target's side.
- The Max Move **G-Max Tartness** lowers all opponents' evasion by one stage as a secondary effect.
- The ability **Supersweet Syrup** lowers all adjacent opponents' evasion by one stage when the bearer enters battle.

## But What About Other Stat Modifiers?

There are other effects that modify stats, yes - but they are not stat stages. The ability Huge Power, for instance, doubles the Pokémon's Attack - but its Attack stat stage still starts out at zero, its maximum Attack stat stage is still 6, and all the effects described above that apply to stat stages in general will not count the Huge Power boost (so, for example, Haze will not remove that boost, nor will Psych Up copy it, nor will it increase the power of Stored Power). It is important to realize this and properly distinguish between stat stages and other modifiers to get a proper grasp on how the different kinds of stat modifiers interact.

My [Battle Mechanics](https://www.dragonflycave.com/mechanics/battle/) section comprehensively covers these other modifiers to stats in general, among other things, while my [R/B/Y Stat Modification](https://www.dragonflycave.com/mechanics/gen-i-stat-modification/) section covers the bizarre way stat stages interact with other modifiers in the first-generation games.

Page last modified January 14 2026 at 20:13 UTC

## You May Also Enjoy

[**R/B/Y Stat Modification**\\
An explanation of the very buggy mechanics of stat modification in the first-generation games, with a calculator to drive the point home.](https://www.dragonflycave.com/mechanics/gen-i-stat-modification/)

[**Stat Mechanics**\\
The nitty-gritty details of everything you never wanted to know about your Pokémon's Special Attack or HP.](https://www.dragonflycave.com/mechanics/stats/)

[**Status Ailments**\\
Everything you ever wanted to know about status ailments in mainline Pokémon, how they function, and how to inflict them.](https://www.dragonflycave.com/mechanics/status-ailments/)

[**Battle Mechanics**\\
An explanation of the inner workings of the mainline Pokémon battle system, including turn order, accuracy, critical hits, the damage formula, and secondary effects of moves.](https://www.dragonflycave.com/mechanics/battle/)

## Post comment

Inflammatory or off-topic comments will be deleted; please go to the [guestbook](https://www.dragonflycave.com/guestbook/) for discussion unrelated to this page. You can use [BBCode](https://www.dragonflycave.com/mechanics/stat-stages/#bbcode "Click for a list of formatting options.") (forum code) to format your messages.

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

![834](https://www.dragonflycave.com/sprites/gen8/home-thumb/834.png)Please type the name of the above Pokémon into this box ( [don't know it?](https://www.dragonflycave.com/mechanics/stat-stages/#))\*:The above sprite has a 1/8192 chance of being shiny. (Modern browsers will give it a yellow glow if so.)

Submit messageReset

## Comments

My own messages will be signed as Butterfree, with the Admin label below my name. If someone signs as Butterfree without that label, it's probably not me.

Pages:



**1**

> ![](https://www.dragonflycave.com/sprites/gen8/icons-unified-small/826.png)
>
> Asleep sweep<3
>
> 🔥🔥
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10656/#responding-to)\[03/09/2025 06:40:09\]

Pages:



**1**