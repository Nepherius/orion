# Orion Hunt Tracker - Development Guide

## Project Overview

Orion is a modern web-based hunt tracking application for Entropia Universe. It allows players to track their hunting sessions, loot, costs, globals, hall of fames (HoFs), and analyze their returns in real-time.

## Architecture

### Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **State Management**: Zustand with persist middleware
- **Date Utilities**: date-fns
- **Icons**: Lucide React
- **Charts**: Recharts (for future analytics)

### Project Structure

```
orion/
├── public/
│   └── vite.svg              # App icon
├── src/
│   ├── components/
│   │   ├── ActiveSessionPanel.tsx    # Active session banner
│   │   ├── AddGlobalModal.tsx        # Add global/HoF dialog
│   │   ├── AddLootModal.tsx          # Add loot dialog
│   │   ├── CostsPanel.tsx            # Cost management
│   │   ├── ItemDatabase.tsx          # Item templates management
│   │   ├── NewSessionModal.tsx       # New session dialog
│   │   ├── SessionDetails.tsx        # Session detail view
│   │   ├── SessionList.tsx           # Sessions sidebar
│   │   └── Settings.tsx              # Settings page
│   ├── App.tsx               # Main app component
│   ├── index.css             # Global styles
│   ├── main.tsx              # React entry point
│   ├── store.ts              # Zustand store
│   └── types.ts              # TypeScript interfaces
├── index.html                # HTML entry point
├── package.json              # Dependencies
├── tailwind.config.js        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite configuration
└── README.md                 # Documentation
```

## Data Models

### HuntSession

The core entity representing a hunting session:

- Basic info: name, creature, weapon, armor, location
- Status: active, paused, completed
- Timestamps: startTime, endTime
- Collections: loot[], skills[], globals[]
- Costs: ammoCost, repairCost, armorDecay, healingCost, otherCosts
- Stats: calculated statistics (returns, profit, duration, etc.)

### LootItem

Individual loot items:

- name, quantity, value (TT), markup percentage
- totalValue (calculated)
- timestamp

### Global

Global drops and HoFs:

- creature, value, timestamp
- isHoF flag

### ItemTemplate

Reusable item templates for quick loot entry:

- name, category, defaultTTValue, defaultMarkup
- description (optional)

### AppSettings

User preferences:

- playerName
- defaultMarkup
- autoSave, overlayEnabled
- theme

## State Management

The app uses Zustand for state management with localStorage persistence. All data is stored locally in the browser - no backend required.

### Key Store Actions

- **Session Management**: createSession, updateSession, deleteSession, startSession, pauseSession, endSession
- **Loot Management**: addLoot, updateLoot, removeLoot
- **Global/HoF Management**: addGlobal
- **Skill Tracking**: addSkillGain
- **Item Database**: addItemTemplate, updateItemTemplate, deleteItemTemplate
- **Settings**: updateSettings

## Key Features

### 1. Session Tracking

- Create multiple hunt sessions
- Track active session in real-time banner
- Pause/resume sessions
- End sessions to mark as completed

### 2. Loot Management

- Quick loot entry with customizable markup
- Real-time total value calculation
- Edit/remove loot items
- Loot event counter

### 3. Cost Tracking

- Multiple cost categories (ammo, repair, armor, healing, other)
- Editable costs panel
- Automatic total cost calculation
- Cost impact on returns

### 4. Returns Calculation

- Automatic returns percentage: (totalLoot / totalCost) \* 100
- Profit/loss calculation
- Color-coded indicators (green for profit, red for loss)
- Real-time updates

### 5. Globals & HoFs

- Record notable drops
- Distinguish between globals and HoFs
- Visual distinction with colored badges
- Separate counters for each

### 6. Item Database

- Create reusable item templates
- Quick-add frequently looted items
- Categorize items (loot, weapon, armor, tool, other)
- Search and filter functionality

### 7. Statistics Dashboard

- Loot value, total cost, profit/loss
- Returns percentage
- Loot events, globals, HoFs counters
- Session duration
- Visual indicators (trending up/down)

## Future Enhancements

### High Priority

1. **Analytics Dashboard**: Charts showing returns over time, loot distribution, cost breakdown
2. **Export Functionality**: Export sessions to Excel/CSV
3. **Overlay Mode**: Transparent overlay for in-game use
4. **Skills Tracking**: Detailed skill gains tracking

### Medium Priority

5. **Multi-session Comparison**: Compare returns across sessions
6. **Import from Entropia Tally**: Migrate existing data
7. **Light Theme**: Alternative color scheme
8. **Mobile Optimization**: Better responsive design

### Low Priority

9. **Cloud Sync**: Optional account-based sync
10. **Session Templates**: Quick-start with predefined settings
11. **Notifications**: Alerts for milestones
12. **Statistics Aggregation**: All-time statistics

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run lint
```

## Contributing

### Adding a New Feature

1. Define TypeScript interfaces in `src/types.ts`
2. Add store actions in `src/store.ts`
3. Create components in `src/components/`
4. Update App.tsx to integrate the feature
5. Test thoroughly
6. Update README.md with new features

### Code Style

- Use TypeScript strict mode
- Follow React best practices
- Use functional components with hooks
- Prefer Tailwind utility classes over custom CSS
- Keep components focused and reusable
- Use meaningful variable names

### Testing Checklist

- [ ] Session creation
- [ ] Adding loot items
- [ ] Cost updates
- [ ] Returns calculation
- [ ] Global/HoF recording
- [ ] Item database CRUD
- [ ] Settings persistence
- [ ] Data persistence (refresh page)
- [ ] Multiple sessions
- [ ] Active session tracking

## Common Issues & Solutions

### Issue: Data not persisting

**Solution**: Check browser localStorage. Ensure autoSave is enabled in settings.

### Issue: Returns calculation incorrect

**Solution**: Verify all costs are entered correctly. Check loot markup percentages.

### Issue: Build errors

**Solution**: Run `npm install` to ensure all dependencies are installed. Check TypeScript errors.

## Performance Considerations

- All data is stored locally (no network calls)
- State updates are optimized with Zustand
- Large session lists may impact performance
- Consider limiting displayed sessions or implementing pagination

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Edge, Safari)
- ES2020+ support required
- LocalStorage API required
- Minimum recommended: Chrome 90+, Firefox 88+, Safari 14+

## Security & Privacy

- All data stored locally in browser
- No data sent to external servers
- No account required
- No tracking or analytics
- No cookies used

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Inspired by Entropia Tally
- Inspired by Artemis (Project Delta)
- Inspired by LootNanny
- Not affiliated with MindArk PE AB or Entropia Universe
