# 🎵 PulseMusic

A modern, feature-rich music streaming and management application built with Python, Flask, and PyWebview. Stream music from YouTube, manage playlists, download tracks, and enjoy an intuitive desktop experience.

---

## ✨ Features

- 🔍 **Smart Search** - Search and discover music from YouTube with real-time results
- 🎧 **High-Quality Streaming** - Stream audio in the best available format
- 📥 **Download Manager** - Download your favorite tracks for offline listening
- 📋 **Playlist Management** - Create, organize, and manage multiple playlists
- 🎨 **Theme Customization** - Multiple theme options (Sunset, and more)
- 💾 **Local Playback** - Play downloaded music files directly from your device
- ⚙️ **Configuration** - Customize download paths, storage locations, and preferences
- 🔄 **Update Checker** - Automatic detection of new app versions

---

## 🛠️ Requirements

### System Requirements
- **OS**: Windows, macOS, or Linux
- **Python**: 3.10 or higher
- **RAM**: Minimum 2GB (4GB recommended)
- **Disk**: 500MB for application and cache

### Python Dependencies
- Flask - Web framework
- PyWebview - Desktop UI framework
- yt-dlp - YouTube audio extraction
- Requests - HTTP client library

---

## 📦 Installation

### From Source

1. **Clone the Repository**
   ```bash
   git clone https://github.com/thecrewx/puslemusic.git
   cd puslemusic
   ```

2. **Install Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Application**
   ```bash
   python app.py
   ```

### From Package

#### Arch Linux
Download the latest `.pkg.tar.zst` package from [Releases](https://github.com/thecrewx/puslemusic/releases) and install:
```bash
sudo pacman -U PulseMusic_Linux_arch.pkg.tar.zst
pulsemusic
```

#### Debian/Ubuntu
```bash
sudo dpkg -i PulseMusic_Linux.deb
pulsemusic
```

#### Red Hat/CentOS/Fedora
```bash
sudo rpm -i PulseMusic_Linux.rpm
pulsemusic
```

---

## 🚀 Quick Start

1. **Launch the Application**
   - Run `python app.py` or launch from your application menu

2. **Search for Music**
   - Enter a song name, artist, or keyword in the search bar
   - Results appear instantly with thumbnails and duration

3. **Stream or Download**
   - Click the play button to stream
   - Click download to save offline

4. **Manage Playlists**
   - Create new playlists from the sidebar
   - Add songs to playlists by clicking the "Add" button
   - Organize your music collection

5. **Configure Settings**
   - Access settings to change themes
   - Customize download location
   - Adjust playback preferences

---

## 📁 Directory Structure

```
puslemusic/
├── app.py                 # Main application file
├── requirements.txt       # Python dependencies
├── templates/
│   └── index.html        # Web UI template
├── static/
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript files
│   └── assets/           # Images and icons
└── .github/
    └── workflows/
        └── build.yml     # CI/CD pipeline
```

---

## ⚙️ Configuration

PulseMusic stores configuration in your system's application data directory:

- **Windows**: `%APPDATA%\PulseMusic\config.json`
- **Linux**: `~/.config/PulseMusic/config.json` (or equivalent)
- **macOS**: `~/Library/Application Support/PulseMusic/config.json`

### Configuration Options
```json
{
  "theme": "sunset",
  "playlist_path": "/path/to/playlists",
  "download_path": "/path/to/downloads"
}
```

---

## 🎨 Themes

PulseMusic supports multiple theme options:
- **Sunset** - Warm orange and red tones (Default)
- More themes coming soon!

---

## 📥 Downloads

All downloaded files are stored in your configured download directory and can be:
- Played back offline
- Managed through the Downloads tab
- Deleted individually or in batch
- Organized in playlists

Supported formats:
- `.webm`
- `.m4a`
- `.mp3`
- `.opus`
- `.wav`

---

## 🐛 Troubleshooting

### Application Won't Start
- Ensure Python 3.10+ is installed
- Verify all dependencies: `pip install -r requirements.txt`
- Check that port 5001 is available

### Search Results Not Loading
- Check your internet connection
- Verify YouTube is accessible in your region
- Try searching with different keywords

### Download Failed
- Ensure sufficient disk space
- Check download directory permissions
- Verify YouTube video is available for streaming

### Audio Quality Issues
- The app automatically selects the best available format
- YouTube availability varies by region and video
- Some videos may not have high-quality audio

---

## 🔄 Automatic Updates

PulseMusic checks for updates on startup. When a new version is available:
- A notification appears in the app
- Click to visit the releases page
- Download and install the latest version

---

## 🏗️ Building from Source

### Build Arch Linux Package
```bash
./build.sh arch
```

### Build Debian Package
```bash
./build.sh debian
```

### Build Executable with PyInstaller
```bash
pyinstaller --noconfirm --onefile --windowed \
  --add-data "templates:templates" \
  --add-data "static:static" \
  --name "PulseMusic" app.py
```

---

## 📝 API Documentation

### Search
```
GET /api/search?q=query
```
Returns list of matching songs with metadata

### Stream
```
GET /api/stream?id=videoId
```
Returns streaming URL for direct playback

### Download
```
POST /api/download
{
  "videoId": "...",
  "title": "Song Title",
  "artists": "Artist Name"
}
```

### Playlists
```
GET /api/playlists                    # List all playlists
POST /api/playlists                   # Create playlist
POST /api/playlists/<name>/add        # Add song
DELETE /api/playlists/<name>/remove   # Remove song
```

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## ⚠️ Disclaimer

PulseMusic is designed for personal, non-commercial use. Users are responsible for ensuring they comply with:
- YouTube's Terms of Service
- Local copyright laws
- Audio streaming service agreements

The developers are not responsible for misuse of this application or copyright infringement.

---

## 🙏 Credits

- **PyWebView** - Desktop application framework
- **Flask** - Web server
- **yt-dlp** - YouTube media extraction
- **Community Contributors** - Your feedback and contributions

---

## 📧 Support

For issues, feature requests, or questions:
- Open an [Issue](https://github.com/thecrewx/puslemusic/issues)
- Check [Discussions](https://github.com/thecrewx/puslemusic/discussions)
- Review [Release Notes](https://github.com/thecrewx/puslemusic/releases)

---

## 🎯 Roadmap

- [ ] Add Spotify integration
- [ ] Implement lyrics display
- [ ] Add equalizer
- [ ] Multi-language support
- [ ] Mobile app version
- [ ] Cloud sync for playlists
- [ ] Advanced search filters
- [ ] Dark mode improvements

---

**Made with ❤️ by thecrewx**

⭐ If you find PulseMusic helpful, please consider giving it a star!
