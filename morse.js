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
let audioCtx = null, osc = null, gainNode = null, volume = 0.5, toneFreq = 650, audioUnlocked = false;
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
const volSlider = document.getElementById("vol-slider"), volOut = document.getElementById("vol-out");
const freqSlider = document.getElementById("freq-slider"), freqOut = document.getElementById("freq-out");

volSlider.addEventListener("input", () => { volume = Number(volSlider.value) / 100; volOut.textContent = `${volSlider.value}%`; initAudio(); });
freqSlider.addEventListener("input", () => { toneFreq = Number(freqSlider.value); freqOut.textContent = `${toneFreq} Hz`; if (osc) osc.frequency.value = toneFreq; });
