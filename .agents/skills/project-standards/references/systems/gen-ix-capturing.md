# Gen IX Capture Mechanics

Thanks to [Anubis](https://twitter.com/Sibuna_Switch/status/1610341810655608833) for originally uncovering and analyzing the capture routine.

The capture formula in Scarlet and Violet is, once again, similar to the [eighth-generation games](https://www.dragonflycave.com/mechanics/gen-viii-capturing/) but makes some interesting changes.

If you're interested in the mechanics of earlier generations, see [here](https://www.dragonflycave.com/mechanics/gen-vi-vii-capturing/) for the sixth- and seventh-generation games, [here](https://www.dragonflycave.com/mechanics/gen-v-capturing/) for the fifth-generation games, [here](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/) for the third- and fourth-generation games, [here](https://www.dragonflycave.com/mechanics/gen-ii-capturing/) for the second generation or [here](https://www.dragonflycave.com/mechanics/gen-i-capturing/) for the first generation. To calculate the likelihood of capturing a Pokémon in Gen IX, use the [catch rate calculator](https://www.dragonflycave.com/calculators/gen-ix-catch-rate/).

## The Catch Rate Formula

The capture is guaranteed if you are using a **Master Ball** or if you are trying to capture a Pokémon after a **Tera Raid** \- the formula is skipped entirely in these cases.

Otherwise, as usual, the game calculates a _final capture rate_, a number that can range from 0 to 255:

X=((3M−2H)⋅G⋅C⋅B⋅BP3M)⋅L⋅S⋅DX=((3M-2H)⋅G⋅C⋅B⋅BP3M)⋅L⋅S⋅D

The variables in the formula are the _current and maximum HP_ (H and M), the _grass modifier_ (G), the _intrinsic catch rate of the species_ (C), the _ball bonus_ (B), the new _badge penalty_ (BP), the _low-level modifier_ (L), the _status condition if any_ (S), and the _difficulty modifier_ (D).

### M (Max HP) and H (Current HP)

The maximum and current HP of the Pokémon you are trying to capture. If it's at full health, X will be roughly G \* C \* B \* BP \* L \* S \* D / 3; lowering its HP will bring it linearly up towards G \* C \* B \* BP \* L \* S \* D, though it'll never quite get there.

### G (Grass Modifier)

Since the [fifth generation](https://www.dragonflycave.com/mechanics/gen-v-capturing/), the formula has included this multiplier. Originally, this multiplier would be used only in dark grass, the special grass in the fifth-generation games where you would encounter higher-leveled Pokémon and wild double battles. In every generation since, the calculation for this multiplier has remained there, triggered by a condition that, as best anyone can tell, is never true.

Scarlet and Violet are no exception. For all intents and purposes, this multiplier is always 1. In the hypothetical scenario where it _would_ get used, it would be based on how many different Pokémon are registered as caught in your Pokédexes, as it has been:

| Number of species caught | Modifier |
| --- | --- |
| More than 600 | 4096/4096 (1) |
| 451-600 | 3686/4096 (~0.9) |
| 301-450 | 3277/4096 (~0.8) |
| 151-300 | 2867/4096 (~0.7) |
| 31-150 | 2048/4096 (0.5) |
| 0-30 | 1229/4096 (~0.3) |

But it's a moot point. Mechanics researcher Anubis tried different scenarios with a debugger and found no situation where the multiplier applies, and nobody has ever found such a situation for four whole generations now. This bit is only around in the capture routine for legacy reasons.

### C (Capture Rate)

This is once again the intrinsic capture rate of the Pokémon species you're trying to catch. Legendary Pokémon will generally have single-digit catch rates, most common early-game Pokémon have a catch rate of 255, and other Pokémon run the gamut in between. Most online Pokédexes will show you this information - though in some cases they have changed between generations. If you use my [calculator](https://www.dragonflycave.com/calculators/gen-ix-catch-rate/), don't worry, you won't have to look this up yourself.

Prior to version 1.2.0 of Scarlet and Violet, the game had a funny little bug where if you were trying to capture a **Ditto** that had transformed into a _non-default form_ of a Pokémon, the catch rate would be 0 - effectively, this was owing to the game trying to fetch the catch rate for that form identifier _of Ditto_, when Ditto only has one form. A catch rate of 0 will make the Pokémon impossible to catch - remember, the formula is basically just a bunch of numbers multiplied together, and if you multiply by zero, the result will always be zero. This bug was fixed in version 1.2.0 of the game.

If you're using a **Heavy Ball**, but no other ball, the intrinsic capture rate will be modified from there, specifically according to the Pokémon's species weight as listed in the Pokédex:

| Weight | Modifier |
| --- | --- |
| >= 300 kg (661.38 lbs) | +30 |
| >= 200 kg, < 300 kg (440.92-661.38 lbs) | +20 |
| >= 100 kg, < 200 kg (220.46-440.92 lbs) | +0 |
| < 100 kg (220.46 lbs) | -20 |

If the result after applying the Heavy Ball modifier is less than 1, it will be bumped up to 1, so as to prevent the catch rate from becoming zero or negative. As usual, the Heavy Ball's catch rate bonuses are only really useful for very heavy (>200kg) legendary Pokémon: since it works by adding to the catch rate instead of multiplying like other balls, the effect it has will only be substantial for Pokémon whose intrinsic catch rates are very low.

In the older versions of the game, the Ditto bug mentioned above could actually be bypassed by using a Heavy Ball - it would use the transformed Pokémon's weight, but even if it wasn't heavy enough, the safeguard that sets the catch rate to a minimum of one would be applied and make the capture possible, giving the Heavy Ball a new ludicrously small niche.

### B (Ball Bonus)

This is where other, non-Heavy balls come in. This multiplier will be set depending on the ball and any special conditions set for this type of ball. As usual, if the Pokémon is an **Ultra Beast** (Nihilego, Buzzwole, Pheromosa, Xurkitree, Celesteela, Kartana, Guzzlord, Poipole, Naganadel, Stakataka or Blacephalon), and the ball is not a Beast Ball, the ball bonus will always be **410/4096 (~0.1)**. Otherwise, the ball bonus is set as follows:

Poké Ball, Premier Ball, Luxury Ball, Heal Ball, any ball not listedB = 1Great BallB = 1.5Ultra BallB = 2Master BallThe formula is not used; the capture is always successfulNet BallB = 3.5 if one of the Pokémon's types is Water or Bug; B = 1 otherwiseNest BallB = (((41 - Pokémon's level) / 10) if the Pokémon's level is less than 30; B = 1 otherwiseDive BallB = 3.5 if the Pokémon is in water (Pokémon that always fly in battle do not count); B = 1 otherwiseRepeat BallB = 3.5 if the Pokémon's species is already registered as caught in the Pokédex; B = 1 otherwiseTimer BallB = 1 + (number of turns passed in battle \* 1229/4096), maximum 4; since 1229/4096 is approximately 0.3, the bonus reaches its cap on the eleventh turnQuick BallB = 5 on the first turn of a battle; B = 1 otherwiseDusk BallB = 3 at night (when the Night icon is visible on the map) or in caves; B = 1 otherwiseFast BallB = 4 if the Pokémon's base Speed is 100 or more; B = 1 otherwiseLevel BallB = 8 if your Pokémon's level divided by four and rounded down is greater than or equal to the target Pokémon's level; otherwise, B = 4 if your Pokémon's level divided by two and rounded down is greater than or equal to the target Pokémon's level; otherwise, B = 2 if your Pokémon's level is greater than that of the target Pokémon; B = 1 otherwiseLove BallB = 8 if the Pokémon is of the same species as your Pokémon but the opposite gender; B = 1 otherwiseLure BallB = 4 if the Pokémon is in or directly above water (Pokémon flying _higher_ above the water do not count); B = 1 otherwise (in at least version 1.1.0 of the game, the Lure Ball would _never_ give its 4x multiplier, but it was fixed at some point prior to version 3.0.0)Moon BallB = 4 if the Pokémon evolves by Moon Stone (Nidorina, Nidorino, Clefairy, Jigglypuff, Skitty or Munna); B = 1 otherwiseBeast BallB = 5 if the Pokémon is an Ultra Beast (Nihilego, Buzzwole, Pheromosa, Xurkitree, Celesteela, Kartana, Guzzlord, Poipole, Naganadel, Stakataka or Blacephalon); B = 410/4096 (~0.1) otherwiseDream BallB = 4 if the Pokémon is asleep or has the ability Comatose; B = 1 otherwise

Nothing has really _changed_ here since the eighth generation, other than how fishing does not exist in the game and Lure Balls have been converted into a copy of Dive Balls (but didn't work properly in earlier versions of the game).

### BP (Badge Penalty)

A new modifier in the formula! Whereas the eighth-generation games would make capture much harder if the Pokémon was a higher level than yours, Scarlet and Violet have refined the concept to be less of a singular drastic discontinuity. Instead of depending on the level of your first Pokémon, it depends on the level of the Pokémon compared to the number _badges_ you have, the same way as obedience.

For _every badge that you lack_ to be able to have the respect of the Pokémon you're attempting to capture, this modifier is multiplied by 0.8. The maximum level each number of badges can control is as follows:

| Badges | Maximum level |
| --- | --- |
| 0 | 25 |
| 1 | 30 |
| 2 | 35 |
| 3 | 40 |
| 4 | 45 |
| 5 | 50 |
| 6 | 55 |
| 7 | 60 |
| 8 | 100 |

Thus, for example, if you're trying to catch a level 46 Pokémon, you'd need five badges in order for it to be willing to obey you - so if you only have two badges, you're missing three badges, and this modifier will be 0.8 \* 0.8 \* 0.8, or 0.83, which is 0.512. The lowest this penalty can get, if you're trying to catch a level 61+ Pokémon with zero badges (i.e. you're missing eight badges), is 0.88, or roughly 0.168 - which is still a better chance than a higher-leveled Pokémon in the previous generation!

### L (Low-Level Modifier)

This modifier, originally added in Sw/Sh, will make it easier to catch low-level Pokémon. This time around, though, it only applies to Pokémon **level 13 or under** (instead of 20), and is then equal to **(36 - 2 \* the Pokémon's level) / 10**. That means for a level 13 Pokémon it will in practice just be a neutral 1, a level 12 one will get a 1.2x modifier, and so on; a hypothetical level 1 wild Pokémon would get a 3.4x bonus here, nearly the equivalent of one of the better specialized balls for free. In other words, at the _very_ beginning of the game captures are easy, but it doesn't take long for this bonus to disappear.

### S (Status)

As usual, if the Pokémon has a [status ailment](https://www.dragonflycave.com/mechanics/status-ailments/), this modifier will make it easier to catch accordingly. If it is **asleep** or **frozen**, S = 2.5; if it is **poisoned**, **paralyzed** or **burned**, S = 1.5; and otherwise, S = 1. The pseudo-sleep of the Comatose ability does _not_ count for this multiplier.

### D (Difficulty Modifier)

In Scarlet and Violet, this modifier is for _out-of-battle_ effects that affect the capture chance. Like other multipliers, it is 1 by default, but two things can alter it:

- If you have an active **Capture Power** from eating the right kind of sandwich, you will receive a bonus. Capture Power Lv. 1 will get you a **1.1** modifier; Capture Power Lv. 2 will get you a **1.25** modifier; and Capture Power Lv. 3 will get you a **2.0** modifier.
- If you **catch the Pokémon off guard**, by starting the battle with a backstrike or running into it unawares (you'll get a "You caught the wild Pokémon off guard!" message when this happens), the modifier will be doubled.

The doubling effect stacks with the Capture Power effect - thus, if you have a Lv. 3 Capture Power _and_ catch the Pokémon off guard, this modifier will be 4. Not bad!

**Prior to version 3.0.0 of the game, this will not affect static encounters**: in the older versions, legendary Pokémon, Gimmighoul from chests, former Titans, and other story encounters that happen in specific places rather than being spawned by the regular encounter system, are never affected by either of these kinds of boosts, and this modifier will just be 1. **As of version 3.0.0**, static encounters now _are_ affected by this modifier.

## Critical Captures

Critical captures return once again in the ninth generation, but with a couple of twists.

Generally, the chance that a capture will be a _critical capture_ is calculated by this formula, which is the same as in the eighth generation. The X variable is the final capture rate that we calculated earlier; the others are the _Pokédex modifier_ (P) and the _Capture Charm modifier_ (Ch), which will be explained below.

CC=⌊min(255,X)⋅P⋅Ch6⌋CC=⌊min(255,X)⋅P⋅Ch6⌋

The result of this formula, CC, is compared against a random number between 0 and 255 inclusive, and if the random number is less than CC, the capture will be critical. Thus, the chance of a critical capture is **CC / 256**.

However, this time around, the way the game _animates_ captures has changed. If a critical capture _succeeds_ you will see the ball shake in mid-air, as in the previous games - but if it doesn't, it will look indistinguishable from a regular capture failing. Meanwhile, successful non-critical captures for a Pokémon you have _already registered in your Pokédex_ will be animated to look like critical captures, even though they weren't! More on this below, under "Throwing a Ball".

### P (Pokédex Modifier)

The one spot where your Pokédex completion _actually_ matters. This modifier will be set depending on how many different Pokémon you have registered as caught in any of your Pokédexes (Pokémon that don't exist in any Pokédex don't count, even if they're programmed into the game):

| Number of species caught | Modifier |
| --- | --- |
| More than 600 | 2.5 |
| 451-600 | 2.0 |
| 301-450 | 1.5 |
| 151-300 | 1.0 |
| 31-150 | 0.5 |
| 0-30 | 0 |

Note that since some Pokémon are in multiple Pokédexes, it is not enough to add up the caught numbers in the Paldea, Kitakami and Blueberry Pokédexes - that would double-count some species. At the beginning of the game, critical captures are impossible, but as you fill out your Pokédex, they will become likelier, up to about one quarter of the chance of a successful capture.

#### Ch (Catching Charm)

If you have the Catching Charm - given to you by Drayton in the Indigo Disk DLC - then the critical capture chance is doubled prior to the division by six: Ch is **2** with the Catching Charm and **1** otherwise. As it happens before the rounded division, this can make the difference between a critical capture being impossible or possible.

## Throwing a Ball

If the X value calculated above is 255 or more, then the capture will always succeed. If _not_, however, there's a chance that it will fail, and we will need to work out whether it should - and how many times the ball should wobble if it does. (This is all the same as it worked in the previous games - you can skip down to "The Animation" for the next noteworthy new tidbit.)

First, we calculate a second number Y from the X number that we calculated above, the same way as in previous generations:

Y=⎢⎣⎢⎢⎢65536(255X)316⎥⎦⎥⎥⎥Y=⌊65536(255X)316⌋

(Since the game uses single-precision floating-point arithmetic for the power function, this result can be slightly inaccurate for some possible values of X; the [calculator](https://www.dragonflycave.com/mechanics/gen-ix-capturing/#calculator) will account for this.)

It's time for the Pokémon to try to break out of the ball! If this is a critical capture (see above), it will get one try to break out; otherwise, it will get up to four. Each breakout attempt is represented by a different random number between 0 and 65535 inclusive; if the number is _less_ than Y, the number representing the strength of the ball, then the ball will hold, while if it's greater than or equal to Y, the ball will break, and no further breakout attempts will need to be made. To capture the Pokémon, the ball needs to hold on every breakout attempt.

All in all, this means that for each breakout attempt, the ball has a **Y / 65536** chance of holding. Since the Pokémon gets only one attempt on a critical capture, that also equals the chance that a critical capture is successful! On a non-critical capture, the chance the ball survives all four attempts is **(Y / 65536)4**, which is close to being **(X / 255)0.75** (bar rounding errors).

This means the total chance of a capture being successful is approximately **(CC / 256) \* (X / 255)0.1875 \+ (1 - CC / 256) \* (X / 255)0.75**, which unfortunately can't be simplified much more than that.

#### The Animation

In the previous games, critical captures would have one set of animations, where the ball shakes in mid-air before it lands on the ground, wobbles once, and then either breaks or captures the Pokémon; and normal captures would have a different set, where the ball simply lands on the ground and then wobbles up to three times, depending on _how many failed breakout attempts the Pokémon made_.

Scarlet and Violet have fiddled with this logic in two novel ways:

- If a critical capture _fails_, it will simply look like a regular capture where the Pokémon broke out on the first attempt (zero wobbles). The ball won't shake in the air at all.
- Meanwhile, _every time you successfully capture a Pokémon that is already registered in your Pokédex_, it will be animated to look like a critical capture - the ball will shake in the air and then still after one wobble on the ground. This is presumably done as a time-saving measure - if you're catching a bunch of Pokémon you've already caught, it doesn't have the same kind of tension as trying to capture one that you haven't, and shortening the animation when you're about to successfully catch it anyway will save you a bit of time. Note that when you're about to _fail_ to capture it, it will still show the normal animation with the appropriate number of wobbles, even if the Pokémon is registered in your Pokédex!

The upshot is that the moment you see that distinctive critical capture mid-air shake, you know you've caught the Pokémon - no worries! Conversely, if the Pokémon is already registered in your Pokédex, you can know it's going to fail the moment the ball fails to shake in mid-air. However, it's now impossible to tell from the game itself whether your capture attempt _actually_ resulted in a critical capture: it's both possible for critical captures to show up as if they weren't (if they fail), and for non-critical captures to show up as if they were (if they succeed, and you've already registered this Pokémon).

## Catch Rate Calculator

As usual, I've got a [Gen IX catch rate calculator](https://www.dragonflycave.com/calculators/gen-ix-catch-rate/) that will calculate your chances to capture a Pokémon in Scarlet and Violet, so that you won't have to do the math yourself. Enjoy!

Page last modified November 20 2025 at 17:02 UTC

## You May Also Enjoy

[**Gen IX Catch Rate Calculator**\\
A calculator for finding your chances of capturing a Pokémon in the ninth-generation games.](https://www.dragonflycave.com/calculators/gen-ix-catch-rate/)

[**Scarlet and Violet: Subtle Shinies**\\
A list of Pokémon you'll want to pay extra attention to in the overworld, since you may need to really squint to realize that they're shiny.](https://www.dragonflycave.com/paldea/subtle-shinies/)

[**Gen VIII Capture Mechanics**\\
Learn all about how capturing works in the eighth-generation games.](https://www.dragonflycave.com/mechanics/gen-viii-capturing/)

[**Gen I Capture Mechanics**\\
An analysis of the capture algorithm in R/B/Y and how the game determines how often the ball will wobble.](https://www.dragonflycave.com/mechanics/gen-i-capturing/)

## Post comment

Inflammatory or off-topic comments will be deleted; please go to the [guestbook](https://www.dragonflycave.com/guestbook/) for discussion unrelated to this page. You can use [BBCode](https://www.dragonflycave.com/mechanics/gen-ix-capturing/#bbcode "Click for a list of formatting options.") (forum code) to format your messages.

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

![848](https://www.dragonflycave.com/sprites/gen8/home-thumb/848.png)Please type the name of the above Pokémon into this box ( [don't know it?](https://www.dragonflycave.com/mechanics/gen-ix-capturing/#))\*:The above sprite has a 1/8192 chance of being shiny. (Modern browsers will give it a yellow glow if so.)

Submit messageReset

## Comments

No comments on this page as of yet.