# R/B/Y Safari Zone Mechanics

A staple of the Pokémon series since the originals is the Safari Zone: a special place with Pokémon that aren't found anywhere else (and some that are) where instead of getting to use your own Pokémon to weaken and capture them, you must employ more old-fashioned methods while the Pokémon may run at any moment. While they haven't been in every game, they shake up the usual routine of catching Pokémon and have had various interesting mechanics through the generations - however, the very most interesting has to be the original.

## How It Works

In every Safari Zone, the player is unable to use their own Pokémon at all. Instead, when you encounter a Pokémon you have four options: throwing one of the limited number of Safari Balls you have; an _aggressive action_ used to make the Pokémon easier to catch; an _enticing action_ used to make it less likely to run away; or running away from the battle yourself.

In Red, Blue and Yellow, the aggressive action is called **Rock**, and the enticing action is called **Bait**. The basic idea is this: throwing a rock will double your chances of catching the Pokémon, but it will also make the Pokémon _angry_ for 1-5 turns. Conversely, throwing bait will halve your chances of catching the Pokémon, but cause the Pokémon to be _eating_ for 1-5 turns. While angry, a Pokémon is twice as likely to run on any given turn as if it were in its neutral state, while it is four times less likely to run while it is eating than in a neutral state.

However, there are several more interesting details and subtleties to how Safari Zone battles happen.

### Your Turn

#### Throwing a Ball

Capturing in the Safari Zone follows the regular [R/B/Y capture algorithm](https://www.dragonflycave.com/mechanics/gen-i-capturing/), though since neither the Pokémon's HP nor its status can be affected and the only balls available are Safari Balls (identical to Ultra Balls), a lot of things are abstracted out in the Safari Zone. Unfortunately, thanks to the game's [flawed RNG](https://www.dragonflycave.com/mechanics/gen-i-rng/), Safari Balls underperform against full-health Pokémon, making all capture chances in the Safari Zone lower than intended. The capture chance maxes out when the Pokémon has a catch rate of 150 or more, for which the chance will be about 27-30% depending on rounding errors; all other Pokémon are harder than that.

The catch rate C starts out being, as in regular captures, the intrinsic catch rate of the Pokémon species. However, unlike regular captures, your actions in the Safari Zone can directly modify C, as hinted above.

#### Throwing Rocks/Bait

Rocks and bait have two distinct effects. First, every time a rock is thrown, the catch rate C is doubled (though it is capped at 255, so if doubling would make the catch rate more than that, it is made 255 instead), and every time bait is thrown, C is halved and rounded down. This happens even if the Pokémon is already angry or eating, and it happens completely blindly - if the Pokémon has a catch rate of 235, and you throw a rock to give it a catch rate of 255, then throwing bait will take that catch rate down to 127, rather than "canceling out" to give it the same catch rate as before.

Since the capture chance maxes out when the catch rate is 150 as explained above, there is no point throwing rocks at any Pokémon with an intrinsic catch rate of 150 or more, or more than one rock at a Pokémon with a catch rate of 75 or more, or more than two rocks at one with a catch rate of 38 or more. As it happens that covers all Pokémon that can be found in the Safari Zone except for Chansey (catch rate 30) and Dragonair (catch rate 27 in Yellow), who would need three rocks to go over 150.

Secondly, while a battle in the Safari Zone is going on, the game also keeps track of two counters, the "angry counter" and the "eating counter", which stand for the number of angry or eating turns the Pokémon has left. They both start out at zero; however, when a rock or bait is thrown, a random number between 1 and 5 inclusive will be generated and added to the appropriate counter (i.e. the angry counter if it's a rock, or the eating counter if it's bait), while the other counter will be reset to zero regardless of its previous value. This means only one of the counters can be nonzero at any given time. Since the random number is added to whatever value the counter already has, throwing further rocks at a Pokémon that is already angry will prolong its angry state, and likewise with throwing bait at an eating Pokémon. The eating and angry counters are both capped at 255.

### The Pokémon's Turn

You always get the first turn in the Safari Zone, but on the Pokémon's turn, two things happen.

First, the game will check if either of the angry and eating counters is nonzero. If so, then a message saying "Wild \[Pokémon\] is angry!" or "Wild \[Pokémon\] is eating!" as appropriate is shown and the counter is decreased by one. If the angry counter is decreased to zero this way, the Pokémon's catch rate will also be _reset to its initial catch rate_, regardless of how it has been modified in the battle before this point; note that this last bit does **not** happen when a Pokémon stops eating, nor when the angry counter is reset to zero because you threw a bait.

After this, the game will perform a calculation to determine whether the Pokémon will run away on this turn. The run chance depends only on which state the Pokémon is in - angry, eating or neutral - but not on _how many_ times you've thrown rocks/bait in any way: a Pokémon that you've thrown five rocks at followed by one bait will be exactly as happy to stick around as one that you threw a bait at on the first turn. Note that the Pokémon's actual current state does not necessarily correspond to the state indicated by the message that was just shown, since the message indicates only that the counter in question was nonzero _before_ it was subtracted from. This also means that if you throw a rock or bait and the random number generated is 1, you will see an angry/eating message, but the Pokémon will in fact be back in its neutral state before even the run check is performed.

The run calculation itself goes as follows:

1. Make a variable X equal to the low byte (i.e. the remainder if you divide by 256) of the Pokémon's Speed ( _not_ the base Speed of the species, but the individual's actual Speed).
2. Double X.
3. If the outcome is greater than 255 (i.e. if the Pokémon's Speed was 128 or more), the Pokémon automatically runs. Skip the rest of the procedure.
4. Modify X again if the Pokémon is in a non-neutral state:
   - If the Pokémon is angry, double X again (if it becomes greater than 255, make it 255 instead).
   - If the Pokémon is eating, divide X by four.
5. Generate a random number R between 0 and 255 inclusive.
6. If R is less than X, the Pokémon runs away.

All in all, this means that so long as (the low byte of) the Pokémon's Speed is less than 128 (which it always will be in the actual game - the highest Speed any Pokémon actually found in the Safari Zone can have is 75), the chance that it will run is 2\*Speed/256 if it's in a neutral state, min(255, 4\*Speed)/256 if it's angry, or floor(Speed/2)/256 if it's eating.

Crucially, since this is the actual individual Speed and not the base Speed of the species, _lower-leveled individuals are less likely to run_. While Scyther at level 25 or 28 have around or above a 50% chance of running every turn in a neutral state, for instance, Yellow's level 15 Scyther are considerably easier to catch, with only a 32% chance of running in a neutral state at the most. Thus, perhaps the best piece of strategic advice for the Safari Zone is to go for the lowest-leveled possible version of your desired Pokémon, given the lower-leveled version isn't unacceptably rare.

## Strategy

So, well, how should one go about trying to achieve success in the Safari Zone, other than trying to catch lower-leveled Pokémon? Four basic kinds of strategies come to mind:

- **Balls only.** This is the simplest way to go about the Safari Zone - just madly lob balls at everything you want to catch and pray that they don't run before you catch them.
- **Rocks, then balls.** Throw some sensible number of rocks, then lob balls and hope you catch it before it either runs or calms down and resets the catch rate. If you see it's not angry anymore, start again from scratch with the rocks.
- **Bait, then balls.** Throw some bait to put the Pokémon in the eating state and make it stick around, then throw balls and hope the reduced catch rate doesn't come back to bite you. Unlike with rocks, where once the Pokémon stops being angry you're back at square one, it's not quite as obvious here that you should throw more bait once the Pokémon stops eating - each bait you throw lowers the catch rate more, after all.
- **Rocks to increase catch rate, then bait to get it to stay, then balls.** Throw a rock or two (or three) and then immediately throw bait. Provided your first rock doesn't generate one as the number of angry turns (in which case the Pokémon will calm down immediately and reset the catch rate), you'll manage to increase the Pokémon's catch rate before the bait gets thrown, meaning you end up with a catch rate of the same, double or quadruple the original (depending on the number of rocks), but a 4x reduced chance of running _and_ assurance that the catch rate won't reset when it returns to the neutral state.

There are other possible strategies, but they appear obviously flawed - if you were to throw bait and then a rock, for instance, you'd end up with a normal catch rate but a higher running chance after wasting two turns, which can't possibly be helpful. These are the main ones that at a glance appear to hold some kind of promise.

You may think, as I did when I was initially working this out, that the fourth strategy has the most potential. However, as it turns out, the R/B/Y Safari Zone is broken: the balls-only strategy nearly always wins by a considerable margin, at least in terms of your overall chance of catching the Pokémon per encounter. Wasting your time on bait and rocks is only worth it in a couple of very exceptional cases.

### Wait, What?

Good question. If you don't care about getting an intuitive grasp on why this is true, feel free to [skip to the Safari Zone calculator.](https://www.dragonflycave.com/mechanics/gen-i-safari-zone/#calculator)

Here's the thing. The entire Safari Zone experience basically simplifies to a game where you and the Pokémon alternate turns, with each of you having a given chance of "winning" on each of your turns (you win if you catch the Pokémon, while the Pokémon wins if it runs). When you throw bait or a rock, however, you do that _instead_ of throwing a ball on that turn, while the Pokémon will continue to have a chance of running on every single one of its turns; essentially, you are forgoing one of your turns (attempts to "win") in exchange for a later advantage.

What is that later advantage, then, and is it worth losing that turn? Well, in the case of a rock, you double your chances of winning (catching the Pokémon) for up to four subsequent turns - but you _also_ double the Pokémon's chances of winning (running away), and because you used up your turn throwing the rock, it's the Pokémon that has the next move.

You can hopefully see how that's not really a recipe for success. However, it's not quite as bleak as it appears, thanks to the one place where the simplification breaks down: you have a limited number of Safari Balls. A rock, by doubling both yours and the Pokémon's chances of winning each turn, will shorten the average duration of the battle. Thus, if you have sufficiently few balls and the Pokémon has a sufficiently low catch rate and Speed, to the point that in an average battle against it you'd run out of balls before either catching it or it running, throwing a rock and shortening the battle so your balls will last can actually be worth it, even at the aforementioned cost. For instance, if you only have one Safari Ball left, then you can either throw that one ball with a regular catch rate or throw some rocks first, which will make your single ball much more likely to be effective once you do throw it; you'll only get one attempt to catch it either way. The risks will still outweigh the benefits if the Pokémon is pretty speedy, since then it will be likely to run before you can actually throw the ball at all, but for a sufficiently slow target (for a single Safari Ball, the highest Speed where a rock will be worth it is 25 or so), rocks can be a good idea when you don't have a lot of Safari Balls left.

Throwing multiple rocks can also help, at least in theory, since more rocks will continue to double your chances of catching the Pokémon without raising the running chance further. Primarily, in many of those situations where a lack of Safari Balls means one rock is a good idea, two (or possibly three) rocks improve your chances even further, though the range of situations where this works is even narrower than for one rock. Technically multiple rocks can also help in general for Pokémon with very low Speeds and low catch rates - however, that's low Speeds as in single digits, and no Pokémon that fit the bill are actually found in the Safari Zone, making that point kind of moot. Otherwise, if you have plenty of balls to spare, the free angry turns they usually get to run away before you even start trying to catch them just result in a disadvantage you can't make up for.

What about bait? Bait is immediately somewhat more promising than rocks, since it halves your chance of "winning" but _quarters_ the Pokémon's. However, bait also differs from rocks in that the catch rate doesn't go back to normal after the Pokémon stops eating, and just like rocks shorten the duration of the battle, bait prolongs the battle - it makes both parties _less_ likely to win on subsequent turns. And the longer the battle goes on, the more the up-to-four turns (remember, the counter is decreased before the run check) that the Pokémon is actually less likely to run diminish in significance compared to all the turns after the Pokémon stops eating, when it will still have a lowered catch rate but a regular chance of running. That's besides the fact that again you must forgo a turn to throw the bait in the first place. In fact, as it turns out this makes bait wholly useless: there is not even in theory a Speed/catch rate combination for which bait will do you any good.

Where does this leave that especially promising-looking "rocks, then bait" strategy? Ultimately, it's stuck in the same rut rocks are: it's normally only useful for Pokémon with such ludicrously low Speed that they don't actually exist in the Safari Zone, and unfortunately, while rocks at least have a niche when you're running low on balls, you're always going to be better off just throwing however many rocks you're going to throw and then throwing your ball than throwing the rocks and then wasting your time on bait if you only have a couple of balls left. This strategy requires wasting several turns without throwing any balls, during some of which the Pokémon will have an increased chance of running, and to make matters worse, if the number of angry turns generated is one, you're going to lose even the rock's advantage and end up with the bait's lowered catch rate after all that preparation. It just kills it.

So, again, in nearly every case the best strategy is to just throw balls and hope you get lucky. That is, however, assuming that what you want to maximize is your chance of success per encounter: since rocks shorten the battle and make for fewer Safari Balls required, rocks may actually save you time and money.

The Safari Zone calculator below includes a variety of strategies, despite their mostly limited usefulness; play around with it if you think you might go with a different one.

## Safari Zone Calculator

Use this tool to calculate your chances of capturing a given Pokémon.

As it is, it only includes Pokémon that are actually found in the Safari Zone in either Red, Blue, Yellow, or the Japanese-exclusive Blue version. If there is demand for adding other Pokémon just for the hell of it, I can do that too, but in the meantime, I feel this makes more sense.

In addition to your chances of capturing the Pokémon with any or all of the provided strategies, the calculator will also provide you with the basic capture rate and run chance per turn. When you select a Pokémon and game, additionally, it will give you the locations, levels and rarities at which the Pokémon is found in the Safari Zone in that game, so that you can perhaps attempt to find your Pokémon at a lower level or in an area where it's more common.

The base percentages the calculator gives may not match exactly up with those given by my [R/B/Y catch rate calculator](https://www.dragonflycave.com/calculators/gen-i-catch-rate/), since this calculator makes the simplifying assumption that the Pokémon's HP and Speed are equal to the average HP/Speed a wild Pokémon of the given species/level would have, while the catch rate calculator does the entire calculation for each possible HP IV and takes the average of the actual outcomes. I chose not to do the more accurate calculation here because this calculation is both already relatively slow and involves two different stats - trying every possibility would mean doing that whole relatively slow calculation up to 256 times, which just seems like way more trouble than it's worth.

Pokémon:

ChanseyCuboneDoduoDragonairDratiniExeggcuteGoldeenKangaskhanKrabbyLickitungMagikarpMarowakNidoran (f)Nidoran (m)NidorinaNidorinoParasParasectPinsirPoliwagPsyduckRhyhornScytherSlowpokeTangelaTaurosVenomothVenonat

Game: RedBlue/JP GreenJP BlueYellow

This Pokémon is found in **Area 2** at level 26 (4%, grass) and **Center area** at level 23 (1%, grass).

Level:

Safari Balls remaining:

Strategy:Show allBalls onlyOne rockTwo rocksThree rocksBait repeatedlyOne baitTwo baitThree baitRock, then baitTwo rocks, then baitThree rocks, then bait

Page last modified March 14 2026 at 15:42 UTC

## You May Also Enjoy

[**Gen I Capture Mechanics**\\
An analysis of the capture algorithm in R/B/Y and how the game determines how often the ball will wobble.](https://www.dragonflycave.com/mechanics/gen-i-capturing/)

[**Gen I Catch Rate Calculator**\\
A calculator to find your chances of capturing a Pokémon in R/B/Y.](https://www.dragonflycave.com/calculators/gen-i-catch-rate/)

[**Gen I Capture RNG Mechanics**\\
A full explanation of the random number generator in the first-generation games and how it affects capturing.](https://www.dragonflycave.com/mechanics/gen-i-rng/)

[**R/B/Y Stat Modification**\\
An explanation of the very buggy mechanics of stat modification in the first-generation games, with a calculator to drive the point home.](https://www.dragonflycave.com/mechanics/gen-i-stat-modification/)

## Post comment

Inflammatory or off-topic comments will be deleted; please go to the [guestbook](https://www.dragonflycave.com/guestbook/) for discussion unrelated to this page. You can use [BBCode](https://www.dragonflycave.com/mechanics/gen-i-safari-zone/#bbcode "Click for a list of formatting options.") (forum code) to format your messages.

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

![725](https://www.dragonflycave.com/sprites/gen8/home-thumb/725.png)Please type the name of the above Pokémon into this box ( [don't know it?](https://www.dragonflycave.com/mechanics/gen-i-safari-zone/#))\*:The above sprite has a 1/8192 chance of being shiny. (Modern browsers will give it a yellow glow if so.)

Submit messageReset

## Comments

My own messages will be signed as Butterfree, with the Admin label below my name. If someone signs as Butterfree without that label, it's probably not me.

Pages:



**1**

> ![](https://www.dragonflycave.com/sprites/gen8/icons-unified-small/362.png)
>
> Butterfree
>
> Admin
>
> Website: [The Cave of Dragonflies](https://www.dragonflycave.com/)
>
> In response to: [post by Sez](https://www.dragonflycave.com/mechanics/gen-i-safari-zone/#post-10992)
>
> The mechanics actually work a bit differently even in FireRed and LeafGreen and are not quite as broken, so don't use this page as an authoritative reference for those games. I should probably make an actual page on those, especially with the Switch port, hmm.
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10993/#responding-to)\[14/03/2026 11:37:38\]

> ![](https://www.dragonflycave.com/sprites/gen8/icons-unified-small/156.png)
>
> Sez
>
> Was actually looking for Gen 3 but this should pretty much work as well. Thank you very much for your service! I really appreciate it
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10992/#responding-to)\[14/03/2026 10:08:02\]

> ![](https://www.dragonflycave.com/sprites/gen8/icons-unified-small/472.png)
>
> mjukus
>
> Very helpful calculator. Although knowing the odds can be more painful—I didn't catch a parasect after a full 30 safari balls (<1.3% odds by my working).
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10702/#responding-to)\[20/09/2025 19:54:49\]

> ![](https://www.dragonflycave.com/sprites/gen8/icons-unified-small/785.png)
>
> Menibaru
>
> Your calculations are impressive and are clear that while AI is a threat to many. AI is incapable of solving complex problems such as this,I tried running these numbers through many versions AI ChatGPT, Meta, Gemini, and DeepSeek they all said that 1 Bait was the best option but my own Xcel spreadsheet agreed with your numbers. GGs
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10512/#responding-to)\[07/06/2025 03:41:27\]

> Chuck
>
> This is awesome, great research and wonderfully helpful tool.
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10395/#responding-to)\[12/04/2025 16:48:53\]

> Butterfree
>
> Admin
>
> Website: [The Cave of Dragonflies](https://www.dragonflycave.com/)
>
> @Steven Mattero: In FR/LG, the mechanics work a little bit differently; in particular, the effects of bait and rocks are no longer nearly as drastic. You can find more info [on Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Kanto_Safari_Zone#Generation_III). I haven't yet actually made a page or calculator for that version of the Safari Zone - it might be interesting to do so.
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10161/#responding-to)\[29/11/2024 18:17:28\]

> Steven Mattero
>
> Do you know if the overall strategy would differ for Gen III (FR/LG)? You mentioned that the Safari ball rng was messed up for Gen I, but I'm not sure if that would alter the optimal strategies or just improve your odds overall.
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/10160/#responding-to)\[29/11/2024 00:09:43\]

Pages:



**1**