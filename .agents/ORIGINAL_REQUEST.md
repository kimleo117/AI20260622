# Original User Request

## 2026-08-09T17:13:57Z

<USER_REQUEST>
Build a fully functional, highly reliable, and visually stunning web application for SoundSync AI — an AI-powered voice/music lyric listener, millisecond-precision timecode alignment tool, and subtitle generator.

Working directory: C:\外掛\影像\workspace\AI20260622-main
Integrity mode: development

## Requirements

### R1. Fail-Safe Audio File Selection and Resampling
The web application must allow selecting or dragging-and-dropping any audio/video file (MP3, WAV, M4A, OGG, FLAC) without browser file picker errors or MIME type blocking on Windows.
- Provide a clean WebAudio 16kHz Mono resampling pipeline to clean vocal audio tracks before sending to Gemini API.

### R2. Official Gemini 2.0 Flash API Integration with Automatic Fallback
Integrate Google Gemini 2.0 Flash REST API (https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent) with automatic fallback to secondary compatible endpoints.
- Parse user-provided reference lyrics text if present to guarantee 100% lyric output accuracy.
- Enforce JSON format response for subtitle items with start/end millisecond timestamps.

### R3. Overlap Eraser and Multi-Format Subtitle Export
Implement a millisecond overlap correction algorithm to adjust consecutive subtitle boundaries (end_i < start_{i+1}).
- Provide interactive real-time lyric teleprompter scrolling tied to <audio> playback.
- Support one-click download for .SRT, .LRC, .VTT, and text clipboard copy.

## Acceptance Criteria

### Audio Upload & UI
- [ ] Clicking the file selection button or dropzone pops up the native file picker on all Windows/Mac browsers.
- [ ] Loading a file immediately updates the audio player title and duration without JavaScript errors.

### API Processing & Alignment
- [ ] Gemini API requests succeed using gemini-2.0-flash or fallback endpoints.
- [ ] Returned subtitles display in the timeline container with millisecond time badges.
- [ ] Clicking any lyric line jumps audio playback directly to its start timestamp.

### Subtitle Export
- [ ] .SRT export generates valid SubRip timecode format (00:00:01,200 --> 00:00:04,500).
- [ ] .LRC export generates valid Lyric format ([00:01.20] Lyric text).
</USER_REQUEST>
