# R/B/Y Stat Modification

It should not come as news to anyone that Red, Blue and Yellow had a lot of bugs and dodgy programming. One of the most spectacularly buggy aspects of them, however, is that they have a number of extremely strange quirks regarding how stats are modified in battle. As the quirks are poorly or incompletely documented elsewhere and difficult to understand fully without a complete picture of why they work as they do, I've put together an explanation of these oddities.

## The Stat Modifiers (and How They Were Supposed to Work)

In the Pokémon games, the stats you see on your Pokémon's stat screen are not the be-all end-all of stats. While you're in battle, all sorts of effects can modify the stat values temporarily for the duration of the battle.

The Game Boy era was a simpler time; in the first-generation games, only three things could modify the value of stats in battle: **stat stages**, **badge boosts**, and **status**. (Critical hits ignored all stat modifiers, instead going off the user's out-of-battle Attack/Special stat and the target's out-of-battle Defense/Special stat, so note that _all_ of these effects, including all the buggy aspects discussed below, are completely negated for critical hits.)

### Badge Boosts

In the first three generations, the first, third, fifth and seventh badge (according to how the badges are ordered in the player menu) would give the player's Pokémon a boost to a certain stat. In Red, Blue and Yellow, Brock's Boulderbadge boosts Attack, Lt. Surge's Thunderbadge boosts Defense, Koga's Soulbadge boosts Speed, and Blaine's Volcanobadge boosts Special. (Note that the game will tell you the Thunderbadge boosts Speed and the Soulbadge boosts Defense, but it is in fact the other way around. The intended order of the gyms may have been changed at some stage in development.) The badge boost is 12.5% - meaning the stats corresponding to those badges you do have will actually be 12.5% higher in battle than the stats you see on your Pokémon's summary screen.

### Status Modifiers

This refers to how when a Pokémon is paralyzed, its Speed is dropped to 1/4 of its previous value, and when a Pokémon is burned, its Attack is dropped to half of its previous value. Both of these effects should in theory persist for as long as the Pokémon is afflicted with the relevant status, and vanish when it is cured of it.

### Stat Stages

Stat stages are what is changing when you see a message like "\[Pokémon\]'s ATTACK greatly rose!" or "\[Pokémon\]'s DEFENSE fell!" For general information on stat stages, see my [Stat Stages](https://www.dragonflycave.com/mechanics/stat-stages/) section. R/B/Y stat stages _in principle_ are supposed to work as described there. For the rest of this page, I will assume you know how stat stages generally work.

## How Things Actually Work

### When a Pokémon is Sent Out

When the player sends a new Pokémon out into battle, its stats are set to its out-of-battle stats; then, if it is paralyzed its Speed will be quartered; then, if it is burned its Attack will be halved; and then those of its stats that the player has the corresponding badges for will be boosted by 12.5%. This is as expected. Similarly, when an opposing trainer sends a new Pokémon out into battle (or a wild one appears), its stats are set to its out-of-battle stats; if it is paralyzed its Speed will be quartered; and if it is burned its Attack will be halved. (Wild Pokémon and NPCs don't have badges, and badge boosts are not applied at all in link battles.)

### When a Pokémon Is Burned or Paralyzed

When a Pokémon becomes burned, its Attack will be halved; when a Pokémon becomes paralyzed, its Speed will be quartered. This is also as expected.

### When a Stat Stage Is Modified

Here's where things get really weird.

When any move that modifies stat stages is successfully executed (trying to raise a stat that's already 999 or at +6, or trying to lower a stat that's already 1 or at -6, does not count as successful execution), the following happens:

1. The stat stage itself is raised or lowered according to the move's effect.
2. The stat is recalculated as the original out-of-battle stat multiplied by the ratio corresponding to the new stat stage. If we're _raising_ the stat, it's capped at 999; if we're _lowering_ the stat, it's bumped up to 1 if it ends up at zero. So far, so good.
3. If the stat being modified is the player's Pokémon's, the badge boost is applied to _all of its stats that you have the corresponding badge for_, capped at 999. This is _not_ as expected. It means your _other_ stats get re-boosted if you have the right badge.
4. If the Pokémon whose turn it is not is paralyzed, its Speed is quartered. This means if one of your _other_ stats is lowered, your Speed will get quartered _again_ if you're paralyzed. This is obviously not the intended effect. Worse still, because this applies to _the Pokémon whose turn it is not_, this will happen to _the opponent_ when you raise one of your own stats, and vice versa.
5. If the Pokémon whose turn it is not is burned, its Attack is halved. As above.

I suspect that originally, rather than recalculating _just the changed stat_ in step two, the game would recalculate _every_ stat for that Pokémon from its out-of-battle value and stat stage. Then it would have made sense to reapply badge boosts to all of the stats, and to always reapply the status modifiers rather than only when the relevant stat was the one being modified. At some later stage, possibly for performance reasons, Game Freak must have decided to recalculate just the one stat, but completely forgot about changing steps 3-5 appropriately.

That doesn't explain how the status modifiers may be reapplied to the wrong Pokémon, however. The routines executed to reapply these modifiers are the same as the ones run when a Pokémon becomes burned or paralyzed; as these status conditions can only happen as an effect of a move used by the other Pokémon, "the Pokémon whose turn it is not" will accurately pick the right Pokémon when first applying the modifiers, but of course, when these same routines were reused for reapplying the status modifiers after stat stage changes, this assumption doesn't necessarily hold. Even more silly, the routines used to apply status modifiers when Pokémon are sent into battle (as described above) allow doing it to either Pokémon regardless of whose turn it is (more specifically, they just set the "whose turn is it" variable appropriately before running the other routine). I suspect those must have been added later, or the stat stage modification code would probably take advantage of them.

That or Game Freak had just had a lot to drink the night they hacked stat stages together. Let's face it; that looks like a likely hypothesis either way.

#### Wait, I'm confused. So what does this mean for modifying stat stages in R/B/Y exactly?

It means that:

- Whenever any of your Pokémon's stat stages are raised _or_ lowered, all of your Pokémon's _other_ badge-boosted stats will be re-boosted.

  - For instance, if you have the Boulderbadge, then _every time a Pokémon uses something like Tail Whip or String Shot on one of your Pokémon, your Attack will be raised by 12.5%_.
  - Even better, if you have the Boulderbadge and use, say, Defense Curl or Agility, then as your Defense or Speed rises, your Attack will also rise for free.
  - And of course, this will be applied for all your stat-boosting badges in sequence - so if you have all of them, then every time one of your stat stages changes _all your other stats_ will get that extra badge boost.
  - This will in theory just go on stacking until the stat reaches the maximum value of 999 - however, note that when a stat is recalculated from its out-of-battle value, such as whenever its own stat stage is modified, it will lose all the extra boosts.
- _Any time_any of a paralyzed Pokémon's stat stages are lowered by its opponent, its Speed will be quartered. Lowering a burned Pokémon's stat stages will also halve its Attack each time, in an analogous fashion.

  - Thus, if you paralyze your opponent (bringing its Speed to 25% of its original value) and then use something like Tail Whip or Growl on it, its Speed will drop again, to 6.25% of its original value. It will continue to drop (though not to less than 1) every time you lower a non-Speed stat stage.
  - Note, however, that if the Speed stat stage itself is lowered on a paralyzed Pokémon, the Speed stat will be recalculated from its out-of-battle value first, so any extra drops are lost. Likewise with the Attack stat stage and burns.
- _However_, when a Pokémon raises one of _its own_ stat stages, status modifiers will be reapplied to the _other_ Pokémon.

  - This means if your Pokémon is paralyzed and the _opponent_ uses a move that raises any of its own stat stages, _your_ Pokémon's Speed will get quartered again, and vice versa (and the same for burns and halving Attack).
  - Moreover, when you are burned or paralyzed and raise the stat dropped by the status, _the status modifier won't get reapplied to you_ \- if you use Agility while paralyzed, for instance, your Speed will be recalculated as your out-of-battle Speed times the new stat stage modifier times the badge boost if any, with no quartering. The paralysis drop won't be reapplied until your _opponent_ uses a move that modifies stat stages.

### When a Pokémon's Rage Builds

So now you may be thinking, _"Oh, hey! So when a Pokémon is using Rage and gets hit by a move, that raises its Attack stat stage on its opponent's turn, so presumably that actually acts like lowering stat stages, in the sense that it will reapply your status modifiers instead of your opponent's, right?"_ And you would be right, if not for a delightful implementation detail: when you hit a Pokémon that's using Rage with a damaging attack, _the game will temporarily pretend it's that Pokémon's turn and that it just used a move that raises its own Attack_. So building Rage actually acts exactly like moves that raise the user's stat stages: if your own Pokémon's rage builds, your opponent's status modifiers get reapplied, and vice versa.

### When a Status Condition is Cured

Right. This is a somewhat confusing one.

When a Pokémon is cured of a status condition, one of two things can happen. The first possibility is that it will simply cure the status and leave stats out of it. If a burn or paralysis is cured this way, the stat drop will stick around until the relevant stat is recalculated, although of course since the Pokémon is no longer afflicted with the status, the drop will not be reapplied again if the opponent uses a move that modifies stat stages.

The other possibility is that the game will cure the status and also _reset all of the Pokémon's stats to their out-of-battle values_, sans all modifiers (even your original badge boosts that you received at the beginning of the battle). Note that the actual stat stages aren't changed, although their effects will vanish until the stat is recalculated. For instance, if your Attack stat stage is at +2 and then you cure a status this way, your Attack will be reset to its normal value, but the stat stage will still be at +2, and if you were to subsequently use a Swords Dance, the stat stage would rise to +4 and your Attack would be recalculated in accordance with that.

This second scenario, where the stats are reset, is what happens when...

- ...you, the player, heal any status of your active Pokémon with one of the consumable specialized status-healing items: that is, an Antidote, Parlyz Heal, Awakening, Burn Heal, Ice Heal or Full Heal.
- ...you, the player, use a Full Restore on a Pokémon that has a status condition but is at full HP. This is because if the Pokémon you use a Full Restore on has full HP, the game will pretend it's a Full Heal and run that code, but otherwise it runs a different chunk of code that does not reset stats.
- ...Haze is used by the _opposing_ Pokémon. Note that Haze also resets the stat stages themselves, unlike the status healing items. More on Haze below.

Meanwhile, the first scenario, where the stats are unaffected, is what happens for every other way that status conditions can be cured in battle. This includes...

- ...the AI curing a status with an item. This is because the AI isn't _really_ using an item at all. It doesn't run the same code that's run when you use an item; rather, it's a completely separate routine that plays the same sound effect and displays the same message but has its own implementation of the actual healing that just clears the status and doesn't affect stats.
- ...you, the player, using a Full Restore on a Pokémon that is _not_ at full HP.
- ...the Poké Flute being used to wake all active Pokémon.
- ...a Pokémon afflicted with a status using Rest (note that this replaces the status with sleep rather than clearing it).

### When Haze Is Used (by Either Pokémon)

Haze resets all the stat stages of both you and your opponent to zero and also resets all the actual stats of both Pokémon to their unmodified out-of-battle stats, without badge boosts or status modifiers. It will also cure any status ailments on the _opposing_ Pokémon, but not the user, as discussed above. Thus, if your Pokémon uses it while paralyzed or burned, the affected stat will be reset but the actual status condition will remain, and the status drop will be reapplied if your opponent uses a stat stage-altering move, as usual.

### When a Pokémon Levels Up

Finally something else that behaves sensibly: when a Pokémon levels up, all of its stats will be recalculated from its new out-of-battle stats, and stat stages, badge boosts and status modifiers will all be applied correctly afterwards.

## Also, One More Thing

Remember how the stat is capped at 999 when you're _raising_ a stat stage and bumped up to at least 1 when you're _lowering_ a stat stage? This makes perfect sense... except that it means if you end up with a stat surpassing 999 after _lowering_ a stat stage, then it doesn't get capped. Whoops!

How can this happen? Well, the game is smart enough to exit early when you attempt to raise a stat stage for a stat that's already 999, without raising the stat stage itself. So if a Pokémon reaches 999 Attack at a stat stage of +4 and then tries to raise it again, it's not going to do anything. However, there are two problems here:

- While the game is smart enough not to keep raising a stat that's already at 999, that doesn't account for moves that raise a stat by two stages: if the Pokémon would surpass 999 at +4, but is currently at +3, then it can use a move to raise it directly to +5. Subsequently, if it's lowered by one stage again, down to +4, it ends up with a stat greater than 999 that doesn't get capped.
- Moreover, the way the game exits early if you're already at 999 (as opposed to when the stat stage is already +6) is buggy. What actually happens is that first it raises the value of the stat stage (capping it at +6), then it fetches the current stat and checks if it's 999, then if it is it _lowers_ the stat stage value by one before displaying the "Nothing happened!" message and exiting. Like the above, this fails to account for moves that raise stats by two stages: if the stat is at +4, it'll be raised to +6, then because the stat is currently 999 the stat stage will be lowered back to +5. Again, this means that lowering the stat stage back down to +4 after this will lead to it being recalculated with no cap.

So, in both cases, we can end up with a stat greater than 999. This sounds sweet, but of course, there is a reason for the cap on stats. During damage calculation, the game tries to make the offensive and defensive stats fit into one byte, since that simplifies the calculation considerably. One byte can store values up to 255; if either of the stats is greater than that, the game will divide both by four and then work with those values. Normally, since the stats are capped at 999, dividing them by four will always make them fit into one byte, but if the cap is bypassed and the stat becomes 1024 or more, the game will grab only the low byte of the result, i.e. the remainder if you divided it by 256, for the calculation. Thus, suppose your Pokémon's Attack were 1026; dividing it by four gives 256 (the game always rounds down), the low byte of which is 0. Not so sweet anymore! The offensive stat will actually be bumped up to 1 if this happens; the defensive stat will not, and in fact this means that if you have a Defense of 1024-1027, the game will try to divide by zero and freeze when it tries to calculate the damage.

(The Speed stat, on the other hand, will be fine even if it exceeds 1024 with this trick, since it doesn't get truncated to a single byte anywhere.)

Moreover, if you _do_ have a stat greater than 999, then the check that ensures you can't raise your stat further if it's already at 999 will fail - it checks if it's _equal_ to 999, not _greater than or equal_. So once at +4 with an Attack of 1026, the Pokémon could use one more Swords Dance to boost its Attack stat stage to +6. This will apply the cap, of course, since it's raising the stat stage - but if it's subsequently lowered back to +5, the Pokémon will end up with an Attack of 1197. This isn't very useful, of course, thanks to the wrapping around, but it's an interesting curiosity nonetheless.

Note that for the player's Pokémon in-game, if a stat is badge-boosted, then it will always be capped at 999 after applying the badge boost, so even if you bypass the cap on the stat stage step, it will just get capped a bit later in the process. Thus, this effect will only be visible on opposing Pokémon, when you don't have all the badges, or in link battles.

## What About Stadium?

Stadium actually fixed all of the weird behaviour described above! Score.

## R/B/Y Battle Stat Calculator

I'm sure this is all a lot to take in, so here's a calculator where you can play around with what will actually happen to your stats in any situation you can imagine.

Press the various buttons to make in-battle events happen, choose your badges and press "Set badges", or even modify the out-of-battle stats and click "Switch Pokémon" or "Level up". Note that you must press "Set badges" to have your new badge selections taken into account, and you must press either "Set badges", "Switch Pokémon" or "Level up" to have new out-of-battle stats taken into account.

**Badges:** Boulder Thunder Soul VolcanoSet badges (reset battle)

| Player's Pokémon | Opposing Pokémon |
| --- | --- |
| Status | - | ParalyzeBurn | Status | - | ParalyzeBurn |
| Attack |  | 112 | 0 | ↑↑↑↓↓↓ | Attack |  | 100 | 0 | ↑↑↑↓↓↓ |
| Defense |  | 112 | 0 | ↑↑↑↓↓↓ | Defense |  | 100 | 0 | ↑↑↑↓↓↓ |
| Speed |  | 112 | 0 | ↑↑↑↓↓↓ | Speed |  | 100 | 0 | ↑↑↑↓↓↓ |
| Special |  | 112 | 0 | ↑↑↑↓↓↓ | Special |  | 100 | 0 | ↑↑↑↓↓↓ |
| Accuracy |  | 0 | ↑↑↑↓↓↓ | Accuracy |  | 0 | ↑↑↑↓↓↓ |
| Evasion |  | 0 | ↑↑↑↓↓↓ | Evasion |  | 0 | ↑↑↑↓↓↓ |
| Full HealUse Rest/Wake upUse Haze | Full HealUse Rest/Wake upUse Haze |
| Switch PokémonLevel up (recalculate stats) | Switch Pokémon |

Page last modified November 20 2025 at 17:02 UTC

## You May Also Enjoy

[**Stat Stages**\\
All about what's really going on behind the scenes when your game tells you your Pokémon's Attack fell.](https://www.dragonflycave.com/mechanics/stat-stages/)

[**Gen I Capture Mechanics**\\
An analysis of the capture algorithm in R/B/Y and how the game determines how often the ball will wobble.](https://www.dragonflycave.com/mechanics/gen-i-capturing/)

[**Gen I Capture RNG Mechanics**\\
A full explanation of the random number generator in the first-generation games and how it affects capturing.](https://www.dragonflycave.com/mechanics/gen-i-rng/)

[**When Rumours Come True: The Mew Trick**\\
A deep-dive essay exploring the history and inner workings of the Mew trick - possibly the most beautiful video game glitch ever found.](https://www.dragonflycave.com/essays/the-mew-trick/)

## Post comment

Inflammatory or off-topic comments will be deleted; please go to the [guestbook](https://www.dragonflycave.com/guestbook/) for discussion unrelated to this page. You can use [BBCode](https://www.dragonflycave.com/mechanics/gen-i-stat-modification/#bbcode "Click for a list of formatting options.") (forum code) to format your messages.

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

![291](https://www.dragonflycave.com/sprites/gen8/home-thumb/291.png)Please type the name of the above Pokémon into this box ( [don't know it?](https://www.dragonflycave.com/mechanics/gen-i-stat-modification/#))\*:The above sprite has a 1/8192 chance of being shiny. (Modern browsers will give it a yellow glow if so.)

Submit messageReset

## Comments

No comments on this page as of yet.