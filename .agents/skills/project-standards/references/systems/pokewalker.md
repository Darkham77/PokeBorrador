# Pokéwalker Battle Mechanics

Thanks to [Altissimo](https://altissimo1.github.io/) for motivating me to look into the Pokéwalker's battle mechanics and [Dmitry Grinberg](https://dmitry.gr/?r=05.Projects&proj=28.%20pokewalker) for publishing the Pokéwalker disassembly.

Pokémon HeartGold and SoulSilver came with a cute pedometer accessory known as the Pokéwalker. It could connect to the games through infrared communication, allowing you to take a single Pokémon on walks with you on one of many _courses_. While out on a course, you would earn a currency known as _watts_ by taking real-life steps, and your watts could then be used to find items and even battle and catch Pokémon (different for different courses), which could then be transferred back to the HeartGold or SoulSilver cartridge.

The mechanics of the Pokéwalker are an interesting curiosity generally, but on this page I want to focus on exploring and explaining the simplified battle system used for the Pokéwalker's PokéRadar feature. Like in the mainline games, after encountering a Pokémon you will be able to engage it in battle, and weakening the Pokémon before attempting to catch it will increase your odds of capturing it successfully – but the details are different and a fun little variant on battling and catching Pokémon.

## Basics

When you use the PokéRadar feature, you will be shown four patches of grass on the screen; when one, two or three exclamation marks appear above one of the patches, you must quickly select it by moving the cursor with the left and right buttons and then confirm with the center button. If you do so in time, a Pokémon encounter will begin.

At the start of the battle, both your Pokémon and the wild Pokémon will have an HP bar with four sections – effectively 4 HP. By pressing one of the Pokéwalker's three buttons, you can choose an action for your turn: **Attack** (left), **Evade** (right) or **Catch** (center).

Behind the scenes, the wild Pokémon also chooses one of three actions: **Attack**, **Evade** or **Flee**. The turn is resolved based on the combination of your and the wild Pokémon's actions:

- If both Pokémon **attack**, then your Pokémon will move first and deal 1 HP of damage to the wild Pokémon, and then the wild Pokémon will move and deal 1 HP of damage to your Pokémon in return.
- If both Pokémon **evade**, then the two Pokémon will have a staredown: no damage is dealt and nothing happens this turn.
- If one Pokémon **attacks** and the other **evades**, then the one that attacked will move but miss, and the one that evaded will then counterattack and deal 1 damage to the one that attacked.
- If your Pokémon **attacks** and the wild Pokémon **flees**, then your Pokémon will successfully chase it down and score a **critical hit** from behind, dealing 2 damage to the wild Pokémon.
- If your Pokémon **evades** and the wild Pokémon **flees**, then the wild Pokémon will successfully flee, ending the battle without a chance to catch it.
- If you attempt a **catch**, then regardless of the wild Pokémon's action, you will throw a Poké Ball; if successful, you will catch the Pokémon, while if it fails, the battle ends without catching the Pokémon. The odds of a successful capture are better the more you've lowered the wild Pokémon's HP before attempting the capture.

If at any point one Pokémon loses all its HP, it will be knocked out and the battle will likewise end without a capture.

Already the main strategic incentives are clear. Evading risks the Pokémon fleeing, but guarantees you will not take damage that turn; attacking risks taking damage, and may result in a critical hit, but guarantees the Pokémon can't successfully flee. Once the wild Pokémon is at 1 HP, there is clearly never any reason not to catch: your odds already can't get any better, and any other action risks either KOing the wild Pokémon or letting it flee. But beyond that, the system has some subtleties that need to be explored to determine the best course of action.

## The Nitty-Gritty

#### Enemy states

The wild Pokémon's chosen action is not simply an even one third chance of each. Instead, the wild Pokémon has five _states_ it can be in, and the states have different odds for each of the three possible enemy actions. (I've made a best effort to give them descriptive names for the purposes of this article, but these names are in no way official and just my speculation as to the intent.)

| State | Chance of action |
| --- | --- |
| Attack | Evade | Flee |
| --- | --- | --- |
| Start | 45% | 35% | 20% |
| Hit | 40% | 30% | 30% |
| Critical Hit | 50% | 40% | 10% |
| Counterattack | 60% | 30% | 10% |
| Staredown | 20% | 30% | 50% |

At the start of the battle, the Pokémon will be in the **Start** state. After each turn, the Pokémon's state is set according to the outcome of that turn:

- If the Pokémon took one damage (either via both Pokémon attacking or the Pokémon attacking and you evading), then it will go into the **Hit** state, which makes it slightly less likely to attack or evade and slightly more likely to flee.
- If the Pokémon took two damage (via attempting to flee while you attacked), then it will go into the **Critical Hit** state. In that state, it's more likely to attack or evade and less likely to attempt to flee again.
- If the Pokémon successfully evaded your attack, then it will go into the **Counterattack** state. In this state, it's much more likely to attack, slightly less likely to evade and unlikely to flee.
- If the two Pokémon had a staredown, then it will go into the **Staredown** state. In this state, it will be much less likely to attack, slightly less likely to evade, and much more likely to flee.

This state mechanic serves two purposes. It's a fun simulation of the Pokémon's mood at this point in the fight: it seems logical that after getting hit the Pokémon would become a bit more likely to flee, or that after getting hit from behind while attempting to flee it would become _less_ likely to attempt that again, or that after successfully counterattacking it's pumped to keep attacking. But it's also a tool for balancing things a bit, nudging things so you can predict what the Pokémon might do to _some_ extent and so that fights playing out with the same actions happening over and over is less likely to happen: attacking is most likely when the Pokémon previously chose to evade or flee, evading is most likely when it previously chose to flee, and fleeing is most likely when it previously chose to evade.

#### Throwing a Ball

Capturing in the Pokéwalker follows some of the same basic principles as [in the main HG/SS games](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/): you're more likely to catch the Pokémon the lower its HP is, and the game performs multiple 'shake checks', giving the Pokémon three chances to break out of the ball, with one wobble of the ball shown for each shake check where it fails to break out.

_Unlike_ in the mainline games, however, the probability of each shake check passing is determined _only_ by the wild Pokémon's current HP. There is no difference between trying to catch one Pokémon and another in the Pokéwalker, no base catch rates to make rarer Pokémon tougher to catch. All Pokémon have the same catch rate.

The probability of each shake check succeeding for each of the four HP values is not determined by a _formula_, but rather by a simple lookup table, which makes sense given it's just four possible values. From the shake check success chance, we can then easily calculate the final probability of a successful capture as the shake check success rate cubed (since it's three independent shake checks that must all pass):

| HP | Shake check chance | Total catch chance |
| --- | --- | --- |
| 4 HP | 56% | ~17.56% |
| 3 HP | 66% | ~28.75% |
| 2 HP | 79% | ~49.30% |
| 1 HP | 97% | ~91.27% |

## The Strategy

Since there is no difference between the catch rate for different Pokémon in the Pokéwalker, nor in the behaviour of different Pokémon, the optimal strategy is inevitably always the same, regardless of which Pokémon you're trying to catch! The best move in any given situation is a simple function of the current HP of your Pokémon and the wild Pokémon and the current state of the enemy Pokémon: whichever move is most likely to end with you capturing the Pokémon is best.

The tables below visually show the best move for each combination of your and the wild Pokémon's HP, for each of the possible enemy states (remember that the states depend on what happened on the _previous_ turn). Cells representing impossible HP combinations for that state are faded; for example, the "Start" state is only possible at the start of the battle, so in practice you'll only ever be in that state when you and the enemy have 4 HP, and the "Critical Hit" state occurs after you've just dealt 2 HP of damage to the Pokémon, so it can never be in that state at 3 or 4 HP.

#### Start

| Wild →<br>↓ You | 4 HP | 3 HP | 2 HP | 1 HP |
| --- | --- | --- | --- | --- |
| 4 HP | a | a | a | c |
| 3 HP | a | a | a | c |
| 2 HP | e | a | a | c |
| 1 HP | e | e | e | c |

#### Hit

| Wild →<br>↓ You | 4 HP | 3 HP | 2 HP | 1 HP |
| --- | --- | --- | --- | --- |
| 4 HP | a | a | a | c |
| 3 HP | a | a | a | c |
| 2 HP | a | a | a | c |
| 1 HP | e | e | e | c |

#### Critical Hit

| Wild →<br>↓ You | 4 HP | 3 HP | 2 HP | 1 HP |
| --- | --- | --- | --- | --- |
| 4 HP | a | a | a | c |
| 3 HP | e | a | a | c |
| 2 HP | e | e | a | c |
| 1 HP | e | e | e | c |

#### Counterattack

| Wild →<br>↓ You | 4 HP | 3 HP | 2 HP | 1 HP |
| --- | --- | --- | --- | --- |
| 4 HP | a | a | a | c |
| 3 HP | a | a | a | c |
| 2 HP | e | e | a | c |
| 1 HP | e | e | e | c |

#### Staredown

| Wild →<br>↓ You | 4 HP | 3 HP | 2 HP | 1 HP |
| --- | --- | --- | --- | --- |
| 4 HP | a | a | c | c |
| 3 HP | a | a | c | c |
| 2 HP | a | a | c | c |
| 1 HP | a | a | c | c |

#### Legend

| a | Attack |
| e | Evade |
| c | Catch |

The _practical_ takeaways are as follows:

1. Of course, **always catch if the wild Pokémon is at 1 HP**. That one was clear just from the basics.
2. **If you've just had a staredown, then always catch if the enemy is at 2 HP or less, and otherwise attack.** The 50% flee chance after a staredown is dangerous both if you evade (in which case the Pokémon successfully flees) and if you attack (in which case you'll score a critical hit); if the Pokémon can take a crit, then attacking is safe, but if not, you should just go for the catch.
3. Outside of the staredown and enemy 1 HP cases, **you should always evade if you're at 1 HP**. Attacking risks getting KOed both if the Pokémon attacks and if it evades, and outside the staredown case, that's more pressing than the possibility of fleeing.
4. _If the Pokémon just successfully counterattacked you_ (evaded while you attacked), **you should also evade if you're at 2 HP and the wild Pokémon is at 3 or 4**. In this case the enemy is highly likely to attack and unlikely to flee, and evading will ensure you don't fall to 1 HP.
5. Otherwise, **attacking is the way to go**.

## Pokéwalker Battle Calculator

Use this calculator to see a full breakdown of your choices and how things could shake out in a given situation. In addition to your best action and the overall chance of capturing the Pokémon with optimal play from there, it will show the odds of success for each possible action and enemy action. Click the » on an individual outcome to calculate the full breakdown for the next turn after that outcome, or manually set the HP and state fields below.

Your Pokémon's HP:
4 HP3 HP2 HP1 HP

Wild Pokémon's HP:
4 HP3 HP2 HP1 HP

Wild Pokémon's state:
StartHitCritical HitCounterattackStaredown

The best action is to **attack**. This gives a 66.46% total chance of a successful catch with optimal play.

Breakdown:

- You **attack**: 66.46% total chance of capture with optimal play
  - If enemy chooses to **attack** (45% chance): Both attack \- 66.89% chance of capture from here [»](https://www.dragonflycave.com/pokewalker/# "Click for full results from here")
  - If enemy chooses to **evade** (35% chance): Enemy counterattacks \- 60.1% chance of capture from here [»](https://www.dragonflycave.com/pokewalker/# "Click for full results from here")
  - If enemy chooses to **flee** (20% chance): Critical hit! \- 76.61% chance of capture from here [»](https://www.dragonflycave.com/pokewalker/# "Click for full results from here")
- You **evade**: 55.49% total chance of capture with optimal play
  - If enemy chooses to **attack** (45% chance): You counterattack \- 69.09% chance of capture from here [»](https://www.dragonflycave.com/pokewalker/# "Click for full results from here")
  - If enemy chooses to **evade** (35% chance): Staredown \- 69.71% chance of capture from here [»](https://www.dragonflycave.com/pokewalker/# "Click for full results from here")
  - If enemy chooses to **flee** (20% chance): Wild Pokémon escaped!
- You **catch**: 17.56% chance of capture

Page last modified July 8 2026 at 22:10 UTC

## You May Also Enjoy

[**R/S/E Roulette Mechanics**\\
A comprehensive explanation of the Roulette minigame in Ruby, Sapphire and Emerald, complete with interactive simulations.](https://www.dragonflycave.com/mechanics/gen-iii-roulette/)

[**Gen III/IV Capture Mechanics**\\
Learn all about the nitty-gritty mechanics behind the capture formula used in the third- and fourth-generation games.](https://www.dragonflycave.com/mechanics/gen-iii-iv-capturing/)

[**Battle Mechanics**\\
An explanation of the inner workings of the mainline Pokémon battle system, including turn order, accuracy, critical hits, the damage formula, and secondary effects of moves.](https://www.dragonflycave.com/mechanics/battle/)

[**Gen III/IV Catch Rate Calculator**\\
A calculator to find your chances of capturing a Pokémon in the third- and fourth-generation games.](https://www.dragonflycave.com/calculators/gen-iii-iv-catch-rate/)

## Post comment

Inflammatory or off-topic comments will be deleted; please go to the [guestbook](https://www.dragonflycave.com/guestbook/) for discussion unrelated to this page. You can use [BBCode](https://www.dragonflycave.com/pokewalker/#bbcode "Click for a list of formatting options.") (forum code) to format your messages.

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

![503](https://www.dragonflycave.com/sprites/gen8/home-thumb/503.png)Please type the name of the above Pokémon into this box ( [don't know it?](https://www.dragonflycave.com/pokewalker/#))\*:The above sprite has a 1/8192 chance of being shiny. (Modern browsers will give it a yellow glow if so.)

Submit messageReset

## Comments

My own messages will be signed as Butterfree, with the Admin label below my name. If someone signs as Butterfree without that label, it's probably not me.

Pages:



**1**

> ![](https://www.dragonflycave.com/sprites/gen8/icons-unified-small/492.png)
>
> zowayix
>
> Nice, I've always wanted to know how this part of the Pokewalker worked behind the scenes.
>
> [» Reply to this](https://www.dragonflycave.com/guestbook/reply/11226/#responding-to)\[09/07/2026 07:12:53\]

Pages:



**1**