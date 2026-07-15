# Gen V Capture Mechanics

Thanks to poccil of [Ultimate Pokémon Center](http://upokecenter.dreamhosters.com/articles/) for unearthing the formulas for the first version of this page and [magical](http://turnipmints.mooo.com/~andrew/pokemon/) for independently analyzing the algorithm and giving some corrections.

The fifth generation brings several interesting new things to the table when it comes to capturing Pokémon. If you're wondering how things worked in the [first](https://www.dragonflycave.com/mechanics/gen-i-capturing/), [second](https://www.dragonflycave.com/mechanics/gen-ii-capturing/), [third and fourth](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/), [sixth and seventh](https://www.dragonflycave.com/mechanics/gen-vi-vii-capturing/) or [eighth](https://www.dragonflycave.com/mechanics/gen-viii-capturing/) generations, go there instead. If you just want the catch rate calculator to find out how likely you are to catch some Pokémon, that's [here](https://www.dragonflycave.com/calculators/gen-v-catch-rate/).

## A Note on Mathematical Functions

(If you don't care about math or ludicrously small margins of error in Pokémon formulas, feel free to [skip this bit](https://www.dragonflycave.com/mechanics/gen-v-capturing/#formula).)

One of the subtlest changes to the inner mechanics of Black and White compared to the previous Pokémon games is that they no longer feature pileups of rounding errors in all the formulas thanks to working with integers from start to finish. Instead, now we're dealing with numbers of a precision to the nearest 1/4096th in all the intermediate stages in the formulas.

What does this mean, exactly? Well, if you do calculations with three digits after the decimal point, that's accuracy to the nearest 1/1000th, while four digits would be to the nearest 1/10000th, so it's somewhere between those two levels of accuracy. The reason we're working with one four-thousand-ninety-sixths instead of something convenient like one thousandths is that in the DS's memory - as with all computers - the numbers are represented in binary, where the first binary digit ('bit') after the point means halves, the second means quarters, the third means eighths and so on - twelve bits after the "binary point", in particular, gives us accuracy to the nearest 1/4096th.

It can get a bit confusing to think of things in terms of 1/4096ths, and ultimately the fact is that gives us plenty enough accuracy to make the rounding stop truly mattering in all but the most exceptional of cases. Thus, in most of the discussion on this page I will pretend there is no rounding at all. However, if you want to be _completely_ accurate, the real formula for X for instance looks like this:

X=down(round(down(round(round((3M-2H)⋅G)⋅C⋅B)3M)⋅S)⋅E100)X=down(round(down(round(round((3M−2H)⋅G)⋅C⋅B)3M)⋅S)⋅E100)

where down(x) means rounding _down_ to the nearest 1/4096, equivalent to int(x \* 4096) / 4096, and round(x) means normal rounding to the nearest 1/4096, equivalent to round(x \* 4096) / 4096 or int(x \* 4096 + 0.5) / 4096. In the other formulas on this page, the contents of every set of parentheses will in reality be rounded to the nearest 1/4096 (the round function described here), but I won't bother to mention it.

## The Catch Rate Formula

Like the previous games, the fifth-generation games start by calculating a number referred to as the _final capture rate_. The formula is quite similar to that of the third- and fourth-generation games, with a couple of additions:

X=((3M-2H)⋅G⋅C⋅B3M)⋅S⋅E100X=((3M−2H)⋅G⋅C⋅B3M)⋅S⋅E100

Deriving your actual chance of catching the Pokémon from X is not quite so straightforward, however. To find the chance, use the [catch rate calculator](https://www.dragonflycave.com/calculators/gen-v-catch-rate/) or read the [Critical Captures](https://www.dragonflycave.com/mechanics/gen-v-capturing/#critical-captures) and [Throwing a Ball](https://www.dragonflycave.com/mechanics/gen-v-capturing/#throwing-a-ball) sections below.

Even aside from that, we have a couple more variables involved than in the previous games: we still have the _current and maximum HP_ (H and M), the _intrinsic catch rate of the species_ (C), the _ball bonus_ (B) and the _status condition if any_ (S), but add the _dark grass modifier_ (G) and the _Entralink modifier_ (E).

### M (Max HP) and H (Current HP)

The maximum and current HP of the Pokémon being captured. At full health, a Pokémon's X value starts out at G \* C \* B \* S \* E / 300 and becomes something approaching G \* C \* B \* S \* E / 100 - three times the full-health value - as you whittle it down. This all works just like in the third and fourth generations.

### G (Grass Modifier)

This is the first new value in the fifth-generation formula. In normal grass, caves or other terrains, this value is a neutral 1. However, if the battle takes place in thick grass (the ultra-tall darker-colored grass where the Pokémon are higher-leveled and wild double battles may occur), this value depends on how many Pokémon you've already caught (!). If more than 600 different species are "Caught" in your Pokédex, this value is 1 like normal; if you've caught 451-600 species it's 3686/4096 or roughly 0.9; if you've caught 301-450 it's 3277/4096 or around 0.8; if you've caught 151-300 it's 2867/4096 or around 0.7; if you've caught 31-150 it's 0.5; and if you've caught thirty Pokémon or less, it's 1229/4096 or around 0.3. Since this is a multiplier in the formula, higher is better - and if you haven't caught more than thirty Pokémon, this cuts your final capture rate to 30% of what it would otherwise be. Ouch.

What this basically means is that at the beginning of the game, when you've caught few Pokémon, it is _extremely_ difficult to capture Pokémon in thick grass. Try to put off catching Pokémon there until you're ready. Meanwhile, slightly lower-leveled versions of most of the same Pokémon tend to be found in the normal grass on the same routes anyway, so it's better to go for it there.

### C (Capture Rate)

This is simply the intrinsic capture rate of the Pokémon species whose capture is being attempted, with common early-game Pokémon like Patrat and Lillipup having a capture rate of 255 (meaning easy to catch), most legendaries having a capture rate of 3 (meaning hard to catch), and other Pokémon taking on various values in between. You can find this value in most online Pokédexes. The capture rates of old Pokémon have not changed since the fifth generation, so any current data you find is also correct in B/W/B2/W2.

### B (Ball Bonus)

This is a multiplier that depends on the type of Pokéball you're using and the various conditions that affect the performance of individual Pokéballs, as follows:

Poké Ball, Premier Ball, Luxury Ball, Heal Ball, Cherish Ball, Dream Ball (outside Entree Forest)B = 1Great BallB = 1.5Ultra BallB = 2Master Ball, any ball inside Entree ForestThe formula is not used; the capture is always successfulNet BallB = 3 if one of the Pokémon's types is Water or Bug; B = 1 otherwiseNest BallB = ((41 - Pokémon's level) / 10), minimum 1Dive BallB = 3.5 when on water; B = 1 otherwiseRepeat BallB = 3 if the Pokémon's species is already registered as caught in the Pokédex; B = 1 otherwiseTimer BallB = 1 + (number of turns passed in battle \* 1229/4096), maximum 4. Since 1229/4096 is approximately 0.3, the bonus reaches its cap on the eleventh turn.Quick BallB = 5 on the first turn of a battle; B = 1 otherwiseDusk BallB = 3.5 outside at night and inside caves or dark places; B = 1 otherwise (including lit indoor areas at night)

The only balls that have significantly changed since the fourth generation are the Quick Ball, which now dominates all other balls with a multiplier of 5 on the first turn of battle, and the Timer Ball, which has received a massive buff: instead of taking a mind-numbing thirty turns to start to shine, a Timer Ball will now be better than a Dusk Ball on the tenth turn of battle and max out on the turn after. The Nest Ball also now maxes out at a ball bonus of four like the Timer Ball now instead of 3.9.

There's a small but noteworthy change to the Dusk Ball, too: in lit indoor areas at night, it does _not_ get a bonus like it used to in Gen IV. As best I can tell, this is a Gen V only thing.

### S (Status)

The status modifier, which has been slightly changed since the fourth generation: if the Pokémon is **asleep** or **frozen**, S = 2.5 (making these better statuses even better than before); if the Pokémon is **poisoned**, **paralyzed** or **burned**, S = 1.5; and otherwise, S = 1.

### E (Entralink Powers)

This is the other new factor in the formula. During normal gameplay this value is 100. However, by playing Entralink missions with your friends over local wireless, you can receive a Capture Power from another player, which can change this value to 110, 120 or 130 depending on the level of the Capture Power (one, two or three up arrows give 110, 120 or 130 respectively; S and MAX both also give 130). This gives a 10%, 20% or 30% boost to the X value, respectively.

## Critical Captures

Once the game has determined X, it is time for one of Black and White's interesting new features, "critical captures". Like a critical hit when attacking, this is a (partly) random occurrence where the ball will make a whistling sound while flying, shake a little in mid-air after sucking the Pokémon in, and then shake only once on the ground before either breaking or successfully capturing it. As you might guess, a critical capture is considerably more likely to succeed than a normal capture.

So how does the game determine whether you're going to get a critical capture? Well, first it calculates a value CC:

CC=⌊min(255,X)⋅P6⌋CC=⌊min(255,X)⋅P6⌋

After the game has determined CC, it is compared against a random number ranging from 0 to 255, and if the random number is less than CC, the capture will be a critical capture. In other words, the probability of a critical capture equals **CC / 256**.

CC, as you can see, is dependent on both the already-calculated X (capped at 255) and a mysterious P value. What is this P value? Well. Remember the grass modifier G and how it depends upon your Pokédex completion?

Yep.

### P (Pokédex Modifier)

If more than 600 species are registered as caught in your Pokédex, this value is 2.5; if you've caught 451-600, this value is 2; if you've caught 301-450, this value is 1.5; if you've caught 151-300, it is 1; if you've caught 31-150, it is 0.5; and if you've caught thirty Pokémon or less, it's 0. In short, critical captures are _much_ more likely the more Pokémon you've already caught, and in fact they're just plain impossible at the beginning of the game.

It seems a little disappointing that the chances of getting a critical capture are only really good when your chances of catching the Pokémon normally would have been great anyway. But any chance of a critical capture at all will boost your overall chances by a little, and once you've caught a lot of Pokémon, critical captures can make things somewhat significantly easier.

## Throwing a Ball

Like the third- and fourth-generation games, if X is 255 or more, the capture will automatically succeed; otherwise, the game will plug X into another formula:

Y=⌊65536√√255X⌋Y=⎢⎣⎢⎢⎢⎢⎢⎢65536255X−−−√−−−−−√⎥⎦⎥⎥⎥⎥⎥⎥

Although it looks a bit different, this is really just a simplified version of the same Y formula used in the third and fourth generation, made more accurate because it's not rounded down at every step.

Then the Pokémon will attempt to break out of the ball. In a regular capture, it will make three attempts; in a critical capture, however, it will only make one. (In the third and fourth generation, it would always make four attempts - this makes _all_ captures significantly easier in the fifth generation unless they're in thick grass). For each attempt, a random number between 0 and 65535 inclusive will be generated; if the random number for an attempt is greater than or equal to Y, it will break out of the ball after a given number of wobbles depending on how many attempts failed previously, but if all attempts fail, the Pokémon will be successfully caught.

The fifth generation lost the previous straightforward relationship between the random numbers and wobbles, but nonetheless, if the first random number is greater than or equal to Y, the Pokémon will burst out immediately (in a normal capture) or after one shake (in a critical capture), with the message "Oh no! The Pokémon broke free!" If the first random number is less than Y but the second is greater than or equal to it, the Pokémon will burst out after one shake with the message "Aww! It appeared to be caught!" If the first two are less than Y but the third check fails, it will burst out after three shakes (note there is no such thing as two shakes in the fifth generation) with the message "Aargh! Almost had it!" And if all three random numbers are less than Y, or the only random number in the case of a critical capture, the Pokémon is successfully caught.

The probability that a single random number will be less than Y is Y / 65536; the probability that three random numbers will all be less than Y is **(Y / 65536)3**. If you plug the formula for Y into that and simplify, this is equivalent to **(X / 255)0.75**, and since the square roots in the fifth generation are pretty exact, that's quite a good approximation. However, that's an approximation of your chance of succeeding with a non-critical capture only; with critical captures, the chance is even higher than that, depending on your critical capture chance. The final chance that you will capture the Pokémon then equals the chance of a successful critical capture plus the chance of a successful normal capture, or **(CC / 256) \* (Y / 65536) + (1 - CC / 256) \* (Y / 65536)3**.

## Catch Rate Calculator

The [fifth-generation catch rate calculator](https://www.dragonflycave.com/calculators/gen-v-catch-rate/) now has its own page, where you can determine exactly how likely you are to capture a given Pokémon under the given circumstances without doing all the confusing math described above.

Page last modified November 20 2025 at 17:02 UTC

## You May Also Enjoy

[**Gen V Catch Rate Calculator**\\
A calculator to find your chances of capturing a Pokémon in the fifth-generation games.](https://www.dragonflycave.com/calculators/gen-v-catch-rate/)

[**Gen III/IV Capture Mechanics**\\
Learn all about the nitty-gritty mechanics behind the capture formula used in the third- and fourth-generation games.](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/)

[**B/W Changes**\\
A list of changes and additions made in Black and White compared to the previous mainline Pokémon games.](https://www.dragonflycave.com/unova/bw-changes/)

[**B2/W2 Changes**\\
Stuff that changed between Black and White on the one hand and Black 2 and White 2 on the other hand.](https://www.dragonflycave.com/unova/b2w2-changes/)

## Post comment

Inflammatory or off-topic comments will be deleted; please go to the [guestbook](https://www.dragonflycave.com/guestbook/) for discussion unrelated to this page. You can use [BBCode](https://www.dragonflycave.com/mechanics/gen-v-capturing/#bbcode "Click for a list of formatting options.") (forum code) to format your messages.

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

![342](https://www.dragonflycave.com/sprites/gen8/home-thumb/342.png)Please type the name of the above Pokémon into this box ( [don't know it?](https://www.dragonflycave.com/mechanics/gen-v-capturing/#))\*:The above sprite has a 1/8192 chance of being shiny. (Modern browsers will give it a yellow glow if so.)

Submit messageReset

## Comments

No comments on this page as of yet.