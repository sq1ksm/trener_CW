const MORSE = {
    ".-": "A", "-...": "B", "-.-.": "C", "-..": "D", ".": "E", "..-.": "F", "--.": "G", "....": "H", "..": "I", ".---": "J",
    "-.-": "K", ".-..": "L", "--": "M", "-.": "N", "---": "O", ".--.": "P", "--.-": "Q", ".-.": "R", "...": "S", "-": "T",
    "..-": "U", "...-": "V", ".--": "W", "-..-": "X", "-.--": "Y", "--..": "Z", "-----": "0", ".----": "1", "..---": "2",
    "...--": "3", "....-": "4", ".....": "5", "-....": "6", "--...": "7", "---..": "8", "----.": "9", ".-.-.-": ".",
    "--..--": ",", "..--..": "?", ".----.": "'", "-.-.--": "!", "-..-.": "/", "-.--.": "(", "-.--.-": ")", ".-...": "&",
    "---...": ":", "-.-.-.": ";", "-...-": "=", ".-.-.": "+", "-....-": "-", "..--.-": "_", ".-..-.": "\"", "...-..-": "$",
    ".--.-.": "@", "...-.-": "<SK>", "-.-.-": "<KA>", ".-.-": "Ą", "-.-..": "Ć", "..-..": "Ę", ".-..-": "Ł", "--.--": "Ń",
    "---.": "Ó", "...-...": "Ś", "--..-.": "Ż", "--..-": "Ź"
};
const REV_MORSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

const settingsDrawer = document.getElementById("settings-drawer");
document.getElementById("toggle-settings-btn").addEventListener("click", () => settingsDrawer.classList.toggle("open"));

const unlockBtn = document.getElementById("unlock-audio-btn");
let audioCtx = null, osc = null, gainNode = null, volume = 0.5, toneFreq = 650, audioUnlocked = false;

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
    gainNode.gain.setTargetAtTime(volume * 0.4, n, 0.004);
}

function toneOff() {
    if (!audioCtx || !gainNode) return;
    const n = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(n);
    gainNode.gain.setTargetAtTime(0, n, 0.004);
}

let midiAccess = null, currentIn = null, currentOut = null;
let txWpm = 20, rxWpm = 20, ditMs = 60, charGapMult = 3.0, maxGapMult = 10;
let keyDownAt = 0, isDown = false, symbolBuf = "", charTimer = null, lessonGapTimer = null;

const statusEl = document.getElementById("status"), inSel = document.getElementById("midi-in"), outSel = document.getElementById("midi-out");
const chSel = document.getElementById("midi-ch"), noteNumEl = document.getElementById("note-num"), anyNoteEl = document.getElementById("any-note");
const volSlider = document.getElementById("vol-slider"), volOut = document.getElementById("vol-out"), freqSlider = document.getElementById("freq-slider"), freqOut = document.getElementById("freq-out");
const wpmSlider = document.getElementById("wpm-slider"), wpmOut = document.getElementById("wpm-out"), quickWpmBadge = document.getElementById("quick-wpm-badge"), syncCheck = document.getElementById("sync-decoder");
const charGapSlider = document.getElementById("char-gap-slider"), charGapOut = document.getElementById("char-gap-out");
const strictGapCheck = document.getElementById("strict-gap-check"), maxGapRow = document.getElementById("max-gap-row"), maxGapSlider = document.getElementById("max-gap-slider"), maxGapOut = document.getElementById("max-gap-out");
const manualRxBox = document.getElementById("manual-rx-box"), rxWpmSlider = document.getElementById("rx-wpm-slider"), rxWpmOut = document.getElementById("rx-wpm-out");
const threshInfo = document.getElementById("thresholds-info"), logEl = document.getElementById("log");

const lessonType = document.getElementById("lesson-type"), lessonBoxEl = document.getElementById("lesson-box");
const lessonGridEl = document.getElementById("lesson-grid"), lessonMsgEl = document.getElementById("lesson-msg"), lessonStatsEl = document.getElementById("lesson-stats");
let targetWord = "SQ1KSM", typedWord = "", passedCount = 0, errorCount = 0, isPlayingDemo = false;

function randChar(str) { return str[Math.floor(Math.random() * str.length)]; }
function generateLessonWord() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", digits = "0123456789", all = letters + digits;
    const prefixes = ["SP", "SQ", "SO", "SN", "3Z", "HF", "DL", "OK", "OM", "OE", "HA", "LY", "YL", "ES", "OH", "SM", "LA", "OZ", "PA", "ON", "F5", "G4", "M0", "I2", "EA", "CT", "K1", "W2", "N3", "VE"];
    const mode = lessonType.value;
    if (mode === "callsign") return randChar(prefixes) + randChar(digits) + randChar(letters) + randChar(letters) + randChar(letters);
    if (mode === "letters") return Array.from({ length: 6 }, () => randChar(letters)).join("");
    return Array.from({ length: 6 }, () => randChar(all)).join("");
}

function flashBox(cls) {
    lessonBoxEl.classList.remove("flash-err", "flash-ok");
    void lessonBoxEl.offsetWidth;
    lessonBoxEl.classList.add(cls);
    setTimeout(() => lessonBoxEl.classList.remove(cls), 350);
}

function renderLesson() {
    lessonGridEl.innerHTML = "";
    for (let i = 0; i < targetWord.length; i++) {
        const top = document.createElement("div");
        top.className = "cell-target";
        top.textContent = targetWord[i];
        lessonGridEl.appendChild(top);
    }
    for (let i = 0; i < targetWord.length; i++) {
        const bot = document.createElement("div");
        bot.className = "cell-typed";
        if (i < typedWord.length) {
            bot.textContent = typedWord[i];
            bot.classList.add(typedWord[i] === targetWord[i] ? "ch-ok" : "ch-err");
        } else {
            bot.textContent = "\u00A0";
        }
        lessonGridEl.appendChild(bot);
    }
    lessonStatsEl.textContent = `Zaliczone: ${passedCount} | Błędy: ${errorCount}`;
}

function triggerLessonFail(msg) {
    clearTimeout(lessonGapTimer);
    errorCount++;
    flashBox("flash-err");
    lessonMsgEl.style.color = "#ff5252";
    lessonMsgEl.textContent = msg;
    typedWord = "";
    symbolBuf = "";
    renderLesson();
}

function nextLessonWord() {
    clearTimeout(lessonGapTimer);
    targetWord = generateLessonWord();
    typedWord = "";
    symbolBuf = "";
    renderLesson();
}

function checkLessonLetter(letter) {
    const idx = typedWord.length;
    if (idx >= targetWord.length) return;

    typedWord += letter;
    if (letter !== targetWord[idx]) {
        triggerLessonFail(`Błąd ("${letter}" zamiast "${targetWord[idx]}") — od nowa!`);
        return;
    }

    lessonMsgEl.textContent = "";
    renderLesson();
    if (typedWord === targetWord) {
        clearTimeout(lessonGapTimer);
        passedCount++;
        flashBox("flash-ok");
        lessonMsgEl.style.color = "#00e676";
        lessonMsgEl.textContent = "Zaliczone!";
        nextLessonWord();
    } else if (strictGapCheck.checked) {
        clearTimeout(lessonGapTimer);
        lessonGapTimer = setTimeout(() => {
            if (typedWord.length > 0 && typedWord.length < targetWord.length) {
                triggerLessonFail("Za długa przerwa — od nowa!");
            }
        }, ditMs * maxGapMult);
    }
}
async function playDemoWord() {
    if (isPlayingDemo) return;
    isPlayingDemo = true; initAudio();
    const d = Math.round(1200 / Number(wpmSlider.value));
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (const ch of targetWord) {
        const code = REV_MORSE[ch];
        if (!code) continue;
        for (const sym of code) { toneOn(); await sleep(sym === "-" ? d * 3 : d); toneOff(); await sleep(d); }
        await sleep(d * (charGapMult - 1));
    }
    isPlayingDemo = false;
}

lessonType.addEventListener("change", () => { lessonMsgEl.textContent = ""; nextLessonWord(); });
document.getElementById("lesson-next-btn").addEventListener("click", () => { lessonMsgEl.textContent = ""; nextLessonWord(); });
document.getElementById("lesson-reset-btn").addEventListener("click", () => { clearTimeout(lessonGapTimer); typedWord = ""; symbolBuf = ""; lessonMsgEl.textContent = ""; renderLesson(); });
document.getElementById("lesson-play-btn").addEventListener("click", playDemoWord);
nextLessonWord();

volSlider.addEventListener("input", () => { volume = Number(volSlider.value) / 100; volOut.textContent = `${volSlider.value}%`; initAudio(); });
freqSlider.addEventListener("input", () => { toneFreq = Number(freqSlider.value); freqOut.textContent = `${toneFreq} Hz`; if (osc) osc.frequency.value = toneFreq; });

function addLog(msg, isCC = false) {
    const div = document.createElement("div");
    if (isCC) div.className = "cc-log";
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.prepend(div);
    while (logEl.children.length > 50) logEl.lastChild.remove();
}

function updateTiming() {
    const activeRx = syncCheck.checked ? txWpm : rxWpm;
    ditMs = Math.round(1200 / activeRx);
    const charMs = Math.round(ditMs * charGapMult);
    const maxMs = Math.round(ditMs * maxGapMult);
    threshInfo.textContent = `dit: ${ditMs} ms | kreska ≥ ${Math.round(ditMs * 2.0)} ms | litera po ${charMs} ms | limit pauzy: ${maxMs} ms`;
}

charGapSlider.addEventListener("input", () => { charGapMult = Number(charGapSlider.value); charGapOut.textContent = `${charGapMult.toFixed(1)}x dit`; updateTiming(); });
strictGapCheck.addEventListener("change", () => { maxGapRow.style.display = strictGapCheck.checked ? "flex" : "none"; if (!strictGapCheck.checked) clearTimeout(lessonGapTimer); });
maxGapSlider.addEventListener("input", () => { maxGapMult = Number(maxGapSlider.value); maxGapOut.textContent = `${maxGapMult}x dit`; updateTiming(); });

function sendDongleWpm(wpm) {
    txWpm = wpm; wpmOut.textContent = `${wpm} WPM`; quickWpmBadge.textContent = `${wpm} WPM`;
    if (syncCheck.checked) { rxWpm = wpm; rxWpmSlider.value = wpm; rxWpmOut.textContent = `${wpm} WPM`; }
    updateTiming();
    if (currentOut) {
        const txDit = Math.round(1200 / wpm);
        const ccVal = Math.min(127, Math.max(1, Math.round(txDit / 2)));
        currentOut.send([0xB0, 0x01, ccVal]);
        addLog(`TX → Dongle CC#1 = ${ccVal} (${wpm} WPM, dit=${txDit}ms)`, true);
    }
}

wpmSlider.addEventListener("input", () => sendDongleWpm(Number(wpmSlider.value)));
syncCheck.addEventListener("change", () => {
    manualRxBox.style.display = syncCheck.checked ? "none" : "block";
    if (syncCheck.checked) { rxWpm = txWpm; rxWpmSlider.value = txWpm; rxWpmOut.textContent = `${txWpm} WPM`; }
    updateTiming();
});
rxWpmSlider.addEventListener("input", () => { rxWpm = Number(rxWpmSlider.value); rxWpmOut.textContent = `${rxWpm} WPM`; updateTiming(); });

document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active-mode"));
        btn.classList.add("active-mode");
        const prog = Number(btn.dataset.prog); updateTiming();
        if (currentOut) { currentOut.send([0xC0, prog]); addLog(`TX → Dongle Tryb Program=${prog} (${btn.textContent})`, true); }
    });
});

function commitChar() {
    if (!symbolBuf) return;
    const letter = MORSE[symbolBuf] || "?";
    symbolBuf = "";
    checkLessonLetter(letter);
}

function onKeyDown() {
    if (isDown) return;
    isDown = true; toneOn();
    clearTimeout(charTimer); clearTimeout(lessonGapTimer);
    keyDownAt = performance.now();
}

function onKeyUp() {
    if (!isDown) return;
    isDown = false; toneOff();
    const dur = performance.now() - keyDownAt; if (dur < 12) return;
    symbolBuf += (dur >= ditMs * 2.0) ? "-" : ".";
    charTimer = setTimeout(commitChar, ditMs * charGapMult);
}

function handleMidiMessage(ev) {
    const [status, d1, d2] = ev.data, cmd = status & 0xF0, ch = (status & 0x0F) + 1;
    if (chSel.value !== "all" && Number(chSel.value) !== ch) return;
    if (cmd === 0x90 && d2 > 0) { if (!anyNoteEl.checked && d1 !== Number(noteNumEl.value)) return; addLog(`RX CH${ch} ON note=${d1} vel=${d2}`); onKeyDown(); }
    else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) { if (!anyNoteEl.checked && d1 !== Number(noteNumEl.value)) return; addLog(`RX CH${ch} OFF note=${d1}`); onKeyUp(); }
    else if (cmd === 0xB0) addLog(`RX CH${ch} CC#${d1} val=${d2}`, true);
}

function bindPorts() {
    if (currentIn) currentIn.onmidimessage = null;
    currentIn = midiAccess.inputs.get(inSel.value) || null;
    if (currentIn) {
        currentIn.onmidimessage = handleMidiMessage;
        addLog(`Połączono Wejście: ${currentIn.name}`);
    }

    currentOut = midiAccess.outputs.get(outSel.value) || null;
    if (currentOut) {
        addLog(`Połączono Wyjście (Dongle): ${currentOut.name}`);

        // POPRAWKA 1: Przełączenie adaptera Vail z trybu klawiatury (0) w tryb MIDI (1)
        currentOut.send([0xB0, 0x00, 1]);
        addLog("TX → Dongle CC#0 = 1 (Tryb MIDI aktywny)", true);

        sendDongleWpm(Number(wpmSlider.value));

        const saved = JSON.parse(localStorage.getItem("cwTrainerPrefs") || "{}");
        const activeBtn = document.querySelector(".mode-btn.active-mode");
        const prog = saved.prog ? Number(saved.prog) : (activeBtn ? Number(activeBtn.dataset.prog) : 7);
        currentOut.send([0xC0, prog]);
        addLog(`TX → Dongle Tryb Program=${prog}`, true);
    }
}
function refreshPorts() {
    const prevIn = inSel.value, prevOut = outSel.value;
    inSel.innerHTML = ""; outSel.innerHTML = "";
    const inputs = Array.from(midiAccess.inputs.values()), outputs = Array.from(midiAccess.outputs.values());
    if (!inputs.length) inSel.innerHTML = '<option value="">Brak wejść MIDI</option>';
    inputs.forEach(p => { const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; inSel.appendChild(o); });
    if (!outputs.length) outSel.innerHTML = '<option value="">Brak wyjść MIDI</option>';
    outputs.forEach(p => { const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; outSel.appendChild(o); });
    if (inputs.some(p => p.id === prevIn)) inSel.value = prevIn;
    if (outputs.some(p => p.id === prevOut)) outSel.value = prevOut;
    statusEl.textContent = `Gotowy. Wykryto wejść: ${inputs.length}, wyjść: ${outputs.length}.`;
    bindPorts();
}

function saveSettings() {
    const activeBtn = document.querySelector(".mode-btn.active-mode");
    localStorage.setItem("cwTrainerPrefs", JSON.stringify({
        wpm: wpmSlider.value,
        vol: volSlider.value,
        freq: freqSlider.value,
        charGap: charGapSlider.value,
        maxGap: maxGapSlider.value,
        strictGap: strictGapCheck.checked,
        prog: activeBtn ? activeBtn.dataset.prog : "7",
        lessonType: lessonType.value
    }));
}

function loadSettings() {
    const raw = localStorage.getItem("cwTrainerPrefs");
    if (!raw) return;
    try {
        const p = JSON.parse(raw);
        if (p.wpm) { wpmSlider.value = p.wpm; sendDongleWpm(Number(p.wpm)); }
        if (p.vol) { volSlider.value = p.vol; volume = Number(p.vol) / 100; volOut.textContent = `${p.vol}%`; }
        if (p.freq) { freqSlider.value = p.freq; toneFreq = Number(p.freq); freqOut.textContent = `${p.freq} Hz`; }
        if (p.charGap) { charGapSlider.value = p.charGap; charGapMult = Number(p.charGap); charGapOut.textContent = `${charGapMult.toFixed(1)}x dit`; }
        if (p.maxGap) { maxGapSlider.value = p.maxGap; maxGapMult = Number(p.maxGap); maxGapOut.textContent = `${maxGapMult}x dit`; }
        if (typeof p.strictGap === "boolean") { strictGapCheck.checked = p.strictGap; maxGapRow.style.display = p.strictGap ? "flex" : "none"; }
        if (p.lessonType) { lessonType.value = p.lessonType; nextLessonWord(); }
        if (p.prog) {
            document.querySelectorAll(".mode-btn").forEach(b => {
                b.classList.toggle("active-mode", b.dataset.prog === String(p.prog));
            });
        }
        updateTiming();
    } catch (e) { }
}

[wpmSlider, volSlider, freqSlider, charGapSlider, maxGapSlider, strictGapCheck, lessonType].forEach(el => {
    el.addEventListener("change", saveSettings);
});
document.querySelectorAll(".mode-btn").forEach(btn => btn.addEventListener("click", saveSettings));

loadSettings();
inSel.addEventListener("change", bindPorts);
outSel.addEventListener("change", bindPorts);
updateTiming();
initAudio();
["pointerdown", "keydown", "touchstart"].forEach(ev => document.addEventListener(ev, initAudio, { once: true }));

if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(access => {
        midiAccess = access;
        refreshPorts();
        midiAccess.onstatechange = refreshPorts;
    }).catch(err => statusEl.textContent = "Błąd Web MIDI: " + err.message);
} else {
    statusEl.textContent = "Brak obsługi Web MIDI API w tej przeglądarce.";
}

// POPRAWKA 2: Powrót do trybu klawiatury (CC#0 = 0) przy zamykaniu/odświeżaniu karty
window.addEventListener("beforeunload", () => {
    if (currentOut) currentOut.send([0xB0, 0x00, 0]);
});
