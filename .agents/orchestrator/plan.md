# Orchestration Plan — SoundSync AI Project

## Objectives
Orchestrate end-to-end development of SoundSync AI according to requirements R1, R2, R3 in ORIGINAL_REQUEST.md.

## Phased Plan
1. **Phase 0: Survey & Specification Discovery**
   - Dispatch parallel Explorers (`teamwork_preview_explorer`, `teamwork_preview_spec_miner`) to investigate codebase, existing web pages (index.html, soundsync.html, js/, css/), APIs, and WebAudio capabilities.
   - Aggregate findings into `PROJECT.md` Feature Inventory & Architecture.

2. **Phase 1: Dual-Track Decomposition**
   - **Track A (E2E Testing Track)**: Dispatch E2E Testing Orchestrator / Test Writer to set up opaque-box test suite (Tiers 1-4) covering all features.
   - **Track B (Implementation Track)**: Milestone decomposition for:
     - M1: Fail-Safe Audio File Selection & WebAudio 16kHz Mono Resampling Pipeline (R1)
     - M2: Gemini 2.0 Flash REST API Integration & Millisecond Timestamp Parsing with Fallbacks & Reference Lyrics (R2)
     - M3: Overlap Eraser Algorithm & Subtitle Export (.SRT, .LRC, .VTT, Clipboard) & Interactive Teleprompter Player Integration (R3)
     - M4: Pass 100% E2E Test Suite & Adversarial Hardening (Tier 5)

3. **Phase 2: Execution & Gate Verification**
   - Per milestone: Explorer -> Worker -> Reviewer x 2 + Challenger x 2 + Forensic Auditor.
   - Strict gate approval before passing each milestone.

4. **Phase 3: Victory & Parent Reporting**
   - Final audit and test suite verification.
   - Send complete report to Sentinel (parent).
