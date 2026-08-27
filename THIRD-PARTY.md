# Third-party software

Everything bundled with this project that someone else wrote, and the terms it
comes under. The project's own code is MIT — see [LICENSE](LICENSE). Data is
covered separately in [DATA-LICENSES.md](DATA-LICENSES.md).

## Shipped with the app

These are served to anyone who opens the app, so their licences ship too.

### D3 v7.9.0 — ISC

`app/js/d3.v7.min.js` · © 2010–2023 Mike Bostock · <https://d3js.org>

Full text: [`app/js/d3-LICENSE.txt`](app/js/d3-LICENSE.txt). The minified bundle
carries only the copyright line, and ISC requires the permission notice to
travel with it, which is why the text is shipped alongside rather than left in
the repository root.

### Archivo — SIL Open Font License 1.1

`app/fonts/archivo-latin-var.woff2` · © 2020 The Archivo Project Authors
<https://github.com/Omnibus-Type/Archivo>

Full text: [`app/fonts/OFL.txt`](app/fonts/OFL.txt). The OFL explicitly requires
the licence to be distributed with the font, so this file must stay next to the
`.woff2` wherever the app is deployed.

The font is used unmodified apart from subsetting to Latin; the OFL permits
this. It must not be sold on its own, and any derivative may not use the
reserved font name.

## A note on translated licence texts

The app is bilingual, but the licence texts it links to are English, and
deliberately so. SIL does not publish translations of the OFL: a release under
that licence "is only valid when using the original English text", and SIL
permits unofficial translations only when they carry an explicit disclaimer.
The same holds for ISC and MIT, which have no authoritative translations at all.

So the app translates the *explanation* around each licence and says plainly, in
French, that the linked text is the binding English original. The one place a
genuine translation exists is Creative Commons, which publishes official
per-language deeds — the CC BY-SA link therefore follows the interface language
(`deed.fr` / `deed.en`).

## Provenance

The project began in 2020 as a D3 v5 page whose map-and-slider approach was
adapted from published examples by **Mike Bostock** (bl.ocks.org/4060606) and
**John Walley** (bl.ocks.org/9b6d8af7a209b95c5b9dff99073db420). Blocks of that era
were commonly released under GPL-3.0, though the terms were not stated in the file
itself.

That version has been removed from the working tree. It is still in git history —
commit `ad4bdf8` contains it — and it vendored D3 5.0.0 (BSD-3-Clause), Bootstrap
3.3.7, jQuery 3.2.1, jQuery UI 1.12.1 and d3-tip (all MIT). If it is ever restored
or published separately, its provenance should be confirmed first.

`app/` is an independent rewrite — different D3 major version, different
architecture — and carries no code from either example. It is now the only place in
the repository with third-party code, so D3 v7 and Archivo above are the complete
set.
