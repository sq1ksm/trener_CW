function saveSettings() {
    const activeBtn = document.querySelector(".mode-btn.active-mode");
    localStorage.setItem("cwTrainerPrefs", JSON.stringify({
        myCall: getMyCall(),
        wpm: wpmSlider.value,
        vol: volSlider.value,
        freq: freqSlider.value,
        charGap: charGapSlider.value,
        maxGap: maxGapSlider.value,
        strictGap: strictGapCheck.checked,
        softError: softErrorCheck ? softErrorCheck.checked : true,
        soundFeedback: soundFeedbackCheck ? soundFeedbackCheck.checked : false,
        prog: activeBtn ? activeBtn.dataset.prog : "7",
        lessonType: lessonType.value,
        lessonLen: lessonLen.value,
        fileOrder: fileOrder.value,
        kochStage: kochStage ? kochStage.value : "0",
        kochScope: kochScope ? kochScope.value : "only"
    }));
}

function loadSettings() {
    const raw = localStorage.getItem("cwTrainerPrefs");
    if (!raw) return;
    try {
        const p = JSON.parse(raw);
        if (p.myCall && myCallInput) myCallInput.value = p.myCall;
        if (p.wpm) { wpmSlider.value = p.wpm; sendDongleWpm(Number(p.wpm)); }
        if (p.vol) { volSlider.value = p.vol; volume = Number(p.vol) / 100; volOut.textContent = `${p.vol}%`; }
        if (p.freq) { freqSlider.value = p.freq; toneFreq = Number(p.freq); freqOut.textContent = `${p.freq} Hz`; }
        if (p.charGap) { charGapSlider.value = p.charGap; charGapMult = Number(p.charGap); charGapOut.textContent = `${charGapMult.toFixed(1)}x dit`; }
        if (p.maxGap) { maxGapSlider.value = p.maxGap; maxGapMult = Number(p.maxGap); maxGapOut.textContent = `${maxGapMult}x dit`; }
        if (typeof p.strictGap === "boolean") { strictGapCheck.checked = p.strictGap; maxGapRow.style.display = p.strictGap ? "flex" : "none"; }
        if (typeof p.softError === "boolean" && softErrorCheck) { softErrorCheck.checked = p.softError; }
        if (typeof p.soundFeedback === "boolean" && soundFeedbackCheck) { soundFeedbackCheck.checked = p.soundFeedback; }
        if (p.lessonLen) lessonLen.value = p.lessonLen;
        if (p.fileOrder) fileOrder.value = p.fileOrder;
        if (p.kochStage && kochStage) kochStage.value = p.kochStage;
        if (p.kochScope && kochScope) kochScope.value = p.kochScope;
        if (p.lessonType) lessonType.value = p.lessonType;
        if (p.prog) {
            document.querySelectorAll(".mode-btn").forEach(b => {
                b.classList.toggle("active-mode", b.dataset.prog === String(p.prog));
            });
        }

        // Wymuszenie aktualizacji wyglądu suwaków (kolorów) po wczytaniu z pamięci
        if (charGapSlider) charGapSlider.dispatchEvent(new Event('input'));
        if (maxGapSlider) maxGapSlider.dispatchEvent(new Event('input'));

        updateTiming();
    } catch (e) { }
}

if (myCallInput) {
    myCallInput.addEventListener("input", () => {
        myCallInput.value = myCallInput.value.toUpperCase();
        updateLessonControlsUI();
        saveSettings();
        if (lessonType.value === "qso") nextLessonWord();
    });
}

[wpmSlider, volSlider, freqSlider, charGapSlider, maxGapSlider, strictGapCheck,
    softErrorCheck, soundFeedbackCheck, lessonType, lessonLen, fileOrder, kochStage, kochScope].forEach(el => {
        if (el) el.addEventListener("change", saveSettings);
    });
document.querySelectorAll(".mode-btn").forEach(btn => btn.addEventListener("click", saveSettings));

loadSettings();
updateLessonControlsUI();
nextLessonWord();

inSel.addEventListener("change", bindPorts);
outSel.addEventListener("change", bindPorts);
updateTiming();
initAudio();
["pointerdown", "keydown", "touchstart"].forEach(ev => document.addEventListener(ev, initAudio, { once: true }));

let wakeLock = null;
async function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch (e) { }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") requestWakeLock(); });
["pointerdown", "keydown", "touchstart"].forEach(ev => document.addEventListener(ev, requestWakeLock, { once: true }));
requestWakeLock();

if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(access => {
        midiAccess = access;
        refreshPorts();
        midiAccess.onstatechange = refreshPorts;
    }).catch(err => statusEl.textContent = "Błąd Web MIDI: " + err.message);
} else {
    statusEl.textContent = "Brak obsługi Web MIDI API w tej przeglądarce.";
}

window.addEventListener("beforeunload", () => {
    if (currentOut) currentOut.send([0xB0, 0x00, 0]);
});
const fsBtn = document.getElementById("fullscreen-btn");

function setFocusMode(active) {
    document.body.classList.toggle("focus-mode", active);
    if (fsBtn) {
        fsBtn.textContent = active ? "✕ Wyjdź" : "⛶ Pełny ekran";
        fsBtn.classList.toggle("danger-btn", active);
        fsBtn.classList.toggle("nav-btn", !active);
    }
}

if (fsBtn) {
    fsBtn.addEventListener("click", async () => {
        const entering = !document.body.classList.contains("focus-mode");
        setFocusMode(entering);
        try {
            if (entering && document.documentElement.requestFullscreen && !document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else if (!entering && document.fullscreenElement) {
                await document.exitFullscreen();
            }
        } catch (e) { }
    });
}

document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && document.body.classList.contains("focus-mode")) {
        setFocusMode(false);
    }
});