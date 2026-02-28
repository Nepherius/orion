# Quick Start Guide - Orion Loot Tracker

## Getting the App Running (5 minutes)

1. **Install Node.js** (if not already installed)
   - Download from https://nodejs.org/
   - Minimum version: Node 18+

2. **Clone and setup**

   ```bash
   git clone https://gitlab.com/Nepherius/orion.git
   cd orion
   npm install
   npm run tauri:dev
   ```

3. **Open the app**
   - The Tauri window will launch automatically.
   - The app is now running locally on your machine!

## Your First Hunt Session (2 minutes)

### Step 1: Create a Loadout

1. Navigate to the **Loadouts** tab
2. Click **"New Loadout"**
3. Enter your weapon, amplifier, and other equipment details
4. Click **"Save"**

### Step 2: Create a Session

1. Click **"New Session"** button
2. Fill in:
   - Session Name: "My First Hunt"
   - Creature: "Atrox"
   - Loadout: Select the loadout you just created
   - Location: "Port Atlantis"
3. Click **"Create Session"**

### Step 3: Add Some Loot

1. Click **"Add Loot"** in the session details
2. Enter:
   - Item Name: "Animal Oil Residue"
   - Quantity: 10
   - TT Value: 0.01
   - Markup: 105
3. Click **"Add Loot"**
4. Your loot total updates automatically!

### Step 4: Track Costs

1. Find the **"Costs"** panel
2. Click **"Edit"**
3. Enter your costs:
   - Ammo Cost: 10.00
   - Repair Cost: 2.50
4. Click **"Save"**
5. Watch your returns percentage update!

### Step 5: Add a Global

1. Click **"Add Global"**
2. Enter:
   - Creature: "Atrox"
   - Value: 50.00
   - Check "This is a HoF" if value > 500 PED
3. Click **"Add Global"**

## Understanding Your Stats

### Returns Percentage

- **100%** = Break even (got back what you spent)
- **> 100%** = Profit! (Green)
- **< 100%** = Loss (Red)

Formula: `(Total Loot / Total Cost) * 100`

### Profit/Loss

Shows the PED difference:

- **Positive** = You made money (Green)
- **Negative** = You lost money (Red)

Formula: `Total Loot - Total Cost`

## Pro Tips

### 1. Use the Item Database

- Add frequently looted items with default values
- Saves time when adding loot repeatedly
- Go to **Database** tab → **Add Item Template**

### 2. Track Everything

- Enter costs as you go
- Add globals immediately
- Update loot in real-time
- More accurate = better insights

### 3. Session Management

- Use descriptive names: "Evening Atrox - South PA"
- Pause sessions when taking breaks
- End sessions when done hunting

### 4. Multiple Sessions

- Track different creatures separately
- Compare returns across sessions
- Keep historical data for analysis

## Common Workflows

### Quick Hunt Session

```
1. New Session (30 seconds)
2. Hunt in-game (? minutes)
3. Add loot as you get it (10 seconds each)
4. Update costs periodically (30 seconds)
5. End session when done (5 seconds)
```

### After-Hunt Data Entry

```
1. New Session with details
2. Take screenshots of loot and costs in-game
3. Enter all loot from screenshots
4. Enter all costs
5. Results calculated automatically
```

### Using Item Templates

```
1. Go to Database tab
2. Add common loot items:
   - Animal Oil Residue (0.01 TT, 105%)
   - Animal Eye Oil (0.02 TT, 110%)
   - Fine Wool (0.05 TT, 105%)
3. When adding loot, use these defaults
4. Just adjust quantity!
```

## What's Next?

### Explore Features

- [ ] Try the Item Database
- [ ] Add multiple sessions
- [ ] Track a full hunt from start to finish
- [ ] Open the floating Live Overlay while hunting
- [ ] Check your returns over multiple sessions in Analytics

### Customize Settings

- Go to **Settings** tab
- Set your player name
- Adjust default markup percentage
- Configure auto-save and theme

## Need Help?

### Data Not Saving?

- Check the console logs for SQLite database write errors

### Returns Look Wrong?

- Double-check all costs are entered
- Verify loot markup percentages
- Make sure TT values are correct

### Can't Find Something?

- Use the search in Sessions list
- Check all tabs (Sessions, Database, Analytics, Settings)
- Read the full README.md

## Backup Your Data

⚠️ **Important**: All data is stored locally on your machine via a SQLite database, NOT the browser localStorage. It is safe from browser cache-clearing.

To backup:

1. Locate the Orion application data folder for your OS.
2. Manually copy the `orion.db` file to a safe location.
3. (Automated Export feature coming soon)

---

**Happy Hunting!** 🎯

Track your hunts, analyze your returns, and hunt smarter in Entropia Universe!

---

_Orion Loot Tracker v0.1.0_
