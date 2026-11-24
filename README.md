# Trener Telegrafii CW (Web MIDI / Vail Adapter) by SQ1KSM

Przeglądarkowy trener nadawania telegrafii (CW) stworzony z myślą o krótkofalowcach oraz osobach uczących się alfabetu Morse'a przy użyciu fizycznego klucza telegraficznego podłączonego przez interfejs **MIDI** (w szczególności **Vail CW Adapter**).

Aplikacja działa w 100% po stronie przeglądarki (**HTML5 + CSS3 + Vanilla JS**) wykorzystując **Web MIDI API**, **Web Audio API** oraz **Screen Wake Lock API** — zarówno na komputerach, jak i na smartfonach (przez adapter USB-OTG), bez konieczności instalowania dodatkowego oprogramowania czy backendu.

---

## Główne funkcje

* **Pełna obsługa adaptera Vail MIDI:**
  * Automatyczne przełączanie dongla z trybu klawiatury w tryb MIDI (`CC#0 = 1`) po nawiązaniu połączenia oraz powrót do trybu klawiatury (`CC#0 = 0`) przy zamykaniu karty.
  * Synchronizacja prędkości nadawania **WPM** bezpośrednio z kluczem sprzętowym (`CC#1`).
  * Zmiana trybu pracy klucza z poziomu przeglądarki (5 trybów): **Iambic A** (`Program 7`), **Iambic B** (`Program 8`), **Ultimatic** (`Program 6`), **Bug** (`Program 2`) oraz **Straight Key** (`Program 1`).
* **7 trybów treningowych:**
  * **Metoda Kocha (stopniowe pary):** pełna 40-znakowa sekwencja zgodna z LCWO.net / G4FON podzielona na 20 lekcji (`KM`, `RS`, `UA`, `PT`, `LO`, `WI`, `NJ`, `EF`, `ØY`, `VG`, `5Q`, `9Z`, `H3`, `8B`, `?4`, `27`, `C1`, `D6`, `X=`, `/<SK>`), z wyborem ćwiczenia wyłącznie nowej pary lub wszystkich dotychczas poznanych znaków naraz.
  * **Znaki wywoławcze:** generator realistycznych znaków krótkofalarskich o wybieranej długości **3–10 znaków** (np. `K1A`, `DL4AB`, `SQ1KSM`).
  * **Krótkie łączności (QSO):** dynamiczne frazy operatorskie (`CQ TEST`, `CQ SOTA /P`, `CQ POTA /P`, raporty `599`/`579`, pożegnania `73 <AR> <SK>`) automatycznie wstawiające własny znak wywoławczy operatora wpisany w ustawieniach.
  * **Losowe znaki:** mieszanka liter `A–Z` oraz cyfr `0–9` o regulowanej długości **1–10 znaków**.
  * **Tylko litery:** grupy losowych liter `A–Z` o regulowanej długości **1–10 znaków**.
  * **Własny plik (`.txt` / `.csv`):** wczytywanie własnych list słów, kodów Q lub tekstów z dysku/telefonu z automatycznym dzieleniem długich zdań co 20 znaków, wyborem kolejności (*losowo* lub *po kolei*) oraz oknami dialogowymi pozwalającymi zamienić polskie litery (`ĄĆĘŁŃÓŚŹŻ` → `ACELNOSZZ`) i usunąć kropki/przecinki (`. ,`).
  * **Swobodne nadawanie (dekoder na żywo):** tryb bez wzorca wyświetlający bieżący tekst w jednej linii (ostatnie 20 znaków) z automatycznym wykrywaniem przerw między wyrazami.
* **Kontrola rytmu, podpowiedzi i poszerzenie przerw (metoda Farnswortha):**
  * Regulacja prędkości w zakresie **5–45 WPM**.
  * Regulowana przerwa między literami (`2.5x – 7.0x dit`).
  * Opcjonalny **limit maksymalnej pauzy w wyrazie** (`5x – 25x dit`) — automatyczne resetowanie wyrazu przy zbyt długim zawahaniu.
  * **Podpowiedź kodu CW przy błędzie:** przy pomyłce program wyświetla prawidłową sekwencję kropek i kresek pomylonego znaku.
* **Odsłuch wzoru i własny Sidetone:**
  * Syntezator **Web Audio** o regulowanej głośności oraz częstotliwości tonu (`350–950 Hz`) z ultradźwiękowym podtrzymaniem układu audio (*keep-alive* 18 kHz), eliminującym ucinanie pierwszego znaku na smartfonach.
  * Przycisk **🔊 Odsłuchaj wzór / ⏹ Zatrzymaj** pozwalający usłyszeć prawidłowy rytm wylosowanego zadania (lub własnego tekstu w trybie swobodnym).
* **Wygoda na telefonie i czytelność znaków:**
  * Tryb skupienia **⛶ Pełny ekran** ukrywający zbędne panele i powiększający siatkę znaków na cały ekran smartfona.
  * Automatyczna blokada wygaszania ekranu (**Screen Wake Lock API**).
  * Cyfra zero wyświetlana zawsze jako przekreślone **`Ø`**, a nierozpoznane sekwencje jako **`¤`** (bez mylenia ze znakiem zapytania `?`).
* **Obsługa polskich znaków oraz skrótów operatorskich (prosigns):**
  * Dekoder rozpoznaje litery `A–Z`, cyfry `0–9`, znaki interpunkcyjne, polskie znaki (`Ą, Ć, Ę, Ł, Ń, Ó, Ś, Ż, Ź`) oraz prosigny: **`<AR>`** (`.-.-.`), **`<KN>`** (`-.--.`), **`<SK>`** (`...-.-`) i **`<KA>`** (`-.-.-`).
* **Zapis ustawień i wbudowana pomoc:**
  * Automatyczne zapamiętywanie konfiguracji oraz znaku wywoławczego w `localStorage`.
  * Wbudowana strona instrukcji (`pomoc.html`) z pełną tabelą znaków Morse'a.

---

## Uruchomienie

### 1. Uruchomienie przez GitHub Pages (zalecane)
1. Wgraj pliki repozytorium na GitHuba.
2. Wejdź w **Settings → Pages** i wybierz gałąź `main` jako źródło.
3. Otwórz wygenerowany adres `https://<twoj-login>.github.io/<nazwa-repo>/` w przeglądarce wspierającej **Web MIDI API** (**Google Chrome**, **Microsoft Edge**, **Opera**, **Brave**).

### 2. Uruchomienie lokalne
Ze względu na politykę bezpieczeństwa przeglądarek dla **Web MIDI API**, otwieraj projekt przez lokalny serwer HTTP (np. rozszerzenie *Live Server* w VS Code lub `python -m http.server 8080`).

---

## Podłączenie klucza (Vail Adapter)

1. Podłącz klucz telegraficzny (manipulator dwułopatkowy, półautomat lub klucz sztorcowy) do adaptera **Vail**, a adapter do portu USB komputera lub smartfona (przez przejściówkę USB-OTG).
2. Otwórz aplikację w przeglądarce i zezwól na dostęp do urządzeń MIDI.
3. Kliknij dowolny element na stronie (lub przycisk **🔇 Włącz dźwięk**), aby odblokować syntezator audio.
4. W panelu **⚙️ Ustawienia** wpisz swój **znak wywoławczy** (do łączności QSO), wybierz tryb pracy klucza oraz odpowiednie **Wejście** i **Wyjście MIDI** (domyślnie wybierane są automatycznie).

---

## Struktura plików

```text
├── index.html      # Główny interfejs trenera CW oraz panel ustawień
├── style.css       # Stylizacja interfejsu (ciemny motyw, tryb pełnoekranowy)
├── morse.js        # Słownik znaków CW (PL, prosigny) oraz syntezator Web Audio
├── lessons.js      # Logika lekcji (Koch, QSO, pliki, znaki, dekoder swobodny)
├── midi.js         # Obsługa Web MIDI API, komunikaty CC/Program Change i dekoder klucza
├── app.js          # Zapis ustawień (localStorage), Wake Lock, pełny ekran i start aplikacji
├── pomoc.html      # Instrukcja obsługi oraz tabela znaków alfabetu Morse'a
└── README.md       # Dokumentacja projektu
```

---

## Wymagania

* Przeglądarka wspierająca **Web MIDI API** (Chrome, Edge, Opera, Brave — *Firefox i Safari wymagają dodatkowych wtyczek lub nie wspierają natywnie Web MIDI*).
* Adapter **CW → USB MIDI** (np. *Vail CW Adapter*, *VBand USB*, lub własny interfejs na Arduino / RP2040 / ESP32).

---

## Licencja

Projekt udostępniony do użytku własnego i edukacyjnego dla społeczności krótkofalarskiej (**73 de SQ1KSM!**).
