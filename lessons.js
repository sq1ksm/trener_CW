const myCallInput = document.getElementById("my-call-input");
const myNameInput = document.getElementById("my-name-input");
const myQthInput = document.getElementById("my-qth-input");
const myLocatorInput = document.getElementById("my-locator-input");

const lessonType = document.getElementById("lesson-type"), lessonLen = document.getElementById("lesson-len"), lessonLenWrap = document.getElementById("lesson-len-wrap");
const fileControls = document.getElementById("file-controls"), fileUploadBtn = document.getElementById("file-upload-btn"), fileInput = document.getElementById("lesson-file-input");
const fileOrder = document.getElementById("file-order"), fileInfo = document.getElementById("file-info"), lessonLegend = document.getElementById("lesson-legend");
const lessonBoxEl = document.getElementById("lesson-box"), lessonGridEl = document.getElementById("lesson-grid"), lessonMsgEl = document.getElementById("lesson-msg"), lessonStatsEl = document.getElementById("lesson-stats");
const playDemoBtn = document.getElementById("lesson-play-btn");

const KOCH_STAGES = new Array(
    new Array("K", "M"), new Array("R", "S"), new Array("U", "A"), new Array("P", "T"), new Array("L", "O"),
    new Array("W", "I"), new Array("N", "J"), new Array("E", "F"), new Array("0", "Y"), new Array("V", "G"),
    new Array("5", "Q"), new Array("9", "Z"), new Array("H", "3"), new Array("8", "B"), new Array("?", "4"),
    new Array("2", "7"), new Array("C", "1"), new Array("D", "6"), new Array("X", "="), new Array("/", "<SK>")
);
const kochControls = document.getElementById("koch-controls");
const kochStage = document.getElementById("koch-stage");
const kochScope = document.getElementById("koch-scope");

let targetWord = "SQ1KSM", typedWord = "", passedCount = 0, errorCount = 0, isPlayingDemo = false, demoAbort = false;
let customWords = new Array(), customWordIdx = 0;

/* ============================================================
   AUTO-QSO — zmienne stanu (muszą być na początku, bo funkcje niżej ich używają)
   ============================================================ */
let autoQsoActive = false;
let autoQsoRepeatOnError = true;
let autoQsoShowText = false;
let autoQsoPlayFirst = true;
let autoQsoGenerating = false;
let autoQsoIdleTimer = null;
const autoStatusBar = document.createElement("div");

function getMyCall() {
    const clean = (myCallInput ? myCallInput.value : "SQ1KSM").trim().toUpperCase().replace(/[^A-Z0-9/]/g, "");
    return clean || "SQ1KSM";
}

function getMyName() {
    const clean = (myNameInput ? myNameInput.value : "JAN").trim().toUpperCase().replace(/[^A-Z]/g, "");
    return clean || "JAN";
}

function getMyQth() {
    const clean = (myQthInput ? myQthInput.value : "WARSZAWA").trim().toUpperCase().replace(/[^A-Z]/g, "");
    return clean || "WARSZAWA";
}

function getMyLocator() {
    const clean = (myLocatorInput ? myLocatorInput.value : "JO72IP").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    return clean || "JO72IP";
}

/* ============================================================
   🔧 MODAL POTWIERDZENIA (showConfirm)
   ============================================================ */
function showConfirm({ title = "Potwierdź", msg = "Czy na pewno?", okText = "Tak", cancelText = "Anuluj", icon = "⚠️", danger = true } = {}) {
    return new Promise((resolve) => {
        const overlay = document.getElementById("confirm-modal");
        const titleEl = document.getElementById("confirm-title");
        const msgEl = document.getElementById("confirm-msg");
        const iconEl = document.getElementById("confirm-icon");
        const okBtn = document.getElementById("confirm-ok");
        const cancelBtn = document.getElementById("confirm-cancel");

        if (!overlay) { resolve(window.confirm(msg)); return; }

        titleEl.textContent = title;
        msgEl.textContent = msg;
        iconEl.textContent = icon;
        okBtn.textContent = okText;
        cancelBtn.textContent = cancelText;
        okBtn.classList.toggle("safe", !danger);

        let resolved = false;
        const finish = (result) => {
            if (resolved) return;
            resolved = true;
            overlay.classList.remove("open");
            overlay.setAttribute("aria-hidden", "true");
            document.removeEventListener("keydown", onKey);
            overlay.removeEventListener("click", onOverlayClick);
            okBtn.removeEventListener("click", onOk);
            cancelBtn.removeEventListener("click", onCancel);
            resolve(result);
        };

        const onOk = () => finish(true);
        const onCancel = () => finish(false);
        const onOverlayClick = (e) => { if (e.target === overlay) finish(false); };
        const onKey = (e) => {
            if (e.key === "Escape") { e.preventDefault(); finish(false); }
            else if (e.key === "Enter") { e.preventDefault(); finish(true); }
        };

        okBtn.addEventListener("click", onOk);
        cancelBtn.addEventListener("click", onCancel);
        overlay.addEventListener("click", onOverlayClick);
        document.addEventListener("keydown", onKey);

        overlay.classList.add("open");
        overlay.setAttribute("aria-hidden", "false");
        setTimeout(() => cancelBtn.focus(), 50);
    });
}

function tokenizeWord(str) {
    const tokens = new Array();
    let i = 0;
    while (i < str.length) {
        if (str.startsWith("<SK>", i)) { tokens.push("<SK>"); i += 4; }
        else if (str.startsWith("<KA>", i)) { tokens.push("<KA>"); i += 4; }
        else if (str.startsWith("<AR>", i)) { tokens.push("<AR>"); i += 4; }
        else if (str.startsWith("<KN>", i)) { tokens.push("<KN>"); i += 4; }
        else { tokens.push(str[i]); i++; }
    }
    return tokens;
}

function splitLongPhrase(phrase, maxLen = 20) {
    if (phrase.length <= maxLen) return new Array(phrase);
    const words = phrase.split(" ");
    const chunks = new Array();
    let current = "";
    for (const w of words) {
        if (!current) current = w;
        else if (current.length + 1 + w.length <= maxLen) current += " " + w;
        else { chunks.push(current); current = w; }
    }
    if (current) chunks.push(current);
    return chunks;
}

function parseCustomFile(text, convertPl, removePunct) {
    const rawItems = text.split(/[\r\n;|]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
    const valid = new Array();
    for (let item of rawItems) {
        if (convertPl) item = stripPolishChars(item);
        if (removePunct) item = item.replace(/[.,]+/g, " ");
        item = item.replace(/\s+/g, " ").trim();
        if (!item) continue;
        for (const chunk of splitLongPhrase(item, 20)) {
            const tokens = tokenizeWord(chunk);
            if (tokens.length > 0 && tokens.every(t => t === " " || REV_MORSE[t])) valid.push(chunk);
        }
    }
    return valid;
}

function updateLessonControlsUI() {
    const mode = lessonType.value;
    const isFile = mode === "file", isQso = mode === "qso", isKoch = mode === "koch", isFree = mode === "free", isCallsign = mode === "callsign";

    if (lessonLen) {
        const prevVal = lessonLen.value;
        const lengths = isCallsign ? new Array(3, 4, 5, 6, 8, 10) : new Array(1, 2, 3, 4, 5, 6, 8, 10);
        const labels = {
            1: "1 znak (bardzo łatwy)", 2: "2 znaki", 3: "3 znaki",
            4: "4 znaki (łatwy)", 5: "5 znaków", 6: "6 znaków (standard)",
            8: "8 znaków", 10: "10 znaków"
        };
        lessonLen.innerHTML = lengths.map(v => `<option value="${v}">${labels[v]}</option>`).join("");
        lessonLen.value = lengths.includes(Number(prevVal)) ? prevVal : (isCallsign ? "6" : "3");
    }

    lessonLenWrap.style.display = (isFile || isQso || isFree) ? "none" : "flex";
    fileControls.style.display = isFile ? "flex" : "none";
    if (kochControls) kochControls.style.display = isKoch ? "flex" : "none";

    if (isFree) lessonLegend.textContent = "Swobodne nadawanie — dekoder CW na żywo";
    else if (isFile) lessonLegend.textContent = "Lekcja telegrafii — własna lista z pliku";
    else if (isQso) lessonLegend.textContent = `Lekcja telegrafii — krótkie łączności QSO (${getMyCall()})`;
    else if (isKoch) {
        const idx = Number(kochStage ? kochStage.value : 0) || 0;
        const pool = (kochScope && kochScope.value === "cumul")
            ? KOCH_STAGES.slice(0, idx + 1).flat()
            : KOCH_STAGES[idx];
        const activeChars = pool.map(ch => fmtChar(ch)).join(" ");
        lessonLegend.textContent = `Metoda Kocha — Lekcja ${idx + 1} (${activeChars})`;
    } else {
        const len = Number(lessonLen.value);
        lessonLegend.textContent = `Lekcja telegrafii — ${len === 1 ? "1-znakowe" : len + "-znakowe"} grupy / znaki wywoławcze`;
    }
}

fileUploadBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
    const file = e.target.files.item(0);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const content = ev.target.result;
        const convertPl = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(content) && confirm(
            "W pliku wykryto polskie litery (Ą Ć Ę Ł Ń Ó Ś Ź Ż).\n\nOK — zamień na zwykłe litery (A C E L N O S Z Z)\nAnuluj — zachowaj polskie znaki CW"
        );
        const removePunct = /[.,]/.test(content) && confirm(
            "W pliku wykryto kropki lub przecinki (. ,).\n\nOK — usuń kropki i przecinki z tekstu\nAnuluj — zachowaj kropki i przecinki CW"
        );
        const words = parseCustomFile(content, convertPl, removePunct);
        if (!words.length) { fileInfo.style.color = "#ff5252"; fileInfo.textContent = "Brak poprawnych słów CW w pliku!"; return; }
        customWords = words; customWordIdx = 0;
        const flags = new Array(convertPl ? "bez PL" : "", removePunct ? "bez . ," : "").filter(Boolean);
        fileInfo.style.color = "#7fd1b9";
        fileInfo.textContent = `${file.name} (${words.length} poz.${flags.length ? ", " + flags.join(", ") : ""})`;
        lessonMsgEl.textContent = "";
        nextLessonWord();
    };
    reader.readAsText(file, "UTF-8");
    fileInput.value = "";
});
function randChar(str) { return str[Math.floor(Math.random() * str.length)]; }
function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateCallsign(len) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", digits = "0123456789";
    const prefixes2 = new Array("SP", "SQ", "SO", "SN", "3Z", "HF", "DL", "OK", "OM", "OE", "HA", "LY", "YL", "ES", "OH", "SM", "LA", "OZ", "PA", "ON", "F5", "G4", "M0", "I2", "EA", "CT", "K1", "W2", "N3", "VE");
    const prefixes1 = new Array("K", "W", "N", "G", "F", "I", "M");
    if (len <= 3) return randItem(prefixes1) + randChar(digits) + (len === 3 ? randChar(letters) : "");
    if (len === 4) return randItem(prefixes2) + randChar(digits) + randChar(letters);
    const base = randItem(prefixes2) + randChar(digits);
    return base + Array.from({ length: len - base.length }, () => randChar(letters)).join("");
}

function generateQsoPhrase() {
    const me = getMyCall(), dx = generateCallsign(Math.random() < 0.35 ? 5 : 6);
    const myName = getMyName(), myQth = getMyQth(), myLoc = getMyLocator();
    const rst = randItem(new Array("599", "579", "589", "559"));
    const nr = String(Math.floor(Math.random() * 199) + 1).padStart(3, "0");

    const imionaDx = new Array("JAN", "ANNA", "PIOTR", "MARIA", "KRZYSZTOF", "TOMASZ", "AGNIESZKA", "MAREK");
    const qthDx = new Array("WARSZAWA", "KRAKOW", "GDANSK", "WROCLAW", "POZNAN", "LODZ", "SZCZECIN", "BYDGOSZCZ", "LUBLIN", "KATOWICE");
    const locDx = new Array("JO91", "KN09", "JO94", "JO81", "JO82", "JO91", "JO73", "JO93", "KO11", "JO90");

    const dxName = randItem(imionaDx);
    const dxQth = randItem(qthDx);
    const dxLoc = randItem(locDx);

    const templates = new Array(
        `CQ CQ DE ${me} ${me} K`,
        `CQ TEST ${me} ${me} TEST`,
        `CQ SOTA ${me}/P ${me}/P K`,
        `CQ POTA ${me}/P ${me}/P K`,
        `${dx} DE ${me} ${me} <KN>`,
        `${dx} UR ${rst} ${rst} <KN>`,
        `${dx} DE ${me} UR ${rst} ${rst} BK`,
        `${dx} TU ${rst} ${nr} ${me}`,
        `R R TU 73 DE ${me} <AR> <SK>`,
        `${dx} GE TNX FER QSO 73 DE ${me} <AR>`,
        `${dx} DE ${me} NAME ${myName} QTH ${myQth} <KN>`,
        `NAME IS ${myName} ${myName} QTH IS ${myQth} ${myQth} <KN>`,
        `QTH ${myQth} ${myQth} LOC ${myLoc} ${myLoc} <KN>`,
        `TNX ${dxName} QTH ${dxQth} 73 DE ${me} <AR>`,
        `R R TU ${dxName} QTH ${dxQth} 73 DE ${me} <SK>`,
        `R R ${dxQth} ${dxQth} LOC ${dxLoc} ${dxLoc} 73 <SK>`,
        `QSL VIA BUREAU 73 DE ${me} <SK>`
    );
    return randItem(templates);
}

function generateKochWord(len) {
    const idx = Number(kochStage ? kochStage.value : 0) || 0;
    const currentPair = KOCH_STAGES[idx] || new Array("K", "M");
    if (!kochScope || kochScope.value === "only" || idx === 0) {
        return Array.from({ length: len }, () => randItem(currentPair)).join("");
    }
    const prevChars = KOCH_STAGES.slice(0, idx).flat();
    return Array.from({ length: len }, () => {
        const pool = Math.random() < 0.5 ? currentPair : prevChars;
        return randItem(pool);
    }).join("");
}

function generateLessonWord() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", digits = "0123456789", all = letters + digits;
    const mode = lessonType.value, len = Number(lessonLen.value) || 6;
    if (mode === "free") return "";
    if (mode === "file") {
        if (!customWords.length) return "WCZYTAJ PLIK";
        if (fileOrder.value === "seq") {
            const word = customWords[customWordIdx % customWords.length];
            fileInfo.textContent = `Pozycja ${(customWordIdx % customWords.length) + 1} / ${customWords.length}`;
            customWordIdx++;
            return word;
        }
        return randItem(customWords);
    }
    if (mode === "koch") return generateKochWord(len);
    if (mode === "qso") return generateQsoPhrase();
    if (mode === "callsign") return generateCallsign(len);
    if (mode === "letters") return Array.from({ length: len }, () => randChar(letters)).join("");
    return Array.from({ length: len }, () => randChar(all)).join("");
}

function flashBox(cls) {
    lessonBoxEl.classList.remove("flash-err", "flash-ok", "flash-err-soft");
    void lessonBoxEl.offsetWidth;
    lessonBoxEl.classList.add(cls);
    setTimeout(() => lessonBoxEl.classList.remove(cls), 350);
}

function fmtChar(ch) { return ch === "0" ? "Ø" : ch; }

function renderLesson() {
    if (lessonType.value === "free") {
        lessonGridEl.classList.add("qso-mode");
        lessonGridEl.style.removeProperty("--cols");
        lessonGridEl.innerHTML = "";
        const tokens = tokenizeWord(typedWord);
        if (!tokens.length) {
            lessonGridEl.innerHTML = '<div style="color:#6b7280; font-size:1.3rem;">Nadawaj dowolny tekst kluczem…</div>';
        } else {
            for (const t of tokens) {
                const span = document.createElement("div");
                span.className = "cell-typed ch-ok";
                span.textContent = t === " " ? "\u00A0\u00A0" : fmtChar(t);
                lessonGridEl.appendChild(span);
            }
        }
        const total = passedCount + errorCount;
        const pct = total > 0 ? `${Math.round((passedCount / total) * 100)}%` : "—";
        lessonStatsEl.textContent = `Zaliczone: ${passedCount} | Błędy: ${errorCount} | Skuteczność: ${pct}`;
        return;
    }

    const targetTokens = tokenizeWord(targetWord), typedTokens = tokenizeWord(typedWord);
    const hasSpaces = targetTokens.includes(" ");
    lessonGridEl.innerHTML = "";

    if (hasSpaces) {
        lessonGridEl.classList.add("qso-mode");
        lessonGridEl.style.removeProperty("--cols");
        for (let i = 0; i < targetTokens.length; i++) {
            const pair = document.createElement("div"); pair.className = "qso-pair";
            const top = document.createElement("div"); top.className = "cell-target";
            if (targetTokens[i] === " ") { top.textContent = "␣"; top.classList.add("cell-space"); }
            else top.textContent = fmtChar(targetTokens[i]);

            const bot = document.createElement("div"); bot.className = "cell-typed";
            if (i < typedTokens.length) {
                bot.textContent = typedTokens[i] === " " ? "␣" : fmtChar(typedTokens[i]);
                bot.classList.add(typedTokens[i] === targetTokens[i] ? "ch-ok" : "ch-err");
            } else bot.textContent = "\u00A0";

            pair.appendChild(top); pair.appendChild(bot); lessonGridEl.appendChild(pair);
        }
    } else {
        lessonGridEl.classList.remove("qso-mode");
        lessonGridEl.style.setProperty("--cols", Math.max(1, targetTokens.length));
        for (let i = 0; i < targetTokens.length; i++) {
            const top = document.createElement("div"); top.className = "cell-target";
            top.textContent = fmtChar(targetTokens[i]); lessonGridEl.appendChild(top);
        }
        for (let i = 0; i < targetTokens.length; i++) {
            const bot = document.createElement("div"); bot.className = "cell-typed";
            if (i < typedTokens.length) {
                bot.textContent = fmtChar(typedTokens[i]);
                bot.classList.add(typedTokens[i] === targetTokens[i] ? "ch-ok" : "ch-err");
            } else bot.textContent = "\u00A0";
            lessonGridEl.appendChild(bot);
        }
    }
    const total = passedCount + errorCount;
    const percent = total === 0 ? 0 : Math.round((passedCount / total) * 100);
    lessonStatsEl.textContent = `Zaliczone: ${passedCount} | Błędy: ${errorCount} | Skuteczność: ${percent}%`;
}

function triggerLessonFail(msg, reason) {
    clearTimeout(lessonGapTimer);
    if (typeof playFeedback === "function") playFeedback(false);
    errorCount++; flashBox("flash-err");
    const reasonStr = reason ? ` [${reason}]` : "";
    lessonMsgEl.style.color = "#ff5252";
    lessonMsgEl.textContent = msg + reasonStr;
    typedWord = "";
    symbolBuf = "";
    renderLesson();
    // 🔧 AUTO-QSO: powiadom o błędzie
    if (autoQsoActive) autoQsoOnError();
}

function stopDemoWord() {
    demoAbort = true; isPlayingDemo = false; toneOff();
    if (playDemoBtn) {
        playDemoBtn.textContent = "🔊 Odsłuchaj wzór";
        playDemoBtn.classList.remove("danger-btn"); playDemoBtn.classList.add("nav-btn");
    }
}

function nextLessonWord() {
    stopDemoWord(); clearTimeout(lessonGapTimer);
    lessonMsgEl.style.color = "";
    targetWord = generateLessonWord(); typedWord = ""; symbolBuf = "";
    renderLesson();
    // 🔧 AUTO-QSO: po nowym wyrazie nadaj wzór
    if (autoQsoActive && !autoQsoGenerating) autoQsoTxAndWait();
}

function checkLessonLetter(letter) {
    // 1. Tryb swobodny (free)
    if (lessonType.value === "free") {
        typedWord += letter;
        if (typedWord.length > 20) typedWord = typedWord.slice(-20);
        lessonMsgEl.textContent = "";
        renderLesson();
        return;
    }

    const targetTokens = tokenizeWord(targetWord);
    let typedTokens = tokenizeWord(typedWord);
    let idx = typedTokens.length;

    // Twardy limit długości
    if (typedWord.length >= targetWord.length && typedWord !== targetWord) {
        triggerLessonFail("Przekroczono długość wyrazu — cały wyraz od nowa!", "za długie");
        return;
    }
    if (idx >= targetTokens.length) {
        triggerLessonFail("Przekroczono długość wyrazu — cały wyraz od nowa!", "za długie");
        return;
    }

    // Automatyczne wstawienie spacji
    if (targetTokens[idx] === " ") {
        typedWord += " ";
        idx++;
    }

    typedWord += letter;
    const soft = softErrorCheck && softErrorCheck.checked;

    if (!soft && letter !== targetTokens[idx]) {
        const expected = targetTokens[idx];
        const hint = REV_MORSE[expected] ? ` (${fmtChar(expected)} to ${REV_MORSE[expected]})` : "";
        triggerLessonFail(`Błąd ("${fmtChar(letter)}" zamiast "${fmtChar(expected)}")${hint} — od nowa!`, "zła litera");
        return;
    }

    lessonMsgEl.textContent = "";
    lessonMsgEl.style.color = "";
    renderLesson();

    typedTokens = tokenizeWord(typedWord);

    let isCurrentWordCorrect = true;
    let lastSpace = -1;
    for (let i = typedTokens.length - 1; i >= 0; i--) {
        if (typedTokens[i] === " ") { lastSpace = i; break; }
    }
    const currentWordStart = lastSpace + 1;

    for (let i = currentWordStart; i < typedTokens.length; i++) {
        if (typedTokens[i] !== targetTokens[i]) {
            isCurrentWordCorrect = false;
            break;
        }
    }

    if (typedWord === targetWord) {
        clearTimeout(lessonGapTimer);
        if (typeof playFeedback === "function") playFeedback(true);
        passedCount++; flashBox("flash-ok");
        lessonMsgEl.style.color = "#00e676"; lessonMsgEl.textContent = "Zaliczone!";
        // 🔧 AUTO-QSO: sukces — następny wyraz
        if (autoQsoActive) {
            autoQsoOnSuccess();
        } else {
            nextLessonWord();
        }
        return;
    }

    if (!isCurrentWordCorrect) {
        clearTimeout(lessonGapTimer);
        if (soft) {
            lessonGapTimer = setTimeout(() => {
                if (typedWord === targetWord) return;
                const freshTyped = tokenizeWord(typedWord);
                let freshLastSpace = -1;
                for (let i = freshTyped.length - 1; i >= 0; i--) {
                    if (freshTyped[i] === " ") { freshLastSpace = i; break; }
                }
                const freshStart = freshLastSpace + 1;
                const diffs = [];
                for (let i = freshStart; i < freshTyped.length; i++) {
                    if (freshTyped[i] !== targetTokens[i]) {
                        diffs.push(`"${fmtChar(freshTyped[i])}" zamiast "${fmtChar(targetTokens[i])}"`);
                    }
                }
                let diffStr = diffs.slice(0, 3).join(", ");
                if (diffs.length > 3) diffStr += ", ...";
                triggerLessonFail(`Błędy: ${diffStr || "niezgodność"} — cały wyraz od nowa!`, "soft");
            }, ditMs * maxGapMult);
        } else {
            triggerLessonFail(`Błąd — od nowa!`, "zła litera");
        }
        return;
    }

    if (strictGapCheck.checked) {
        clearTimeout(lessonGapTimer);
        const allowedMult = targetTokens[idx + 1] === " " ? Math.max(maxGapMult, 14) : maxGapMult;
        lessonGapTimer = setTimeout(() => {
            if (typedWord.length > 0 && typedWord !== targetWord) {
                triggerLessonFail("Spróbuj jeszcze raz!", "timeout");
            }
        }, ditMs * allowedMult);
    }
}

async function playDemoWord() {
    if (isPlayingDemo) { stopDemoWord(); return; }
    const textToPlay = lessonType.value === "free" ? typedWord : targetWord;
    if (!textToPlay) return;

    isPlayingDemo = true; demoAbort = false; initAudio();
    if (playDemoBtn) {
        playDemoBtn.textContent = "⏹ Zatrzymaj";
        playDemoBtn.classList.remove("nav-btn"); playDemoBtn.classList.add("danger-btn");
    }
    const d = Math.round(1200 / Number(wpmSlider.value));
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (const ch of tokenizeWord(textToPlay)) {
        if (demoAbort) break;
        if (ch === " ") { await sleep(d * 4); continue; }
        const code = REV_MORSE[ch];
        if (!code) continue;
        for (const sym of code) {
            if (demoAbort) break;
            toneOn(); await sleep(sym === "-" ? d * 3 : d); toneOff();
            if (demoAbort) break;
            await sleep(d);
        }
        if (demoAbort) break;
        await sleep(d * (charGapMult - 1));
    }
    stopDemoWord();
}

function syncFreeModeButtons() {
    const isFree = lessonType.value === "free";
    const nextBtn = document.getElementById("lesson-next-btn");
    const resetBtn = document.getElementById("lesson-reset-btn");
    const statsResetBtn = document.getElementById("stats-reset-btn");
    const autoBtn = document.getElementById("toggle-auto-btn");
    if (nextBtn) nextBtn.textContent = isFree ? "Wyczyść" : "Następny";
    if (resetBtn) resetBtn.style.display = isFree ? "none" : "inline-block";
    if (statsResetBtn) statsResetBtn.style.display = isFree ? "none" : "inline-block";
    if (autoBtn) {
        // 🔧 Auto-QSO nie ma sensu w trybie swobodnym (brak wzoru do nadania)
        autoBtn.style.display = isFree ? "none" : "inline-block";
        // Jeśli Auto-QSO było aktywne, a przechodzimy do free — wyłącz je
        if (isFree && autoQsoActive) setAutoQsoMode(false);
    }
}

/* ============================================================
   🔧 AUTO-QSO — implementacja
   ============================================================ */
function setAutoStatus(text, cls) {
    autoStatusBar.textContent = text;
    autoStatusBar.className = "auto-status-bar " + (cls || "");
    if (!autoStatusBar.parentNode) {
        lessonBoxEl.parentNode.insertBefore(autoStatusBar, lessonBoxEl);
    }
}

function clearAutoStatus() {
    if (autoStatusBar.parentNode) autoStatusBar.remove();
}

function setAutoQsoMode(active) {
    autoQsoActive = active;
    document.body.classList.toggle("auto-qso-mode", active);
    const btn = document.getElementById("toggle-auto-btn");
    if (btn) {
        btn.textContent = active ? "⏹ Stop" : "🎧 Auto-QSO";
        btn.classList.toggle("danger-btn", active);
        btn.classList.toggle("nav-btn", !active);
    }
    if (!active) {
        clearAutoStatus();
        clearTimeout(autoQsoIdleTimer);
        autoQsoGenerating = false;
        lessonGridEl.style.opacity = "1";
    }
}

async function autoQsoTxAndWait() {
    if (!autoQsoActive) return;
    autoQsoGenerating = true;

    // 1. Ukryj/pokaż tekst
    if (autoQsoShowText) lessonGridEl.style.opacity = "1";
    else lessonGridEl.style.opacity = "0.05";

    // 2. Nadaj wzór
    setAutoStatus("📡 System nadaje wzór…", "tx");
    if (typeof stopDemoWord === "function") stopDemoWord();
    await new Promise(r => setTimeout(r, 200));

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const d = Math.round(1200 / Number(wpmSlider.value));
    initAudio();

    for (const ch of tokenizeWord(targetWord)) {
        if (!autoQsoActive) { toneOff(); return; }
        if (ch === " ") { await sleep(d * 4); continue; }
        const code = REV_MORSE[ch];
        if (!code) continue;
        for (const sym of code) {
            if (!autoQsoActive) { toneOff(); return; }
            toneOn();
            await sleep(sym === "-" ? d * 3 : d);
            toneOff();
            await sleep(d);
        }
        await sleep(d * (charGapMult - 1));
    }

    if (!autoQsoActive) return;

    // 3. Czekaj na odpowiedź
    if (!autoQsoShowText) lessonGridEl.style.opacity = "1";
    setAutoStatus("🎤 Twoja kolej — nadaj odpowiedź…", "rx");
    autoQsoGenerating = false;

    clearTimeout(autoQsoIdleTimer);
    autoQsoIdleTimer = setTimeout(() => {
        if (autoQsoActive && !autoQsoGenerating && typedWord.length === 0) {
            autoQsoTxAndWait();
        }
    }, 60000);
}

function autoQsoOnSuccess() {
    if (!autoQsoActive) return;
    clearTimeout(autoQsoIdleTimer);
    setAutoStatus("✅ Dobrze! Następny wyraz…", "wait");
    setTimeout(() => {
        if (!autoQsoActive) return;
        nextLessonWord();
        // nextLessonWord() sam wywoła autoQsoTxAndWait() dzięki hakowi
    }, 1200);
}

function autoQsoOnError() {
    if (!autoQsoActive) return;
    clearTimeout(autoQsoIdleTimer);
    if (autoQsoRepeatOnError) {
        setAutoStatus("❌ Błąd — powtarzam ten sam wyraz…", "wait");
        setTimeout(() => {
            if (!autoQsoActive) return;
            typedWord = ""; symbolBuf = "";
            renderLesson();
            autoQsoTxAndWait();
        }, 1500);
    } else {
        setAutoStatus("❌ Błąd — następny wyraz…", "wait");
        setTimeout(() => {
            if (!autoQsoActive) return;
            nextLessonWord();
            // nextLessonWord() sam wywoła autoQsoTxAndWait()
        }, 1500);
    }
}

// Podłącz przyciski modala
const autoBtn = document.getElementById("toggle-auto-btn");
const autoModal = document.getElementById("auto-modal");
if (autoBtn) {
    autoBtn.addEventListener("click", () => {
        if (autoQsoActive) { setAutoQsoMode(false); return; }
        autoModal.classList.add("open");
        autoModal.setAttribute("aria-hidden", "false");
    });
}

if (autoModal) {
    document.getElementById("auto-cancel").addEventListener("click", () => {
        autoModal.classList.remove("open");
        autoModal.setAttribute("aria-hidden", "true");
    });

    document.getElementById("auto-start").addEventListener("click", () => {
        autoQsoRepeatOnError = document.getElementById("auto-repeat-on-error").checked;
        autoQsoShowText = document.getElementById("auto-show-text").checked;
        autoQsoPlayFirst = document.getElementById("auto-play-first").checked;

        autoModal.classList.remove("open");
        autoModal.setAttribute("aria-hidden", "true");

        setAutoQsoMode(true);
        typedWord = ""; symbolBuf = "";
        renderLesson();

        if (autoQsoPlayFirst) {
            setTimeout(() => autoQsoTxAndWait(), 400);
        } else {
            setAutoStatus("🎤 Twoja kolej — nadaj odpowiedź…", "rx");
        }
    });

    autoModal.addEventListener("click", (e) => {
        if (e.target === autoModal) {
            autoModal.classList.remove("open");
            autoModal.setAttribute("aria-hidden", "true");
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && autoModal.classList.contains("open")) {
            autoModal.classList.remove("open");
            autoModal.setAttribute("aria-hidden", "true");
        }
    });
}

/* ============================================================
   🔧 Przyciski z potwierdzeniem
   ============================================================ */
const statsResetBtn = document.getElementById("stats-reset-btn");
if (statsResetBtn) {
    statsResetBtn.addEventListener("click", async () => {
        if (passedCount === 0 && errorCount === 0) {
            lessonMsgEl.style.color = "#9aa3b0";
            lessonMsgEl.textContent = "Liczniki są już wyzerowane.";
            setTimeout(() => {
                if (lessonMsgEl.textContent === "Liczniki są już wyzerowane.") lessonMsgEl.textContent = "";
            }, 1800);
            return;
        }

        const ok = await showConfirm({
            title: "Zerować liczniki?",
            msg: `Zaliczone: ${passedCount} | Błędy: ${errorCount}\n\nTej operacji nie można cofnąć.`,
            okText: "Tak, zeruj",
            cancelText: "Anuluj",
            icon: "🔄",
            danger: true
        });
        if (!ok) return;

        passedCount = 0;
        errorCount = 0;
        lessonMsgEl.textContent = "";
        renderLesson();
    });
}

lessonType.addEventListener("change", () => { updateLessonControlsUI(); syncFreeModeButtons(); lessonMsgEl.textContent = ""; nextLessonWord(); });
lessonLen.addEventListener("change", () => { updateLessonControlsUI(); lessonMsgEl.textContent = ""; nextLessonWord(); });
fileOrder.addEventListener("change", () => { customWordIdx = 0; lessonMsgEl.textContent = ""; nextLessonWord(); });
if (kochStage) kochStage.addEventListener("change", () => { updateLessonControlsUI(); lessonMsgEl.textContent = ""; nextLessonWord(); });
if (kochScope) kochScope.addEventListener("change", () => { updateLessonControlsUI(); lessonMsgEl.textContent = ""; nextLessonWord(); });
document.getElementById("lesson-next-btn").addEventListener("click", () => { lessonMsgEl.textContent = ""; nextLessonWord(); });

document.getElementById("lesson-reset-btn").addEventListener("click", async () => {
    if (typedWord.length === 0) {
        stopDemoWord(); clearTimeout(lessonGapTimer);
        lessonMsgEl.style.color = "";
        lessonMsgEl.textContent = "";
        symbolBuf = "";
        renderLesson();
        return;
    }

    const ok = await showConfirm({
        title: "Powtórzyć bieżący?",
        msg: "Wpisany tekst zostanie utracony. Kontynuować?",
        okText: "Tak, powtórz",
        cancelText: "Anuluj",
        icon: "↺",
        danger: true
    });
    if (!ok) return;

    stopDemoWord(); clearTimeout(lessonGapTimer);
    lessonMsgEl.style.color = "";
    typedWord = ""; symbolBuf = ""; lessonMsgEl.textContent = "";
    renderLesson();
});

if (playDemoBtn) playDemoBtn.addEventListener("click", playDemoWord);
syncFreeModeButtons();