# SIMSOC 6 — Manager

A football management game that runs in the browser, rebuilt in the style of
Football Manager. It started as a remake of the late-90s *SIMSOC 6* and keeps
its spirit — start a small club in the Conference and climb — but the world,
the match engine and the interface have been rebuilt from scratch.

You get **eight footballing nations and twelve leagues** with promotion and
relegation, every nation's domestic cup plus the two-legged European cups,
**live minute-by-minute matches** you can influence from the touchline, and
a career that can take you from Romford to Serie A.

The game has **no runtime dependencies**: it's plain HTML, CSS and JavaScript.

> This is an independent, clean-room project. It contains no original code or
> assets from any commercial game. Club names are the real clubs of the late
> 90s. Every player is generated at random from per-nation name pools, and any
> combination that would recreate a famous real player of the era is re-rolled.

## Screens

| Match day: the assistant's advice | Live match on the 2D pitch |
|---|---|
| ![Match preview](shots/03-match-preview.png) | ![Live match](shots/04-match-live.png) |

| Home dashboard | Tactics board |
|---|---|
| ![Home](shots/02-home.png) | ![Tactics](shots/08-tactics.png) |

| Half-time team talk | Full time |
|---|---|
| ![Team talk](shots/05-half-time-team-talk.png) | ![Full time](shots/06-full-time.png) |

| Results round-up (every competition) | League table |
|---|---|
| ![Round-up](shots/07-results-roundup.png) | ![League](shots/11-league-table.png) |

| Squad | Player profile |
|---|---|
| ![Squad](shots/09-squad.png) | ![Player](shots/10-player.png) |

| Transfer market | Inbox |
|---|---|
| ![Transfers](shots/14-transfers.png) | ![Inbox](shots/15-inbox.png) |

| Champions League bracket | League stats & scorers |
|---|---|
| ![Bracket](shots/13-cup-bracket.png) | ![Stats](shots/12-league-stats.png) |

| Finances | Every competition |
|---|---|
| ![Finances](shots/16-finances.png) | ![Competitions](shots/17-competitions.png) |

| Season review | Hall of Fame — trophies per club |
|---|---|
| ![Season review](shots/19-season-review.png) | ![Hall of Fame](shots/20-hall-of-fame.png) |

| New career | My career | On a phone |
|---|---|---|
| ![New career](shots/01-new-career.png) | ![Career](shots/21-career.png) | ![Phone](shots/23-phone-home.png) |

## What's in the game

### A whole football world
- **12 leagues across 8 nations**: England's four tiers (Premier Division → Conference),
  Serie A and Serie B, La Liga, Bundesliga, Division 1, Eredivisie, Primeira Liga and the
  Scottish Premier (four meetings a season). Every league is simulated every matchday, and
  shorter leagues are spread across the same calendar.
- **Promotion and relegation** in England (three up and down) and Italy (four).
- **13 cups**, with no byes in any draw: the FA Cup and League Cup, Coppa Italia, Copa del Rey,
  DFB-Pokal, Coupe de France, KNVB Cup, Taça de Portugal, Scottish Cup; the 64-team
  **Champions League** and **UEFA Cup** (two-legged ties, away goals, extra time and
  penalties, single-match final at a neutral venue); plus the Community Shield and the
  European Super Cup. Places in Europe come from league finishes and domestic cup wins in
  every nation, topped up with 75 continental guests.
- **A dated calendar**: league matches on Saturdays, cup ties midweek, from August to May.
- **A living world**: AI clubs buy and sell players, sack managers, and bid for yours. The
  news feed covers big results, transfers, trophies and awards.

### Match day
- **The assistant's report**: an opposition scouting report (form, shape, key players,
  ratings compared with yours) and tactical tips. The assistant **simulates the match with
  each of the five mentalities** and shows your win / draw / loss chances for each, so you
  can choose with real information.
- **A live match engine**, minute by minute: possession, shots and expected goals, saves,
  blocks, corners, fouls, penalties, bookings and red cards, injuries, fatigue,
  substitutions, extra time and penalty shoot-outs.
- **A top-down 2D pitch** where both teams keep their shape and the ball follows the
  engine's events, alongside commentary, live stats, live player ratings, momentum and
  **live scores from the other games** in your league.
- **You stay in control**: change mentality at any time, make substitutions (or let the
  assistant do it), pause or change speed, and give the **half-time team talk** (praise,
  encourage, demand more, calm down). The right talk depends on the score and how strong
  your team is.
- **Quick result** if you just want the score. If you leave a match half-way, the assistant
  finishes it for you.

### Your team
- **Tactics board** with seven formations (3-4-3, 3-5-2, 4-4-2, 4-5-1, 5-4-1, 4-3-3, 5-3-2).
  Click to swap players between positions, the bench and the reserves. Players out of
  position perform worse.
- **Team instructions**: mentality, pressing and tempo, each with a real trade-off.
  Defending deeply helps underdogs and attacking helps favourites. High pressing wins the
  ball back but tires players and gives away more fouls.
- **Pick Best XI / Pick Fresh XI / Best + Fresh XI**, or let the assistant pick the team
  before every match.
- **Players** have FM-style 1–20 attributes, potential, form (their last five ratings),
  average rating, assists, man-of-the-match awards, a nationality, a wage and a contract.
  Abilities are re-rolled each summer: young players tend to grow and veterans fade, with
  plenty of surprises. Players retire between 35 and 40.
- **Squad rules**: up to 23 players. If you can't field 8 fit players, you lose 0–3 by
  walkover. Five bookings or a red card bring a ban. Injuries and bans are shown everywhere.

### Running the club
- **Transfer market**: search by name, position, price, skill, age or league. Shortlist
  players. Buy listed players and free agents, or pay a 60% premium for anyone else.
  Selling is instant. AI clubs make offers for your players, and you accept or reject them
  in the inbox. Your scouts can also find unknown players for you.
- **Finances**: gate receipts (attendance depends on form and the opponent), TV money,
  prize money, weekly wages and transfer fees, with a balance chart. Bank loans charge
  weekly interest. If you stay overdrawn too long, the board sells your best player. A loan
  stays with the club if you move on.
- **Contracts**: renew players before the summer, or they leave on a free transfer. You can
  also release players by paying up their contract. Each summer brings a youth intake.
- **The board** sets a season objective based on your squad's strength. Board confidence
  rises and falls with your results, and you can be sacked (except on Easy).

### Your career
- **Reputation** grows with results and trophies. Bigger clubs offer you their job, or you
  can resign and pick a club at the **Job Centre**. Which clubs will hire you depends on
  your reputation.
- **My Career** logs every season and stint: club, league, finishing position, record,
  objective and trophies, plus your Manager of the Month awards.
- **Hall of Fame**: every season's champions, runners-up and third place in all twelve
  leagues, every cup winner, the Golden Boot and Player of the Season in each league, and
  the **total trophies per club with a breakdown by competition**.
- **Season review**: your verdict, promotions and relegations, champions and award winners
  across Europe.
- **20 achievements** to chase, from your first win to winning the Champions League. Locked
  achievements are shown as goals.
- **Media predictions**: the pre-season forecast sits next to every league table, so you
  can see who is beating expectations.
- **Stadium expansion**: once a season, if the board backs you, add seats to grow your gate
  income as you climb.

### Interface
- A dark, Football-Manager-style layout: a sidebar for navigation and a top bar showing your
  club, the date, your balance, your inbox and the **Continue** button.
- **Your club always appears in red and bold**: in tables, results, brackets, round-ups,
  scorer charts, news and honours. Every club and player name links to its page.
- **Spacebar = Continue**: it moves the game on, kicks off, skips to full time and closes
  each screen.
- **Top-scorer charts are per competition**: each league shows its own scorers and each cup
  shows the scorers in that cup.
- **Save slots** (an autosave plus three slots, stored in IndexedDB), and a layout that
  works on phones too.
- **Difficulty**: Easy, Normal or Hard. This changes your budget, how patient the board is,
  and a small boost to your team's performance.

## Play it

The whole game fits in one file: **[`dist/simsoc6.html`](dist/simsoc6.html)**. Download it
and open it in your browser (double-click it). There is nothing to install and no server to
run; your career is saved inside the browser, so keep using the same browser on the same
computer, or save to a slot before you move on. `npm run bundle` rebuilds that file from the
source.

To run it from the source instead:

```bash
npm start            # then open http://localhost:8080
```

You can also open `index.html` directly in a modern browser. These URL parameters help with
testing:

- `?fresh=1` opens the new-career screen.
- `?seed=12345` makes the world deterministic.
- `?club=64` starts straight away as that club (by global index; 64 is Romford).

## Test it

```bash
npm test             # head-less engine self-test: 174 checks
npm run test:ui      # drives the real UI in headless Chrome: 28 interaction checks
npm run test:bundle  # the single-file build, opened from disk and inside a sandboxed frame: 20 checks
npm run shots        # regenerates the screenshots in shots/
```

`npm test` needs only Node. The UI and bundle tests and the screenshots use Puppeteer, which
is a dev-only dependency. Set `CHROME=/path/to/chrome` to choose the browser they run.

The engine test covers several areas:

- **Season mechanics**: full seasons, promotion and relegation in two nations, table maths,
  the cups (no byes, two legs, extra time, penalties) and the dated calendar.
- **The match engine**: it is deterministic, stops for the team talk, handles substitutions,
  and the tactics have a measurable effect.
- **The rest of the game**: finances, contracts, the inbox, bids, sackings and the job
  market, the live-score ticker (which must match the results that get committed) and
  compact save/load.

## How it's put together

```
index.html         the app shell: top bar, sidebar, view, modals
css/style.css      the dark FM-style theme and every component
js/data.js         seeded RNG, nations, leagues, clubs & kit colours, name pools, economy   (UMD)
js/live.js         the live minute-by-minute match engine + Monte Carlo predictions         (UMD)
js/engine.js       the world: seasons, calendar, cups, Europe, finances, transfers,
                   contracts, inbox, board, reputation, awards, save format                  (UMD)
js/store.js        IndexedDB save slots
js/pitch.js        the top-down 2D match renderer (canvas)
js/ui-core.js      router, shell, shared components, charts, modals, keyboard
js/ui-pages.js     every screen of the game
js/ui-match.js     match day: preview, live match, team talk, full time
server.js          zero-dependency static server
dist/simsoc6.html  the whole game in one file (generated by tools/bundle.js)
test/run.js        engine self-test
test/ui.js         headless UI interaction test
test/bundle.js     the single-file build, from disk and hosted in a frame
tools/bundle.js    inlines the stylesheet and scripts into dist/simsoc6.html
tools/screenshots.js   regenerates shots/*.png
```

`data.js`, `live.js` and `engine.js` are UMD modules, so the same game logic runs in the
browser and under Node for the tests.

## Credit

Inspired by *SIMSOC 6* (1998). References:
[Retro Review: Simsoc 6 — Fuller FM](https://fullerfm.com/2025/04/30/retro-review-simsoc-6/)
and the [MobyGames entry](https://www.mobygames.com/game/205760/simsoc-6/).

MIT licensed.
