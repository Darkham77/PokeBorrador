# Gen VI/VII Capture Mechanics

Thanks to [magical](http://turnipmints.mooo.com/~andrew/pokemon/) for locating, analyzing and publishing the sixth-generation capture routine, [SciresM](http://twitter.com/SciresM) for finding the ball bonuses for Gen VII, and Kaphotics, Trinket and Zaggyo for later correction/verification.

Capturing in the sixth- and seventh-generation games is not much changed from the [fifth generation](https://www.dragonflycave.com/mechanics/gen-v-capturing/), but brings back the four shake checks from the [third- and fourth-generation games](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/). If you'd rather read about the more different algorithms from the first two generations, see [here](https://www.dragonflycave.com/mechanics/gen-i-capturing/) or [here](https://www.dragonflycave.com/mechanics/gen-ii-capturing/), or if you want the modern eighth-generation method, see [here](https://www.dragonflycave.com/mechanics/gen-viii-capturing/). The catch rate calculator, which can calculate for you how likely you are to succeed in capturing a certain Pokémon, is [here](https://www.dragonflycave.com/calculators/gen-vi-vii-catch-rate/).

## The Catch Rate Formula

The capture formula is not used when you are using a **Master Ball**, or when you are on the first route of the game with wild encounters (Route 2 in X/Y, Route 101 in OR/AS, or Route 1 until the start of the festival in Su/Mo/US/UM), in which case the capture will automatically succeed.

Otherwise, the game starts by calculating the _final capture rate_, in a manner essentially identical to the fifth-generation games:

X=((3M−2H)⋅G⋅C⋅B3M)⋅S⋅OX=((3M-2H)⋅G⋅C⋅B3M)⋅S⋅O

The variables involved are mostly the same as in the fifth generation or analogous to them: _current and maximum HP_ (H and M), the _grass modifier_ (G), the _intrinsic catch rate of the species_ (C), the _ball bonus_ (B), and the _status condition if any_ (S). The sixth generation only adds the _O-Power bonus_ (O), which is reused for the Roto Catch power in the seventh-generation games.

### M (Max HP) and H (Current HP)

As usual, this is the maximum and current HP of the Pokémon being captured. When the Pokémon is at full health, X will equal just about G \* C \* B \* S \* O / 3, and lowering its HP will bring it down to something close to G \* C \* B \* S \* O.

### G (Grass Modifier)

I call this the grass modifier because it appears to be basically the exact same thing as the fifth-generation grass modifier, which would decrease the capture chance while in dark grass if you had too few Pokémon caught in your Pokédex. The sixth- and seventh-generation games don't include dark grass in quite the same sense as the fifth-generation games, however, and technically we don't yet know the exact condition that activates this part of the formula - the game checks the battle type/terrain (the same thing it checks to see if we get a bonus from the Dive Ball), but we don't know exactly what the value it tests for represents. From in-game testing, it's not OR/AS hidden Pokémon battles, long grass, or darker grass. If you have any ideas on what it could be, [let me know](https://www.dragonflycave.com/contact-me/) and I will attempt to test it in-game.

In any case, when we're not in the unknown terrain/battle type, the formula skips applying this modifier - you can treat it as if the G value is 1. When we are in that terrain/battle type, however, the value is modified depending on how many species are registered as caught in your National Pokédex, the same way as in the fifth generation:

| Number of species caught | Modifier |
| --- | --- |
| More than 600 | 4096/4096 (1) |
| 451-600 | 3686/4096 (~0.9) |
| 301-450 | 3277/4096 (~0.8) |
| 151-300 | 2867/4096 (~0.7) |
| 31-150 | 2048/4096 (0.5) |
| 0-30 | 1229/4096 (~0.3) |

So, all in all, in the mystery terrain, it is extremely difficult to catch Pokémon at the beginning of the game, when you've caught few Pokémon, and it only becomes as easy as normal when you have more than 600 Pokémon caught.

### C (Capture Rate)

This is the intrinsic capture rate of the Pokémon species you are attempting to capture, a number ranging from 3 (hard-to-catch legendaries) to 255 (common easy-to-catch mostly-early-game Pokémon). Generally, you can look these up in any decent online Pokédex; however, note that some legendaries' catch rates changed between X/Y and OR/AS, and not all Pokédexes updated the catch rates they listed. The basic idea is that legendaries that had been mandatory catches for the storyline in earlier games, and were therefore given a higher catch rate than normal, now have the regular legendary catch rate of 3: this includes Kyogre and Groudon (used to have a catch rate of 5) and Dialga, Palkia, Reshiram and Zekrom (used to have a catch rate of 30). Meanwhile, since Rayquaza _is_ a mandatory storyline catch in OR/AS, Rayquaza's catch rate was bumped up to 45. These legendaries all retain their new OR/AS catch rates in the seventh generation.

Ultra Sun and Ultra Moon also changed some catch rates: the Ultra Beasts, which used to have drastically different catch rates (15 for Guzzlord; 25 for Buzzwole and Celesteela; 30 for Xurkitree; and 255 for Pheromosa and Kartana), now all have a catch rate of 45, while Necrozma, formerly with catch rate 3, gets catch rate 255(!) as a new mandatory storyline catch.

If you are using a **Heavy Ball** (but no other ball) in the seventh-generation games, this value may be modified according to the Pokémon's weight (actual Pokédex weight, discounting in-battle modifiers to weight such as the Heavy Metal or Light Metal abilities), as follows:

| Weight | Modifier |
| --- | --- |
| >= 300 kg (661.38 lbs) | +30 |
| >= 200 kg, < 300 kg (440.92-661.38 lbs) | +20 |
| >= 100 kg, < 200 kg (220.46-440.92 lbs) | +0 |
| < 100 kg (220.46 lbs) | -20 |

In Sun and Moon, if this results in a _negative_ value, it is bumped up to 0; in Ultra Sun and Ultra Moon, if it's _less than or equal to_ zero, it will be bumped up to 1. The change here is because in Sun and Moon, this made it possible to end up with an X value of zero, which meant zero overall chance of a capture, regardless of the other values in the formula. This is the reason you may have heard that a Beldum caught in a Heavy Ball must be hacked: Beldum's weight is under 100 kg (95 kg or 209.9 lbs) and its intrinsic catch rate is 3, meaning it gets the -20 penalty when you throw a Heavy Ball at it, and instead of the negative value being bumped back up to 1 as [HG/SS](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/), it would be set to 0 in Sun and Moon. Ultra Sun and Ultra Moon have fixed this, so now it _is_ possible to obtain a Beldum in a Heavy Ball - though it's very unlikely.

Note how unlike in the second and fourth generations, the Heavy Ball can no longer give a +40 bonus for Pokémon over 400kg. This makes its usefulness even more limited than there - since in the vast majority of cases it's easy to get a ball bonus of at least 3x using something like a nighttime Dusk Ball or a Timer Ball on turn 7+, the top Heavy Ball bonus of +30 can only outperform that for Pokémon with an intrinsic catch rate less than 15, and the +20 bonus only improves on it for intrinsic catch rates less than 10. In practice, this just means heavy legendaries. If you have a legendary to catch, check its weight and a Heavy Ball might be worth it; otherwise, it's never your choice.

### B (Ball Bonus)

Here's where the Pokéball you're using comes in, other than the Heavy Ball modifier explained above. This is a multiplier, determined by the ball you're using and any conditions that might affect the effectiveness of that ball.

In the seventh-generation games, if the Pokémon is an **Ultra Beast** (Nihilego, Buzzwole, Pheromosa, Xurkitree, Celesteela, Kartana, Guzzlord, Poipole, Naganadel, Stakataka or Blacephalon), the ball bonus will be specially overwritten with **410/4096 (~0.1)** for any ball other than a Beast Ball, so disregard all of the below for those. (Note that Master Balls always succeed regardless; they have no ball bonus and in fact exit the capture routine early.)

Some of these multipliers changed in Gen VII; their Gen VI values are also noted below. These changes were made to rebalance balls - prior to Gen VII, for example, Dusk Balls were at least as good as and more practical than virtually any other type of ball, since they'd give a 3.5x bonus so long as you were playing at night, which made most other balls simply redundant. Now, there is a more sensible hierarchy of more narrowly specialized balls giving higher bonuses, with balls like Net Balls, Dive Balls and Repeat Balls being better than Dusk Balls when their bonuses apply.

Poké Ball, Premier Ball, Luxury Ball, Heal Ball, any ball not listedB = 1Great BallB = 1.5Ultra BallB = 2Master Ball, any ball on the first route of the gameThe formula is not used; the capture is always successfulNet Ball(Gen VII) B = 3.5 if one of the Pokémon's types is Water or Bug; B = 1 otherwise

(Gen VI) B = 3 if one of the Pokémon's types is Water or Bug; B = 1 otherwiseNest BallB = (((41 - Pokémon's level) / 10) if the Pokémon's level is less than 30; B = 1 otherwise (the bonus thus ranges from 4x for a hypothetical level 1 wild Pokémon down to 1.2x for a level 29 one, but is 1 for level 30+)Dive BallB = 3.5 when on or in water; B = 1 otherwiseRepeat BallB = 3.5 if the Pokémon's species is already registered as caught in the Pokédex (3 in Gen VI); B = 1 otherwiseTimer BallB = 1 + (number of turns passed in battle \* 1229/4096), maximum 4; since 1229/4096 is approximately 0.3, the bonus reaches its cap on the eleventh turnQuick BallB = 5 on the first turn of a battle; B = 1 otherwiseDusk Ball(Gen VII) B = 3 at night and inside caves; B = 1 otherwise

(Gen VI) B = 3.5 at night and inside caves; B = 1 otherwise (note that Mirage Caves in OR/AS do not count as caves)Fast BallB = 4 if the Pokémon's base Speed is 100 or more; B = 1 otherwiseLevel BallB = 8 if your Pokémon's level divided by four and rounded down is greater than or equal to the target Pokémon's level; otherwise, B = 4 if your Pokémon's level divided by two and rounded down is greater than or equal to the target Pokémon's level; otherwise, B = 2 if your Pokémon's level is greater than that of the target Pokémon; B = 1 otherwiseLove BallB = 8 if the Pokémon is of the same species as your Pokémon but the opposite gender; B = 1 otherwiseLure BallB = 5 when fishing; B = 1 otherwiseMoon BallB = 4 if the Pokémon evolves by Moon Stone (Nidorina, Nidorino, Clefairy, Jigglypuff, Skitty or Munna; note that in Gen IV this bonus applied to _any member of those families_, but in Gen VII it's only the ones who evolve with the Moon Stone themselves); B = 1 otherwiseBeast BallB = 5 if the Pokémon is an Ultra Beast (Nihilego, Buzzwole, Pheromosa, Xurkitree, Celesteela, Kartana, Guzzlord, Poipole, Naganadel, Stakataka or Blacephalon); B = 410/4096 (~0.1) otherwise

### S (Status)

This is a modifier based on whether the Pokémon is afflicted with a [status ailment](https://www.dragonflycave.com/mechanics/status-ailments/). Like in the fifth generation, if the Pokémon is **asleep** or **frozen**, S = 2.5; if the Pokémon is **poisoned**, **paralyzed** or **burned**, S = 1.5; and otherwise, S = 1.

### O (O-Power/Roto Catch Bonus)

This value replaces the Entralink modifier of the fifth-generation games to factor in their sixth- and seventh-generation analogues. While Entralink Capture Powers could only provide a 30% bonus at the most, the Capture O-Powers in the sixth-generation games are considerably more effective: Capture Power Lv. 1 gives an O value of **1.5**, Lv. 2 gives an O value of **2.0**, and Lv. 3, S and MAX all give an O value of **2.5**. In the seventh-generation games, the Roto Catch boost also gives an O value of **2.5**. If no Capture Power or Roto Catch power is active, the O value is **1**.

## Critical Captures

Critical captures are back from the fifth-generation games and work pretty much the same way as they did then. Sometimes a ball will make a whistling sound when thrown, shake once in mid-air, and then shake once on the ground before either breaking or successfully capturing the Pokémon. A critical capture is much more likely to succeed than a regular capture, as will be explained below. The chance that a given capture will be critical is calculated as follows:

CC=⌊min(255,X)⋅P6⌋CC=⌊min(255,X)⋅P6⌋

CC is then compared against a random number between 0 and 255 inclusive. If the random number is less than CC, the capture will be critical. Thus, the probability of a critical capture is **CC / 256**, and depends both on the already-calculated final capture rate X and on the _Pokédex modifier_ (P).

### P (Pokédex Modifier)

Much like the grass modifier in the formula for X, this value depends on how many species of Pokémon you have caught:

| Number of species caught | Modifier |
| --- | --- |
| More than 600 | 2.5 |
| 451-600 | 2.0 |
| 301-450 | 1.5 |
| 151-300 | 1.0 |
| 31-150 | 0.5 |
| 0-30 | 0 |

In other words, critical captures become likelier as you capture more Pokémon, making it just a touch easier to catch those last few, but are downright impossible at the beginning of the game, when 30 or fewer Pokémon have been caught.

## Throwing a Ball

So here's where we finally get to the part where something is a bit interestingly different from the fifth-generation games.

In Gen VI onwards, Pokéballs can break after zero, one, two or three wobbles again, like in the older games but unlike the fifth generation where they never broke after two. The change in the fifth generation happened because the game, effectively, only gave the Pokémon three chances to break out of the ball instead of four (I will explain how this works in a moment). However, this was a somewhat awkward change, because previously each failed breakout attempt would be represented by one visible wobble on the screen, while in the fifth-generation games the second failed breakout attempt would randomly seem to correspond to two visible wobbles.

The sixth-generation games fixed this awkwardness by giving the Pokémon four chances to break out again in non-critical captures, like in the third- and fourth-generation games. However, they also _changed the way the breakout chance is calculated_, so as to make the final success rate of a regular capture the same as in the fifth generation.

Specifically, if X is 255 or more, the capture will automatically succeed. However, otherwise a second number Y is calculated from X:

Y=⎢⎣⎢⎢⎢65536(255X)316⎥⎦⎥⎥⎥Y=⌊65536(255X)316⌋

Note that the power of 3/16 you see there used to be a fourth root - a power of 1/4 - in the fifth-generation games. Here the value below the line is lower, meaning the Y value is higher.

Once Y has been determined, the Pokémon will make up to four attempts to break out of the ball, except in a critical capture, where it will only make one. For each attempt, a random number between 0 and 65535 inclusive is generated; if this random number is greater than or equal to Y, the Pokémon will break free. If every attempt fails (that is, if each of the random numbers is less than Y), the Pokémon is successfully caught; otherwise, in a regular capture the number of times the ball wobbles is equal to the number of failed tries the Pokémon made before it broke out, whereas in a critical capture you will always see the ball wobble once before it breaks.

The probability of a single random number being less than Y (that is, the probability that the breakout attempt will fail) is Y / 65536. Thus, the probability that all four attempts in a regular capture will fail is **(Y / 65536)4**. Plugging the Y formula into that tells us the regular capture chance is **(X / 255)0.75**, exactly the same as the fifth-generation chance. However, a critical capture succeeds if just one random number is less than Y, the chance of which is now equal to **(X / 255)0.1875**, rather than **(X / 255)0.25** as in the fifth generation - in other words, while regular captures are equally likely to be successful as before, _critical captures are now even more significantly more likely to succeed than regular captures_.

The total probability of a successful capture equals the chance of a successful critical capture plus the chance of a successful normal capture: namely, **(CC / 256) \* (Y / 65536) + (1 - CC / 256) \* (Y / 65536)4**. There is no less cumbersome way to write that equation, I'm afraid; if you want to calculate your chances, you're better off using the calculator.

## Catch Rate Calculator

Oh, yeah, there's a calculator. The [Gen VI/VII catch rate calculator](https://www.dragonflycave.com/calculators/gen-vi-vii-catch-rate/) will do all the math for you and tell you how likely you are to capture the Pokémon without you having to do any of these calculations yourself.

Page last modified November 20 2025 at 17:02 UTC

## You May Also Enjoy

[**Gen VI/VII Catch Rate Calculator**\\
A capture calculator for the sixth- and seventh-generation games.](https://www.dragonflycave.com/calculators/gen-vi-vii-catch-rate/)

[**Gen V Capture Mechanics**\\
A breakdown of how capturing works in the fifth-generation games and how it differs from the previous games.](https://www.dragonflycave.com/mechanics/gen-v-capturing/)

[**Gen VIII Capture Mechanics**\\
Learn all about how capturing works in the eighth-generation games.](https://www.dragonflycave.com/mechanics/gen-viii-capturing/)

[**Gen IX Capture Mechanics**\\
The mechanics of capturing in the ninth-generation games.](https://www.dragonflycave.com/mechanics/gen-ix-capturing/)

## Post comment

Inflammatory or off-topic comments will be deleted; please go to the [guestbook](https://www.dragonflycave.com/guestbook/) for discussion unrelated to this page. You can use [BBCode](https://www.dragonflycave.com/mechanics/gen-vi-vii-capturing/#bbcode "Click for a list of formatting options.") (forum code) to format your messages.

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

![406](https://www.dragonflycave.com/sprites/gen8/home-thumb/406.png)Please type the name of the above Pokémon into this box ( [don't know it?](https://www.dragonflycave.com/mechanics/gen-vi-vii-capturing/#))\*:The above sprite has a 1/8192 chance of being shiny. (Modern browsers will give it a yellow glow if so.)

Submit messageReset

## Comments

No comments on this page as of yet.