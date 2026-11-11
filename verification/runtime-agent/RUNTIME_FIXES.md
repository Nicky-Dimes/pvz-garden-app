# Drawn animation runtime fixes

The parallel review found that garden costume zombies went through a scene-level cache keyed by legacy0/1walk phases. They now normalize drawn clips before calling eventZombie, whose frame cache stays finite. Browser trace changed from a captured frame to all4walk frames.

Almanac groans and arcade bites supplied open-mouth poses without elapsed one-shot progress, freezing wind-up. Almanac now uses tap elapsed progress. Arcade uses existing action timers, or a repeating bite cycle for persistent open-mouth displays. Gold/tint cache uses source canvas identity in a WeakMap, retaining distinct drawn-frame canvases.

Final `probe.json` and screenshots were rerun by the main agent after the parallel agent hit the service usage limit. The probe marks welcome/unlock notices as already seen in its isolated fixture so animations run during capture. No family saves are accessed.
