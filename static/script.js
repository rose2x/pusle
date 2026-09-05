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
        // Load saved volume
        const savedVolume = localStorage.getItem('pulseVolume');
        if (savedVolume !== null) {
            audioPlayer.volume = parseFloat(savedVolume);
            volumeSlider.value = savedVolume;
            updateMuteUI();
        }

        await fetchConfig();
        await fetchPlaylists();
        
        // Hide splash screen
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
            applyTheme(appConfig.theme);
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

    // ==================== NAVIGATION ====================
    function resetNav() {
        navSearch.classList.remove('active');
        if (navSettings) navSettings.classList.remove('active');
        if (navDownloads) navDownloads.classList.remove('active');
        document.querySelectorAll('.playlists-list li').forEach(el => el.classList.remove('active'));
        searchView.style.display = 'none';
        viewTitle.style.display = 'none';
        resultsContainer.style.display = 'none';
        if (settingsContainer) settingsContainer.style.display = 'none';
    }

    navSearch.addEventListener('click', () => {
        resetNav();
        navSearch.classList.add('active');
        searchView.style.display = 'block';
        resultsContainer.style.display = 'block';
        if (searchInput.value.trim() === '') {
            resultsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-compact-disc"></i><p>Search for tracks or open a playlist</p></div>';
        } else {
            renderResults(currentPlaylist, true);
        }
    });

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

    function openPlaylistView(name) {
        resetNav();
        viewTitle.style.display = 'block';
        viewTitle.textContent = name;
        resultsContainer.style.display = 'block';
        currentPlaylist = allPlaylists[name] || [];
        renderResults(currentPlaylist, false);
    }

    // ==================== THEMES ====================
    function applyTheme(theme) {
        const root = document.documentElement;
        if (theme === 'sunset') {
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

    // ==================== SEARCH ====================
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        if (query.length === 0) {
            resultsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-compact-disc"></i><p>Search for tracks or open a playlist</p></div>';
            return;
        }
        searchTimeout = setTimeout(() => performSearch(query), 500);
    });

    async function performSearch(query) {
        searchSpinner.style.display = 'block';
        resultsContainer.innerHTML = '';
        try {
            const res = await fetch('/api/search?q=' + encodeURIComponent(query));
            const data = await res.json();
            if (data.length === 0) {
                resultsContainer.innerHTML = '<div class="empty-state"><p>No results found for "' + query + '"</p></div>';
            } else {
                currentPlaylist = data;
                renderResults(data, true);
            }
        } catch (err) {
            resultsContainer.innerHTML = '<div class="empty-state"><p>Error fetching results</p></div>';
        } finally {
            searchSpinner.style.display = 'none';
        }
    }

    // ==================== RENDER RESULTS ====================
    function renderResults(songs, isSearch) {
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
                ? '<i class="fas fa-check-circle" style="color:var(--accent-secondary);margin:0.5rem;" title="Available Offline"></i>'
                : '<button class="btn-download" title="Download Offline"><i class="fas fa-download"></i></button>';

            div.innerHTML =
                '<img class="song-thumb" src="' + (song.thumbnail || 'https://via.placeholder.com/45') + '" alt="cover">' +
                '<div class="song-details">' +
                '<div class="song-title">' + song.title + '</div>' +
                '<div class="song-artist">' + song.artists + '</div>' +
                '</div>' +
                '<div class="song-actions">' +
                dlBtnHtml +
                '<button class="btn-add" title="Add to Playlist"><i class="fas fa-plus"></i></button>' +
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

            // Download
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

            resultsContainer.appendChild(div);
        });
    }

    // ==================== PLAYLISTS MODAL ====================
    btnNewPlaylist.addEventListener('click', async () => {
        const name = prompt("Enter playlist name:");
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
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // ==================== AUDIO PLAYER ====================
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
        
        // Media Session API
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
            btnRepeat.innerHTML = '<i class="fas fa-redo"></i>';
            btnRepeat.title = 'Repeat (Off)';
        } else if (repeatMode === 1) {
            btnRepeat.innerHTML = '<i class="fas fa-redo"></i>';
            btnRepeat.title = 'Repeat All';
        } else {
            btnRepeat.innerHTML = '<i class="fas fa-redo"></i><span style="font-size:0.5em;position:absolute;margin-left:-8px;margin-top:2px;">1</span>';
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