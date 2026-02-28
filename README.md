# Orion Loot Tracker 🎯

A modern **desktop application** for tracking Entropia Universe hunting sessions. Built with **Tauri** (Rust + React), Orion automatically monitors your chat log to detect globals, HoFs, and loot in real-time.

**Key Features:**

- 🔥 **Automatic loot detection** from chat log
- 📊 **Real-time monitoring** with file watching
- 💎 **Tiny file size** (~10-20 MB)
- ⚡ **Fast & efficient** - Native performance with Rust backend
- 💾 **Local-first** - All data stays on your machine

Inspired by **Entropia Tally**, **Artemis**

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎯 Automatic Chat Log Parsing

- **Real-time monitoring** of Entropia Universe chat.log
- **Automatic detection** of globals and Hall of Fame events
- **Multi-language support** (English, Romanian, etc.)
- **File watching** - Monitors log changes automatically
- **Player filtering** - Track only your own loot

### 🎮 Session Management

- Create and manage multiple hunting sessions
- Track active, paused, and completed sessions
- Real-time session statistics
- Session notes and details

### 💎 Loot Tracking

- Add loot items with TT value and markup
- Track quantity and total value
- Quick loot entry with customizable defaults
- Item database for frequently looted items

### 📊 Statistics & Analytics

- Real-time returns calculation
- Total loot vs. cost tracking
- Profit/loss monitoring
- Session duration tracking
- Loot events counter

### 🏆 Globals & HoFs

- Record global drops
- Track Hall of Fame (HoF) events
- Visual distinction between globals and HoFs

### 💰 Cost Management

- Ammo cost tracking
- Repair cost tracking
- Armor decay costs
- Healing costs
- Other miscellaneous costs

### 📦 Item Database

- Create item templates with default values
- Quick-add frequently looted items
- Categorize items (loot, weapon, armor, tool, other)
- Default markup management

### ⚙️ Settings

- Customizable default markup
- Player name configuration
- **Rust** 1.77.2+ ([install from rustup.rs](https://rustup.rs/))
- **Node.js** 18+ and npm/yarn
- **Linux/Windows/macOS** supported

### Installation

1. Clone the repository:

```bash
git clone https://gitlab.com/Nepherius/orion.git
cd orion
```

2. Install dependencies:

```bash
npm install
```

3. Run in development mode:

```bash
npm run tauri:dev
```

4. Build for production:

```bash
npm run tauri:build
```

The built executable will be in `src-tauri/target/release/`

### First Run Setup

1. **Launch Orion** - Double-click the executable
2. **Create a Loadout** - Navigate to the "Loadouts" tab and create your first equipment loadout.
3. **Select your chat log** (if not auto-detected in Settings):
   - Windows: `C:\Users\<YourName>\Documents\Entropia Universe\chat.log`
   - Linux: `~/.wine/drive_c/users/<YourName>/Documents/Entropia Universe/chat.log`
4. **Create a hunting session** - Click "New Session" and select your new loadout.
5. **Hunt!** - Globals, HoFs, and loot will be automatically detected from your chat log.

## 📖 Usage

### Creating a Hunt Session

1. Click "New Session" in the Sessions panel
2. Fill in session details (creature, weapon, armor, location)
3. Click "Create Session" to start tracking

### Adding Loot

1. Select an active or completed session
2. In the Session Details view, click "Add Loot"
3. Enter item name, quantity, TT value, and markup
4. Click "Add Loot" to record

### Recording Globals & HoFs

1. In Session Details, click "Add Global"
2. Enter creature name and loot value
3. Check "This is a Hall of Fame (HoF)" if applicable
4. Click "Add Global"

### Managing Costs

1. In Session Details, find the Costs panel
2. Click "Edit" to modify costs
3. Enter ammo, repair, armor decay, healing, and other costs
4. Click "Save" to update

### Using Item Database

1. Navigate to the Database tab
2. Click "Add Item Template"
3. Create templates for frequently looted items with default values
4. Use these templates for quick loot entry

## 🛠️ Technology Stack

- **Tauri 2** - Rust-powered desktop framework
- **Rust** - Backend for file operations and parsing
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management with local persistence
- **Notify** - File system watching
- **Regex** - Chat log parsing

## 🚀 Future Enhancements

- [x] Automatic chat log parsing
- [x] Real-time file watching
- [x] Global and HoF detection
- [x] Analytics dashboard with charts
- [x] Skills & attributes parsing from chat
- [x] Overlay mode for in-game use
- [ ] Team/shared loot detection

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Inspired by [Entropia Tally](https://github.com/EntropiaTally/entropia-tally-app/)
- Inspired by [Artemis](https://www.thedeltaproject.net/artemis)

## ⚠️ Disclaimer

This is an independent project and is **not affiliated with MindArk PE AB or Entropia Universe**. All trademarks are property of their respective owners.

## 📧 Contact

For issues, questions, or suggestions, please use the GitLab issue tracker.

---

_Orion Loot Tracker v0.1.0_
