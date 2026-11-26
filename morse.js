const MORSE = {
    ".-": "A", "-...": "B", "-.-.": "C", "-..": "D", ".": "E", "..-.": "F", "--.": "G", "....": "H", "..": "I", ".---": "J",
    "-.-": "K", ".-..": "L", "--": "M", "-.": "N", "---": "O", ".--.": "P", "--.-": "Q", ".-.": "R", "...": "S", "-": "T",
    "..-": "U", "...-": "V", ".--": "W", "-..-": "X", "-.--": "Y", "--..": "Z", "-----": "0", ".----": "1", "..---": "2",
    "...--": "3", "....-": "4", ".....": "5", "-....": "6", "--...": "7", "---..": "8", "----.": "9", ".-.-.-": ".",
    "--..--": ",", "..--..": "?", ".----.": "'", "-.-.--": "!", "-..-.": "/", "-.--.": "<KN>", "-.--.-": ")", ".-...": "&",
    "---...": ":", "-.-.-.": ";", "-...-": "=", ".-.-.": "<AR>", "-....-": "-", "..--.-": "_", ".-..-.": "\"", "...-..-": "$",
    ".--.-.": "@", "...-.-": "<SK>", "-.-.-": "<KA>", ".-.-": "Ą", "-.-..": "Ć", "..-..": "Ę", ".-..-": "Ł", "--.--": "Ń",
    "---.": "Ó", "...-...": "Ś", "--..-.": "Ż", "--..-": "Ź"
};

const REV_MORSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

const PL_MAP = {
    "Ą": "A", "Ć": "C", "Ę": "E", "Ł": "L",
    "Ń": "N", "Ó": "O", "Ś": "S", "Ź": "Z", "Ż": "Z"
};

function stripPolishChars(str) {
    return str.replace(/[ĄĆĘŁŃÓŚŹŻ]/g, ch => PL_MAP[ch] || ch);
}

const settingsDrawer = document.getElementById("settings-drawer");
document.getElementById("toggle-settings-btn").addEventListener("click", () => settingsDrawer.classList.toggle("open"));

const unlockBtn = document.getElementById("unlock-audio-btn");
let audioCtx = null, osc = null, gainNode = null, volume = 0.5, toneFreq = 700, audioUnlocked = false;
let keepAliveOsc = null, keepAliveGain = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        osc = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = toneFreq;
        gainNode.gain.value = 0;
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();

        keepAliveOsc = audioCtx.createOscillator();
        keepAliveGain = audioCtx.createGain();
        keepAliveOsc.type = "sine";
        keepAliveOsc.frequency.value = 18000;
        keepAliveGain.gain.value = 0.001;
        keepAliveOsc.connect(keepAliveGain);
        keepAliveGain.connect(audioCtx.destination);
        keepAliveOsc.start();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume().then(() => {
            if (audioCtx.state === "running") {
                audioUnlocked = true;
                if (unlockBtn) unlockBtn.style.display = "none";
            }
        }).catch(() => { });
    } else if (audioCtx.state === "running") {
        audioUnlocked = true;
        if (unlockBtn) unlockBtn.style.display = "none";
    }
}

function toneOn() {
    initAudio();
    if (!audioCtx || !gainNode) return;
    const n = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(n);
    gainNode.gain.setTargetAtTime(volume * 0.4, n, 0.002);
}

function toneOff() {
    if (!audioCtx || !gainNode) return;
    const n = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(n);
    gainNode.gain.setTargetAtTime(0, n, 0.002);
}

let txWpm = 20, rxWpm = 20, ditMs = 60, charGapMult = 3.0, maxGapMult = 10;
let symbolBuf = "", lessonGapTimer = null;

const wpmSlider = document.getElementById("wpm-slider");
const strictGapCheck = document.getElementById("strict-gap-check");
const softErrorCheck = document.getElementById("soft-error-check");
const volSlider = document.getElementById("vol-slider"), volOut = document.getElementById("vol-out");
const freqSlider = document.getElementById("freq-slider"), freqOut = document.getElementById("freq-out");

volSlider.addEventListener("input", () => { volume = Number(volSlider.value) / 100; volOut.textContent = `${volSlider.value}%`; initAudio(); });
freqSlider.addEventListener("input", () => {
    toneFreq = Number(freqSlider.value);
    freqOut.textContent = `${toneFreq} Hz`;
    if (osc) osc.frequency.value = toneFreq;

    let color = "#22c55e"; // zielony: standard Yaesu FT-817 / FT-450 (600 - 700 Hz)
    if (toneFreq < 600) color = "#38bdf8";      // niebieski: niski, łagodny ton (< 600 Hz)
    else if (toneFreq > 700) color = "#f59e0b"; // pomarańczowy: wysoki ton (> 700 Hz)

    freqSlider.style.accentColor = color;
    freqOut.style.color = color;
});

const soundFeedbackCheck = document.getElementById("sound-feedback-check");

// Krótkie dźwięki feedbacku (niezależne od głównego tonu CW)
function playFeedback(isSuccess) {
    if (!soundFeedbackCheck || !soundFeedbackCheck.checked) return;
    if (!audioCtx) return;

    // Głośność to 50% głośności suwaka (np. jeśli suwak na 50%, dźwięk ma 25%)
    const volumeLevel = volume * 1.0; // Możesz dostosować ten współczynnik, aby zmienić głośność feedbacku
    const duration = isSuccess ? 0.1 : 0.25;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Sukces: wysoki, czysty dźwięk (C6). Błąd: niski, buczący (G3)
    osc.type = isSuccess ? "sine" : "triangle";
    osc.frequency.setValueAtTime(isSuccess ? 1046.50 : 196.00, audioCtx.currentTime);

    // Obwiednia (fade in/out), aby uniknąć trzasków
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(volumeLevel, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}