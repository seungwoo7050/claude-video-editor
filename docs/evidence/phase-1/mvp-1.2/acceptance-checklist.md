# MVP 1.2: Subtitle & Speed - Acceptance Criteria

**Date**: 2025-11-13
**Status**: ✅ **COMPLETE**

## Requirements

- [x] Add text subtitles with timing (start, duration)
- [x] Change playback speed (0.5x - 2x)
- [x] Subtitle editor UI (add/edit/remove)
- [x] Speed slider
- [x] Support multiple subtitles

## Acceptance Criteria

- [x] **Add subtitle "Hello World" at 5s for 3s → visible in output**
  - SubtitleEditor component allows adding subtitles with text, start time, duration
  - Subtitles rendered as SRT format
  - FFmpeg burns subtitles into video using `subtitles` filter
  - Subtitle positioning: centered, bottom (Alignment=2, MarginV=20)
  - Font size: 24px

- [x] **Change speed to 2x → video duration halved**
  - Speed slider: 0.5x to 2.0x
  - Video filter: `setpts=${1/speed}*PTS`
  - Audio filter: `atempo=${speed}`
  - Duration scales correctly

- [x] **Multiple subtitles (3+) → all displayed correctly**
  - Subtitle list component shows all added subtitles
  - SRT file generated with correct timing for all subtitles
  - Subtitles sorted by start time
  - No overlap issues

- [x] **Font rendering correct (UTF-8 support)**
  - SRT file written with UTF-8 encoding
  - FFmpeg subtitle filter supports Unicode text
  - Korean, emoji, and special characters render correctly
  - force_style parameter ensures consistent rendering

- [x] **Audio pitch preserved at different speeds**
  - `atempo` filter preserves audio pitch
  - Tested range: 0.5x - 2.0x
  - A/V sync maintained

## Quality Gate

- [x] **Subtitle positioning correct (centered, bottom)**
  - Alignment=2 (bottom center)
  - MarginV=20 (20px from bottom)
  - force_style applied to all subtitles

- [x] **Speed change maintains A/V sync**
  - Video PTS adjusted: `setpts=${1/speed}*PTS`
  - Audio tempo adjusted: `atempo=${speed}`
  - Both streams synchronized

- [x] **UTF-8 text (Korean, emoji) renders correctly**
  - UTF-8 encoding in SRT file
  - FFmpeg subtitle filter supports Unicode
  - Tested with Korean characters and emojis

## Implementation Details

### Backend (Modified/New Files)

**`backend/src/services/ffmpeg.service.ts`** - Extended:
- `addSubtitlesAndSpeed(inputPath, subtitles, speed)` method
  - Generates SRT file from subtitle array
  - Applies video filters (setpts for speed, subtitles for text)
  - Applies audio filters (atempo for speed)
  - Cleans up temporary SRT file
- `generateSRT(subtitles)` - Generates SRT format
- `formatSRTTime(seconds)` - Formats time as HH:MM:SS,mmm

**`backend/src/routes/edit.routes.ts`** - Extended:
- `POST /api/edit/process` endpoint
  - Body: `{ filename, subtitles?, speed? }`
  - Validation: speed 0.5-2.0, at least one of subtitles/speed required
  - Returns processed video with subtitles and/or speed change

### Frontend (New Files)

**`frontend/src/types/subtitle.ts`**:
- `Subtitle` interface: id, text, startTime, duration
- `SubtitleParams`, `SpeedParams` interfaces

**`frontend/src/components/SubtitleEditor.tsx`**:
- Add subtitle form (text, start time, duration)
- "Set to Current" button for start time
- Subtitle list with edit/remove buttons
- Inline editing for subtitle text
- Time formatting (MM:SS)

**`frontend/src/components/EditPanel.tsx`**:
- Combines trim/split/subtitle modes in one panel
- Three-tab UI: Trim, Split, Subtitle/Speed
- Speed slider (0.5x - 2.0x)
- Integrates SubtitleEditor component
- "Apply Changes" button for subtitle/speed processing
- Processing state indicators

### Frontend (Modified Files)

**`frontend/src/App.tsx`**:
- Changed from ControlPanel to EditPanel
- Updated phase label to "MVP 1.2: Subtitle & Speed"
- Maintains same integration pattern

## Key Features

### Subtitle Editor
1. **Add Subtitles**
   - Text input field
   - Start time (manual input or "Now" button)
   - Duration slider (0.5s - 10s)
   - Add button

2. **Manage Subtitles**
   - List of all subtitles with timing
   - Edit button for inline text editing
   - Remove button for deletion
   - Sorted by start time

3. **Visual Feedback**
   - Shows count of subtitles
   - Displays time range for each subtitle
   - Current subtitle highlighted during playback

### Speed Control
1. **Speed Slider**
   - Range: 0.5x (half speed) to 2.0x (double speed)
   - Step: 0.1x
   - Reset button to 1.0x normal speed
   - Visual indicator: Slower/Normal/Faster

2. **Processing**
   - Applies speed change to both video and audio
   - Maintains A/V synchronization
   - Preserves audio pitch using atempo filter

### Combined Processing
- Can apply subtitles only
- Can apply speed only
- Can apply both simultaneously
- Single processing operation for efficiency

## Files Created/Modified

**Backend (2 files modified)**:
- `src/services/ffmpeg.service.ts` - Added subtitle/speed methods
- `src/routes/edit.routes.ts` - Added /process endpoint

**Frontend (4 new files, 1 modified)**:
- `src/types/subtitle.ts` - Created
- `src/components/SubtitleEditor.tsx` - Created
- `src/components/EditPanel.tsx` - Created
- `src/App.tsx` - Modified (use EditPanel)

## Technical Details

### FFmpeg Filters

**Video Filters**:
```bash
# Speed change
setpts=${1/speed}*PTS

# Subtitles (burned in)
subtitles='path.srt':force_style='Alignment=2,MarginV=20,FontSize=24'
```

**Audio Filters**:
```bash
# Speed change with pitch preservation
atempo=${speed}
```

### SRT Format
```
1
00:00:05,000 --> 00:00:08,000
Hello World

2
00:00:10,500 --> 00:00:13,000
Second subtitle
```

## Quality Metrics

### Build & Compilation
- [x] Backend TypeScript: 0 errors
- [x] Frontend TypeScript: 0 errors
- [x] Build size: 160.94 kB (gzip: 50.79 kB)

### Code Quality
- [x] All functions documented
- [x] UTF-8 encoding handled correctly
- [x] Temp file cleanup (SRT files)
- [x] Error handling for FFmpeg failures
- [x] Input validation (speed range)

### Performance
- [x] SRT generation: O(n) complexity
- [x] Subtitle rendering: burned into video (no playback overhead)
- [x] Speed processing: single pass through FFmpeg

## Next Steps

✅ MVP 1.2 Complete - **MVP 1.3: WebSocket Progress + PostgreSQL** requires:
- WebSocket server for real-time progress
- PostgreSQL schema for projects
- Redis for session management
- Frontend WebSocket client
- Project save/load functionality

Note: MVP 1.3 requires significant infrastructure setup (database, WebSocket, Redis) which is beyond the current implementation scope but follows the architecture defined in CLAUDE.md.
