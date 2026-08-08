# Gen II Capture Mechanics

Thanks to Ultimate Pokémon Center for the original analysis and getting me curious about things, [iimarckus](http://iimarck.us/) for indulging my curiosity for clarifications, [magical](http://turnipmints.mooo.com/~andrew/pokemon/) for being interested, giving second opinions and determining how the game behaves when it divides by zero, and [pret](https://github.com/pret/pokecrystal) for the pokecrystal disassembly.

Although the original G/S/C don't see much play nowadays, the capture mechanics of the second generation are still of some interest - not only to geeks like me, but also simply as a historical stepping stone between the [R/B/Y algorithm](https://www.dragonflycave.com/mechanics/gen-i-capturing/) and the more refined formulas [of](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/) [the](https://www.dragonflycave.com/mechanics/gen-v-capturing/) [later](https://www.dragonflycave.com/mechanics/gen-vi-vii-capturing/) [games](https://www.dragonflycave.com/mechanics/gen-viii-capturing/).

If you don't care about the math, I also have a [G/S/C catch rate calculator](https://www.dragonflycave.com/calculators/gen-ii-catch-rate/) that you can use to just calculate your chances of capturing a Pokémon in G/S/C.

**Please note that the Pokémon games prior to the fifth generation only work with integers. In practice, this essentially means that they round all numbers down, including at every intermediate step in a calculation. This will usually not be specifically included in the mathematical formulas on this page, but whenever you perform any action within a particular formula that results in a non-integer, you should round it down before performing the next action in the formula if you want to get a perfect result.**

## The Catch Rate Formula

G/S/C paved the way for the later games by replacing [R/B/Y's fairly intricate algorithm](https://www.dragonflycave.com/mechanics/gen-i-capturing/) with a more straightforward calculation in _most_ cases: first, the game derives a _final capture rate_ by plugging some variables into a set mathematical formula, and then the final capture rate is used to determine whether the capture will be successful.

The formula used for for the final capture rate in the second-generation games for _most_ balls bears a clear resemblance to the [third- and fourth-generation formula](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/):

X=max((3M-2H)⋅C3M,1)+S

_However_, if you're using a **Level Ball**, most of the calculation will be skipped, and the formula is instead just

X=C

The final capture rate X can range from 1 to 255 (if it's higher than 255 at the end of the calculation, it is made 255 instead). In G/S/C, the chance of a successful capture is then simply **(X + 1)/256**, meaning an X of 255 automatically yields a guaranteed capture.

The variables plugged into the formula are based on the Pokémon's _hit points_ (M and H), _catch rate_ (C) and _status condition if any_ (S), where the C value may also be modified by the kind of ball you are using. I will cover each of these in turn.

### M (Maximum HP) and H (Current HP)

As the formula is intended, these values are very straightforward: they are simply the maximum and current HP of the Pokémon you are trying to catch. When the Pokémon is at full health, the formula will roughly simplify to max(C / 3, 1) + S, and as you whittle down its HP, the value will rise linearly towards a theoretical limit of max(C, 1) + S (the Pokémon would need to be at 0 HP to reach the limit, but the lower its current HP, the closer it gets). Thus, by lowering the Pokémon's HP you can nearly triple your chances of capturing it, assuming it does not have a status condition.

But there is a slight snag here. The Game Boy was a rather limited system, and the division routines used by the first- and second-generation Pokémon games can only divide by 8-bit numbers (integers between 0 and 255 inclusive). However, the capture formula needs to divide by 3M, which can easily be considerably more than 255. In order to get around this, if 3M is greater than 255, then 3M and 2H are both _divided by four and rounded down_ before being plugged into the formula (this will give basically the same result bar rounding errors, since the division is happening both above and below the line). For all legitimate wild Pokémon encounters in the game, this is sufficient to make the formula work as intended.

However, if 3M were to be greater than 255 even after the division by four (that is, if the Pokémon's maximum HP were more than 341), some very strange things would start to happen:

- **The game would act (for the purposes of the capture formula) as if the Pokémon's maximum HP were much lower than it is.** It only plugs the low eight bits of the divided 3M into the formula, or essentially the remainder if you divided it by 256. For example, if the Pokémon had 343 maximum HP, then 3M would be 1029, which would be divided by four to get 257. This would be represented in binary form as 100000001, but only the last eight bits - 00000001, or just 1 - would be plugged into the formula where 3M should be. This is called a _truncation_.
- **If you were to try to capture a Pokémon with exactly 342 or 683 max HP, the game would freeze.** This is because for these HP values, 3M divided by four is evenly divisible by 256, which means a _zero_ would get plugged into the formula where 3M should be. Because the formula then tries to divide by 3M, and the division routine used by the game has no checks or safeguards in case of a divisor of zero, it would simply go into an infinite loop until you reset the game. Whoops.
- **The final capture rate could be ridiculously inflated if 3M were greater than 255 after the division by four but 2H weren't.** Since 3M could be truncated to some extremely low value, the result of 3M - 2H would actually be negative. However, the game treats all variables as _unsigned_, meaning there is no such thing as a negative number - a subtraction will essentially simply start to count down from 256 once it passes zero. (3 - 5, for instance, would become 254.) This is called an _underflow_. Normally, ((3M - 2H) \* C) / 3M should result in a value less than C, but if the subtraction underflowed, this limitation would be thrown out of the window.
- **Under the conditions in the above point, the final capture rate would cycle around bizarrely as the Pokémon's HP was lowered.** This is because of yet another truncation: all but the last eight bits of the outcome of ((3M - 2H) \* C) / 3M are thrown away before the maximum is applied. Normally this makes sense because this value should be lower than C, which can at most be 255, but if the subtraction were to underflow, this wouldn't necessarily be the case anymore, and the capture rate would rise at a rate of C / 3M for every two hit points of damage you dealt to the Pokémon, wrapping around to zero whenever it passed 255.

Again, all that weird, glitchy stuff can't happen on an actual game played as the creators intended it - the highest HP any legal encounter can have is 249 for the level 70 Lugia and Ho-Oh in Gold and Silver respectively. It could, however, happen with hacking, and if you play around with impossible encounters on the [catch rate calculator](https://www.dragonflycave.com/calculators/gen-ii-catch-rate/), you might run into all the various wonkiness described above (which I've faithfully reproduced in the calculator). Be prepared.

### C (Modified Capture Rate)

This number starts out as the intrinsic capture rate of the Pokémon you're trying to catch. This is a number that is set for every Pokémon species, ranges from 3 to 255, and can be found in most online Pokédexes; all first- and second-generation catch rates have been unchanged since G/S/C except Raticate's, which was 90 in G/S/C but was changed to 127 in Ruby and Sapphire. A higher catch rate means a better chance of capturing the Pokémon.

In the second-generation games, the Pokéball used will directly modify this value before it is plugged into the formula above. If we call the original capture rate of the Pokémon R, the C value will be set as follows, depending on the ball used:

Poké Ball, Friend BallC = RGreat Ball, Park BallC = R \* 1.5Ultra BallC = R \* 2Master BallThe formula isn't used; the capture automatically succeedsFast BallC = R \* 4 if the Pokémon is Grimer, Tangela or Magnemite (they are only the first three of many Pokémon that may flee from battle in the games, but they're the only ones affected by the Fast Ball); C = R otherwiseHeavy BallC = R + 40 if the Pokémon weighs at least 409.6 kilograms (903.0 lbs); otherwise, R + 30 if the Pokémon weighs at least 307.2 kilograms (677.3 lbs); otherwise, C = R + 20 if the Pokémon weighs at least 204.8 kilograms (451.5 lbs); otherwise, C = R if the Pokémon weighs at least 102.4 kilograms (225.8 lbs); otherwise, C = R - 20Level BallC = R \* 8 if your Pokémon's level divided by four and rounded down is greater than the Pokémon's level; otherwise C = R \* 4 if your Pokémon's level divided by two and rounded down is greater than the Pokémon's level; otherwise C = R \* 2 if your Pokémon's level is greater than the Pokémon's; otherwise C = RLove BallC = R \* 8 if the Pokémon is of the same species as your Pokémon and they are either both male or both female (that is not a typo: the Love Ball in G/S/C gives a bonus only if the Pokémon are of the _same_ gender); C = R otherwiseLure BallC = R \* 3 when fishing; C = R otherwiseMoon BallC = R \* 4 if the Pokémon's second evolution method is 10; C = R otherwise (this was _meant_ to check if the Pokémon can evolve with a Moon Stone, but it's buggy in two ways, both by getting the second evolution method instead of the first evolution item, and by using the wrong constant 10, which represented a Moon Stone in R/B/Y but is a Burn Heal in G/S/C and does not represent any Pokémon's evolution method; all in all, the Moon Ball is just a glorified Poké Ball)

If C is greater than 255 after the appropriate ball modifier has been applied, it will be made 255 instead, and if C is less than zero, it will be bumped up to 1. This means that if the Pokémon you are trying to catch already has an intrinsic catch rate of 255 (this includes common early-game Pokémon such as Caterpie or Pidgey), then _a positive modifier to the C value won't actually help you any_; in fact, it is impossible for regular ball bonuses, however great, to make a Pokémon easier to catch than a Caterpie or Pidgey would be in a regular Poké Ball in G/S/C.

Note again, though, how the **Level Ball** in particular doesn't actually use the regular formula. None of the HP calculation is even done for a Level Ball - the final catch rate X just equals C, i.e. the catch rate modified by the Level Ball's multiplier, capped at 255. Interestingly, since for a full-health Pokémon the catch rate will be divided by 3, this means that for a full-health Pokémon the Level Ball effectively has a 3x multiplier compared to a Poké Ball, _even if your Pokémon is a lower level than the opponent_, and even more if it isn't! It also means it's an exception to the above: that full-health Pidgey really _will_ be three times easier to catch with a Level Ball, even though its catch rate is 255, because that's not a multiplier to the C value at all, but rather comes from skipping the rest of the formula.

This is also _the only way that a non-Master Ball capture without status can be guaranteed in G/S/C_, barring the impossible-in-game case where the subtraction in the formula underflows as discussed above - usually, the HP part of the formula ensures that the final catch rate X will always be _less_ than 255 before the status is added, but for a Level Ball, it can easily be _exactly_ 255, resulting in a 100% chance of capture.

The Heavy Ball is unusual in that it _adds_ to (or subtracts from) the capture rate rather than multiplying it. This means that in theory it vastly outperforms all other balls for Pokémon with extremely low intrinsic catch rates, provided they're heavy enough to get a bonus from it, but isn't that useful for Pokémon with higher intrinsic catch rates even if they're very heavy; it can even make things _worse_ against Pokémon that are relatively light.

Additionally, in Pokémon Crystal in particular, there is a small glitch with how the game retrieves the weight of the Pokémon: **Kadabra**, **Tauros** and **Sunflora** all incorrectly get a +40 Heavy Ball bonus as it interprets the junk data that it fetches as massive weights. Other Pokémon's weight is handled correctly, and in Pokémon Gold and Silver this function does not have the bug.

In practice, given the weights and catch rates of all the Pokémon available in G/S/C, the Heavy Ball is great for catching Lugia (+20 Heavy Ball bonus but an intrinsic catch rate of 3, effectively giving a boost of 7.67x), significantly better than an Ultra Ball for Snorlax (+40 bonus to an intrinsic catch rate of 25, or 2.6x) but only a little better than an Ultra Ball for Steelix (+30 Heavy Ball bonus to an intrinsic catch rate of 25, or 2.2x), slightly worse than an Ultra Ball for Tauros in Crystal (+40 Heavy Ball bonus, intrinsic catch rate of 45, or 1.88x) and Mantine (+20 Heavy Ball bonus, intrinsic catch rate of 25, or 1.8x), worse than a Great Ball for all the other Pokémon heavy enough to get a +20 bonus (Golem, Onix, Gyarados, Lapras and Dragonite, which all have an intrinsic catch rate of 45, so the Heavy Ball is effectively 1.44x), even worse than that for the glitched Crystal Kadabra (+40 bonus, intrinsic catch rate of 100, for a 1.4x) and Sunflora (+40 bonus, intrinsic catch rate of 120, for a 1.33x), and no better than a Poké Ball or even worse for all other Pokémon.

### S (Status)

This is one area where the G/S/C capture formula takes after R/B/Y: the status factor is _added_ to the final capture rate rather than being a multiplier like in the later games. This means that, like in R/B/Y, status has a more significant effect on your chances of capturing a Pokémon with a low catch rate than one with a high catch rate.

The S value is _supposed_ to be 5 if the Pokémon is poisoned, burned or paralyzed, 10 if the Pokémon is asleep or frozen, and 0 if it has no status, but due to a bug (yes, this formula is _astoundingly_ buggy), only sleep and freezing actually affect this value; the subsequent check that's supposed to be for poisoning, burning and paralysis always fails. So in fact, the S value is 10 if the Pokémon is asleep or frozen and 0 otherwise. Making a Pokémon poisoned, burned or paralyzed does not improve your chances of catching it at all.

Thus, the Pokémon being asleep or frozen adds a flat 10/256 = **~3.91%** extra chance of catching it. Unfortunately, this is a whole lot less significant than in R/B/Y (where, with an Ultra Ball, sleep or freezing would add a flat 21.11%), to the point of only really being worth it for Pokémon with _extremely_ low catch rates.

## Wobbles

As previously noted, the final capture rate X straightforwardly represents the actual chance of catching the Pokémon: after it has been calculated, a random number between 0 and 255 is generated, and if it is less than or equal to X, the Pokémon is caught.

If the Pokémon is _not_ caught, however, the game will decide how often the ball should wobble on the screen before breaking. Unlike R/B/Y's static calculation, G/S/C introduce a random factor into the wobbling for more tension and variety. First, a Y value is determined from X according to the following table:

| X | Y |
| --- | --- |
| 0-1 | 63 |
| 2 | 75 |
| 3 | 84 |
| 4 | 90 |
| 5 | 95 |
| 6-7 | 103 |
| 8-10 | 113 |
| 11-15 | 126 |
| 16-20 | 134 |
| 21-30 | 149 |
| 31-40 | 160 |
| 41-50 | 169 |
| 51-60 | 177 |
| 61-80 | 191 |
| 81-100 | 201 |
| 101-120 | 211 |
| 121-140 | 220 |
| 141-160 | 227 |
| 161-180 | 234 |
| 181-200 | 240 |
| 201-220 | 246 |
| 221-240 | 251 |
| 241-254 | 253 |
| 255 | 255 |

The table looks pretty mysterious - where do those seemingly random Y values come from? - but in fact, Y is pretty close to being 64 times the fourth root of the highest value in each X interval, and the table was likely calculated from some similar function to that originally (the table is precalculated, though, so the game only looks up the value in the table rather than calculating anything).

Once Y has been determined, the game calculates up to three random numbers between 0 and 255 (inclusive), each representing an attempt by the Pokémon to break out. For each random number, if it is greater than or equal to Y, the Pokémon will break out and no further numbers will be generated; otherwise, if it is less than Y, that corresponds to one wobble of the ball before the Pokémon tries to break out again. (If none of these three attempts succeed, the Pokémon automatically breaks out after the last attempt anyway, since at this point we've already determined that we don't manage to catch the Pokémon.)

In other words, if you see the ball pop open without wobbling at all ("Oh no! The POKéMON broke free!"), the first random number was greater than or equal to Y; if it wobbles once and then opens ("Aww! It appeared to be caught!"), the first was less than Y but the second was greater than or equal to it; if it wobbles twice before opening ("Aargh! Almost had it!"), the first two were less than Y but the third was greater than or equal to it; and if it wobbles three times ("Shoot! It was so close, too!"), all three numbers were less than Y.

## Catch Rate Calculator

The [G/S/C catch rate calculator](https://www.dragonflycave.com/calculators/gen-ii-catch-rate/) now has its own page. Go there to easily calculate your chances of catching a Pokémon in the second-generation games.

Page last modified February 25 2026 at 00:24 UTC

## You May Also Enjoy

[**Gen II Catch Rate Calculator**\\
A calculator to find your chances of capturing a Pokémon in G/S/C.](https://www.dragonflycave.com/calculators/gen-ii-catch-rate/)

[**Gen I Capture Mechanics**\\
An analysis of the capture algorithm in R/B/Y and how the game determines how often the ball will wobble.](https://www.dragonflycave.com/mechanics/gen-i-capturing/)

[**The Legendary Whatevers**\\
A guide to how to find and catch Raikou, Entei and Suicune that refrains from taking a definitive stance on the dogs versus cats debate.](https://www.dragonflycave.com/johto/legendary-whatevers/)

[**Gen II Locations**\\
The details of the wild Pokémon found on every route in all the second-generation games.](https://www.dragonflycave.com/locations/gen2/)

## Post comment

Inflammatory or off-topic comments will be deleted; please go to the [guestbook](https://www.dragonflycave.com/guestbook/) for discussion unrelated to this page. You can use [BBCode](https://www.dragonflycave.com/mechanics/gen-ii-capturing/#bbcode "Click for a list of formatting options.") (forum code) to format your messages.

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

![407](https://www.dragonflycave.com/sprites/gen8/home-thumb/407.png)Please type the name of the above Pokémon into this box ( [don't know it?](https://www.dragonflycave.com/mechanics/gen-ii-capturing/#))\*:The above sprite has a 1/8192 chance of being shiny. (Modern browsers will give it a yellow glow if so.)

Submit messageReset

## Comments

My own messages will be signed as Butterfree, with the Admin label below my name. If someone signs as Butterfree without that label, it's probably not me.

Pages:



**1**

> ![](https://www.dragonflycave.com/sprites/gen8/icons-unified-small/604.png)
>
> Butterfree
>
> Admin
>
> Website: [The Cave of Dragonflies](https://www.dragonflycave.com/)
>
> In response to: [post by lxf](https://www.dragonflycave.com/mechanics/gen-ii-capturing/#post-10470)
>
> Thank you! I'm really thrilled you enjoy the informative writeups - I spend a lot of time on them even as internet content keeps inexorably shifting away from longform text.
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10472/#responding-to)\[12/05/2025 14:31:42\]

> ![](https://www.dragonflycave.com/sprites/gen8/icons-unified-small/741.png)
>
> lxf
>
> You’re the coolest! I’ve been using your website forever, you have my favorite writing style of any site I’ve used—and you’re so informative. I’m glad you did all the work you’ve done on this
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10470/#responding-to)\[11/05/2025 11:26:05\]

Pages:



**1**