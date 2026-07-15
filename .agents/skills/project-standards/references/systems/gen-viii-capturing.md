# Gen VIII Capture Mechanics

Thanks to [Anubis](http://twitter.com/Sibuna_Switch) for finding the capture routines in the decompilation, assisting with testing, and uncovering the raid modifiers, and the several friends who assisted with in-game testing at various stages, as well as [Zaggyo](https://twitter.com/zakocky) for some research and corrections.

Sword and Shield added some new spice to the capture formula, though it remains significantly similar to the [sixth and seventh generations](https://www.dragonflycave.com/mechanics/gen-vi-vii-capturing/). Note that this page also applies to Brilliant Diamond and Shining Pearl.

If you're interested in the mechanics of earlier generations, see [here](https://www.dragonflycave.com/mechanics/gen-v-capturing/) for the fifth-generation games, [here](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/) for the third- and fourth-generation games, [here](https://www.dragonflycave.com/mechanics/gen-ii-capturing/) for the second generation or [here](https://www.dragonflycave.com/mechanics/gen-i-capturing/) for the first generation. To calculate the likelihood of capturing a Pokémon in Gen VIII, use the [catch rate calculator](https://www.dragonflycave.com/calculators/gen-viii-catch-rate/).

## A Note on "Very Strong-Looking" Pokémon

In Sword and Shield, when you encounter a Pokémon that is **above a certain level determined by the badges you have**, the Pokémon will be described as "very strong-looking", and it will be impossible to throw a ball at it at all. Obviously, since you can't throw balls at them, you can never catch them, and the capture mechanics as described below never come into play. The respective maximum catchable levels for the badges are as follows:

| Badge | Maximum level |
| --- | --- |
| No badges | 20 |
| Grass badge | 25 |
| Water Badge | 30 |
| Fire Badge | 35 |
| Fighting/Ghost Badge | 40 |
| Fairy Badge | 45 |
| Rock/Ice Badge | 50 |
| Dark Badge | 55 |
| Dragon Badge | 100 |

## The Catch Rate Formula

As usual, a Master Ball will capture the Pokémon without fail, without performing the calculation. Like in the sixth and seventh generations, captures will always succeed on the first route in the game with wild encounters (Route 1). Additionally, for Max Raids, capture is guaranteed if:

- you are the raid host, and this is not an event raid
- this is an event raid where the raid catch difficulty is 0 (guaranteed)

Otherwise, the game calculates a _final capture rate_, which can be determined by a formula - and it has a couple of new bits this time around:

X=((3M−2H)⋅G⋅C⋅B3M)⋅L⋅S⋅D

The variables here are the _current and maximum HP_ (H and M), the _grass modifier_ (G), the _intrinsic catch rate of the species_ (C), the _ball bonus_ (B), the new _low-level modifier_ (L), the _status condition if any_ (S), and the new _difficulty modifier_ (D).

### M (Max HP) and H (Current HP)

Nothing new here; these are once again just the maximum and current HP of the Pokémon you are trying to capture. When the Pokémon is at full health, X will be roughly G \* C \* B \* L \* S \* D / 3, and lowering its HP will bring it down to towards a limit of G \* C \* B \* L \* S \* D.

For Max Raid captures, the current HP value is set to 0 for the capture, resulting in the HP effectively canceling out fully and the X value just becoming G \* C \* B \* L \* S \* D.

### G (Grass Modifier)

Like in the sixth and seventh generations, this modifier corresponds to and works like the thick grass modifier in the [fifth-generation games](https://www.dragonflycave.com/mechanics/gen-v-capturing/), where battles in thick grass (where Pokémon were higher-leveled and you could get into wild double battles) would make Pokémon harder to catch unless you'd already filled out most of your Pokédex - _but_ there is not actually any known way to trigger this modifier to be anything other than 1. The game checks for a certain value of the "terrain" variable - the same variable that tells us if we're fishing or surfing, for instance - but what this value means isn't known, or whether battles with this value even exist in the game at all. (Raid battles are not it.)

Thus, **at least the vast majority of the time, this variable is simply 1**. If this battle type exists, however, in those battles this modifier will be set according to the number of Pokémon you have registered in any of the game's Pokédexes:

| Number of species caught | Modifier |
| --- | --- |
| More than 600 | 4096/4096 (1) |
| 451-600 | 3686/4096 (~0.9) |
| 301-450 | 3277/4096 (~0.8) |
| 151-300 | 2867/4096 (~0.7) |
| 31-150 | 2048/4096 (0.5) |
| 0-30 | 1229/4096 (~0.3) |

In the eighth-generation games there are a couple of snags here. Brilliant Diamond and Shining Pearl, of course, only include the 493 Pokémon of the first four generations in their National Pokédex, so you can never have more than 600 Pokémon caught. And the same also applies to Sword and Shield: _only 584 Pokémon can currently be registered to any Pokédex in Sw/Sh, even with the Expansion Pass/trading_. There are technically 664 obtainable Pokémon in Sword and Shield, but 80 of them are not in any of the game's Pokédexes, and they will never be counted here. Even worse, though, in Sword and Shield, even if you have the Expansion Pass and have received the Pokédexes of the Isle of Armor and the Crown Tundra, there is not actually any way to see the total number of species registered to your Pokédexes within the game if you've caught any of the DLC's Pokémon, since the Galar Pokédex, Isle of Armor Pokédex and Crown Tundra Pokédex are three separate Pokédexes! You might assume that all you have to do is add up the Pokédex completion numbers of the three dexes, but this does _not_ give you the correct number, because a lot of Pokémon exist in more than one of the three dexes, and adding up the Pokédex caught numbers will _count them multiple times_, while the counting function the game uses here only counts each once. In short, this means that getting the maximum value of 1 for this modifier when it's active is actually simply impossible.

The grass modifier at the very least doesn't _usually_ matter, since it's simply 1 in most battles; unfortunately, however, the Pokédex registered number is also used for the critical capture calculation, which does apply for all non-raid battles. More on that later.

### C (Capture Rate)

By default, this is the intrinsic capture rate of the Pokémon species you're trying to catch. Most legendary Pokémon have a catch rate of 3; most common early-game Pokémon have a catch rate of 255; and other Pokémon are somewhere in between. You can find this number in various online Pokédexes, though some catch rates, especially legendary Pokémon, have changed between generations - make sure the one you use is up-to-date, or use my [calculator](https://www.dragonflycave.com/calculators/gen-viii-catch-rate/).

If you're using a **Heavy Ball**, then this value may be adjusted according to the Pokémon's weight. This uses the Pokémon species' weight as listed by the Pokédex and is unaffected by abilities or items that modify weight in battle, or by a Pokémon being Dynamaxed in a Max Raid:

| Weight | Modifier |
| --- | --- |
| >= 300 kg (661.38 lbs) | +30 |
| >= 200 kg, < 300 kg (440.92-661.38 lbs) | +20 |
| >= 100 kg, < 200 kg (220.46-440.92 lbs) | +0 |
| < 100 kg (220.46 lbs) | -20 |

If the result is less than 1, it will be bumped up to 1, so that it's impossible for the catch rate to be zero or negative. Like in the seventh generation, the Heavy Ball's usefulness is extremely limited: since it _adds_ to the catch rate rather than applying a ball bonus multiplier like other balls do, it's only a substantial improvement for Pokémon that have very low intrinsic catch rates. In practice, all they can be more useful for than a decent ordinary ball is legendaries over 200kg - but for those, it will be superior to any other ball.

### B (Ball Bonus)

Balls _other_ than the Heavy Ball will instead apply a ball bonus multiplier depending on the ball and any conditions specific to that ball. If the Pokémon is an **Ultra Beast** (Nihilego, Buzzwole, Pheromosa, Xurkitree, Celesteela, Kartana, Guzzlord, Poipole, Naganadel, Stakataka or Blacephalon), the ball bonus will always be **410/4096 (~0.1)** for any ball other than a Beast Ball. Otherwise, the ball bonus is set as follows:

Poké Ball, Premier Ball, Luxury Ball, Heal Ball, any ball not listedB = 1Great BallB = 1.5Ultra BallB = 2Master Ball, any ball on the first route of the gameThe formula is not used; the capture is always successfulSafari BallB = 1.5 (BD/SP only)Net BallB = 3.5 if one of the Pokémon's types is Water or Bug; B = 1 otherwiseNest BallB = (((41 - Pokémon's level) / 10) if the Pokémon's level is less than 30; B = 1 otherwiseDive BallB = 3.5 when on or in water; B = 1 otherwiseRepeat BallB = 3.5 if the Pokémon's species is already registered as caught in the Pokédex; B = 1 otherwiseTimer BallB = 1 + (number of turns passed in battle \* 1229/4096), maximum 4; since 1229/4096 is approximately 0.3, the bonus reaches its cap on the eleventh turnQuick BallB = 5 on the first turn of a battle; B = 1 otherwiseDusk BallB = 3 at night (if the hour is 7PM to 5AM in Sword/Shield or 5PM to 3AM in BD/SP), inside caves/Newmoon Island or on the Darkest Day; B = 1 otherwiseFast BallB = 4 if the Pokémon's base Speed is 100 or more; B = 1 otherwiseLevel BallB = 8 if your Pokémon's level divided by four and rounded down is greater than or equal to the target Pokémon's level; otherwise, B = 4 if your Pokémon's level divided by two and rounded down is greater than or equal to the target Pokémon's level; otherwise, B = 2 if your Pokémon's level is greater than that of the target Pokémon; B = 1 otherwiseLove BallB = 8 if the Pokémon is of the same species as your Pokémon but the opposite gender; B = 1 otherwiseLure BallB = 4 when fishing; B = 1 otherwiseMoon BallB = 4 if the Pokémon evolves by Moon Stone (Nidorina, Nidorino, Clefairy, Jigglypuff, Skitty or Munna; note that in Gen IV this bonus applied to _any member of those families_, but in Gen VII it's only the ones who evolve with the Moon Stone themselves); B = 1 otherwiseBeast BallB = 5 if the Pokémon is an Ultra Beast (Nihilego, Buzzwole, Pheromosa, Xurkitree, Celesteela, Kartana, Guzzlord, Poipole, Naganadel, Stakataka or Blacephalon); B = 410/4096 (~0.1) otherwiseDream BallB = 4 if the Pokémon is asleep or has the ability Comatose; B = 1 otherwise

The only changes here since the seventh generation are that Lure Balls now give a 4x bonus when fishing rather than a 5x one and the addition of Dream Balls as a regular ball - originally these were used in the fifth generation to capture Pokémon in Entree Forest after encountering them with the Dream Radar, and would never fail, but now they are extra effective against Pokémon who are asleep, including the pseudo-sleep of Komala's signature ability Comatose.

Note that for a raid battle capture, the "turns passed" variable ticks up _before_ the capture happens. That means that effectively, if you beat the raid in one turn, the capture acts as if it's turn 2. This means Quick Balls never get their 5x bonus for a raid capture, but Timer Balls _do_ always get at least a 1.3x bonus.

### L (Low-Level Modifier)

The first new modifier in the Gen VIII formula, and it's a doozy! For the first time in the main series, **it is now easier to catch low-level Pokémon**. If the Pokémon's level is less than 21, the catch rate is multiplied by **(30 - the Pokémon's level) / 10**. In other words, for a hypothetical level 1 Pokémon, L would be 2.9; for a level 10 Pokémon it's 2.0; and for a level 15 Pokémon it's 1.5. Past level 20, L is simply 1, and the Pokémon's level has no effect on the result, like in previous games. The idea here is presumably to be kinder and make capturing easier at the beginning of the game, when the player is still learning the ropes, while it ramps up in difficulty as they get the hang of it.

### S (Status)

This multiplier is applied if the Pokémon has a [status ailment](https://www.dragonflycave.com/mechanics/status-ailments/): if the Pokémon is **asleep** or **frozen**, S = 2.5; if the Pokémon is **poisoned**, **paralyzed** or **burned**, S = 1.5; and otherwise, S = 1. (Note that this multiplier is _not_ applied to a Pokémon with the Comatose ability.)

Max Raid boss Pokémon never count as having a status condition applied for the purposes of the capture formula; the status is gone before you get the chance to capture it.

### D (Difficulty Modifier)

This is the other new variable in the catch rate formula for this generation. This is a multiplier representing a special _difficulty modifier_, to make capturing more or less difficult when appropriate.

For **regular wild battles**, this modifier has one purpose: if you have _not yet received the eighth badge (Raihan's in Sw/Sh or Volkner's in BD/SP)_, then _if your Pokémon's level is lower than the level of the wild Pokémon_, this value will be **410/4096 (~0.1)**. Otherwise, this value is 1. This is presumably intended to make it hard to deal with higher-level wild Pokémon by simply capturing them instead of battling them, which would otherwise be a way to cheese the game a bit. Note that in the Great Marsh in BD/SP, this penalty also applies, based on the level of your lead Pokémon, even though you don't actually battle in the Marsh.

However, in a **Max Raid**, this modifier will be set depending on the raid and whether you are the _raid host_ or a _guest_.

#### Event Raids

For an event raid (online distributions), the modifier will be set to one of five set multipliers depending on the raid data, unless the raid is set to be a guaranteed capture. The raid event data can set a different catch difficulty for the host than for other participants, although so far they have always been the same to my knowledge. You can find event raid data on [Project Pokémon](https://projectpokemon.org/home/files/category/203-generation-8/), under the columns "Host Catch Rate" and "Non-Host Catch Rate" in the tables provided for each event.

The difficulty modifiers corresponding to each raid catch difficulty are as follows:

| Catch difficulty rating | Modifier |
| --- | --- |
| 0 | Capture is guaranteed |
| 1 | 2.0 |
| 2 | 1.5 |
| 3 | 1.0 |
| 4 | 0.5 |
| 5 | 0.25 |
| 6 | No option to capture (challenge raid) |

#### Non-Event Raids

For non-event raids, capture should always be guaranteed if you are the **raid host**.

If you are a **guest**, and this is a _non-Gigantamax_ raid, then this modifier will be 2, making all captures easier than they would be normally (equivalent to an event raid with catch difficulty 1). You only get to throw one ball in a raid, after all, so balancing it so that the one ball is a bit more likely to succeed is a sensible choice.

If it is a _Gigantamax_ raid, then the modifier is defined by an interesting lookup table that at a casual glance looks totally random - unlike all other capture modifiers, the numbers aren't approximating neat fractions of 4096 at all. What's actually happening here is that these modifiers are designed to roughly _equalize the catch rates_. For instance, all Gigantamax Pokémon with a catch rate of 45 have a modifier of 291/4096, which will effectively turn that into ~3.197. Meanwhile, those with a catch rate of 3 (Melmetal and Urshifu) have a modifier of 4354/4096, which will effectively bring that to ~3.189. All of the effective catch rates as calculated in this manner wind up in the range of 3.1-3.3, though curiously there's a bit of variation in that range, with not much apparent rhyme or reason to it:

| Pokémon | Catch rate | Modifier | Effective catch rate |
| --- | --- | --- | --- |
| Melmetal<br>Urshifu | 3 | 4354/4096 | ~3.189 |
| Snorlax | 25 | 524/4096 | ~3.198 |
| (All Gigantamax Pokémon not listed) | 45 | 291/4096 | ~3.197 |
| Kingler<br>Garbodor | 60 | 217/4096 | ~3.179 |
| Drednaw<br>Centiskorch | 75 | 176/4096 | ~3.223 |
| Copperajah | 90 | 143/4096 | ~3.142 |
| Alcremie | 100 | 131/4096 | ~3.198 |
| Sandaconda | 120 | 111/4096 | ~3.252 |
| Pikachu | 190 | 70/4096 | ~3.247 |
| Meowth | 255 | 53/4096 | ~3.300 |

Tweaking some of these modifiers just slightly would result in more consistent effective catch rates, and it seems quite random that Copperajah, one of the higher actual base catch rates, should be the hardest Gigantamax Pokémon to catch by a tiny amount, but these are the numbers the game is using, for one reason or another. (Note that there are not actually any non-event Gigantamax Meowth or Pikachu raids in the game.)

All in all, though, this means you can effectively expect all non-event Gigantamax raids for a guest player to be about as difficult to catch as most legendary Pokémon (catch rate 3) at low HP and no status.

## Critical Captures

As with the previous three generations, the eighth features _critical captures_, where sometimes the ball will make a different sound when thrown and then shake only once in mid-air, making the capture much more likely. Critical captures _cannot happen in Max Raids_; that entire bit of code is skipped over in raids.

The chance that a given capture will be critical is very similar to the previous generations, with the addition of one new variable, Ch:

CC=⌊min(255,X)⋅P⋅Ch6⌋

The CC number is compared against a random number between 0 and 255 inclusive; if the random number is less than CC, the capture will be critical. Thus, the chance of a critical capture is **CC / 256**. The X variable in the formula is the final catch rate calculated before; the other two variables are as follows:

### P (Pokédex Modifier)

This is the other spot where Pokédex completion matters for capturing. The Pokédex modifier is set according to the same categories of Pokédex completion as in the G modifier, but with different values:

| Number of species caught | Modifier |
| --- | --- |
| More than 600 | 2.5 |
| 451-600 | 2.0 |
| 301-450 | 1.5 |
| 151-300 | 1.0 |
| 31-150 | 0.5 |
| 0-30 | 0 |

Thus, it's impossible to get a critical capture at the beginning of the game when you've caught 30 or fewer Pokémon, but becomes easier as you go on and catch more. Unfortunately, as with the grass modifier, the total number of species registered in your Pokédex is not actually visible in-game in Sword and Shield if you have Pokémon from the Isle of Armor or Crown Tundra DLC (again, note that adding the three Pokédex caught numbers together will get you an overestimate thanks to Pokémon that are in multiple dexes), and it's impossible to reach the highest tier of 600+ in any Gen VIII game, since the maximum number of species you can currently register in your Pokédexes in the game even with trading is 584 (Sw/Sh) or 493 (BD/SP). The maximum Pokédex modifier in all Gen VIII games as it is is therefore 2.0.

#### Ch (Catching Charm)

The Catching Charm item, which can be obtained in one of the rooms on the second floor of Hotel Ionia in Circhester, will double the critical capture chance; in other words, the Ch variable is **2** if you have the Catching Charm and **1** without it. Thus, it won't help you if you have caught 30 or fewer Pokémon - but since it happens _before_ any rounding, sometimes it can make the difference between a critical capture being possible and impossible, for a low X.

## Throwing a Ball

This bit works identically to the previous two generations. If X is 255 or more, then the capture will automatically succeed. Otherwise, we calculate a second number Y from X:

Y=⎢⎣⎢⎢⎢65536(255X)316⎥⎦⎥⎥⎥

(The game uses single-precision floating-point arithmetic for the power function here, so the result can be slightly inaccurate for some possible values of X; the [calculator](https://www.dragonflycave.com/mechanics/gen-viii-capturing/#calculator) accounts for this, for maximally accurate results.)

The Pokémon will now _attempt to break out of the ball_ a number of times. To simulate a breakout attempt, the game will generate a random number between 0 and 65535 inclusive; if this number is _less_ than Y, then the ball holds, while otherwise it breaks. This means that the chance the ball holds on each breakout attempt is **Y / 65536**.

Normally, the Pokémon will make up to four attempts to break out of the ball; in order to capture it, the ball has to hold on all four. For each breakout check where the ball holds, you will see the ball wobble on the screen once - so if it wobbles three times and then breaks, you really did almost have it! If it holds on the fourth check, the ball seals rather than wobbling again. Since there are four checks, the odds that you capture the Pokémon are **(Y / 65536)4**, which roughly equals **(X / 255)0.75**, bar rounding errors.

For a critical capture, however, the Pokémon will only get _one_ chance to break out of the ball! The breakout calculation is the same - it just only happens once. You'll always see the ball wobble once on a critical capture, and then either break or seal depending on whether that one check was successful. The success chance for a critical capture is just **Y / 65536**, or **(X / 255)0.1875**.

The _overall_ chance of a capture in a non-raid battle, then, is the chance that you get a critical capture and it succeeds, plus the chance that you get a non-critical capture and it succeeds, or **(CC / 256) \* (X / 255)0.1875 \+ (1 - CC / 256) \* (X / 255)0.75**. Quite a mouthful! There is unfortunately no way to meaningfully simplify this much.

## Catch Rate Calculator

Luckily, then, I've got a [Gen VIII catch rate calculator](https://www.dragonflycave.com/calculators/gen-viii-catch-rate/) that will take care of all the numbers for you. Simply enter the relevant information and it will display your chance to capture it as well as your chances for zero, one, two or three wobbles.

Page last modified November 20 2025 at 17:02 UTC

## You May Also Enjoy

[**Gen VIII Catch Rate Calculator**\\
Calculate your chances of capturing a Pokémon in the eighth-generation games.](https://www.dragonflycave.com/calculators/gen-viii-catch-rate/)

[**Sword and Shield Weather Encounter Tool**\\
A tool for calculating what Pokémon you can actually find in your Wild Area right now.](https://www.dragonflycave.com/galar/weather-encounters/)

[**Gen VI/VII Capture Mechanics**\\
Everything about how capturing works in the sixth- and seventh-generation games.](https://www.dragonflycave.com/mechanics/gen-vi-vii-capturing/)

[**Gen IX Capture Mechanics**\\
The mechanics of capturing in the ninth-generation games.](https://www.dragonflycave.com/mechanics/gen-ix-capturing/)

## Post comment

Inflammatory or off-topic comments will be deleted; please go to the [guestbook](https://www.dragonflycave.com/guestbook/) for discussion unrelated to this page. You can use [BBCode](https://www.dragonflycave.com/mechanics/gen-viii-capturing/#bbcode "Click for a list of formatting options.") (forum code) to format your messages.

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

![344](https://www.dragonflycave.com/sprites/gen8/home-thumb/344.png)Please type the name of the above Pokémon into this box ( [don't know it?](https://www.dragonflycave.com/mechanics/gen-viii-capturing/#))\*:The above sprite has a 1/8192 chance of being shiny. (Modern browsers will give it a yellow glow if so.)

Submit messageReset

## Comments

No comments on this page as of yet.