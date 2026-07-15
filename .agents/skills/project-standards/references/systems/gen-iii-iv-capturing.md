# Gen III/IV Capture Mechanics

This section explains how the game determines whether an attempted Pokémon capture will be successful in the third- and fourth-generation games. For the R/B/Y algorithm (which is completely different), look [here](https://www.dragonflycave.com/mechanics/gen-i-capturing/). For the G/S/C version (which is slightly less completely different, but makes up for it by being ridiculously buggy), check [here](https://www.dragonflycave.com/mechanics/gen-ii-capturing/). For the fifth generation, you want [this page](https://www.dragonflycave.com/mechanics/gen-v-capturing/). For the sixth and seventh generations, you want [this one](https://www.dragonflycave.com/mechanics/gen-vi-vii-capturing/). For the eighth generation, you want [this one](https://www.dragonflycave.com/mechanics/gen-viii-capturing/). If you're not interested in how it works and just want to calculate your chances of capturing a Pokémon, use the [catch rate calculator](https://www.dragonflycave.com/calculators/gen-iii-iv-catch-rate/).

**The Pokémon games prior to the fifth generation only work with integers. In practice, this essentially means that they round all numbers down, including at every intermediate step in a calculation. This will not be specifically included in the mathematical formulas on this page, but whenever you perform any action within a particular formula that results in a non-integer, you should round it down before performing the next action in the formula if you want to get a perfect result.**

## The Catch Rate Formula

Since the second generation, the Pokémon games' capture routines have followed the same basic structure: first, the game calculates a _final capture rate_ by plugging some variables into a mathematical formula, and then it decides whether the capture will be successful based on the final capture rate. In the third- and fourth-generation games, the formula for the final capture rate looks like this:

X=((3M-2H)⋅(C⋅B)3M)⋅SX=((3M−2H)⋅(C⋅B)3M)⋅S

If X is less than one at the end of the calculation, it is made 1 instead. The chance that the Pokémon will be successfully caught is designed to be _roughly_ **X/255**; however, this approximation can be **significantly off** due to rounding errors. To obtain an accurate estimate of your chances, use the [catch rate calculator](https://www.dragonflycave.com/calculators/gen-iii-iv-catch-rate/), or read the [Throwing a Ball](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/#throwing-a-ball) section below for more information on how the game decides whether the capture is successful.

The variables involved in the formula are _the current and maximum HP of the Pokémon_ (H and M respectively), _the instrinsic capture rate of the Pokémon's species_ (C), _the Pokémon's status condition if any_ (S), and _the type of Pokéball you're using and any conditions that may affect its performance_ (B, with some balls also directly affecting the C value). Each of them is covered in more detail below.

### M (Max HP) and H (Current HP)

The maximum and current HP of the Pokémon being captured. For a full-health Pokémon, we can simplify these variables out of the formula entirely and find that the final capture rate equals ((C \* B) / 3) \* S; lowering its HP will then raise the final capture rate linearly towards a theoretical limit of (C \* B) \* S, or around three times the full-health capture rate. In practice, it will never quite reach that maximum, however, because that would be if the Pokémon had 0 HP - at 1 HP the final capture rate will be slightly lower, by a factor of about 2 / 3M.

Somewhat counterintuitively, this means Pokémon are actually _easier_ to catch at higher levels: thanks to their higher maximum HP, their final capture rate will be closer to the 0-HP ideal when they've been False Swiped to 1 HP. However, the difference is very slight - it's at the very most a matter of whether the capture rate is 94% or 99% of the theoretical maximum.

### C (Capture Rate)

This number starts out being the intrinsic capture rate of the Pokémon whose capture is being attempted. This is a number that is set for every individual species of Pokémon, just like base stats, and represents how difficult this Pokémon is generally to catch: early-game common Pokémon such as Caterpie and Pidgey usually have a capture rate of 255, while most legendary Pokémon have a capture rate of 3, and others take various values in between. A higher catch rate yields a higher final capture rate and thus a greater chance of a successful capture. Capture rates for individual species can be found in any online Pokédex of your choice.

If you're playing Pokémon Colosseum or Pokémon XD: Gale of Darkness for the GameCube, note that the usual capture rates for the Shadow Pokémon's species will often be overridden there to make for a more sensible gradient of generally easier to generally harder captures throughout the game. The Shadow Pokémon with altered capture rates are:

Makuhita (Colosseum); Teddiursa (XD)The formula is not used; capture always succeedsHoundour (XD)C = 225Bayleef, Croconaw, Quilava (Colosseum)C = 180Delcatty, Golduck, Magcargo, Mawile, Venomoth (XD)C = 120Magneton, Marowak, Rapidash, Starmie (XD)C = 110Dugtrio, Lunatone, Rhydon (XD)C = 100Mantine, Misdreavus (Colosseum); Banette, Beedrill, Butterfree, Dodrio, Electabuzz, Hitmonchan, Hitmonlee, Kangaskhan, Lickitung, Magmar, Mr. Mime, Pinsir, Poliwrath, Sableye, Scyther, Solrock, Swellow, Tangela (XD)C = 90Altaria, Exeggutor, Farfetch'd, Hypno, Lapras, Manectric, Primeape, Salamence, Tauros (XD)C = 80Chansey, Snorlax (XD)C = 70Togetic, Tropius (Colosseum); Togepi, Mareep, Scizor (Japanese Colosseum Card e-Room exclusive)C = 45Articuno, Moltres, Zapdos (XD)C = 25Entei, Metagross, Raikou, Skarmory, Suicune (Colosseum)C = 15Tyranitar (Colosseum)C = 10

In the third-generation games and D/P/Pt, this was it and you could skip right down to the ball bonus section. HG/SS's Apricorn balls (and only Apricorn balls), however, do not give a ball bonus like regular Pokéballs, but rather modify the C value. (This was how all balls worked in the second-generation games, where Apricorn balls originated.) This has some interesting consequences, because the C value is capped at 255: Apricorn balls can't actually do anything for the the catch rate beyond that cap. For instance, since a Caterpie already has a catch rate of 255, Apricorn balls don't actually make it any easier to catch even if they should give a bonus, but regular balls will because they leave the catch rate alone and affect the B value instead.

If we call the original capture rate of the Pokémon R, then the C value will be determined as follows:

Fast BallC = R \* 4 if the Pokémon has a base Speed of 100 or more; C = R otherwiseHeavy BallC = R + 40 if the Pokémon weighs at least 409.6 kilograms (903.0 lbs); otherwise, R + 30 if the Pokémon weighs at least 307.2 kilograms (677.3 lbs); otherwise, C = R + 20 if the Pokémon weighs at least 204.8 kilograms (451.5 lbs); otherwise, C = R - 20 (there is a bug here - the game subtracts 20 if none of the bonuses apply and the _catch rate_ is less than 1024, which is always true, while they presumably intended to have it check the _weight_)Level BallC = R \* 8 if your Pokémon's level divided by four and rounded down is greater than the target Pokémon's level; otherwise, C = R \* 4 if your Pokémon's level divided by two and rounded down is greater than the target Pokémon's level; otherwise, C = R \* 2 if your Pokémon's level is greater than that of the target Pokémon; otherwise, C = RLove BallC = R \* 8 if the Pokémon is of the _same species_ as your Pokémon but the opposite gender; C = R otherwiseLure BallC = R \* 3 when fishing; C = R otherwiseMoon BallC = R \* 4 if the Pokémon belongs to a family that evolves by Moon Stone (those would be both Nidoran families, the Clefairy and Jigglypuff families, and the Skitty family); C = R otherwiseAll other (non-Apricorn) ballsC = R

Finally, if C is greater than 255 it is knocked back down to 255, and if you're throwing a Heavy Ball and have ended up with a negative catch rate, you must bump it back up to 1. (Interestingly, the game only bumps it up to 1 if it is indeed _less_ than zero, so you could theoretically have a catch rate of zero; however, as that could only happen with a 20-catch-rate Pokémon having a Heavy Ball thrown at it without a bonus, and as there are no Pokémon with a catch rate of 20, this will never actually happen.)

Note that the Heavy Ball, thanks to adding to the catch rate rather than multiplying it, works by somewhat different principles than other Pokéballs. It is not very practical to use a Heavy Ball on a Pokémon that already has a high catch rate, even if it is very heavy; a +20 Heavy Ball bonus for a Pokémon with an intrinsic catch rate of more than 40, for instance, would be outperformed even by a measly Great Ball. However, the proportional bonus is immense when it comes to Pokémon with low intrinsic catch rates, such as legendaries - with the usual legendary catch rate of 3, a +30 Heavy Ball bonus will effectively be a multiplier of 11, for instance, vastly outperforming any other ball in the game. Better yet, for low intrinsic catch rates the aforementioned limitation of the Apricorn balls will not be affecting you either.

What this amounts to, if we look at the weights and catch rates of the Pokémon existing in the fourth-generation games, is that Heavy Balls are highly effective for Giratina, Metagross, Heatran and Regigigas (normal catch rate 3, +40 Heavy Ball bonus; effective multiplier of 14.33), Arceus (normal catch rate 3, +30 Heavy Ball bonus; effective multiplier of 11), Groudon (normal catch rate 5, +40 Heavy Ball bonus; effective multiplier of 9), Regirock, Lugia, Rayquaza and Registeel (normal catch rate 3, +20 Heavy Ball bonus; effective multiplier of 7.67), and Kyogre (normal catch rate 5, +30 Heavy Ball bonus; effective multiplier of 7). However, for all other Pokémon you can do better with something like a nighttime Dusk Ball; while Snorlax (normal catch rate 25, +40 Heavy Ball bonus; effective multiplier of 2.6), Dialga (normal catch rate 30, +40 Heavy Ball bonus; effective multiplier of 2.33) and Steelix (normal catch rate 25, +30 Heavy Ball bonus; effective multiplier of 2.2) are more easily caught in Heavy Balls than any nonconditional ball, Heavy Balls just plain aren't worth it for any other Pokémon and you might as well be using Ultra Balls.

### B (Ball Bonus)

This number is a straightforward multiplier that changes depending on the type of Pokéball you're using and whatever conditions the individual Pokéballs might define for the bonuses they give. As detailed above, the HG/SS Apricorn balls apply their modifiers directly to the C value and thus all have a ball bonus of 1.

Poké Ball, Premier Ball, Luxury Ball, Heal Ball, Cherish Ball, Friend Ball, Fast Ball, Heavy Ball, Level Ball, Love Ball, Lure Ball, Moon BallB = 1Great Ball, Safari Ball, Sport BallB = 1.5Ultra BallB = 2Master Ball, Park BallThe formula is not used; capture always succeedsNet BallB = 3 if one of the Pokémon's types is Water or Bug; B = 1 otherwiseNest BallB = (40 - Pokémon's level) / 10, minimum 1Dive BallB = 3.5 when underwater in R/S/E or fishing/surfing in D/P/HG/SS; B = 1 otherwiseRepeat BallB = 3 if the Pokémon is already registered as caught in the Pokédex; B = 1 otherwiseTimer BallB = (number of turns passed in battle + 10) / 10, maximum 4Quick BallB = 4 on the first turn of a battle; B = 1 otherwiseDusk BallB = 3.5 at night and inside caves; B = 1 otherwise

Because the games only work with integers, they actually treat these multipliers as ten times higher than listed here and then divide by ten after the multiplier has been applied. The division by ten has here been incorporated into the B value itself to simplify the formula - the outcome is exactly equivalent.

### S (Status)

We all know that Pokémon are easier to catch when, say, asleep or paralyzed. This is entered into the formula here, with the status modifier. Basically, if the Pokémon is **asleep** or **frozen**, S = 2; if the Pokémon is **poisoned**, **paralyzed** or **burned**, S = 1.5; and otherwise, S = 1. In **Ruby and Sapphire**, but not FireRed/LeafGreen or Emerald, bad poisoning (caused by Toxic or Poison Fang) does **not** count as a status for the purposes of the capture formula, and thus does not increase the odds of capture at all.

## Throwing a Ball

After the final capture rate X has been calculated, the game still has to decide whether you actually capture the Pokémon. First of all, if X is 255 or more, then the capture will automatically succeed and you can skip the rest of this section. Otherwise, a second value Y is calculated from X (remember to round down after every step of the calculation):

Y=1048560√√16711680XY=104856016711680X−−−−−−√−−−−−−−−√

Once Y has been determined, the Pokémon will try up to four times to break out of the ball. For each attempt, the game will generate a random number between 0 and 65535 (inclusive); if the random number is greater than or equal to Y, the Pokémon will break out of the ball, but otherwise you will see the ball wobble on your screen and the Pokémon will try again. If all four of the Pokémon's breakout attempts fail, the ball will seal and the Pokémon will be successfully caught. Thus, if the Pokémon breaks out with no wobbles ("Oh no! The Pokémon broke free!"), it means it broke out on the first attempt, with the first random number; if it breaks out after one wobble ("Aww! It appeared to be caught!"), the first attempt failed but the second succeeded; if it breaks out after two ("Aargh! Almost had it!"), it only managed it on the third; and if it breaks out after three whole wobbles ("Shoot! It was so close, too!"), it was the fourth and final random number that got it out of the ball.

Since you need all four breakout attempts to fail in order to capture the Pokémon, the exact chance of success when you throw an individual ball (that is, the chance that all four random numbers are less than Y) is **(Y / 65536)4**. Note that since Y can at most be 6553 **5**, there is always a tiny chance of a breakout if it gets this far (but recall that if X is 255 the capture will always succeed, without Y being calculated at all).

How does this relate to X? Well, the numbers in the formula for Y look pretty big and scary, but it's actually (bar rounding) equivalent to this somewhat less scary formula:

Y=65535√√255XY=65535255X−−−√−−−−−√

And as it turns out, this almost completely cancels out with (Y / 65536)4, giving **X/255** as an approximation of the final chance of a capture. What the Y formula is trying to do is really just converting X into a value suitable for comparing the four breakout attempts against rather than a single random number as in G/S/C. However, thanks to rounding errors (which are also what the Y formula is trying to partly mitigate by using the big scary numbers instead of 65535 and 255), the final capture chance can deviate significantly from that "ideal" of X/255. For example, _all X values greater than 200 yield a Y value of 65535_, even though only 255 "should" give that result, and the second-highest possible Y - for X values between 160 and 200 inclusive - is only 61680. Yet again, be sure to correctly calculate Y and derive the chance from there, or use the [catch rate calculator](https://www.dragonflycave.com/calculators/gen-iii-iv-catch-rate/) for a guaranteed accurate result.

## Catch Rate Calculator

The [Gen III/IV Catch Rate Calculator](https://www.dragonflycave.com/calculators/gen-iii-iv-catch-rate/) can do all these calculations for you to find your chances of catching any Pokémon in any situation you wish.

Page last modified November 20 2025 at 17:02 UTC

## You May Also Enjoy

[**Gen I Capture Mechanics**\\
An analysis of the capture algorithm in R/B/Y and how the game determines how often the ball will wobble.](https://www.dragonflycave.com/mechanics/gen-i-capturing/)

[**Gen II Capture Mechanics**\\
A full breakdown of the gloriously buggy capture mechanics of Gold, Silver and Crystal.](https://www.dragonflycave.com/mechanics/gen-ii-capturing/)

[**Gen III/IV Catch Rate Calculator**\\
A calculator to find your chances of capturing a Pokémon in the third- and fourth-generation games.](https://www.dragonflycave.com/calculators/gen-iii-iv-catch-rate/)

[**Battle Mechanics**\\
An explanation of the inner workings of the mainline Pokémon battle system, including turn order, accuracy, critical hits, the damage formula, and secondary effects of moves.](https://www.dragonflycave.com/mechanics/battle/)

## Post comment

Inflammatory or off-topic comments will be deleted; please go to the [guestbook](https://www.dragonflycave.com/guestbook/) for discussion unrelated to this page. You can use [BBCode](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/#bbcode "Click for a list of formatting options.") (forum code) to format your messages.

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

![274](https://www.dragonflycave.com/sprites/gen8/home-thumb/274.png)Please type the name of the above Pokémon into this box ( [don't know it?](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/#))\*:The above sprite has a 1/8192 chance of being shiny. (Modern browsers will give it a yellow glow if so.)

Submit messageReset

## Comments

No comments on this page as of yet.