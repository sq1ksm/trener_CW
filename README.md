# Trener Telegrafii CW (Web MIDI / Vail Adapter)

Przeglądarkowy trener nadawania telegrafii (CW) stworzony z myślą o krótkofalowcach oraz osobach uczących się alfabetu Morse'a przy użyciu fizycznego klucza telegraficznego podłączonego przez interfejs **MIDI** (w szczególności **Vail CW Adapter**).

Aplikacja działa w 100% po stronie przeglądarki (**HTML5 + CSS3 + Vanilla JS**) wykorzystując **Web MIDI API** oraz **Web Audio API** — bez konieczności instalowania dodatkowego oprogramowania czy backendu.

---

## Główne funkcje

* **Pełna obsługa adaptera Vail MIDI:**
  * Automatyczne przełączanie dongla z trybu klawiatury w tryb MIDI (`CC#0 = 1`) po nawiązaniu połączenia oraz powrót do trybu klawiatury (`CC#0 = 0`) przy zamykaniu karty.
  * Synchronizacja prędkości nadawania **WPM** bezpośrednio z kluczem sprzętowym (`CC#1`).
  * Zmiana trybu pracy klucza z poziomu przeglądarki: **Iambic A** (`Program 7`), **Iambic B** (`Program 8`) oraz **Straight Key** (`Program 1`).
* **3 tryby treningowe:**
  * **Znaki wywoławcze** (np. `SQ1KSM`, `SP2ABC`, `DL4XYZ` — polskie i europejskie/światowe prefiksy).
  * **Losowe 6 znaków** (mieszanka liter `A–Z` oraz cyfr `0–9`).
  * **Tylko 6 liter** (`A–Z`).
* **Kontrola rytmu i poszerzenie przerw (metoda Farnswortha):**
  * Regulacja prędkości w zakresie **5–45 WPM**.
  * Regulowana przerwa między literami (`2.0x – 6.0x dit`).
  * Opcjonalny **limit maksymalnej pauzy w wyrazie** (`5x – 25x dit`) — automatyczne resetowanie wyrazu przy zbyt długim zawahaniu, uczące płynnego nadawania całych znaków.
* **Odsłuch wzoru i własny Sidetone:**
  * Syntezator **Web Audio** o regulowanej głośności oraz częstotliwości tonu (`400–1000 Hz`).
  * Przycisk **Odsłuchaj wzór** pozwalający usłyszeć prawidłowy rytm wylosowanego znaku przed jego nadaniem.
* **Obsługa polskich znaków oraz skrótów operatorskich:**
  * Dekoder rozpoznaje litery `A–Z`, cyfry `0–9`, znaki interpunkcyjne, polskie znaki (`Ą, Ć, Ę, Ł, Ń, Ó, Ś, Ż, Ź`) oraz prosigny (`<KA>`, `<SK>`).
* **Zapis ustawień i wbudowana pomoc:**
  * Automatyczne zapamiętywanie konfiguracji w `localStorage`.
  * Wbudowana strona instrukcji (`pomoc.html`) z tabelą znaków Morse'a.

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

1. Podłącz klucz telegraficzny (manipulator dwułopatkowy lub klucz sztorcowy) do adaptera **Vail**, a adapter do portu USB komputera.
2. Otwórz aplikację w przeglądarce i zezwól na dostęp do urządzeń MIDI.
3. Kliknij dowolny element na stronie (lub przycisk **🔇 Włącz dźwięk**), aby odblokować syntezator audio.
4. Wybierz odpowiednie **Wejście** oraz **Wyjście MIDI** w panelu **⚙️ Ustawienia** (domyślnie wybierane są automatycznie).

---

## Struktura plików

```text
├── index.html      # Główny interfejs trenera CW oraz panel ustawień
├── style.css       # Stylizacja interfejsu (ciemny motyw)
├── script.js       # Logika Web MIDI, Web Audio, dekodera CW i lekcji
├── pomoc.html      # Instrukcja obsługi oraz tabela znaków alfabetu Morse'a
└── README.md       # Dokumentacja projektu
```

---

## Wymagania

* Przeglądarka wspierająca **Web MIDI API** (Chrome, Edge, Opera, Brave — *Firefox i Safari wymagają dodatkowych wtyczek lub nie wspierają natywnie Web MIDI*).
* Adapter **CW → USB MIDI** (np. *Vail CW Adapter*, *VBand USB*, lub własny interfejs na Arduino / RP2040 / ESP32).

---

## Licencja

Projekt udostępniony do użytku własnego i edukacyjnego dla społeczności krótkofalarskiej (73!).
