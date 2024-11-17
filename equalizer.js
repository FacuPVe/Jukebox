let songs = [];
let radioStations = [];
let currentTrack = null;
let songIndex = 0;
let isPlaying = false;
let songVolume = 0.5;
let analyser, bufferLength, dataArray;
let canvas = document.getElementById('equalizer');
let ctx = canvas.getContext('2d');
let currentContext = 'songs';
let seekBar = document.getElementById('seek-bar');
let equalizerContainer = document.getElementById('equalizer-container');
let topRight = document.querySelector('.top-right');

const loadSongsAndRadio = async () => {
    let songsResponse = await fetch('./json/songsData.json');
    let radioResponse = await fetch('./json/radioStations.json');
    songs = (await songsResponse.json()).songs;
    radioStations = (await radioResponse.json()).radioStations;
    createPlaylist();
    createRadioList();
    loadTrack(songIndex);
    setupEventListeners();

};

function updatePlayerUI(song) {
    document.getElementById('song-title').textContent = song.title;
    document.getElementById('song-artist').textContent = song.artist;
    document.getElementById('song-image').src = song.image;

}

function createPlaylist() {
    const playlist = document.getElementById('playlist');
    playlist.innerHTML = '';
    songs.forEach((song, index) => {
        const li = document.createElement('li');
        li.textContent = song.title;
        li.addEventListener('click', () => {
            stopTrack();
            loadTrack(index);
            playTrack();
        });
        playlist.appendChild(li);
    });
}

function createRadioList() {
    const radioList = document.getElementById('radio-list');
    radioList.innerHTML = '';
    radioStations.forEach((station) => {
        const li = document.createElement('li');
        li.textContent = station.name;
        li.addEventListener('click', () => {
            stopTrack();
            playRadioStation(station);
        });
        radioList.appendChild(li);
    });
}

function playRadioStation(station) {
    if (currentTrack) {
        currentTrack.stop();
        isPlaying = false;
    }
    currentContext = 'radios';

    seekBar.style.display = 'none';
    topRight.style.height = '100%';
    equalizerContainer.style.display = 'none';
    currentTrack = new Howl({
        src: [station.stream],
        volume: songVolume,
        html5: true
    });

    document.getElementById('song-title').textContent = station.name;
    document.getElementById('song-artist').textContent = "Radio";
    document.getElementById('song-image').src = station.logo || "./images/default.png";

    currentTrack.play();
    isPlaying = true;
    document.getElementById('play-pause').src = 'images/pause.png';

    if (!analyser) {
        loadEqualizer();
    }
    animateEqualizer();
}


function loadTrack(index) {
    if (currentTrack) currentTrack.stop();
    currentContext = 'songs';
    equalizerContainer.style.display = 'initial';

    seekBar.style.display = 'initial';
    topRight.style.height = '60%';
    const song = songs[index];
    currentTrack = new Howl({
        src: [song.src],
        volume: songVolume,
        onend: nextTrack
    });
    updatePlayerUI(song);
    songIndex = index;

}

function playTrack() {
    if (currentTrack) {
        currentTrack.play(); 
        isPlaying = true;
        document.getElementById('play-pause').src = 'images/pause.png';

        if (!analyser) {
            loadEqualizer();
        }
        animateEqualizer();
    }
}


function pauseTrack() {
    if (isPlaying) {
        currentTrack.pause();
        isPlaying = false;
        document.getElementById('play-pause').src = 'images/play.png';
    }
}

function stopTrack() {
    if (currentTrack) {
        currentTrack.stop();
        isPlaying = false;
    }
}

function nextTrack() {
    if (currentContext === 'songs') {
        songIndex = (songIndex + 1) % songs.length;
        loadTrack(songIndex);
        playTrack();
    } else if (currentContext === 'radios') {
        const currentStationIndex = radioStations.findIndex(
            (station) => station.name === document.getElementById('song-title').textContent
        );
        const nextStationIndex = (currentStationIndex + 1) % radioStations.length;
        playRadioStation(radioStations[nextStationIndex]);
    }
}


function prevTrack() {
    if (currentContext === 'songs') {
        songIndex = (songIndex - 1 + songs.length) % songs.length;
        loadTrack(songIndex);
        playTrack();
    } else if (currentContext === 'radios') {
        const currentStationIndex = radioStations.findIndex(
            (station) => station.name === document.getElementById('song-title').textContent
        );
        const prevStationIndex = (currentStationIndex - 1 + radioStations.length) % radioStations.length;
        playRadioStation(radioStations[prevStationIndex]);
    }
}

function loadEqualizer() {
    if (!Howler.ctx) {
        Howler.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    analyser = Howler.ctx.createAnalyser();
    analyser.fftSize = 512;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    Howler.masterGain.connect(analyser);
    analyser.connect(Howler.ctx.destination);
}

function animateEqualizer() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    analyser.getByteFrequencyData(dataArray);
    let barWidth = (canvas.width / bufferLength) * 1;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        let barHeight = dataArray[i + 5];
        ctx.fillStyle = `rgb(${barHeight + 100},50,150)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
    if (isPlaying) requestAnimationFrame(animateEqualizer);
}

function setupEventListeners() {
    document.getElementById('play-pause').addEventListener('click', () => {
        if (isPlaying) pauseTrack();
        else playTrack();
    });
    document.getElementById('prev').addEventListener('click', prevTrack);
    document.getElementById('next').addEventListener('click', nextTrack);
    document.getElementById('volume-control').addEventListener('input', (e) => {
        songVolume = e.target.value;
        if (currentTrack) currentTrack.volume(songVolume);
    });
    document.getElementById('seek-bar').addEventListener('input', (e) => {
        if (currentTrack) {
            const seekTime = currentTrack.duration() * (e.target.value / 100);
            currentTrack.seek(seekTime);
        }
    });
    setInterval(() => {
        if (currentTrack && currentTrack.playing()) {
            const seek = currentTrack.seek() || 0;
            document.getElementById('seek-bar').value = (seek / currentTrack.duration()) * 100;
        }
    }, 1000);
}

loadSongsAndRadio();
