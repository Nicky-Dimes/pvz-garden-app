# P vs. Z Garden

A family-made garden creature game: raise plant guardians, collect elements, fuse, race, and defend the grove against zombies.

Play at https://nicky-dimes.github.io/pvz-garden-app/ . The existing address is retained so installed players keep their storage and update path.

## Install

Open the game in Safari, choose Share → Add to Home Screen, and launch it from its icon. Choose a player card or create a new player. After its first load the game works offline.

## Keep progress safe

Use Almanac → Backups to export a backup before deleting an installed copy or moving devices. Existing backup codes and player saves remain compatible. The legacy repository path and internal save identifiers are retained for compatibility; the game retains its P vs. Z Garden title and uses updated character and arcade names.

## Release

This repository contains the built static site. The editable project uses `python3 tools/build_pvz.py` to run checks and generate the release, including the app manifest and offline cache. Every release has a content fingerprint so installed copies can offer an update.

This release includes restrained revisions of the supplied project art, updated names and older interface artwork.

## Art credits

Selected character illustrations are adapted from Plants vs. Zombies artwork by Electronic Arts / PopCap. Digger references use the extracted PC sprite sheet [archived by The Spriters Resource](https://www.spriters-resource.com/pc_computer/plantsvszombies/asset/180859/). Prospector and Chicken Wrangler references use the original EA illustrations hosted on the licensed Walls360 product pages: [Prospector](https://walls360.com/plants-vs-zombies-ii-prospector-zombie/) and [Chicken Wrangler](https://walls360.com/plants-vs-zombies-ii-chicken-wrangler-zombie/). Guacodile was supplied as a reference image by the project owner; Fire Peashooter uses a community-hosted original render. These remain adaptations of the credited artwork.
