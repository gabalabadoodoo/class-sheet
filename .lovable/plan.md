

## Plan: Add Notifications, Countdown Timer & Schedule Import from Photo

### Features to Implement

**1. Countdown to Next Class (Today View)**
- Add a prominent countdown card at the top of the Today view showing time remaining until the next class
- Display the upcoming class name, location, and start time
- Live-updating timer (hours, minutes, seconds) that refreshes every second
- If currently in a class, show "In progress — ends in X min" instead
- If no more classes today, show "No more classes today"

**2. Browser Notifications / Reminders**
- Add a "Enable Notifications" toggle in the header or a settings area
- Request browser notification permission when toggled on
- Store reminder preference in localStorage (e.g., 10 minutes before class)
- Run a background interval that checks upcoming classes and fires a browser `Notification` when within the reminder window
- Track which notifications have already fired to avoid duplicates

**3. Import Schedule from Photo**
- Add an "Import from Photo" button in the Class Manager dialog
- User uploads an image of their schedule (standard tabular format)
- Use the device camera or file picker to capture/select the image
- Since we're a client-side app without OCR capabilities built in, we have two realistic options:

  **Option A (Recommended):** Provide a structured paste/import — user takes a photo, uses their phone's built-in text recognition (Google Lens, Apple Live Text), copies the text, and pastes it into a text area. We parse the pasted tabular text into class entries automatically.

  **Option B:** Integrate a free OCR API (would require an API key from the user).

### Technical Details

| Feature | Files Modified |
|---|---|
| Countdown timer | `src/components/TodayView.tsx` |
| Notifications | New `src/hooks/useNotifications.ts`, `src/pages/Index.tsx` |
| Import from text | `src/components/ClassManagerDialog.tsx`, new `src/components/ImportScheduleDialog.tsx` |

### Countdown Timer Logic
- Sort today's classes by start time
- Find the first class where `startTime > now` → show countdown
- If a class has `startTime <= now <= endTime` → show "in progress"
- Update every second using `setInterval`

### Notification Logic
- Store `{ enabled: boolean, minutesBefore: number }` in localStorage
- On each 30-second tick, check if any class starts within `minutesBefore` minutes
- Track fired notifications in a Set keyed by `classId + day + date`
- Use the Web Notifications API (`new Notification(...)`)

### Import from Text Logic
- Provide a textarea where user pastes copied text from their phone's OCR
- Parse lines using regex to extract: class name, class ID, day, location, times
- Show a preview table of parsed entries for user to confirm before adding

