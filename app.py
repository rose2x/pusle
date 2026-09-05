import os
import sys
import json
import time
import socket
import threading
import shutil
import webview
from flask import Flask, render_template, request, jsonify, send_file
import yt_dlp

if getattr(sys, 'frozen', False):
    template_folder = os.path.join(sys._MEIPASS, 'templates')
    static_folder = os.path.join(sys._MEIPASS, 'static')
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
else:
    app = Flask(__name__)

# Base AppData
appdata_dir = os.path.join(os.getenv('APPDATA'), 'PulseMusic')
os.makedirs(appdata_dir, exist_ok=True)
config_file = os.path.join(appdata_dir, 'config.json')

def load_config():
    default_config = {
        "theme": "sunset",
        "playlist_path": appdata_dir,
        "download_path": os.path.join(appdata_dir, 'downloads')
    }
    if not os.path.exists(config_file):
        return default_config
    with open(config_file, 'r', encoding='utf-8') as f:
        try:
            config = json.load(f)
            for k, v in default_config.items():
                if k not in config:
                    config[k] = v
            return config
        except:
            return default_config

def save_config(config):
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=4)

def get_playlists_file():
    config = load_config()
    path = config.get('playlist_path', appdata_dir)
    os.makedirs(path, exist_ok=True)
    return os.path.join(path, 'playlists.json')

def load_playlists():
    pf = get_playlists_file()
    if not os.path.exists(pf):
        return {"Liked Songs": []}
    with open(pf, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except:
            return {"Liked Songs": []}

def save_playlists(data):
    pf = get_playlists_file()
    with open(pf, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify(load_config())

@app.route('/api/config', methods=['POST'])
def update_config():
    new_config = request.json
    old_config = load_config()
    
    old_pf = get_playlists_file()
    config = load_config()
    config.update(new_config)
    save_config(config)
    
    new_pf = get_playlists_file()
    if old_pf != new_pf and os.path.exists(old_pf) and not os.path.exists(new_pf):
        try:
            shutil.copy2(old_pf, new_pf)
        except:
            pass
            
    return jsonify(config)

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
    try:
        ydl_opts = {
            'quiet': True,
            'extract_flat': 'in_playlist',
            'default_search': 'ytsearch20',
            'no_warnings': True,
            'simulate': True
        }
        songs = []
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch20:{query} song", download=False)
            if 'entries' in info:
                for entry in info['entries']:
                    if entry:
                        video_id = entry.get('id')
                        if video_id:
                            duration_sec = entry.get('duration', 0)
                            if duration_sec:
                                m = int(duration_sec // 60)
                                s = int(duration_sec % 60)
                                duration = f"{m}:{s:02d}"
                            else:
                                duration = "0:00"
                            thumbnail = entry.get('thumbnail') or f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg"
                            songs.append({
                                'videoId': video_id,
                                'title': entry.get('title', 'Unknown'),
                                'artists': entry.get('uploader', 'Unknown'),
                                'duration': duration,
                                'thumbnail': thumbnail
                            })
        return jsonify(songs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stream', methods=['GET'])
def stream():
    video_id = request.args.get('id', '')
    if not video_id:
        return jsonify({'error': 'No ID provided'}), 400
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'simulate': True,
        'skip_download': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            return jsonify({'stream_url': info.get('url')})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download', methods=['POST'])
def download_song():
    data = request.json
    video_id = data.get('videoId')
    title = data.get('title', 'Unknown')
    artists = data.get('artists', 'Unknown')
    
    if not video_id:
        return jsonify({'error': 'No ID provided'}), 400
        
    config = load_config()
    dl_dir = config.get('download_path', os.path.join(appdata_dir, 'downloads'))
    os.makedirs(dl_dir, exist_ok=True)
    
    clean_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c==' ']).rstrip()
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(dl_dir, f'{clean_title} - {artists}.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/downloads', methods=['GET'])
def list_downloads():
    config = load_config()
    dl_dir = config.get('download_path', os.path.join(appdata_dir, 'downloads'))
    os.makedirs(dl_dir, exist_ok=True)
    
    files = []
    for f in os.listdir(dl_dir):
        if f.endswith(('.webm', '.m4a', '.mp3', '.opus', '.wav')):
            path = os.path.join(dl_dir, f)
            name_parts = os.path.splitext(f)[0].split(' - ', 1)
            title = name_parts[0] if len(name_parts) > 0 else f
            artists = name_parts[1] if len(name_parts) > 1 else 'Local File'
            
            files.append({
                'videoId': 'local',
                'filepath': path,
                'title': title,
                'artists': artists,
                'duration': 'Offline',
                'thumbnail': 'https://via.placeholder.com/45?text=Offline'
            })
    return jsonify(files)

@app.route('/api/local_stream', methods=['GET'])
def local_stream():
    filepath = request.args.get('file', '')
    if not filepath or not os.path.exists(filepath):
        return "File not found", 404
    return send_file(filepath)

@app.route('/api/playlists', methods=['GET', 'POST'])
def handle_playlists():
    if request.method == 'GET':
        return jsonify(load_playlists())
    data = request.json
    name = data.get('name')
    if not name: return jsonify({'error': 'Name required'}), 400
    pl = load_playlists()
    if name not in pl:
        pl[name] = []
        save_playlists(pl)
    return jsonify(pl)

@app.route('/api/playlists/<name>/add', methods=['POST'])
def add_to_playlist(name):
    song = request.json
    pl = load_playlists()
    if name not in pl: pl[name] = []
    if not any(s['videoId'] == song['videoId'] for s in pl[name]):
        pl[name].append(song)
        save_playlists(pl)
    return jsonify(pl)

# Folder picker endpoint using Tkinter
@app.route('/api/choose_folder')
def choose_folder():
    import tkinter as tk
    from tkinter import filedialog
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    folder = filedialog.askdirectory()
    root.destroy()
    return jsonify({"folder": folder})

def start_server():
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

def wait_for_server(host='127.0.0.1', port=5000, timeout=15):
    """Wait until the Flask server is accepting connections."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            s = socket.create_connection((host, port), timeout=1)
            s.close()
            return True
        except (ConnectionRefusedError, OSError):
            time.sleep(0.2)
    return False

def open_browser_app(url):
    """Opens the URL in a standalone app window using Edge or Chrome."""
    
    creationflags = 0
    if hasattr(subprocess, 'CREATE_NO_WINDOW'):
        creationflags = subprocess.CREATE_NO_WINDOW

    # Try Edge first
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        "/usr/bin/microsoft-edge",
        "/usr/bin/microsoft-edge-stable"
    ]
    for path in edge_paths:
        if os.path.exists(path):
            if os.name == 'nt':
                subprocess.Popen([path, f'--app={url}'], creationflags=creationflags)
            else:
                subprocess.Popen([path, f'--app={url}'])
            return

    # Fallback to Chrome/Chromium
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe"),
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser"
    ]
    for path in chrome_paths:
        if os.path.exists(path):
            if os.name == 'nt':
                subprocess.Popen([path, f'--app={url}'], creationflags=creationflags)
            else:
                subprocess.Popen([path, f'--app={url}'])
            return
            
    # Absolute fallback
    import webbrowser
    webbrowser.open(url)

if __name__ == '__main__':
    import subprocess
    # Start Flask in a background thread
    t = threading.Thread(target=start_server)
    t.daemon = True
    t.start()
    
    # Wait for Flask to be ready
    wait_for_server()
    
    # Open the lightweight app window
    open_browser_app("http://127.0.0.1:5000")
    
    # Keep the main thread alive so Flask continues running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
