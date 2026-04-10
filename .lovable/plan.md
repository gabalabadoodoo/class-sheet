
## University Class Schedule Website

### Overview
Build a class schedule website with your uni classes, featuring both a **weekly calendar grid** and a **list/table view**, with search/filter and live editing capabilities.

### Data
The schedule will be hardcoded from your uploaded spreadsheet with these classes:
- AppDev LEC/LAB, Techno, NetComm 1, Automata, DataVis, Python, PurComm

### Features

1. **Weekly Calendar Grid View**
   - Days as columns (Monday–Friday), time slots as rows (7 AM–7 PM)
   - Color-coded blocks per class for easy visual identification
   - Shows class name, room/location, and time on each block

2. **List/Table View**
   - Clean table matching spreadsheet layout (Class, ID, Day, Location, Start/End Time)
   - Sortable columns

3. **Toggle Between Views**
   - Tab or button to switch between calendar and table views

4. **Search & Filter**
   - Search bar to filter by class name or ID
   - Filter by day of the week
   - Filter by location (Online vs. On-site)

5. **Edit Schedule Live**
   - Add new classes via a form/dialog
   - Edit existing class details inline or via modal
   - Delete classes with confirmation
   - All changes persist in browser localStorage

6. **Design**
   - Clean, modern UI with shadcn components
   - Responsive layout for desktop and mobile
   - Color-coded classes for quick visual scanning
