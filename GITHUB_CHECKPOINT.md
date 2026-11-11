# Published checkpoint

This branch publishes the frozen 2026-11-11 Claude handoff as a complete source snapshot. The game is in PROJECT/pvz-garden, its original source art is in PROJECT/art-src, and its tools are in PROJECT/tools. Start with CLAUDE_RESUME.md.

The checkpoint contains 1,975 drawn animation frames across 139 looks. Full source-image provenance and runtime-frame checks passed before publication. The exporter validated 145 sheets and 2,023 frames, including legacy fallback poses.

The release includes the 26 MB Claude handoff, the playable build, five original-art ZIPs, extraction instructions, and SHA-256 checksums for the art ZIPs. Extract all five original-art ZIPs into the same destination as the handoff.

The published snapshot retains the previous main commit as its parent. This branch uses the complete handoff directory layout described above.
