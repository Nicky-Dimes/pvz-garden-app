// P vs. Z Garden — illustrated-art pilot manifest.
// Default is deliberately empty: the current game stays unchanged until approved artwork exists.
// Add atlas paths after generating the approved art. Each plant sheet is 1024x512 (4x2 frames),
// each zombie sheet is 768x512 (3x2 frames), and EVERY cell is 256x256 RGBA.
// The frame order is documented in docs/CLAUDE_IMPLEMENTATION_HANDOFF.md.
window.PVZ_HD_MANIFEST = Object.freeze({
  plants: {
    // sunflower: {
    //   0: 'img/hd/plants/sunflower/stage-0.png',
    //   1: 'img/hd/plants/sunflower/stage-1.png',
    //   2: 'img/hd/plants/sunflower/stage-2.png',
    // },
  },
  zombies: {
    // basic: 'img/hd/zombies/basic.png',
  },
});
