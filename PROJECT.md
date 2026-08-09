# Project: SoundSync AI

## Architecture
SoundSync AI is an AI-powered Web Application (Client-side single-page / multi-page web application using HTML5, WebAudio API, CSS3, ES6 JavaScript, and Google Gemini 2.0 Flash REST API).
- Client-side Audio Resampling: WebAudio OfflineAudioContext 16kHz 16-bit Mono PCM WAV encoder.
- API Client: REST fetch to Gemini 2.0 Flash (`models/gemini-2.0-flash:generateContent`) with JSON schema enforcement & fallback chain.
- Alignment & Overlap Eraser: Millisecond precision timecode parser & boundary adjustment algorithm ($end_i = \max(0, start_{i+1} - 0.050)$).
- Subtitle Engine & Teleprompter: Interactive line jump audio playback, real-time scroll sync (`scrollIntoView`), and multi-format exporters (.SRT, .LRC, .VTT, Clipboard).

## Feature Inventory
Every feature from user requirements and survey is inventoried below and assigned to a milestone:
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Native File Picker & D&D | Select or drag-and-drop audio/video files on Windows/Mac without MIME blocking | M1 | ORIGINAL_REQUEST R1 |
| 2 | Audio Title & Duration Player UI | Audio player immediately updates title, duration, waveforms without JS errors | M1 | ORIGINAL_REQUEST R1 |
| 3 | WebAudio 16kHz Mono Resampling Pipeline | Downsample audio to 16kHz 16-bit Mono WAV via OfflineAudioContext before API payload | M1 | ORIGINAL_REQUEST R1 |
| 4 | Gemini API Key Management & Storage | Input API key with localStorage persistence, validation, and zero-leak security | M2 | ORIGINAL_REQUEST R2 |
| 5 | Reference Lyrics Text Parser & Integration | Parse user reference lyrics and build prompt guaranteeing 100% lyric output accuracy | M2 | ORIGINAL_REQUEST R2 |
| 6 | Gemini 2.0 Flash REST API Client | Direct REST API call with `responseMimeType: application/json` and response schema | M2 | ORIGINAL_REQUEST R2 |
| 7 | Candidate Model Fallback Chain | Auto fallback: gemini-2.0-flash -> gemini-2.0-flash-exp -> gemini-1.5-flash-latest -> gemini-1.5-flash-8b | M2 | ORIGINAL_REQUEST R2 |
| 8 | Robust Millisecond Timestamp Parser | Parse `HH:MM:SS.mmm`, `MM:SS.mmm`, seconds floats into precise millisecond floats without minute loss | M2 | ORIGINAL_REQUEST R2 |
| 9 | Overlap Eraser Algorithm | Correct consecutive boundary overlaps ($end_i < start_{i+1}$) with 50ms safety gap and sorting | M3 | ORIGINAL_REQUEST R3 |
| 10 | Interactive Real-Time Teleprompter | Highlight active lyric line on `<audio>` `timeupdate` with centered smooth scrolling | M3 | ORIGINAL_REQUEST R3 |
| 11 | Lyric Line Jump Audio Playback | Click lyric line to jump audio playback directly to `start` timestamp | M3 | ORIGINAL_REQUEST R3 |
| 12 | SubRip (.SRT) Exporter | Export valid SubRip format (`HH:MM:SS,mmm --> HH:MM:SS,mmm`) | M3 | ORIGINAL_REQUEST R3 |
| 13 | Lyric (.LRC) Exporter | Export valid Lyric format (`[mm:ss.xx] Lyric text`) | M3 | ORIGINAL_REQUEST R3 |
| 14 | WebVTT (.VTT) Exporter | Export valid WebVTT format (`WEBVTT`, `HH:MM:SS.mmm --> HH:MM:SS.mmm`) | M3 | ORIGINAL_REQUEST R3 |
| 15 | Text Clipboard Copy | Copy timed text subtitles directly to clipboard with toast notification | M3 | ORIGINAL_REQUEST R3 |
| 16 | Traditional Chinese Error Translator | Translate HTTP 429, 401, 500, etc. into 100% Traditional Chinese instructions with AI Studio key link | M2 | ORIGINAL_REQUEST R2 |
| 17 | E2E Testing Suite & Quality Hardening | Comprehensive unit, UI, E2E integration, and adversarial testing across Tiers 1-5 | M4 | PROJECT_PATTERN |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Fail-Safe Audio File Selection & Resampling | R1: Audio Drag-and-drop, Windows file picker fail-safe, Audio Player UI, WebAudio 16kHz Mono WAV Resampling Pipeline | none | PLANNED |
| M2 | Gemini 2.0 Flash API Integration & Alignment | R2: API Key storage, Reference Lyrics, REST API client, JSON Schema, Fallback chain, Robust Millisecond Timestamp Parser, Traditional Chinese error translation | M1 | PLANNED |
| M3 | Overlap Eraser & Multi-Format Subtitle Export | R3: Overlap Eraser algorithm, Interactive Teleprompter with line jump & centered scroll, Exporters (.SRT, .LRC, .VTT, Clipboard) | M2 | PLANNED |
| M4 | Pass 100% E2E Test Suite & Hardening | Phase 1: Tier 1-4 E2E Test Pass. Phase 2: Tier 5 Adversarial Coverage Hardening | M1, M2, M3 | PLANNED |

## Interface Contracts
### WebAudio Resampler ↔ Gemini API Client
- Input: `File` object from file picker/dropzone.
- Output: `Promise<{ wavBase64: string, sampleRate: number, duration: number, audioBuffer: AudioBuffer }>`
- Error handling: Throws `AudioDecodeError` with Traditional Chinese message if file is corrupt or unreadable.

### Gemini API Client ↔ Subtitle Parser & Overlap Eraser
- Input: `{ apiKey: string, wavBase64: string, referenceLyrics?: string }`
- Output: `Promise<Array<{ start: string, end: string, text: string }>>`
- Error handling: Throws mapped Traditional Chinese error or falls back down candidate model chain.

### Subtitle Parser & Overlap Eraser ↔ Subtitle Exporters & Teleprompter
- Input: Raw subtitle items array.
- Output: Sorted, overlap-corrected subtitle array `Array<{ start: string, end: string, text: string, startSec: number, endSec: number }>`.

## Code Layout
- `soundsync.html`: Main Web Application single-page UI (HTML5, CSS3, ES6 JS).
- `js/audio-resampler.js`: WebAudio 16kHz Mono PCM WAV resampling module.
- `js/gemini-api.js`: Gemini 2.0 Flash REST API client with fallback chain, JSON schema, and error translation.
- `js/subtitle-engine.js`: Millisecond timestamp parser, Overlap Eraser algorithm, and exporters (.SRT, .LRC, .VTT, Clipboard).
- `js/teleprompter.js`: Interactive teleprompter sync, line click jump to audio, and smooth scroll controller.
- `js/app.js`: Main application coordinator integrating audio resampler, API, subtitle engine, and teleprompter.
- `tests/`: Automated test suite for Tiers 1-4 (runner, unit tests, integration tests, E2E assertions).
