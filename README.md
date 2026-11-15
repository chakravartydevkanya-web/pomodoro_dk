# Pomodoro Art

A Pomodoro timer that shows you a real painting while you focus.

## What the app is

- A Pomodoro timer is a countdown that helps you focus on one thing at a time.
- Each time you open the app, it picks a painting from the European Paintings collection of the Metropolitan Museum of Art in New York.
- The painting starts hidden behind 9 orange tiles.
- As the time counts down, the tiles disappear one by one, in a random order.
- When the time runs out, you can see the whole painting.

## How it works

- **Start:** the countdown begins.
- **Pause:** the countdown stops. The button changes to **Resume**.
- **Resume:** the countdown carries on from where it stopped.
- **Reset:** the timer goes back to the start and the tiles cover the painting again. You keep the same painting.
- **Timer length:** you can't change it yet. For now it is fixed at 30 seconds, so it is quick to test. A longer, normal Pomodoro length will come later.
- **At 00:00:**
  - The last tile disappears, so you see the whole painting.
  - A soft chime rings once.
  - The painting's name, artist, year and a link to its page on the Met's website appear. The link opens in a new tab.
  - A **Restart session** button appears. Press it to get a new painting and start again.
- The details stay hidden until the timer reaches 00:00.

## Where the paintings come from

- The paintings and their details come from the Met's free Collection API. (An API is a way for one website to ask another website for information.)
- No API key (a secret password) is needed.
- Only European paintings that are in the public domain and have an image are used.

## What happens when something goes wrong

- There is no message for problems yet.
- If the Met's website says no, the app quietly keeps asking until it gets a painting.
- Until then, the painting box stays empty. This usually takes only a few seconds.
- The timer, the buttons and the chime still work.

## Live link

[add live link here]

## Credits

- Paintings and details: the [Metropolitan Museum of Art](https://www.metmuseum.org/).
- Built by [your name].
