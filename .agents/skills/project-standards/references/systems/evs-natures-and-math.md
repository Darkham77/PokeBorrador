# Effort Values and Natures: A Mathematical Approach

The Advanced generation added a new dimension of strategy to Pokémon battling by forcing the player to pick and choose which stats to raise and which to lower. No longer do all fully trained perfect-IV Pokémon of the same species invariably have the exact same stats, making for more interesting battling than ever.

I am of course here referring to effort values and natures. At first sight, they appear to be similar things in practice, but here I will discuss a very important difference between them. I will also discuss the fundamental difference between the two types of stats.

Note that I am by no means an expert at competitive battling. This article is not about competitive strategy. It is simply a purely mathematical approach to these concepts.

Note: You do not need to know any advanced mathematics to understand this article. All that is necessary is that you understand the fundamental difference between adding/subtracting on one hand and multiplying/dividing on the other hand, and that you know some basic algebra for the formulas.

In this article, I will speak of "Attack" and "Defense", but of course they will always be interchangeable with Special Attack and Special Defense, respectively. Just assume "Attack" to mean "the offensive stats" and "Defense" to mean "the defensive stats".

## Natures

Let's recount on how natures work. A nature has a stat it **lowers** and a stat it **raises**. (There are, of course, also neutral natures, but we will not be discussing them here as they are, for obvious reasons, not of any mathematical significance when it comes to stats.) To be more precise, a nature will multiply the value of one stat by 1.1, and the value of another stat by 0.9. This basically adds or subtracts 10% to or from the stat.

Now, what does this mean? It means that, because the value which is added or subtracted changes depending on the original value of the stat, a nature will have a more drastic effect on the actual number if the stat is already high. For example, if you have a Deoxys in normal form, which has 50 base Defense and 150 base Attack, its maximum Defense and Attack at level 100 with maximized effort points and neutral natures will be 199 and 399, respectively. If it had a nature that raises Defense, it would have 218 Defense (since the Pokémon games always round down). However, if it had a nature that raises Attack, it would have a whopping 438 Attack. In the first case, the Defense rises by 19, but in the latter case, the Attack rises by 39 - quite a significant difference when you just look at it.

However, although the difference looks more significant with an Attack-boosting nature, it really isn't. This is because in the damage formula, Attack and Defense are applied as a multiplication and a division - it _multiplies_ by the attacker's Attack stat and then _divides_ by the defender's Defense stat. If you have one Deoxys with a nature that raises Attack attack another Deoxys with a nature that raises Defense, it will do essentially the same amount of damage as it would if both of them had neutral natures - the beneficial natures cancel each other out. The reason for this is simple. Look at the following:

(A \\* 1.1) / (D \\* 1.1)

A stands for Attack and D for Defense, obviously, but that does not especially matter; what matters is the fact that we can multiply or divide both the numerator and the denominator by the same number if we want without changing the final result, as you should learn in basic algebra. Thus we only need to divide by 1.1 again to see that (A \\* 1.1) / (D \\* 1.1) = A / D. Admittedly, the rounding (because again, the Pokémon games always round down) will change it a little bit, but the difference is too small to matter. The point here is that there is no mathematical reason to give your Pokémon a nature that boosts its higher Attack/Defense stats rather than the lower ones, even though the point difference is greater.

But we've only been discussing Attack and Defense (along with their special counterparts) so far. The thing is that while they are applied through multiplication and division during battle, Speed and HP are not - Speed comes into play through direct comparison with the other Pokémon's Speed, and HP gets subtracted from throughout the course of the battle. Natures never affect HP, so that's out of the discussion for now, but indeed, Speed is the one stat where you actually _do_ benefit more from having a +Speed nature if the Pokémon already has high Speed than if it has low Speed - a Pokémon with 100 base Speed and a +Speed nature will outspeed neutral-natured Pokémon with base 114 or less Speed (14 base points higher than itself), but a Pokémon with 50 base Speed and a +Speed nature will only outspeed neutral-natured Pokémon with 59 or less base Speed (9 base points higher than itself). A high-Speed Pokémon gets more out of a +Speed nature than a low-Speed one.

## Effort Values

Let's recount on how those work too, shall we? One Pokémon can have at most 510 effort points in total, and at most 252 in any given stat. For every four effort points in a particular stat, the final stat that your Pokémon will end up with at level 100 is raised by one.

What does this mean? It means that once you have 252 effort points in one stat, that stat will be 63 points (252 / 4) higher than it would have been if you had had no effort points, regardless of what the original value of the stat was. The thing is that unlike natures, effort points factor in through addition, not through multiplication - which makes them an _entirely_ different thing to work with mathematically.

Imagine those two normal form Deoxys again. Both of them have maximum IVs, so their maximum Attack and Defense at level 100 are 399 and 199, respectively, and the minimums (with no effort points put into them) are 336 and 136.

Now let's imagine that one of the trainers of those Deoxys effort trains it in Attack, while the other effort trains his in Defense. For the sake of the example, we'll assume that the other effort points went into irrelevant stats or don't exist at all. At first glance one _could_ think that this will even out and not matter in the end just like with the natures earlier, but look what happens if we calculate the A / D factor of each Deoxys attacking the other...

Defense effort trained Deoxys attacks Attack effort trained Deoxys: 336 / 136 = 2.47

Attack effort trained Deoxys attacks Defense effort trained Deoxys: 399 / 199 = 2.0

The result is clear: the Defense effort trained Deoxys' attack used against the Attack effort trained one does nearly 25% more damage than the Attack effort trained Deoxys' attack against the Defense effort trained one. But why? The reason is simple. The effort points are factored in through addition rather than multiplication, and this means that the 63 stat points are a much greater proportion of 199 than they are of 399 - the Defense effort trained Deoxys had its defensive abilities boosted by 46%, but the Attack effort trained one only had its offensive capabilities boosted by 19%. While the Attack effort trained Deoxys could get a greater boost to its attacking power simply by holding a Plate of the right type than it gets out of all those effort points, the Defense effort trained one nearly gets a free Harden every time it comes into battle - and this is simply because Deoxys started out with low Defense but high Attack. In other words, effort training a Pokémon in an offensive/defensive stat gives you a greater advantage the _lower_ the stat originally was. This obviously works for Pokémon with high Defense stats and low Attack stats too: effort training your Pokémon for the low attacking stats will yield a far greater increase in the damage you deal than effort training it in the already-high defensive stats will decrease the damage dealt to you.

Speed and HP, again, however, are an entirely different matter thanks to factoring in through comparison and subtraction rather than multiplication and division. Speed and HP will benefit exactly as much from effort training if they're already low as if they're already high. To twist things even more, you have to consider that since Speed is a comparison, a _greater_ advantage doesn't help you. If your Speed is higher than the opponent's, you go first, no matter whether it's one or a hundred points higher. This means that you only really need to decide which Pokémon you want to be able to outrun and give your own Speed just enough effort to surpass the Speed that those Pokémon will generally have. Any extra Speed points beyond that are wasted.

Nonetheless, the Attack/Defense thing sounds pretty revolutionizing, doesn't it? Don't people always tell you to effort train your Alakazam in Special Attack and would laugh at you if you started giving it defenses instead? This may make you want to try this sort of EV spread. But...

## Why This Does Not Work in Practice

Why indeed would they tell you to give your Alakazam Special Attack effort points? Because of three fundamental problems, which lie not in the math, but in the other mechanics of Pokémon.

#### The Problem of Overkill

It happens that Pokémon battles are pretty fast. You execute an attack and often deal one heck of a lot of damage, even knocking out the other Pokémon in one hit (called an OHKO in competitive battling lingo) or two (2HKO). Your attacks can also be _overkill_: they might technically deal, say, 500 damage, but the opponent only has 300 HP at the time. A player is not in any way rewarded for overkill; for all the game cares, you may as well only have dealt exactly 300 damage. This means that there are many Pokémon which can knock out our Defense effort trained normal form Deoxys just as easily with the Defense as without it - many Pokémon are designed to hit fast and hard but have little hope of lasting out for any length of time, and boosting their defenses often won't actually change how many hits common threats will need to defeat them.

If all Pokémon had, say, twenty times the HP they actually do, this kind of EV spread would be a great deal more plausible, because the difference that the defensive boost would make in that case could be a matter of being able to take multiple extra hits. In the real Pokémon games, the problem of overkill will render much of the possible advantages of this kind of EV spread void, at least for sweepers.

#### The Problem of Speed

Pokémon such as Alakazam are sweepers with an extremely high attacking stat but very poor defenses, which would seem to make them ideal candidates for this kind of EV spread in practice - but these are precisely the Pokémon for which it is most important to be fast, so just boosting their defenses and neglecting both the offensive stat _and_ Speed is likely to be a terrible idea. Meanwhile, if you do invest a bunch of your effort points into Speed and want to beef your defenses with the rest, then you only have a much lower number left over to do so, and the defensive advantage you could get out of it wouldn't actually outweigh the offensive advantage you'd get out of investing those points in Attack or Special Attack.

Interestingly enough, if all Pokémon had twenty times their normal HP, the problem of Speed would also largely be eliminated, as this would almost trivialize Speed. (Instead of the opponent being able to dish out one hit while you get in none if you're slower, a faster opponent will merely get, say, twenty hits in and you nineteen.)

#### The Problem of Strategy

Pokémon battles are mostly about strategy, and a player's strategy generally relies on making each of their Pokémon do its particular job well enough. Sweepers are there to sweep, to deal a lot of damage in one stroke, not to survive multiple hits. When you bring out a sweeper like Alakazam, you usually just want it to hit fast and hard. Sacrificing attack power may give the opponent a chance to strike that it otherwise wouldn't have had, and if it's powerful enough, your increased defenses won't even matter (see the problem of overkill).

However, despite these fundamental flaws to the practical use of EV training in the lower offensive/defensive stats, the mathematical approach to EVs and natures is worth keeping in mind, or at the very least a fun thing to think about if you have a geeky mind like me.

---

## Related Systems & Reference Manuals

- [**Stat Mechanics**](./stats.md): The nitty-gritty details of everything about Pokémon stats, base values, and formulas.
- [**EV Mechanics Manual**](./ev_mechanics_manual.md): Technical manual for EV items, battle distribution, Showdown integration, and stat recalculation.
- [**Stat Stages**](../core/stat-stages.md): Complete guide to combat stat stage multipliers and in-battle buffs/debuffs.
- [**Battling Basics**](../battle/battling-basics.md): Fundamental rules of the Pokémon battle engine.
- [**Battle Mechanics**](../battle/battle.md): Detailed mechanics of turn order, accuracy, damage formula, and secondary effects.