# Zombie wave two — production notes

Batch IDs: `newspaper`, `screendoor`, `football`. User direction: research actual Plants vs Zombies identities and create original pixel art, replacing simplified project designs where needed. IDs, data and saves are unchanged.

## Inspected references

### newspaper

Old-man dark blazer, low black rectangular glasses, black tie, white heart-print boxer shorts, black socks/shoes, open gray newspaper. The prior PvZ2 newspaper render was checked as a cross-reference; this batch uses the original PvZ1 identity.

Reference source: https://characters.fandom.com/wiki/Newspaper_zombie

### screendoor

Classic hunched browncoat zombie, silver-white screen door with diagonal gray mesh, gold kick plate and round gold doorknob. Door held as a shield in both hands.

Reference source: https://www.behance.net/gallery/12352413/2011Plants-vs-Zombies-by-AI-for-PopCap/modules/95900003

### football

Original red football helmet and faceguard, broad shoulder pads, red zero jersey, gloves, gray-white shorts, red socks and black studded cleats. This is not Mecha-Football or PvZ2 All-Star.

Reference source: https://puzzlefactory.com/es/rompecabezas-personas/493606-zombie-futbolista-rompecabezas

## Production contract

Three 5-column × 3-row source atlases. First 13 cells: idle2, walk4, attack3, hurt1, fall3. Last two cells blank. All face right. Pale cream background, no cast shadows, detached effects or projectiles. Props and helmets remain with character throughout. New original pixels; source reference images are development research only.

Target 64 × 64, exact base61, max height54 and max width55. Existing browser slicer performs cutout and palette indexing; source face bounds will be recorded for costume/projectile anchors.

## Status

All three original source sheets are generated and visually reviewed; corrected extraction is complete and all 39 indexed frames are validated and frozen. No registry/index/runtime/shared progress changes; parent owns integration and final game checks.

## Source crop correction

All three source sheets are 1620 × 971. Their broad attack-strike pose (index7) extends into the blank gutter beside index6; Newspaper also extends a few pixels right. Preserve the complete rear shoe and forward newspaper by expanding index7 source crop from `[648,324,324,324]` to `[616,324,388,324]`. Index6’s own figure ends before this gutter; no neighboring pose is included. The exact mapping is recorded in `zombie-wave-two-sources.json`. Face boxes for index7 use the expanded crop coordinate system: xNew=(xOld×324+32)/388; y is unchanged. All other cells retain the standard original slicer bounds. Sources are unchanged; this corrects extraction only.

## Visual assessment

- Newspaper — good: unmistakable low rectangular glasses, heart boxer shorts, black socks and paper. Attack expresses canonical newspaper rage while keeping paper attached.
- Screen Door — good: real framed mesh screen, gold knob/plate, hands and body remain consistent; strong door-shove attack. Do not trim rear shoe at source crop boundary.
- Football — good: original red helmet/cage, broad pads, jersey0 and cleats, with clear running/tackle/fall silhouettes; not a robot or All-Star substitute.

## Final verification

All 39 drawn frames pass artifact checks: 64×64 dimensions, consistent per-character palette (≤52 colours), valid palette symbols, empty edges, exact base row61, base support centre within32±10, finite recorded face anchors and distinct frames in each multi-frame clip. `verification/zombie-wave-two-validation.json` records per-frame bounds/head anchors. All three indexed sheets were visually inspected; complete attack props/shoes remain and no adjacent-pose pixels appear.

Screen Door uses explicit background-only seeds with threshold18 to clear enclosed cream gaps around arms/legs/door, preserving the painted frame and gray mesh. Newspaper receives a uniform +1px horizontal import shift so the strike's rear-foot support centre meets the contract without clipping its forward paper. Every source image remains unmodified.

Reproduce: `python tools/animation_slice.py art-src/pvz-ai/animation/zombie-wave-two-spec.json`. Parent owns registry ingestion, runtime integration and final game/export checks. No index/runtime/game-data/save/shared-progress files were edited by this batch.

Indexed previews: `PROJECT/art-src/pvz-ai/animation/newspaper-indexed.png`, `screendoor-indexed.png`, `football-indexed.png`.
