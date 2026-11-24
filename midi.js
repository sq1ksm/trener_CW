let midiAccess = null, currentIn = null, currentOut = null;
let keyDownAt = 0, isDown = false, charTimer = null;

const statusEl = document.getElementById("status"), inSel = document.getElementById("midi-in"), outSel = document.getElementById("midi-out");
const chSel = document.getElementById("midi-ch"), noteNumEl = document.getElementById("note-num"), anyNoteEl = document.getElementById("any-note");
const wpmOut = document.getElementById("wpm-out"), quickWpmBadge = document.getElementById("quick-wpm-badge"), syncCheck = document.getElementById("sync-decoder");
const charGapSlider = document.getElementById("char-gap-slider"), charGapOut = document.getElementById("char-gap-out");
const maxGapRow = document.getElementById("max-gap-row"), maxGapSlider = document.getElementById("max-gap-slider"), maxGapOut = document.getElementById("max-gap-out");
const manualRxBox = document.getElementById("manual-rx-box"), rxWpmSlider = document.getElementById("rx-wpm-slider"), rxWpmOut = document.getElementById("rx-wpm-out");
const threshInfo = document.getElementById("thresholds-info"), logEl = document.getElementById("log");

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
    const letter = MORSE[symbolBuf] || "¤";
    symbolBuf = "";
    checkLessonLetter(letter);
}


let lastKeyUpAt = 0;

function onKeyDown() {
    if (isDown) return;
    if (isPlayingDemo) stopDemoWord();
    isDown = true; toneOn();
    clearTimeout(charTimer); clearTimeout(lessonGapTimer);
    const wordGapMult = Math.max(6.5, charGapMult + 2.5);
    if (typeof lessonType !== "undefined" && lessonType.value === "free" && lastKeyUpAt > 0 && typedWord.length > 0 && !typedWord.endsWith(" ")) {
        if (performance.now() - lastKeyUpAt >= ditMs * wordGapMult) typedWord += " ";
    }
    keyDownAt = performance.now();
}

function onKeyUp() {
    if (!isDown) return;
    isDown = false; toneOff();
    lastKeyUpAt = performance.now();
    const dur = lastKeyUpAt - keyDownAt; if (dur < 12) return;
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
    if (currentIn) { currentIn.onmidimessage = handleMidiMessage; addLog(`Połączono Wejście: ${currentIn.name}`); }

    currentOut = midiAccess.outputs.get(outSel.value) || null;
    if (currentOut) {
        addLog(`Połączono Wyjście (Dongle): ${currentOut.name}`);
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
