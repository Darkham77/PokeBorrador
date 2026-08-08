# Gen I Capture Mechanics

Special thanks to [a\_magical\_me](http://turnipmints.mooo.com/~andrew/pokemon/), who started analyzing the algorithm, let me use their notes and then provided me with an assembly dump to pick up where they left off. The hacking genius is mostly theirs.

If you were an avid player of Red, Blue and Yellow, you may have read [the](https://www.dragonflycave.com/mechanics/gen-ii-capturing/) [other](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/) [capture](https://www.dragonflycave.com/mechanics/gen-v-capturing/) [mechanics](https://www.dragonflycave.com/mechanics/gen-vi-vii-capturing/) [sections](https://www.dragonflycave.com/mechanics/gen-viii-capturing/) and fleetingly wondered, "But what about the times in R/B/Y when it would say, 'You missed the POKéMON!'? What was going on _then_? How much of this stuff was the same back then, anyway?"

How much, indeed? As it turns out, barely any. The R/B/Y capture algorithm is drastically different from that of the later games; in particular, it really is an _algorithm_ rather than mostly a straightforward formula. And it is also, as it happens, quite interesting - especially if you, like me, have always sort of wondered exactly how that worked. So sit back, relax, and let's take a look at the insides of the game. Or, well, if you don't care about the insides of the game, you can always skip down to the [basic summary of how capturing is different in R/B/Y](https://www.dragonflycave.com/mechanics/gen-i-capturing/#english).

Meanwhile, if all you want to do is find out how likely you are to capture a Pokémon in R/B/Y, you'll want the [catch rate calculator](https://www.dragonflycave.com/calculators/gen-i-catch-rate/).

## The Algorithm

The capture algorithm proper, as listed below, applies to _regular wild Pokémon battles_. A few sanity checks are handled before we get to that part:

- If you're not in battle, you can't use a ball. "OAK: This isn't the time to use that!"
- If this is a trainer battle, the capture immediately fails. "The trainer blocked the BALL! Don't be a thief!"
- If this is not the Old Man's tutorial battle in Viridian City, then if both your party and your current box are full, you can't throw a ball. "The POKéMON BOX is full! Can't use that item!"
- If this is a battle against an unidentified ghost, or if the Pokémon is a Marowak and the player's current location is the sixth floor of Pokémon Tower (in an unmodified game, the latter will only happen for the special ghost Marowak), the capture immediately fails. "It dodged the thrown BALL! This POKéMON can't be caught!"

Otherwise, to determine the outcome of a thrown ball, the game executes the following procedure (cleaned up and tweaked for human presentation, of course). Note that any time it speaks of division, it means _integer division_: the result is an integer and the remainder is simply discarded. Thus, for example, if it says "Divide 5 by 2", the result is simply 2, not 2.5.

01. If the ball being thrown is a Master Ball, the Pokémon is automatically **caught**. Skip the rest of the procedure. ( **Yes**, the Master Ball is an automatic guaranteed success, as long as you pass the sanity checks above. There is an extremely persistent rumour that it actually has a 1/256 or 1/65536 chance of missing; whatever you may have heard, wherever you heard it, it is **not true**. It is true that _moves_ that were meant to be 100% accurate would have a 1/256 chance of missing in R/B/Y, but this has no relation to how the Master Ball works in any game; it always simply skips the calculation entirely.)
02. Generate a random number R1, with a range depending on the ball used:
    - If it's a Poké Ball, R1 ranges from 0 to 255 (inclusive).
    - If it's a Great Ball, R1 ranges from 0 to 200 (inclusive).
    - If it's an Ultra or Safari Ball, R1 ranges from 0 to 150 (inclusive).
03. Create a status variable S:
    - If the targeted Pokémon is asleep or frozen, S is 25.
    - If the targeted Pokémon is poisoned, burned or paralyzed, S is 12.
    - Otherwise, S is 0.
04. Subtract S from R1 (to avoid confusion with the original R1, I will refer to the result as R\*).
05. If R\* is less than zero (i.e. if the generated R1 was less than S), the Pokémon is successfully **caught**. Skip the rest of the procedure.
06. Calculate the HP factor F:
    1. Multiply the Pokémon's max HP by 255 and store the result in F.
    2. Divide F by
       - 8 if the ball used was a Great Ball.
       - 12 otherwise.
    3. Divide the Pokémon's current HP by four (if the result is zero, bump it up to 1). Divide F by this number and make that the new F.
    4. If F is now greater than 255, make it 255 instead.
07. If the base catch rate of the Pokémon is less than R\*, the Pokémon automatically **breaks free**. Skip to step 10.
08. Generate a second random number R2 ranging from 0 to 255 (inclusive).
09. If R2 is less than or equal to the HP factor F, the Pokémon is **caught**. Skip the rest of the procedure.
10. If we get here, the capture fails. Determine the appropriate animation to show:
    1. Multiply the Pokémon's base catch rate by 100 and store the result in a wobble approximation variable W.
    2. Divide W by a number depending on the ball used, rounding the result down:
       - If it was a Poké Ball, divide by 255.
       - If it was a Great Ball, divide by 200.
       - If it was an Ultra or Safari Ball, divide by 150.
    3. If the result is greater than 255, the ball will wobble three times; skip the rest of this subprocedure. (This can't actually happen, since the Pokémon's base catch rate can never be greater than 255 and we just multiplied it by 100 and then divided it by something greater than 100, but given [the shenanigans that can happen when Game Freak forgets to include failsafes](https://www.dragonflycave.com/mechanics/gen-ii-capturing/), I don't blame them.)
    4. Multiply W by F (the HP factor calculated above).
    5. Divide W by 255.
    6. Add a number if the Pokémon has a status affliction:
       - If the Pokémon is asleep or frozen, add 10 to W.
       - If the Pokémon is poisoned, burned or paralyzed, add 5 to W.
    7. Show the animation and message corresponding to W:
       - If W is less than 10, the ball misses ("The ball missed the POKéMON!").
       - If W is between 10 and 29 (inclusive), the ball wobbles once ("Darn! The POKéMON broke free!").
       - If W is between 30 and 69 (inclusive), the ball wobbles twice ("Aww! It appeared to be caught!").
       - Otherwise (if W is greater than or equal to 70), the ball wobbles three times ("Shoot! It was so close too!").

## What It Means

(Psst, if you don't speak math, you can skip down to the [plain English summary](https://www.dragonflycave.com/mechanics/gen-i-capturing/#english), which has almost no math at all. It's simple, I promise!)

So what does this algorithm actually _mean_ for capturing in R/B/Y? How is it different from the later games? (In the rest of this discussion, I will assume you are not using a Master Ball; that case is trivial and it would be a bother to keep mentioning it.)

Well, first, let's look at what the structure of the algorithm actually theoretically means for our chances of capturing the Pokémon. (This gets a bit mathematical, but bear with me.) Let's call the Pokémon's base catch rate C and create a ball modifier variable B to stand for the range of the first random number R1: 256 if the ball is a Poké Ball, 201 if the ball is a Great Ball and 151 if the ball is an Ultra Ball. (Note that this is one higher than the maximum numbers discussed in the algorithm above; this is because a random integer between 0 and X inclusive can take on X+1 possible values, the way that 0–2 inclusive means _three_ values, 0, 1 and 2.) Depending on where R1 falls in this range, three different things can happen:

- If **R1 is less than the status variable S**, the Pokémon is immediately **caught**.
- If **R1 is greater than or equal to S, but less than or equal to S + C**, the game calculates a second random number R2 between 0 and 255 inclusive and an HP factor F. These numbers are then compared:

  - If **R2 is less than or equal to F**, the Pokémon is **caught**.
  - If **R2 is greater than F**, the Pokémon breaks free.
- If **R1 is greater than S + C**, the Pokémon breaks free.

Of the total of B possible R1 values, S of them result in the first path (auto-capture), C + 1 of them (up to a maximum of B - S, since there are only B - S values left) result in the second path where R2 and the HP factor F are calculated, and the rest (if any) result in the third path (auto-failure). We can visualize it like this:

![](https://www.dragonflycave.com/rbycapture/vis-general.png)

_If_ we assume that R1 and R2 are perfectly randomly distributed (please put a pin in this), it's straightforward to derive a formula for the total odds of capture from this. What we want is the sum of the two possible paths leading to the Pokémon being successfully caught: first, the case where R1 is within the auto-capture range (the chance of which should be S / B, since S out of B possible values of R1 give us that result), and second, the case where R1 is within that white range in the middle (the chance of which should be min(C + 1, B - S) / B) _and_ subsequently R2 <= F (the chance of which should be (F + 1) / 256 - again, it's F + 1 because we're counting the R2 values from 0 to F _inclusive_). This directly gives us the following:

Chancetheoretical=SB+min(C+1,B-S)B⋅F+1256

Note that these are not mathematical operations performed by the game; the only actual arithmetic it's doing is within the F variable, while this is a theoretical probabilistic formula derived from the structure of the algorithm. That means _these_ divisions are not integer divisions, and this formula can be rearranged at will without producing rounding errors or the like. Thus we could, for instance, combine those divisions by B and get this equivalent, perhaps somewhat cleaner formula:

Chancetheoretical=S+min(C+1,B-S)⋅F+1256B

You'll see that version again a bit later, but for most of the explanation I'll be referencing the former version. Recall also that the F value, the HP factor, is derived from the Pokémon's maximum HP (M), current HP (H), and a value we can call G, which is 8 for Great Balls and 12 for all other balls, as follows:

F=min(255,⌊⌊M⋅255G⌋max(1,⌊H4⌋)⌋)

You probably still don't have a very good idea what any of this really means, but that's okay; we're getting to that. Let's go over the values in the formula, what they mean and how they theoretically affect the result.

### S (Status Conditions)

This is a simple variable: it is 25 if the Pokémon you're trying to catch is asleep or frozen, 12 if it's poisoned, burned or paralyzed, and 0 otherwise.

Unlike the post-Advance games' formulas (but like the [second-generation formula](https://www.dragonflycave.com/mechanics/gen-ii-capturing/)), the status is factored in not as a multiplier but an addition. This leads to two interesting conclusions. First, it means that status conditions essentially give a certain baseline chance of capturing the Pokémon - S out of the B possible R1 values will always mean you catch the Pokémon, _regardless_ of its catch rate and HP. Second, addition has a proportionally greater influence the _smaller_ the original value is - think of how if you add 100 to 100, you're doubling it, whereas if you add 100 to one million, the change is barely worth mentioning. This means that while status does provide a substantial improvement to the odds of a successful capture even if your chances are already pretty good, it makes a truly _massive_ difference when you're trying to catch something like a legendary. This is extremely important to keep in mind when capturing hard-to-catch Pokémon in Red, Blue and Yellow.

### C (Capture Rate)

This is simply the base catch rate of the Pokémon species, ranging from 3 (for legendaries) to 255 (for common Pokémon like Caterpie and Pidgey). The values for the Kanto Pokémon are mostly unchanged in the later generations, with a couple of exceptions: Raticate went from a catch rate of 90 in R/B/Y and G/S/C to a catch rate of 127 in R/S, and in Yellow only, Dragonair and Dragonite's catch rates were changed to 27 and 9 respectively, while both in R/B and the later games they have a catch rate of 45 like Dratini. For any other Pokémon, you can look up the catch rate in an online Pokédex of your choice and it will be the same as in R/B/Y. (Of course, if you use my [calculator](https://www.dragonflycave.com/calculators/gen-i-catch-rate/), you won't have to look anything up.)

If you look back at the visualization image above, the capture rate's role in the algorithm is to determine the size of the white part of the top bar: out of the B possible values R1 can take, C + 1 of them (or more accurately, min(C + 1, B - S), since the capture rate window obviously can't be bigger than all the B values that aren't in the status auto-capture window) will lead to the HP factor check happening. All values of R1 that don't fall either within the status auto-capture window or the capture rate window are auto-failures. For a legendary (with capture rate 3), there are therefore always only four (3 + 1) possible R1 values for which the game will look at the legendary's HP at all, for instance.

That capping when C + 1 is greater than B - S has some interesting consequences - one of them is that effectively, _once the Pokémon's catch rate is higher than B - S, going beyond that no longer has any effect on the algorithm_. Thus, for instance, if you're using an Ultra Ball (B = 151), there is no difference between a Pokémon with catch rate 190 and one with catch rate 255. They simply become exactly equivalent.

### B (Ball Modifier) and G (Great Ball Modifier)

Quite unlike the ball bonus multiplier of the later games, there are two ball-related modifiers in the R/B/Y formula, both of which are primarily divisors, meaning a _lower_ value for them should in principle mean a _higher_ chance of a successful capture. In the later games, a Poké Ball has a ball bonus multiplier of 1, with a Great Ball having a ball bonus of 1.5 and an Ultra Ball having a ball bonus of 2, forming a straightforward linear progression from worse to better balls. In R/B/Y, however, the ball modifier B is 256 for Poké Balls, 201 for Great Balls and 151 for Ultra Balls and Safari Balls, and furthermore the G value in the calculation of the HP factor (the F variable) is 8 for Great Balls but 12 for all other balls.

This makes it harder to see at a glance just how much more effective the better balls actually are than plain Poké Balls in R/B/Y. However, we can look at the balls' role in the algorithm and figure out what the general idea is meant to be. Let's look at our visualization again:

![](https://www.dragonflycave.com/rbycapture/vis-general.png)

- **Firstly**, the B value determines the _size of the top bar_. A lower B value helps by making the red auto-failure portion on the right side smaller, and thus also making the status auto-capture window and the capture rate window proportionally bigger. For a Pokémon with a high catch rate, however, where there _is_ no auto-failure window, _all_ that lowering the B value past that will do is make the status window (if any) proportionally bigger. Thus, for a Pokémon with a catch rate of 255, a Great or Ultra Ball won't actually be any better than a Poké Ball unless there's a status condition! For any non-statused Pokémon with a catch rate of 200+, it makes no difference to the R1 check whether you use a Great or Ultra Ball. And for any Pokémon with a catch rate over 150, the Ultra Ball won't have the full advantage it's meant to.
- **Secondly**, the G value is part of the _HP factor_. G is a divisor on the HP factor value, and it's 8 for Great Balls but 12 for all other balls - which means that until it hits its cap of 255, **the HP factor is significantly higher for Great Balls than for other balls, including Ultra Balls** \- specifically, about 33% higher! This is good, since the _second_ random number R2 is being compared against the HP factor, and you catch the Pokémon if it's less than or equal to it. Even for Pokémon with relatively low catch rates, this actually theoretically outweighs the Ultra Ball's advantage as outlined above if there is no status condition.

This means that **Great Balls are actually better than Ultra Balls in many cases, by design**! Pokémon with very high catch rates, in particular, will be _way_ easier to catch in a Great Ball than an Ultra Ball, especially when not afflicted with a status condition, and even Pokémon with lower catch rates should be a little easier to catch in a Great Ball if there's no status, assuming the cap on the HP factor isn't tripped. When is that cap tripped? Well...

### F (HP Factor)

This is where the current health of the Pokémon you're trying to catch comes in, making it easier to capture a Pokémon that has been weakened. To recap, the F value is given by the following formula:

F=min(255,⌊⌊M⋅255G⌋max(1,⌊H4⌋)⌋)

where M stands for the Pokémon's maximum HP, H stands for the Pokémon's current HP, G stands for the Great Ball modifier discussed above (8 for Great Balls, 12 otherwise), and ⌊x⌋ stands for rounding x down to the nearest integer. A higher F value means a greater chance of a successful capture.

First things first, let's see what sort of value is going to come out of this for both possible G values. If we plug in H = M to represent a full-health Pokémon and ignore rounding errors, we get...

F=min(255,⌊⌊M⋅25512⌋max(1,⌊M4⌋)⌋)≅M⋅25512M4=255⋅412=2553=85 (Poké/Ultra/Safari Ball)

F=min(255,⌊⌊M⋅2558⌋max(1,⌊M4⌋)⌋)≅M⋅2558M4=255⋅48=2552=127 (Great Ball)

Again, note how the Great Ball gives a substantially bigger value for the HP factor. Thanks to rounding errors, the actual HP factor can be a bit higher than these values for a full-health Pokémon, depending on its exact HP value, but it can never be lower.

Ignoring rounding errors, the formula the HP factor is going for is essentially 255 \* (M / 2H) for Great Balls and 255 \* (M / 3H) for all other balls, which at a glance makes sense as a way to do something like this: at full HP you'll get 255 \* (1/2 or 1/3) out of that, and then as H drops, the value will rise. But if left unchecked, the result of that would just rise ever faster and faster, which would lead to absurd results - the value for 4 HP would be twice as high as for 8 HP. That's where the HP factor cap comes in: once you've whittled the Pokémon's HP down enough to make the HP factor value 255, **lowering its HP more will no longer have any effect upon its catch rate**.

So, just when is this cap of 255 tripped? Well... it only takes a little rearranging of those formulas to show that it happens at around half HP for a Great Ball, and around one third HP for other balls. (This also means that while Great Balls start out with a higher HP factor, Ultra Balls will _catch up_ if you lower the Pokémon's HP.)

You may be doing a double-take right now. But yes, it's true! With or without status effects, regardless of catch rates, _lowering the Pokémon's HP below one third, or one half if you're using a Great Ball, does absolutely nothing to help you catch it_. Continuing to painstakingly deal tiny slivers of damage beyond that is simply a waste of your time and effort. No wonder False Swipe wasn't made until the second generation - leaving a Pokémon at exactly one HP is not actually useful in any fashion in R/B/Y! All you need is to get it down to one third and start throwing balls.

For a low-health Pokémon whose HP factor has reached the cap, regardless of the ball used, the theoretical formula simplifies beautifully to

ChanceLowHP=S+min(C+1,B-S)B

### W (Wobble Approximation)

But what about the wobbling? What's all that weird calculation the game is doing just to figure out how many times the ball is going to wobble?

Well. Let's analyze just what the game is doing there, shall we? Most of the variables involved in the wobble calculation are the same or basically the same as in the actual capture formula, so I'll use the same variable names, but since the status factor in the wobble formula is _not_ the same (it's 10 for sleep/freezing and 5 for poisoning/burns/paralysis instead of 25 and 12 respectively) I'll call that S2. With this in mind, here's the formula the game is evaluating:

W=⌊⌊C⋅100B-1⌋⋅F255⌋+S2

Hmm. Doesn't this formula look just the slightest bit familiar? No? How about if we ignore the roundings and rearrange it just a bit...

W=100⋅(B-1)⋅S2100+C⋅F255B-1

...and note that for Poké Balls in particular, (B-1)⋅S2100 gives a result uncannily close to the S variable from the theoretical success formula...

W=100⋅S\*+C⋅F255B-1

...doesn't it look just a little bit like simply a hundred times a variation of another formula we know, with some off-by-one errors and a cap removed?

Chance=S+min(C+1,B-S)⋅F+1256B

Now, I can't claim I _know_ what Game Freak were thinking when they programmed this calculation. But I would bet money that what the game is trying to do here with the wobbles is to _calculate a percentage approximation of its own success rate_. When the ball misses, it's because the game estimates your chances are less than 10%, whereas if it wobbles once it's guessing 10-29%, twice means 30-69%, and three times means 70% or more.

This approximation isn't _completely_ in line with that theoretical formula. They failed to account for the status bonus being affected by the ball modifier (as noted above, (B-1)⋅S2100 only approximates S for Poké Balls); the one that should be added to the C value has some significance for very low catch rates; and of course, it ignores the cap on C + 1. What's up with that? Well, they could be mistakes - we _are_ talking about the same programmers who made the [stat modification system](https://www.dragonflycave.com/mechanics/gen-i-stat-modification/), after all - but more charitably, I expect they wouldn't really have particularly wanted to waste the additional overhead it would take to be more precise about it for something not exactly significant; it's not as if the player even has much of an idea what the wobbles are supposed to mean in the first place! (The collective fandom had no idea about this until I first wrote it up here in early 2011, to the best of my knowledge.) It's a serviceable enough approximation for the game's purposes, and that's plenty.

Notice anything interesting about it, though? This is a completely static calculation with no random factor to it whatsoever, and that means (unlike the later games) _the number of wobbles in R/B/Y is always the same given the Pokémon's HP, catch rate, status and the type of ball_. If you just keep throwing the same balls, without the Pokémon's HP or status changing in between, you will _always see the same number of wobbles on failure_, depending on the outcome of this calculation.

That means that, for instance, if you've landed in one of those situations where it says the ball misses, such as throwing Ultra Balls at a full-health Articuno, it will _always_ say the ball misses - except when you're about to catch it for real! So the moment you see it actually go into the ball, you can already start celebrating. It was easy back in the day to assume that if the ball was missing, the Pokémon was impossible to catch without weakening it more - but this was never the case. It's just R/B/Y's version of when the ball breaks open immediately without wobbling in the later games.

Conversely, if you try to catch a sleeping full-health Caterpie in a Great Ball, the ball will always wobble three times if you fail - you'll never see the ball miss there, or break out after one or two wobbles. This also contributed to the sense that the ball missing must mean something special: it barely ever happened, because it would _only_ happen for Pokémon with very low catch rates. Many of us would be seeing that message for the first time when battling our first legendary.

## But Wait, There's More...

All of the above is assuming that the random numbers in the formula are truly random and independent of each other. _However_, it's actually a bit more complicated than that. Computers cannot produce true randomness, so instead they simulate it with _pseudo-random number generators_, and as a consequence of how the random number generator in R/B/Y is designed and how it's being used here, the actual results can be significantly skewed when you're using Great or Ultra/Safari Balls.

The details of this are pretty involved, and so I've explained it on a separate page about the [RNG mechanics](https://www.dragonflycave.com/mechanics/gen-i-rng/). It's pretty fascinating, I promise - but if you'd really rather not, or if you try to read it and get completely lost, feel free to ignore the _why_ and just move on to the _what_.

In very short, the skewed RNG means that...

- Poké Balls work exactly as intended; there is no weirdness with them.
- Great Balls are _close_ to how they were intended, underperform _ever so slightly_ for high catch rates but are _better_ than expected for lower catch rates especially as the Pokémon's HP is lowered.
- Ultra and Safari Balls significantly underperform against Pokémon at more than two thirds of their HP with no status but also significantly _over_ perform when the Pokémon is brought to low HP first.
- Status conditions significantly overperform compared to the theoretical S/B baseline chance that they should give when using Great or Ultra/Safari Balls; they are especially effective for the latter, because all RNG weirdness effects are bigger for Ultra/Safari Balls, but status conditions are also better than they should be when using Great Balls.
- Ultra Balls are actually _worse_ than Poké Balls against a full-health Pokémon with a high (>200) base catch rate! (But this is an edge case; please don't conclude from this that Ultra Balls are worse than Poké Balls _in general_.)
- The hard-to-catch Pokémon in the Safari Zone - Chansey, Tangela, Kangaskhan, Scyther, Pinsir, Tauros, and Dragonair in Yellow - are genuinely _significantly harder to catch than intended thanks to RNG nonsense_, and unfortunately in the Safari Zone you can't mitigate this by inflicting status or lowering their HP.

Check the [RNG mechanics page](https://www.dragonflycave.com/mechanics/gen-i-rng/) for a look at why all of this happens and some fun visualizations of it.

## In Plain English

Confused by all the math talk? All right; here's a plain, summarized, as-few-numbers-as-possible version of the unexpected conclusions of the algorithm. Remember, this is all stuff that applies _to R/B/Y only_; it does _not_ work this way in the later games, including FireRed and LeafGreen.

First of all, **regardless of anything else, if the targeted Pokémon has a status affliction, you get a set extra chance to capture it depending on the status and the Pokéball you're using, before the game even starts checking the Pokémon's HP and whatnot.** These chances are listed in the following table:

| Ball | PSN/PAR/BRN | SLP/FRZ |
| --- | --- | --- |
| Poké Ball | 4.69% | 9.77% |
| Great Ball | 7.62% | 14.52% |
| Ultra Ball | 11.07% | 21.11% |

Your overall chance of capturing the Pokémon if it has a status affliction will _never_ be less than the chance stated above, even if it's a legendary at full health - this is a check the game applies before it even looks at the HP or catch rate, after all. This makes status _by far the most viable way of increasing your chances of getting a legendary_ \- the improvements to be made by lowering their HP are frankly negligible in comparison. (The chance of catching an average full-HP sleeping Mewtwo in an Ultra Ball is 21.634%; if you also bring it to low HP, that only boosts it to 23.752%.)

Second of all, **lowering a Pokémon's HP down further than to about one third of its max HP has no effect at all on its catch rate.** If you're using Great Balls, in fact, that cutoff point is at one half rather than one third. Painstakingly shaving off slivers until the HP bar is one pixel wide is and always has been a waste of time in R/B/Y. _However_, lowering its HP to one third _is_ highly beneficial if there's no status or the Pokémon has a relatively high catch rate, especially if you're using an Ultra Ball.

Third, **Great Balls are actually better than Ultra Balls in many cases** \- specifically, if the Pokémon is at **around half of its HP or more**, and _either_ there is no status condition in play _or_ the Pokémon has a high intrinsic catch rate. However, **if you lower the Pokémon's HP down below one third, Ultra Balls will always be at least as good**, and for lower catch rates with a status condition, Ultra Balls will be better even at full HP. Generally, you should use Great Balls if you want to catch quickly, without having to inflict status or damage, or if it's a Pokémon with a high catch rate - but for all difficult captures, the best strategy is to put it to sleep and use an Ultra Ball.

Fourth, **wobbles are a loose indicator of the game's approximation of your chances of capturing the Pokémon at the current status and HP with the current ball.** This approximation can be significantly flawed, especially when status or high catch rates are involved, but I would guess accuracy wasn't particularly a priority for the programmers, considering it's just determining how many times you'll see a ball wobble on the screen before a breakout. Roughly:

| Wobbles | Message | Approximated chance of capture |
| --- | --- | --- |
| 0 | "You missed the POKéMON!" | < 10% |
| 1 | "Darn! The POKéMON broke free!" | 10-30% |
| 2 | "Aww! It appeared to be caught!" | 30-70% |
| 3 | "Shoot! It was so close too!" | >= 70% |

Notice that **the message "You missed the POKéMON!" is simply R/B/Y's version of the ball breaking without wobbling**. The message confusingly implies that the Pokémon is currently impossible to catch, but in reality, if you keep chucking balls, you'll eventually get it - it's just that your chances are low.

The catch rate calculator below will show this approximation and the number of wobbles in addition to the actual chance when "Show detailed report" is on, if you're interested.

## Visualization

To visualize how your chances of capturing a Pokémon change depending on HP, status, ball and catch rate, you can play with the graph below.

The graph shows dotted lines for the theoretical catch rate for Great and Ultra Balls - i.e. the catch rate as calculated by the intended formula, as if the game had an unbiased random number generator, as a point of comparison for the actual catch rates. There is no theoretical line for Poké Balls, since Poké Balls always work as intended with no RNG bias.

(Worth noting: the graph is somewhat idealized; in actuality, the lines on it should be jagged like a staircase, because the HP factor jumps at 4HP intervals, rather than changing smoothly. I chose to assume the Pokémon has 200 max HP, plot 50 data points for each line, and let the graph draw straight lines between them to better show the overall shape of the graph.)

Pokémon:

![](https://www.dragonflycave.com/sprites/gen8/home-thumb/001.png) Bulbasaur

Status:

NonePoisonedParalyzedBurnedAsleepFrozen

Game:

Red/Blue Yellow

Capture rate by HP (catch rate 45)Ultra Ball, actualUltra Ball, theor…Great Ball, actualGreat Ball, theoreticalPoké Ball100% HP80% HP60% HP40% HP20% HP0%10%20%30%40%Current HPChance of capture

| Current HP | Ultra Ball, actual | Ultra Ball, theoretical | Great Ball, actual | Great Ball, theoretical | Poké Ball |
| --- | --- | --- | --- | --- | --- |
| 100% HP | 6.451% | 10.234% | 11.433% | 11.443% | 6.036% |
| 98% HP | 6.522% | 10.353% | 12.015% | 11.711% | 6.107% |
| 96% HP | 6.638% | 10.591% | 12.276% | 11.89% | 6.247% |
| 94% HP | 6.802% | 10.829% | 12.602% | 12.158% | 6.387% |
| 92% HP | 6.944% | 11.067% | 12.99% | 12.426% | 6.528% |
| 90% HP | 7.088% | 11.305% | 13.374% | 12.694% | 6.668% |
| 88% HP | 7.262% | 11.543% | 13.82% | 12.963% | 6.808% |
| 86% HP | 7.437% | 11.781% | 14.279% | 13.32% | 6.949% |
| 84% HP | 7.773% | 12.138% | 14.606% | 13.588% | 7.159% |
| 82% HP | 8.044% | 12.376% | 15.111% | 13.946% | 7.3% |
| 80% HP | 8.572% | 12.733% | 15.61% | 14.303% | 7.51% |
| 78% HP | 9.029% | 12.971% | 16.158% | 14.661% | 7.651% |
| 76% HP | 9.636% | 13.328% | 16.597% | 15.019% | 7.861% |
| 74% HP | 10.756% | 13.685% | 17.256% | 15.466% | 8.072% |
| 72% HP | 11.882% | 14.161% | 17.856% | 15.913% | 8.353% |
| 70% HP | 12.773% | 14.518% | 18.402% | 16.36% | 8.563% |
| 68% HP | 13.779% | 14.994% | 18.99% | 16.807% | 8.844% |
| 66% HP | 15.056% | 15.351% | 19.681% | 17.343% | 9.055% |
| 64% HP | 15.898% | 15.827% | 20.268% | 17.879% | 9.335% |
| 62% HP | 16.829% | 16.422% | 20.863% | 18.416% | 9.686% |
| 60% HP | 17.549% | 16.898% | 21.544% | 19.042% | 9.967% |
| 58% HP | 18.556% | 17.493% | 22.145% | 19.667% | 10.318% |
| 56% HP | 19.397% | 18.088% | 22.81% | 20.382% | 10.669% |
| 54% HP | 20.493% | 18.802% | 23.5% | 21.187% | 11.09% |
| 52% HP | 21.613% | 19.516% | 24.138% | 21.992% | 11.511% |
| 50% HP | 22.856% | 20.349% | 24.84% | 22.886% | 12.003% |
| 48% HP | 24.098% | 21.182% | 24.84% | 22.886% | 12.494% |
| 46% HP | 25.345% | 22.015% | 24.84% | 22.886% | 12.985% |
| 44% HP | 26.878% | 23.086% | 24.84% | 22.886% | 13.617% |
| 42% HP | 28.236% | 24.157% | 24.84% | 22.886% | 14.249% |
| 40% HP | 29.614% | 25.347% | 24.84% | 22.886% | 14.951% |
| 38% HP | 30.936% | 26.656% | 24.84% | 22.886% | 15.723% |
| 36% HP | 32.452% | 28.203% | 24.84% | 22.886% | 16.635% |
| 34% HP | 33.913% | 29.869% | 24.84% | 22.886% | 17.618% |
| 32% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 30% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 28% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 26% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 24% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 22% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 20% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 18% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 16% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 14% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 12% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 10% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 8% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 6% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 4% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |
| 2% HP | 34.402% | 30.464% | 24.84% | 22.886% | 17.969% |

Ultra Ball, theore…

## Catch Rate Calculator

The [catch rate calculator for the first-generation games](https://www.dragonflycave.com/calculators/gen-i-catch-rate/) is now its own page; look there to easily determine your chances of capturing a Pokémon in R/B/Y without manually working through the formulas.

Page last modified November 20 2025 at 17:02 UTC

## You May Also Enjoy

[**Gen I Capture RNG Mechanics**\\
A full explanation of the random number generator in the first-generation games and how it affects capturing.](https://www.dragonflycave.com/mechanics/gen-i-rng/)

[**Gen I Catch Rate Calculator**\\
A calculator to find your chances of capturing a Pokémon in R/B/Y.](https://www.dragonflycave.com/calculators/gen-i-catch-rate/)

[**R/B/Y Safari Zone Mechanics**\\
An in-depth explanation and calculator for how R/B/Y's Safari Zone trolled everyone.](https://www.dragonflycave.com/mechanics/gen-i-safari-zone/)

[**R/B/Y Stat Modification**\\
An explanation of the very buggy mechanics of stat modification in the first-generation games, with a calculator to drive the point home.](https://www.dragonflycave.com/mechanics/gen-i-stat-modification/)

## Post comment

Inflammatory or off-topic comments will be deleted; please go to the [guestbook](https://www.dragonflycave.com/guestbook/) for discussion unrelated to this page. You can use [BBCode](https://www.dragonflycave.com/mechanics/gen-i-capturing/#bbcode "Click for a list of formatting options.") (forum code) to format your messages.

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

![537](https://www.dragonflycave.com/sprites/gen8/home-thumb/537.png)Please type the name of the above Pokémon into this box ( [don't know it?](https://www.dragonflycave.com/mechanics/gen-i-capturing/#))\*:The above sprite has a 1/8192 chance of being shiny. (Modern browsers will give it a yellow glow if so.)

Submit messageReset

## Comments

My own messages will be signed as Butterfree, with the Admin label below my name. If someone signs as Butterfree without that label, it's probably not me.

Pages:



**1**

> ![](https://www.dragonflycave.com/sprites/gen8/icons-unified-small/667.png)
>
> Butterfree
>
> Admin
>
> Website: [The Cave of Dragonflies](https://www.dragonflycave.com/)
>
> In response to: [post by Ahmet](https://www.dragonflycave.com/mechanics/gen-i-capturing/#post-10678)
>
> It sounds like you've got an idea of the kinds of results you want, for the capture formula, but I think the first thing you need to do is work out exactly what the algorithm you want to implement is. If you want it to work similarly to the later games, then you can check my capture mechanics pages for the later games and adjust that formula to your liking until you have something you feel happy with.
>
> Either way, though, if you want to completely rewrite the capture logic (which it sounds like you do), or write your own event scripts, you're going to have to learn to write code. I know [this site](https://gbdev.io/gb-asm-tutorial/) has a tutorial on Game Boy assembly; you could maybe check that out? Since you're not developing a game from scratch you could skip or skim some sections, but you'll at least want to get acquainted with what the assembly instructions do, how to understand what the code is doing, and how to write instructions that will accomplish what you want.
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10679/#responding-to)\[08/09/2025 14:35:16\]

> ![](https://www.dragonflycave.com/sprites/gen8/icons-unified-small/794.png)
>
> Ahmet
>
> In response to: [post by Butterfree](https://www.dragonflycave.com/mechanics/gen-i-capturing/#post-10674)
>
> Thank you very much for your answer. I've actually made quite a few changes in eng∈e.asm. I'll even write down some of the changes.
>
> For example, for \*\*sleep\*\*, I enabled the ability to attack on the turn the Pokémon "woke up."
>
> \\* Sleep-inducing attacks will no longer hit a Pokémon that is behind a Substitute.
>
> \\* The duration of sleep was 0-6 turns (1-7 with the "woke up" turn); I reduced it to 2-4 turns.
>
> \\* We couldn't open the attack sub-menu while asleep or frozen. This even caused a glitch for defrosting. I've enabled the ability to select an attack while asleep or frozen.
>
> \\* Fire-type Pokémon can no longer be frozen.
>
> \\* Ground and Electric-type Pokémon can no longer be paralyzed.
>
> \\* I increased the duration of confusion from 2-4 turns to 2-5 turns.
>
> I tried to make many attacks more reasonable and logical. For example:
>
> \\* \*\*Glare:\*\* 75% —> 100% accuracy
>
> \\* \*\*Hydro Pump:\*\* 80% —> 85% accuracy
>
> \\* \*\*Thunder:\*\* Paralysis side-effect chance 10% —> 30%
>
> \\* \*\*Thunder:\*\* 70% —> 85% accuracy
>
> \\* \*\*Dragon Rage:\*\* Now functions like Outrage. 120 power, 2-3 turn rampage, causes confusion afterward.
>
> For Pokémon with a low Special stat, I set their Special stat to be their Special Defense from later generations (this is why Hitmonchan, for example, became much stronger).
>
> \\* I completely changed the stats of some Pokémon. For example, \*\*Ditto's\*\* base stats are all 100. This way, it became a Pokémon with good enough stats to gain an advantage on the turn it uses Transform.
>
> \\* I made changes to the type chart. For example, I made \*\*Poison —> super-effective against Dragon\*\*. I added thematic and balancing elements.
>
> \\* The \*\*Ghost\*\* type is now a Special type, and \*\*Dragon\*\* is a Physical type.
>
> \\* I added the \*\*Eeveelutions\*\* and \*\*Tyrogue\*\* into some of the MissingNo. slots.
>
> \\* I changed the sprites of many poorly drawn Pokémon. I took some sprites from Yellow, some from GSC. I pixel-by-pixel ported \*\*Glaceon\*\* and \*\*Leafeon\*\* from DPP.
>
> \\* I changed some of the in-game text to be more thematic and interesting.
>
> \\* I expanded some maps. For example, I extended \*\*Vermilion City\*\* to the west, opening it up to the Cycling Road. I extended \*\*Viridian City\*\* to the east, also connecting it to the Cycling Road. I extended the southern routes and \*\*Cinnabar Island\*\*'s map to the south, making the southern sea larger. I'm planning to add small islets there (for example, an island where Mew appears as a stationary encounter or an Eeveelution island).
>
> \\* I changed the evolution method for clustered Pokémon like \*\*Dugtrio\*\* and \*\*Magneton\*\* to use an item I placed in an empty item slot, called the "Stellarstone." The Stellarstone will be an item that has the power to summon the siblings or symbiotes of the Pokémon it's used on.
>
> \\* I changed the animations for some attacks (for example, I added a "beam" effect to Hydro Pump).
>
> I've made many other similar changes.
>
> \\* I made \*\*Umbreon\*\* a Ghost-type and made it evolve with a Moon Stone.
>
> \\* For \*\*Glaceon\*\*, I added an \*\*Ice Stone\*\* into a glitch item slot.
>
> \\* I changed some of the TMs.
>
> \\* I changed the Pokémon rosters and levels of some opponents.
>
> \\* \*\*Mt. Moon\*\* now truly looks like a mountain with a tunnel entrance leading into it.
>
> Although I've been able to make all these changes, there are some I'm struggling with.
>
> \\* For example, I want the Pokémon \*\*menu icons\*\* to be exactly like in Generation 2, but I don't know how to do it.
>
> \\* Or I want to add \*\*stationary Pokémon\*\* (like a stationary Gengar on the top floor of the Pokémon Tower, a stationary Raticate in the Underground Path, or a stationary Weezing or Muk in the Power Plant/Celadon), but I'm not exactly sure how to add them.
>
> \\* I want to add \*\*new event scripts\*\* to the game, but I looked and saw that even for Gary to come and battle us and then leave, there are quite a lot of lines written. The only event I was able to add myself was an Omastar fossil picture in the Pewter Museum.
>
> \\* I'd like to add a stationary \*\*Chansey\*\* or \*\*Tauros\*\* in the Safari Zone.
>
> I changed the types of some Pokémon:
>
> \\* \*\*Lapras:\*\* Ice/Dragon
>
> \\* \*\*Gyarados:\*\* Water/Dragon
>
> \\* \*\*Charizard:\*\* Fire/Dragon
>
> \\* \*\*Seadra:\*\* Poison/Dragon (with Kingdra's stats)
>
> \\* \*\*Aerodactyl:\*\* Rock/Dragon
>
> \\* \*\*Kabutops:\*\* Bug/Rock
>
> \\* \*\*Ninetales:\*\* Fire/Ghost
>
> \\* \*\*Venomoth:\*\* Bug/Ghost
>
> \\* \*\*Umbreon:\*\* Ghost (with Vaporeon's stats)
>
> \\* \*\*Golduck:\*\* Water/Ghost
>
> I know I've written very generally, please forgive me. I can't seem to change the \*\*catch mechanic\*\*; it feels too difficult to understand.
>
> For instance, I think the catch mechanic should be like this:
>
> \\* It should be a bit more like in the later generations.
>
> \\* Bringing a Pokémon from max HP down to 1 HP should \*\*triple\*\* the catch chance (the current system is somewhat close but not exactly the same).
>
> \\* Status conditions should have a \*\*multiplying\*\* effect instead of an \*\*adding\*\* one. For example, Poison, Burn, Paralyze x1.5; Sleep, Freeze x2.0. You mentioned this in another thread. Because it's additive, it becomes incredibly easy to catch even Mewtwo. All you have to do is use a Chansey or Articuno to repeatedly use Ice Beam and wait for it to freeze.
>
> \\* Thematically, even though it's not in the Pokémon games, catching a Pokémon should become harder as its level increases. But it's also harder to get a high-level Pokémon down to low HP. Plus, it deals more damage to your own Pokémon. So, to not "double-penalty" the act of catching a high-level Pokémon but still make it a bit harder, a formula like this could work: Levelmodifier=1-(≤vel150).
>
> \\* For example, a level 70 Mewtwo at 1 HP and asleep should have a 5-10% chance of being caught with an Ultra Ball.
>
> \\* \*\*Magikarp\*\* should be catchable at full health with a Poké Ball, regardless of its level.
>
> \\* Basic Pokémon like \*\*Rattata\*\* or \*\*Pidgey\*\* at levels 5-10 should have a 50% chance of being caught in a Poké Ball at full HP with no status, and a 100% chance once at 50% HP.
>
> \\* The formula from later generations is actually quite fair. It's just that the catch rates themselves are much higher than they should be. For example, it's absurd for a Pokémon with high potential like \*\*Staryu\*\* to have a catch rate of 225. If the calculation formula from later generations is to be used, the catch rates of many average Pokémon should be compressed into the 10 to 130 range.
>
> I've talked about a lot, but even these things would make the first-generation games extremely thematic.
>
> \\* I made \*\*in-battle evolving\*\* possible, just like in the anime. It works without major issues, despite some minor glitches.
>
> \\* The in-game story could be expanded. Since I'm having trouble adding event scripts, I'm trying to expand the story through text and map edits.
>
> And one of the things I want the most but is the hardest to add: a \*\*Battle Tower\*\*, even a primitive one, for Generation 1.
>
> \\* Memory problems could arise, scripting its event could be difficult, and also, we can set exact DVs for opponents, but there's no formula for their Stat Experience. I couldn't add that either; I struggled with it.
>
> \\* The idea is to have it generate 7 consecutive trainers with pre-set, randomized Pokémon rosters each time you enter, just like in Generation 2 or, if possible, Generation 3.
>
> I considered implementing the \*\*physical-special split\*\*, but it doesn't seem very necessary right now. I currently only see it as a bit of a problem for Kingler and no other Pokémon.
>
> I've explained the things I've done, the things I want to do, and the things I haven't been able to do. I hope my ideas excite you and that you can offer some advice. Thank you very much.
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10678/#responding-to)\[08/09/2025 12:42:19\]

> ![](https://www.dragonflycave.com/sprites/gen8/icons-unified-small/470.png)
>
> Butterfree
>
> Admin
>
> Website: [The Cave of Dragonflies](https://www.dragonflycave.com/)
>
> In response to: [post by Ahmet](https://www.dragonflycave.com/mechanics/gen-i-capturing/#post-10668)
>
> Assembly (the language these games are written in) is quite challenging to program in and likely not what you want to go for as your first foray into programming; if I were you, I would leave significant changes to program logic alone when making your ROM hack until you have more experience. If there's something in particular that you want to do with the logic that's relatively simple, though (as in, something like adjusting certain values or such, rather than making fundamental changes to the mechanics of how it works), I could help you with what you'd need to modify.
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10674/#responding-to)\[06/09/2025 16:06:13\]

> ![](https://www.dragonflycave.com/sprites/gen8/icons-unified-small/556.png)
>
> Ahmet
>
> I'm working on a Pokered ROM hack. I'm trying to make the game more themed in the ROM hack I'm making (making the type chart more fair, adding more Ghostbug Dragon types, changing or increasing the base stats of weaker Pokemon thematically, more themed situations, etc.). I also want the capture mechanics to be smoother, but I have no idea how to write code. I have no coding knowledge either. I can only understand 20-30% of the lines in the .asm files in the disassembly folder. I can't understand the commands, etc. there. When I try to explain the situation to ChatGPT, Gemini, or DeepSeek and have them write code, they can't write proper code. Can you give me any advice?
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10668/#responding-to)\[06/09/2025 13:45:38\]

> ![](https://www.dragonflycave.com/sprites/gen8/icons-unified-small/494.png)
>
> BT
>
> I've wondered about this for a while. Great explanation!
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10551/#responding-to)\[28/06/2025 01:54:35\]

Pages:



**1**

Ultra Ball, theoretical