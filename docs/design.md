# Design system

Colour tokens live on `:root` in [`app/css/app.css`](../app/css/app.css) and are
redefined under `@media (prefers-color-scheme: dark)`. Read them there rather
than from a table here, which would go stale.

## Typography

**Archivo** (SIL OFL), self-hosted in `app/fonts/` as a single 88 KB variable
file, latin subset — nothing in the data or the interface goes above U+00FF.

One file covers both widths the design needs: the interface runs at
`font-stretch: 100%` and the year readout at `76%`, which is close to the
condensing Parisine gets from its own 90% compression. Self-hosted rather than
linked, because the app is meant to run from `file://`, where a CDN stylesheet
would not load.

## The accent

The cobalt of the enamel station plate — the one colour continuous across the
network's whole life. It replaces a red that belonged to no era but Motte's.

## Line casings

**This is the reason the map is legible.** The RATP line colours were drawn for
white paper and enamel. Measured against the map's land tone, twelve of the
twenty-two fell below the 3:1 WCAG floor for graphical objects, line 1's yellow
reaching only 1.19:1.

Rather than alter canonical colours, every line is drawn twice: a casing path
1px wider beneath it, in a shade of the line's own hue. That keeps the identity
while restoring the edge, and takes all 22 above 3:1 in **both** themes. Line and
casing come to 3px together, against 2.6px for the bare line before casings
existed, so the edge costs almost nothing in apparent weight.

The shade has to follow the theme. Darkening rescues the pale colours on the
light map but does nothing for line 2's navy on the dark one, so the casing moves
away from whichever ground it sits on. `syncCasings()` checks the theme on each
render rather than relying only on the `matchMedia` change event — that event is
the only thing standing between a theme switch and 740 wrongly-shaded strokes.

## Projections

The dataset holds two different kinds of thing, and the design's job is to keep
them apart: 126 years of **record**, and a handful of lines that are
**projection**. Presenting a planned line in the same visual language as the 1900
opening of line 1 would be a claim the data cannot support.

So planned track is **dashed** and planned stations are **hollow rings**, at
every year — a projection never resolves into a solid line, however far the
scrubber travels. Dashes rather than a fade, because opacity is already spoken
for by the hover dim: a dimmed built line and a highlighted planned one would
come out the same grey. The distinction survives both themes and carries no
colour information, so it holds for colour-blind readers too. The casing takes
the same dash pattern, or it would read as a solid line under a dotted one.

The timeline says it twice more. The stretch of track past today is drawn in the
same dashed language, with a rule marking the boundary, and past it the year
readout itself is labelled *projet* / *planned* — the one signal that cannot be
missed at a glance. Tooltips drop "depuis 1900" for "en projet · ouverture prévue
en 2027".

## Framing

**The map is framed on the built network alone.** Grand Paris Express reaches
Saclay and Chelles; fitting the frame to include them would shrink the historic
core to about 60% at every year, spending the map's whole budget on track nobody
has ridden. The planned lines run off the edges instead, and the zoom floor was
lowered from 1 to 0.5 — it used to be impossible to pull back from the initial
fit — so you can zoom out to see where they go. *Reset view* returns to the built
frame.
