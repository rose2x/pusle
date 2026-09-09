document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const searchInput = document.getElementById('search-input');
    const searchSpinner = document.getElementById('search-spinner');
    const resultsContainer = document.getElementById('results-container');
    const viewTitle = document.getElementById('view-title');
    const searchView = document.getElementById('search-view');
    const navSearch = document.getElementById('nav-search');
    const navSettings = document.getElementById('nav-settings');
    const navDownloads = document.getElementById('nav-downloads');
    const settingsContainer = document.getElementById('settings-container');

    // Player Elements
    const audioPlayer = document.getElementById('audio-player');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnShuffle = document.getElementById('btn-shuffle');
    const btnRepeat = document.getElementById('btn-repeat');
    const npTitle = document.getElementById('np-title');
    const npArtist = document.getElementById('np-artist');
    const npThumbnail = document.getElementById('np-thumbnail');

    // Progress & Volume
    const progressBg = document.getElementById('progress-bg');
    const progressFill = document.getElementById('progress-fill');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    const btnMute = document.getElementById('btn-mute');
    const volumeSlider = document.getElementById('volume-slider');

    // Playlist Elements
    const playlistsList = document.getElementById('playlists-list');
    const btnNewPlaylist = document.getElementById('btn-new-playlist');
    const modal = document.getElementById('playlist-modal');
    const modalPlaylistsList = document.getElementById('modal-playlists-list');
    const btnCloseModal = document.getElementById('btn-close-modal');
    
    // Info / Menu Elements
    const btnMainMenu = document.getElementById('btn-main-menu');
    const mainMenuDropdown = document.getElementById('main-menu-dropdown');
    const infoModal = document.getElementById('info-modal');
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalBody = document.getElementById('info-modal-body');
    const btnCloseInfoModal = document.getElementById('btn-close-info-modal');

    // Settings Elements
    const inputPlaylistPath = document.getElementById('input-playlist-path');
    const btnChooseFolder = document.getElementById('btn-choose-folder');
    const inputDownloadPath = document.getElementById('input-download-path');
    const btnChooseDownloadFolder = document.getElementById('btn-choose-download-folder');
    const themeButtons = document.querySelectorAll('.btn-theme');

    // State
    let allPlaylists = {};
    let currentPlaylist = [];
    let playingQueue = [];
    let playingIndex = -1;
    let isShuffle = false;
    let repeatMode = 0; // 0=off, 1=playlist, 2=track
    let activeSongToAdd = null;
    let appConfig = {};
    let lastSearchResults = []; // NEW: Cache search results

    // ==================== CUSTOM MODALS (Replaces JS prompt/confirm) ====================
    function customPrompt(title, defaultValue = '') {
        return new Promise((resolve) => {
            const m = document.getElementById('custom-prompt-modal');
            const titleEl = document.getElementById('prompt-title');
            const inputEl = document.getElementById('prompt-input');
            const btnCancel = document.getElementById('btn-prompt-cancel');
            const btnConfirm = document.getElementById('btn-prompt-confirm');
            
            titleEl.textContent = title;
            inputEl.value = defaultValue;
            m.style.display = 'flex';
            inputEl.focus();
            
            const cleanup = () => {
                m.style.display = 'none';
                btnCancel.removeEventListener('click', onCancel);
                btnConfirm.removeEventListener('click', onConfirm);
                inputEl.removeEventListener('keydown', onKeyDown);
            };
            
            const onCancel = () => { cleanup(); resolve(null); };
            const onConfirm = () => { cleanup(); resolve(inputEl.value); };
            const onKeyDown = (e) => {
                if (e.key === 'Enter') onConfirm();
                if (e.key === 'Escape') onCancel();
            };
            
            btnCancel.addEventListener('click', onCancel);
            btnConfirm.addEventListener('click', onConfirm);
            inputEl.addEventListener('keydown', onKeyDown);
        });
    }

    function customConfirm(title) {
        return new Promise((resolve) => {
            const m = document.getElementById('custom-confirm-modal');
            const titleEl = document.getElementById('confirm-title');
            const btnCancel = document.getElementById('btn-confirm-cancel');
            const btnYes = document.getElementById('btn-confirm-yes');
            
            titleEl.textContent = title;
            m.style.display = 'flex';
            
            const cleanup = () => {
                m.style.display = 'none';
                btnCancel.removeEventListener('click', onCancel);
                btnYes.removeEventListener('click', onYes);
            };
            
            const onCancel = () => { cleanup(); resolve(false); };
            const onYes = () => { cleanup(); resolve(true); };
            
            btnCancel.addEventListener('click', onCancel);
            btnYes.addEventListener('click', onYes);
        });
    }

    // ==================== TOAST NOTIFICATIONS ====================
    function showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fas fa-check-circle" style="color:var(--accent-primary)"></i> &nbsp;${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ==================== INITIALIZATION ====================
    initApp();

    async function initApp() {
        const savedVolume = localStorage.getItem('pulseVolume');
        if (savedVolume !== null) {
            audioPlayer.volume = parseFloat(savedVolume);
            volumeSlider.value = savedVolume;
            updateMuteUI();
        }

        await fetchConfig();
        await fetchPlaylists();
        
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 500);
        }
    }

    async function fetchConfig() {
        try {
            const res = await fetch('/api/config');
            appConfig = await res.json();
            applyTheme(appConfig.theme || 'spotify');
            if (inputPlaylistPath) inputPlaylistPath.value = appConfig.playlist_path || '';
            if (inputDownloadPath) inputDownloadPath.value = appConfig.download_path || '';
        } catch (e) { console.error("Config error", e); }
    }

    async function saveConfig(updates) {
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            appConfig = await res.json();
            if (updates.playlist_path) {
                if (inputPlaylistPath) inputPlaylistPath.value = appConfig.playlist_path;
                fetchPlaylists();
            }
            if (updates.download_path) {
                if (inputDownloadPath) inputDownloadPath.value = appConfig.download_path;
            }
        } catch (e) { console.error("Config save error", e); }
    }

    async function fetchPlaylists() {
        try {
            const res = await fetch('/api/playlists');
            allPlaylists = await res.json();
            renderSidebarPlaylists();
        } catch (e) { console.error("Error fetching playlists", e); }
    }

    function renderSidebarPlaylists() {
        playlistsList.innerHTML = '';
        Object.keys(allPlaylists).forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            li.addEventListener('click', () => {
                openPlaylistView(name);
            });
            playlistsList.appendChild(li);
        });
    }

    const playlistActions = document.getElementById('playlist-actions');
    const btnRenamePlaylist = document.getElementById('btn-rename-playlist');
    const btnDeletePlaylist = document.getElementById('btn-delete-playlist');
    const btnQueue = document.getElementById('btn-queue');
    const queueContainer = document.getElementById('queue-container');
    const queueList = document.getElementById('queue-list');

    // ==================== NAVIGATION ====================
    function resetNav() {
        navSearch.classList.remove('active');
        if (navSettings) navSettings.classList.remove('active');
        if (navDownloads) navDownloads.classList.remove('active');
        const navLyrics = document.getElementById('nav-lyrics');
        if (navLyrics) navLyrics.classList.remove('active');
        const navFreeMusic = document.getElementById('nav-free-music');
        if (navFreeMusic) navFreeMusic.classList.remove('active');
        
        document.querySelectorAll('.playlists-list li').forEach(el => el.classList.remove('active'));
        searchView.style.display = 'none';
        viewTitle.style.display = 'none';
        resultsContainer.style.display = 'none';
        if (settingsContainer) settingsContainer.style.display = 'none';
        if (playlistActions) playlistActions.style.display = 'none';
        if (queueContainer) queueContainer.style.display = 'none';
        
        const lyricsContainer = document.getElementById('lyrics-container');
        if (lyricsContainer) lyricsContainer.style.display = 'none';
    }

    navSearch.addEventListener('click', () => {
        resetNav();
        navSearch.classList.add('active');
        searchView.style.display = 'block';
        resultsContainer.style.display = 'block';
        
        // Restore cached search results if available
        if (lastSearchResults.length > 0 && searchInput.value.trim() !== '') {
            currentPlaylist = lastSearchResults;
            renderResults(lastSearchResults, true);
        } else {
            renderSearchHistory();
        }
    });

    const navLyrics = document.getElementById('nav-lyrics');
    if (navLyrics) {
        navLyrics.addEventListener('click', () => {
            resetNav();
            navLyrics.classList.add('active');
            viewTitle.style.display = 'block';
            viewTitle.textContent = "Lyrics";
            document.getElementById('lyrics-container').style.display = 'block';
            fetchLyricsForCurrentSong();
        });
    }
    
    const navFreeMusic = document.getElementById('nav-free-music');
    if (navFreeMusic) {
        navFreeMusic.addEventListener('click', () => {
            resetNav();
            navFreeMusic.classList.add('active');
            viewTitle.style.display = 'block';
            viewTitle.textContent = "Trending Free Music";
            resultsContainer.style.display = 'block';
            performSearch("NoCopyrightSounds");
        });
    }
    
    if (btnQueue) {
        btnQueue.addEventListener('click', () => {
            resetNav();
            viewTitle.style.display = 'block';
            viewTitle.textContent = "Up Next";
            queueContainer.style.display = 'block';
            renderQueue();
        });
    }

    if (navDownloads) {
        navDownloads.addEventListener('click', async () => {
            resetNav();
            navDownloads.classList.add('active');
            viewTitle.style.display = 'block';
            viewTitle.textContent = "Downloads";
            resultsContainer.style.display = 'block';
            resultsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading downloads...</p></div>';
            try {
                const res = await fetch('/api/downloads');
                const data = await res.json();
                currentPlaylist = data;
                renderResults(data, false);
            } catch (e) {
                resultsContainer.innerHTML = '<div class="empty-state"><p>Error loading downloads</p></div>';
            }
        });
    }

    if (navSettings) {
        navSettings.addEventListener('click', () => {
            resetNav();
            navSettings.classList.add('active');
            viewTitle.style.display = 'block';
            viewTitle.textContent = "Settings";
            if (settingsContainer) settingsContainer.style.display = 'block';
        });
    }

    let activePlaylistName = null;

    function openPlaylistView(name) {
        resetNav();
        viewTitle.style.display = 'block';
        viewTitle.textContent = name;
        resultsContainer.style.display = 'block';
        currentPlaylist = allPlaylists[name] || [];
        activePlaylistName = name;
        if (playlistActions && name !== "Liked Songs") {
            playlistActions.style.display = 'flex';
        }
        renderResults(currentPlaylist, false, true);
        
        // Pre-fetch the first 3 results to make playback instant
        for(let i=0; i<Math.min(3, currentPlaylist.length); i++) {
            const vid = currentPlaylist[i].videoId;
            if(vid !== 'local' && !prefetchCache[vid]) {
                fetch('/api/stream?id=' + vid)
                    .then(res => res.json())
                    .then(d => { if(d.stream_url) prefetchCache[vid] = d.stream_url; })
                    .catch(()=>{});
            }
        }
    }
    
    if (btnRenamePlaylist) {
        btnRenamePlaylist.addEventListener('click', async () => {
            const newName = await customPrompt("Enter new name for playlist:", activePlaylistName);
            if (newName && newName !== activePlaylistName) {
                try {
                    await fetch('/api/playlists/' + encodeURIComponent(activePlaylistName), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newName })
                    });
                    fetchPlaylists();
                    openPlaylistView(newName);
                    showToast("Playlist renamed");
                } catch(e) { console.error(e); }
            }
        });
    }

    if (btnDeletePlaylist) {
        btnDeletePlaylist.addEventListener('click', async () => {
            if (await customConfirm("Delete playlist '" + activePlaylistName + "'?")) {
                try {
                    await fetch('/api/playlists/' + encodeURIComponent(activePlaylistName), { method: 'DELETE' });
                    fetchPlaylists();
                    navSearch.click();
                    showToast("Playlist deleted");
                } catch(e) { console.error(e); }
            }
        });
    }

    // ==================== THEMES ====================
    function applyTheme(theme) {
        const root = document.documentElement;
        if (theme === 'spotify') {
            root.style.setProperty('--bg-main', '#121212');
            root.style.setProperty('--bg-sidebar', '#000000');
            root.style.setProperty('--bg-hover', '#1a1a1a');
            root.style.setProperty('--bg-player', '#181818');
            root.style.setProperty('--accent-primary', '#1DB954');
            root.style.setProperty('--accent-secondary', '#1ed760');
            root.style.setProperty('--accent-tertiary', '#1DB954');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#b3b3b3');
            root.style.setProperty('--border', '#282828');
        } else if (theme === 'sunset') {
            root.style.setProperty('--bg-main', '#050005');
            root.style.setProperty('--bg-sidebar', '#0a000a');
            root.style.setProperty('--bg-hover', '#1f0b18');
            root.style.setProperty('--bg-player', '#0a000a');
            root.style.setProperty('--accent-primary', '#ff2a2a');
            root.style.setProperty('--accent-secondary', '#ff7300');
            root.style.setProperty('--accent-tertiary', '#a020f0');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#a099a5');
            root.style.setProperty('--border', '#2a1122');
        } else if (theme === 'classic') {
            root.style.setProperty('--bg-main', '#0d0b14');
            root.style.setProperty('--bg-sidebar', '#08070d');
            root.style.setProperty('--bg-hover', '#1a1528');
            root.style.setProperty('--bg-player', '#110e1a');
            root.style.setProperty('--accent-primary', '#00f0ff');
            root.style.setProperty('--accent-secondary', '#ff0055');
            root.style.setProperty('--accent-tertiary', '#00f0ff');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#8b8698');
            root.style.setProperty('--border', '#231d33');
        } else if (theme === 'light') {
            root.style.setProperty('--bg-main', '#f5f5f7');
            root.style.setProperty('--bg-sidebar', '#ffffff');
            root.style.setProperty('--bg-hover', '#e8e8ed');
            root.style.setProperty('--bg-player', '#ffffff');
            root.style.setProperty('--accent-primary', '#0066cc');
            root.style.setProperty('--accent-secondary', '#00aaff');
            root.style.setProperty('--accent-tertiary', '#0066cc');
            root.style.setProperty('--text-primary', '#1d1d1f');
            root.style.setProperty('--text-secondary', '#86868b');
            root.style.setProperty('--border', '#d2d2d7');
        }
        themeButtons.forEach(btn => {
            btn.style.border = btn.dataset.theme === theme
                ? '2px solid var(--accent-primary)'
                : '1px solid var(--border)';
        });
    }

    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            applyTheme(btn.dataset.theme);
            saveConfig({ theme: btn.dataset.theme });
        });
    });

    // ==================== SETTINGS FOLDER PICKERS ====================
    if (btnChooseFolder) {
        btnChooseFolder.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/choose_folder');
                const data = await res.json();
                if (data.folder) saveConfig({ playlist_path: data.folder });
            } catch(e) { console.error(e); }
        });
    }

    if (btnChooseDownloadFolder) {
        btnChooseDownloadFolder.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/choose_folder');
                const data = await res.json();
                if (data.folder) {
                    saveConfig({ download_path: data.folder });
                    if (inputDownloadPath) inputDownloadPath.value = data.folder;
                }
            } catch(e) { console.error(e); }
        });
    }

    const btnCheckUpdates = document.getElementById('btn-check-updates');
    const updateStatus = document.getElementById('update-status');
    if (btnCheckUpdates) {
        btnCheckUpdates.addEventListener('click', async () => {
            btnCheckUpdates.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking GitHub...';
            btnCheckUpdates.disabled = true;
            
            try {
                const res = await fetch('/api/update/check');
                const data = await res.json();
                
                if (data.update_available) {
                    if(await customConfirm("Update " + data.latest_version + " is available! Would you like to open the GitHub page to download the new EXE?")) {
                        await fetch('/api/open_url', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: data.html_url })
                        });
                        btnCheckUpdates.innerHTML = 'Check for Updates';
                        btnCheckUpdates.disabled = false;
                    } else {
                        btnCheckUpdates.innerHTML = 'Check for Updates';
                        btnCheckUpdates.disabled = false;
                    }
                } else {
                    btnCheckUpdates.innerHTML = 'Check for Updates';
                    btnCheckUpdates.disabled = false;
                    updateStatus.innerHTML = '<i class="fas fa-check-circle" style="color:var(--accent-secondary)"></i> You are on the latest version! (' + (data.current_version || 'v16.0') + ')';
                    showToast("App is up to date!");
                }
            } catch (err) {
                btnCheckUpdates.innerHTML = 'Check for Updates';
                btnCheckUpdates.disabled = false;
                showToast("Failed to check for updates");
            }
        });
    }

    // ==================== SEARCH ====================
    let searchTimeout;
    
    function loadSearchHistory() {
        try {
            return JSON.parse(localStorage.getItem('pulseSearchHistory')) || [];
        } catch(e) { return []; }
    }
    
    function saveSearchHistory(query) {
        let history = loadSearchHistory();
        history = history.filter(q => q !== query);
        history.unshift(query);
        if (history.length > 10) history.pop();
        localStorage.setItem('pulseSearchHistory', JSON.stringify(history));
    }
    
    function renderSearchHistory() {
        const history = loadSearchHistory();
        if (history.length === 0) {
            resultsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>Search for tracks or artists</p></div>';
            return;
        }
        let html = '<h3 style="color:var(--text-secondary); margin: 1rem 2rem;">Recent Searches</h3><div style="display:flex; flex-direction:column; gap:0.5rem; padding: 0 2rem;">';
        history.forEach(query => {
            html += `<div class="history-item" style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 4px; cursor: pointer; color: white;">
                        <i class="fas fa-clock" style="margin-right: 10px; color: var(--text-secondary);"></i> ${query}
                     </div>`;
        });
        html += '</div>';
        resultsContainer.innerHTML = html;
        
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const q = e.target.textContent.trim();
                searchInput.value = q;
                performSearch(q);
            });
        });
    }

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim() === '') {
            renderSearchHistory();
        }
    });

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        if (query.length === 0) {
            renderSearchHistory();
            return;
        }
        searchTimeout = setTimeout(() => performSearch(query), 500);
    });

    async function performSearch(query) {
        searchSpinner.style.display = 'block';
        resultsContainer.innerHTML = '';
        saveSearchHistory(query);
        try {
            const res = await fetch('/api/search?q=' + encodeURIComponent(query));
            const data = await res.json();
            if (data.length === 0) {
                resultsContainer.innerHTML = '<div class="empty-state"><p>No results found for "' + query + '"</p></div>';
            } else {
                currentPlaylist = data;
                lastSearchResults = data; // Cache search results
                renderResults(data, true);
                // Pre-fetch the first 3 results to make playback instant
                for(let i=0; i<Math.min(3, data.length); i++) {
                    if(!prefetchCache[data[i].videoId]) {
                        fetch('/api/stream?id=' + data[i].videoId)
                            .then(res => res.json())
                            .then(d => { if(d.stream_url) prefetchCache[data[i].videoId] = d.stream_url; })
                            .catch(()=>{});
                    }
                }
            }
        } catch (err) {
            resultsContainer.innerHTML = '<div class="empty-state"><p>Error fetching results</p></div>';
        } finally {
            searchSpinner.style.display = 'none';
        }
    }

    // ==================== RENDER RESULTS ====================
    function renderResults(songs, isSearch, isPlaylist=false) {
        resultsContainer.innerHTML = '';
        if (songs.length === 0) {
            resultsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-compact-disc"></i><p>No tracks found</p></div>';
            return;
        }
        songs.forEach((song, idx) => {
            const div = document.createElement('div');
            div.className = 'song-item';

            const isLocal = song.videoId === 'local';
            const dlBtnHtml = isLocal
                ? '<i class="fas fa-check-circle" style="color:var(--accent-secondary);margin:0.5rem;" title="Available Offline"></i><button class="btn-delete-dl" title="Delete Download"><i class="fas fa-trash"></i></button>'
                : '<button class="btn-download" title="Download Offline"><i class="fas fa-download"></i></button>';
                
            const removeBtnHtml = isPlaylist 
                ? '<button class="btn-remove" title="Remove from Playlist" style="margin-left:5px;"><i class="fas fa-minus-circle"></i></button>'
                : '';

            div.innerHTML =
                '<img class="song-thumb" src="' + (song.thumbnail || 'https://via.placeholder.com/45') + '" alt="cover">' +
                '<div class="song-details">' +
                '<div class="song-title">' + song.title + '</div>' +
                '<div class="song-artist">' + song.artists + '</div>' +
                '</div>' +
                '<div class="song-actions">' +
                dlBtnHtml +
                '<button class="btn-add" title="Add to Playlist"><i class="fas fa-plus"></i></button>' +
                removeBtnHtml +
                '<div class="song-duration">' + song.duration + '</div>' +
                '</div>';

            // Play on click
            div.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                playingQueue = [...songs];
                if (isShuffle) {
                    const first = songs[idx];
                    const rest = songs.filter((_, i) => i !== idx).sort(() => Math.random() - 0.5);
                    playingQueue = [first, ...rest];
                    playSong(0);
                } else {
                    playSong(idx);
                }
            });

            // Add to playlist
            div.querySelector('.btn-add').addEventListener('click', (e) => {
                e.stopPropagation();
                activeSongToAdd = song;
                showPlaylistModal();
            });
            
            // Remove from playlist
            const rmBtn = div.querySelector('.btn-remove');
            if (rmBtn) {
                rmBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        await fetch('/api/playlists/' + encodeURIComponent(activePlaylistName) + '/remove', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ videoId: song.videoId })
                        });
                        openPlaylistView(activePlaylistName);
                        showToast("Song removed");
                    } catch(e){}
                });
            }

            // Download & Delete Download
            const dlBtn = div.querySelector('.btn-download');
            if (dlBtn) {
                dlBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const icon = dlBtn.querySelector('i');
                    icon.className = 'fas fa-spinner fa-spin';
                    try {
                        const res = await fetch('/api/download', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(song)
                        });
                        const data = await res.json();
                        if (data.status === 'success') {
                            icon.className = 'fas fa-check';
                            icon.style.color = 'var(--accent-secondary)';
                            showToast("Download Complete!");
                        } else {
                            icon.className = 'fas fa-times';
                        }
                    } catch (err) {
                        icon.className = 'fas fa-times';
                    }
                });
            }
            
            const delDlBtn = div.querySelector('.btn-delete-dl');
            if (delDlBtn) {
                delDlBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if(await customConfirm("Delete this downloaded file?")) {
                        try {
                            await fetch('/api/download?file=' + encodeURIComponent(song.filepath), { method: 'DELETE' });
                            showToast("File deleted");
                            navDownloads.click(); // refresh
                        } catch(e){}
                    }
                });
            }

            resultsContainer.appendChild(div);
        });
    }

    function renderQueue() {
        queueList.innerHTML = '';
        if (playingQueue.length === 0) {
            queueList.innerHTML = '<div class="empty-state"><p>Queue is empty</p></div>';
            return;
        }
        
        let startIdx = playingIndex >= 0 ? playingIndex : 0;
        
        for (let i = startIdx; i < playingQueue.length; i++) {
            const song = playingQueue[i];
            const div = document.createElement('div');
            div.className = 'song-item';
            if (i === playingIndex) {
                div.style.borderLeft = '3px solid var(--accent-primary)';
                div.style.backgroundColor = 'rgba(255,255,255,0.05)';
            }
            
            div.innerHTML =
                '<img class="song-thumb" src="' + (song.thumbnail || 'https://via.placeholder.com/45') + '" alt="cover">' +
                '<div class="song-details">' +
                '<div class="song-title">' + song.title + '</div>' +
                '<div class="song-artist">' + song.artists + '</div>' +
                '</div>' +
                '<div class="song-actions">' +
                '<div class="song-duration">' + song.duration + '</div>' +
                '</div>';
                
            div.addEventListener('click', () => {
                playSong(i);
            });
            
            queueList.appendChild(div);
        }
    }

    // ==================== PLAYLISTS MODAL ====================
    btnNewPlaylist.addEventListener('click', async () => {
        const name = await customPrompt("Enter playlist name:");
        if (name) {
            try {
                await fetch('/api/playlists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                fetchPlaylists();
            } catch (e) { console.error(e); }
        }
    });

    function showPlaylistModal() {
        modalPlaylistsList.innerHTML = '';
        Object.keys(allPlaylists).forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            li.addEventListener('click', async () => {
                if (activeSongToAdd) {
                    try {
                        await fetch('/api/playlists/' + encodeURIComponent(name) + '/add', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(activeSongToAdd)
                        });
                        fetchPlaylists();
                        modal.style.display = 'none';
                        showToast(`Added to ${name}`);
                    } catch (e) { console.error(e); }
                }
            });
            modalPlaylistsList.appendChild(li);
        });
        modal.style.display = 'flex';
    }

    btnCloseModal.addEventListener('click', () => { modal.style.display = 'none'; });
    
    // ==================== MAIN MENU & INFO MODAL ====================
    if (btnMainMenu) {
        btnMainMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            mainMenuDropdown.style.display = mainMenuDropdown.style.display === 'none' ? 'block' : 'none';
        });
    }

    document.addEventListener('click', (e) => {
        if (mainMenuDropdown && !mainMenuDropdown.contains(e.target) && e.target !== btnMainMenu) {
            mainMenuDropdown.style.display = 'none';
        }
    });

    const openInfoModal = (title, htmlContent) => {
        infoModalTitle.textContent = title;
        infoModalBody.innerHTML = htmlContent;
        infoModal.style.display = 'flex';
        mainMenuDropdown.style.display = 'none';
    };

    document.getElementById('menu-updates')?.addEventListener('click', (e) => {
        e.preventDefault();
        openInfoModal("What's New in V1.3.9", `
            <ul style="padding-left:20px; line-height:1.6;">
                <li><b>Instant Playback Engine:</b> Background pre-fetcher makes songs load instantly.</li>
                <li><b>Spotify Dark Theme:</b> New default styling with native-looking UI dialogs.</li>
                <li><b>Auto-Updater:</b> Pulse Music will now detect updates seamlessly from the cloud.</li>
                <li><b>Offline Manager:</b> Delete downloaded files directly from the Downloads tab.</li>
                <li><b>Queue View:</b> See your "Up Next" queue by clicking the list icon in the player.</li>
            </ul>
        `);
    });

    document.getElementById('menu-credits')?.addEventListener('click', (e) => {
        e.preventDefault();
        openInfoModal("Credits & Thanks", `
            <div style="text-align: center; margin-bottom: 20px;">
                <i class="fas fa-heart" style="color: #ff0055; font-size: 3rem; margin-bottom: 10px;"></i>
                <h3 style="margin-top:0;">Made with Love</h3>
            </div>
            <table style="width:100%; border-collapse: collapse; font-size: 1.1em;">
                <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                    <td style="padding:12px 0; color:var(--text-secondary);">Founder</td>
                    <td style="padding:12px 0; color:white; text-align:right;"><b>Hakim (حكيم)</b></td>
                </tr>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                    <td style="padding:12px 0; color:var(--text-secondary);">Developer</td>
                    <td style="padding:12px 0; color:white; text-align:right;"><b>thecrewx</b></td>
                </tr>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                    <td style="padding:12px 0; color:var(--text-secondary);">Idea</td>
                    <td style="padding:12px 0; color:white; text-align:right;"><b>vishal</b></td>
                </tr>
                <tr>
                    <td style="padding:12px 0; color:var(--text-secondary);">Supporters</td>
                    <td style="padding:12px 0; color:white; text-align:right;"><b>vishal, mei</b></td>
                </tr>
            </table>
        `);
    });

    document.getElementById('menu-help')?.addEventListener('click', (e) => {
        e.preventDefault();
        openInfoModal("Help & Support", `
            <p>Welcome to Pulse Music!</p>
            <ul style="padding-left:20px; margin-top:10px;">
                <li><b>Search:</b> Find any song on YouTube Music.</li>
                <li><b>Playlists:</b> Create local playlists to organize your favorite tracks.</li>
                <li><b>Downloads:</b> Click the download icon to save a song offline as an MP3.</li>
                <li><b>Lyrics:</b> Click the Lyrics tab while a song is playing to view synced lyrics.</li>
            </ul>
            <p style="margin-top:10px;">All data is stored locally on your device.</p>
        `);
    });

    document.getElementById('menu-keybinds')?.addEventListener('click', (e) => {
        e.preventDefault();
        openInfoModal("Keyboard Shortcuts", `
            <table style="width:100%; border-collapse: collapse;">
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:8px 0; color:white;"><b>Spacebar</b></td>
                    <td style="padding:8px 0;">Play / Pause</td>
                </tr>
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:8px 0; color:white;"><b>/ (Forward Slash)</b></td>
                    <td style="padding:8px 0;">Focus Search</td>
                </tr>
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:8px 0; color:white;"><b>M</b></td>
                    <td style="padding:8px 0;">Mute / Unmute</td>
                </tr>
                <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:8px 0; color:white;"><b>Up Arrow</b></td>
                    <td style="padding:8px 0;">Volume Up</td>
                </tr>
                <tr>
                    <td style="padding:8px 0; color:white;"><b>Down Arrow</b></td>
                    <td style="padding:8px 0;">Volume Down</td>
                </tr>
            </table>
            <p style="margin-top:15px; font-size:0.9em;">Pulse also supports global hardware media keys (Play, Pause, Next, Prev).</p>
        `);
    });

    if (btnCloseInfoModal) {
        btnCloseInfoModal.addEventListener('click', () => { infoModal.style.display = 'none'; });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
        if (e.target === infoModal) infoModal.style.display = 'none';
    });

    // ==================== AUDIO PLAYER ====================
    let prefetchCache = {}; // URL Cache for next song

    function prefetchNextSong() {
        if (playingQueue.length === 0) return;
        let next = playingIndex + 1;
        if (next >= playingQueue.length) {
            if (repeatMode === 1) next = 0;
            else return;
        }
        const nextSong = playingQueue[next];
        if (nextSong.videoId === 'local') return;
        if (prefetchCache[nextSong.videoId]) return;
        
        fetch('/api/stream?id=' + nextSong.videoId)
            .then(res => res.json())
            .then(data => {
                if (data.stream_url) {
                    prefetchCache[nextSong.videoId] = data.stream_url;
                }
            }).catch(e => console.error("Prefetch failed", e));
    }

    function fetchLyricsForCurrentSong() {
        const lyricsContent = document.getElementById('lyrics-content');
        if (!lyricsContent) return;
        
        if (playingIndex < 0 || playingQueue.length === 0) {
            lyricsContent.innerHTML = '<div class="empty-state"><p>Play a song to see lyrics</p></div>';
            return;
        }
        
        const song = playingQueue[playingIndex];
        lyricsContent.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Searching for lyrics...</p></div>';
        
        // Clean up title and artist for better match
        const cleanTitle = song.title.replace(/[\(\[].*?[\)\]]/g, '').trim();
        const cleanArtist = song.artists.split(',')[0].split('&')[0].trim();
        
        fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    const track = data[0];
                    const lyrics = track.syncedLyrics || track.plainLyrics;
                    if (lyrics) {
                        lyricsContent.innerHTML = `<pre class="lyrics-text">${lyrics}</pre>`;
                    } else {
                        lyricsContent.innerHTML = '<div class="empty-state"><p>No lyrics found for this track.</p></div>';
                    }
                } else {
                    lyricsContent.innerHTML = '<div class="empty-state"><p>No lyrics found for this track.</p></div>';
                }
            })
            .catch(() => {
                lyricsContent.innerHTML = '<div class="empty-state"><p>Failed to load lyrics.</p></div>';
            });
    }

    async function playSong(index) {
        if (index < 0 || index >= playingQueue.length) return;
        playingIndex = index;
        const song = playingQueue[index];

        npTitle.textContent = song.title;
        npArtist.textContent = song.artists;
        if (song.thumbnail) {
            npThumbnail.src = song.thumbnail;
            npThumbnail.style.display = 'block';
        }

        npTitle.innerHTML = 'Loading <i class="fas fa-spinner fa-spin"></i>';
        btnPlayPause.disabled = true;
        btnNext.disabled = true;
        btnPrev.disabled = true;
        
        if (document.getElementById('nav-lyrics') && document.getElementById('nav-lyrics').classList.contains('active')) {
            fetchLyricsForCurrentSong();
        }
        
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: song.artists,
                artwork: [{ src: song.thumbnail || 'https://via.placeholder.com/512', sizes: '512x512', type: 'image/jpeg' }]
            });
            navigator.mediaSession.setActionHandler('play', () => btnPlayPause.click());
            navigator.mediaSession.setActionHandler('pause', () => btnPlayPause.click());
            navigator.mediaSession.setActionHandler('previoustrack', () => btnPrev.click());
            navigator.mediaSession.setActionHandler('nexttrack', () => btnNext.click());
        }

        try {
            if (song.videoId === 'local') {
                npTitle.textContent = song.title;
                audioPlayer.src = '/api/local_stream?file=' + encodeURIComponent(song.filepath);
                audioPlayer.play();
                updatePlayPauseUI(true);
            } else {
                if (prefetchCache[song.videoId]) {
                    npTitle.textContent = song.title;
                    audioPlayer.src = prefetchCache[song.videoId];
                    audioPlayer.play();
                    updatePlayPauseUI(true);
                } else {
                    const res = await fetch('/api/stream?id=' + song.videoId);
                    const data = await res.json();
                    if (data.stream_url) {
                        npTitle.textContent = song.title;
                        audioPlayer.src = data.stream_url;
                        audioPlayer.play();
                        updatePlayPauseUI(true);
                    } else {
                        npTitle.textContent = 'Error loading stream';
                    }
                }
            }
            prefetchNextSong(); // Automatically fetch the next track's URL in the background
        } catch (err) {
            npTitle.textContent = 'Network error';
        } finally {
            btnPlayPause.disabled = false;
            btnPrev.disabled = playingQueue.length <= 1;
            btnNext.disabled = playingQueue.length <= 1;
        }
    }

    function updatePlayPauseUI(isPlaying) {
        btnPlayPause.innerHTML = isPlaying
            ? '<i class="fas fa-pause"></i>'
            : '<i class="fas fa-play"></i>';
    }

    btnPlayPause.addEventListener('click', () => {
        if (audioPlayer.paused && audioPlayer.src) {
            audioPlayer.play();
            updatePlayPauseUI(true);
        } else if (!audioPlayer.paused) {
            audioPlayer.pause();
            updatePlayPauseUI(false);
        }
    });

    // Next / Prev
    btnNext.addEventListener('click', playNext);
    btnPrev.addEventListener('click', playPrev);

    function playNext() {
        if (playingQueue.length === 0) return;
        let next = playingIndex + 1;
        if (next >= playingQueue.length) {
            if (repeatMode === 1) next = 0;
            else return;
        }
        playSong(next);
    }

    function playPrev() {
        if (playingQueue.length === 0) return;
        if (audioPlayer.currentTime > 3) {
            audioPlayer.currentTime = 0;
            return;
        }
        let prev = playingIndex - 1;
        if (prev < 0) {
            if (repeatMode === 1) prev = playingQueue.length - 1;
            else prev = 0;
        }
        playSong(prev);
    }

    audioPlayer.addEventListener('ended', () => {
        if (repeatMode === 2) {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        } else {
            playNext();
        }
    });

    // Shuffle & Repeat
    btnShuffle.addEventListener('click', () => {
        isShuffle = !isShuffle;
        btnShuffle.classList.toggle('active', isShuffle);
        btnShuffle.title = isShuffle ? 'Shuffle (On)' : 'Shuffle (Off)';
        if (playingQueue.length > 0 && isShuffle) {
            const current = playingQueue[playingIndex];
            const rest = playingQueue.filter((_, i) => i !== playingIndex).sort(() => Math.random() - 0.5);
            playingQueue = [current, ...rest];
            playingIndex = 0;
        }
    });

    btnRepeat.addEventListener('click', () => {
        repeatMode = (repeatMode + 1) % 3;
        btnRepeat.classList.toggle('active', repeatMode > 0);
        if (repeatMode === 0) {
            btnRepeat.innerHTML = '<i class="fas fa-redo"></i> <span>Loop</span>';
            btnRepeat.title = 'Repeat (Off)';
        } else if (repeatMode === 1) {
            btnRepeat.innerHTML = '<i class="fas fa-redo"></i> <span>Loop All</span>';
            btnRepeat.title = 'Repeat All';
        } else {
            btnRepeat.innerHTML = '<i class="fas fa-redo"></i><span style="font-size:0.5em;position:absolute;margin-left:-8px;margin-top:2px;">1</span> <span>Loop 1</span>';
            btnRepeat.title = 'Repeat One';
        }
    });

    // Progress bar
    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration) {
            progressFill.style.width = ((audioPlayer.currentTime / audioPlayer.duration) * 100) + '%';
            timeCurrent.textContent = formatTime(audioPlayer.currentTime);
            timeTotal.textContent = formatTime(audioPlayer.duration);
        }
    });

    progressBg.addEventListener('click', (e) => {
        if (audioPlayer.duration) {
            const rect = progressBg.getBoundingClientRect();
            audioPlayer.currentTime = ((e.clientX - rect.left) / rect.width) * audioPlayer.duration;
        }
    });

    // Volume
    volumeSlider.addEventListener('input', (e) => {
        audioPlayer.volume = e.target.value;
        audioPlayer.muted = false;
        localStorage.setItem('pulseVolume', e.target.value);
        updateMuteUI();
    });

    btnMute.addEventListener('click', () => {
        audioPlayer.muted = !audioPlayer.muted;
        updateMuteUI();
    });

    function updateMuteUI() {
        btnMute.innerHTML = (audioPlayer.muted || audioPlayer.volume === 0)
            ? '<i class="fas fa-volume-mute"></i>'
            : '<i class="fas fa-volume-up"></i>';
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m + ':' + s.toString().padStart(2, '0');
    }

    // ==================== KEYBOARD SHORTCUTS ====================
    document.addEventListener('keydown', (e) => {
        if (document.activeElement === searchInput) {
            if (e.key === 'Escape') searchInput.blur();
            return;
        }
        switch (e.key.toLowerCase()) {
            case ' ':
                e.preventDefault();
                if (!btnPlayPause.disabled) btnPlayPause.click();
                break;
            case 'm':
                btnMute.click();
                break;
            case '/':
                e.preventDefault();
                navSearch.click();
                searchInput.focus();
                break;
            case 'arrowup':
                e.preventDefault();
                volumeSlider.value = Math.min(1, parseFloat(volumeSlider.value) + 0.1);
                audioPlayer.volume = volumeSlider.value;
                break;
            case 'arrowdown':
                e.preventDefault();
                volumeSlider.value = Math.max(0, parseFloat(volumeSlider.value) - 0.1);
                audioPlayer.volume = volumeSlider.value;
                break;
        }
    });
});