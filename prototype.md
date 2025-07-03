La oss bygge en fungerende prototype.

-----

### \#\# Konsept og Arkitektur 💡

Vi endrer nå arkitektur fra et Python-skript som genererer filer, til en **frontend-applikasjon** som kjører helt i nettleseren din.

1.  **HTML5 Canvas:** Vi bruker et `<canvas>`-element som vårt digitale sjakkbrett. All tegning – brettet, brikkene, piler – vil bli gjort med JavaScript.
2.  **JavaScript:** Dette blir hjernen i applikasjonen. Vi bruker biblioteket **chess.js** for å håndtere sjakklogikk (lovlige trekk, stillinger osv.), og ren JavaScript for å tegne på canvas og kommunisere med Gemini.
3.  **Gemini API:** Når en spiller gjør et trekk, sender vi den nye brettstillingen (som en FEN-streng) til Gemini API-en. Vi prompter modellen til å analysere stillingen og returnere en evaluering og det beste trekket, akkurat som vi gjorde med Stockfish.

> **⚠️ Veldig viktig sikkerhetsadvarsel:**
> Å plassere en API-nøkkel direkte i JavaScript-koden på en nettside er **svært usikkert**. Alle som besøker siden kan se nøkkelen din og misbruke den. For en ekte applikasjon må du ha en **backend-server** (f.eks. i Node.js eller Python/Flask) som trygt lagrer nøkkelen og sender forespørsler til Gemini på vegne av brukeren.
>
> For dette læringsprosjektet tar vi en snarvei og legger nøkkelen i koden, men **ikke bruk denne metoden i produksjon\!**

-----

### \#\# Forutsetninger 🛠️

1.  **Google AI API-nøkkel:** Du må skaffe en gratis API-nøkkel fra [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  **`chess.js`-biblioteket:** Vi henter dette direkte fra en CDN (Content Delivery Network), så du trenger ikke laste ned noe.

-----

### \#\# Koden: Cybersjakk med Gemini & Canvas

For å gjøre det enkelt, lager vi tre separate filer i samme mappe: `index.html`, `style.css`, og `script.js`.

#### **1. `index.html` (Strukturen)**

Dette er skjelettet til nettsiden vår.

```html
<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cybersjakk med Gemini</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Cybersjakk-analyse</h1>
    <div id="status">Laster inn...</div>
    <canvas id="chess-board" width="512" height="512"></canvas>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>
    
    <script src="script.js"></script>
</body>
</html>
```

#### **2. `style.css` (Utseendet)**

Dette gir siden vår "Cybersjakk"-utseendet.

```css
body {
    background-color: #1a1a1a;
    color: #00ff41;
    font-family: 'Courier New', Courier, monospace;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    margin: 0;
}

canvas {
    background-color: #333;
    border: 2px solid #00ff41;
}

#status {
    margin-bottom: 1em;
    font-size: 1.2em;
    min-height: 1.5em;
}
```

#### **3. `script.js` (Logikken og magien) 🪄**

Dette er den tyngste filen. Den håndterer tegning, spillogikk og API-kallet.

````javascript
// --- Konfigurasjon ---
// ⚠️ ADVARSEL: IKKE LEGG UT DENNE KODEN OFFENTLIG MED DIN EKTE NØKKEL!
const GEMINI_API_KEY = "DIN_GOOGLE_AI_API_NØKKEL_HER";

// --- Oppsett ---
const canvas = document.getElementById('chess-board');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const game = new Chess(); // Initialiserer sjakklogikken med chess.js

const BOARD_SIZE = canvas.width;
const SQUARE_SIZE = BOARD_SIZE / 8;

// --- Tegnefunksjoner ---
function drawBoard() {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const isLight = (row + col) % 2 !== 0;
            ctx.fillStyle = isLight ? '#d1d1d1' : '#5c5c5c';
            ctx.fillRect(col * SQUARE_SIZE, row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);
        }
    }
}

function drawPieces() {
    ctx.font = `${SQUARE_SIZE * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const board = game.board();
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const isBlack = piece.color === 'b';
                ctx.fillStyle = isBlack ? '#000000' : '#ffffff';
                
                // Tegner brikken på riktig sted.
                // Unicode-brikker er en enkel måte å visualisere på.
                const pieceSymbol = getPieceSymbol(piece.type, piece.color);
                ctx.fillText(pieceSymbol, col * SQUARE_SIZE + SQUARE_SIZE / 2, row * SQUARE_SIZE + SQUARE_SIZE / 2);
            }
        }
    }
}

function getPieceSymbol(type, color) {
    const symbols = {
        'p': '♙', 'r': '♖', 'n': '♘', 'b': '♗', 'q': '♕', 'k': '♔'
    };
    const piece = symbols[type];
    // For svarte brikker, bruk de fylte symbolene
    return color === 'w' ? piece : String.fromCharCode(piece.charCodeAt(0) + 6);
}

function draw() {
    drawBoard();
    drawPieces();
}

// --- Gemini API-funksjon ---
async function getGeminiAnalysis(fen) {
    statusDiv.textContent = "Gemini tenker...";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `
        Du er en sjakkanalytiker. Analyser følgende sjakkstilling i FEN-format.
        Ikke skriv en lang forklaring. Svar KUN med et gyldig JSON-objekt med to nøkler: "evaluation" (en kort tekstlig evaluering som "+0.5, hvit er litt bedre") og "bestMove" (det beste trekket i SAN-format, f.eks. "Nf3").
        FEN: ${fen}
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            throw new Error(`API-kall feilet: ${response.statusText}`);
        }

        const data = await response.json();
        // Parser ut JSON-strengen fra Gemini sitt svar
        const rawText = data.candidates[0].content.parts[0].text;
        const cleanedText = rawText.replace(/```json|```/g, '').trim();
        const analysis = JSON.parse(cleanedText);

        statusDiv.textContent = `Gemini: ${analysis.evaluation}. Beste trekk: ${analysis.bestMove}`;
        
        // Simulerer et trekk fra AI-en
        setTimeout(() => {
            game.move(analysis.bestMove);
            draw();
            statusDiv.textContent = "Ditt trekk.";
        }, 1000);

    } catch (error) {
        console.error("Feil ved analyse:", error);
        statusDiv.textContent = "Kunne ikke hente analyse fra Gemini.";
    }
}

// --- Spill-logikk ---
function handlePlayerMove(from, to) {
    // Forsøk å gjøre trekket
    const move = game.move({ from, to, promotion: 'q' }); // 'q' for bondeforvandling til dronning
    
    if (move === null) {
        return; // Ugyldig trekk
    }
    
    draw(); // Tegn den nye stillingen
    
    if (game.isGameOver()) {
        statusDiv.textContent = "Spillet er over!";
        return;
    }
    
    // Nå er det AI-ens tur
    getGeminiAnalysis(game.fen());
}


// Enkel logikk for å håndtere klikk
let selectedSquare = null;

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const col = Math.floor(x / SQUARE_SIZE);
    const row = Math.floor(y / SQUARE_SIZE);
    const square = String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row);

    if (!selectedSquare) {
        selectedSquare = square;
    } else {
        handlePlayerMove(selectedSquare, square);
        selectedSquare = null;
    }
});


// --- Start ---
draw();
statusDiv.textContent = "Velkommen til Cybersjakk! Gjør ditt første trekk.";

````

-----

### \#\# Slik kjører du det 🚀

1.  **Lagre** de tre filene (`index.html`, `style.css`, `script.js`) i samme mappe.
2.  **Lim inn** din Google AI API-nøkkel i `script.js` der det står `DIN_GOOGLE_AI_API_NØKKEL_HER`.
3.  **Åpne** `index.html`-filen i en moderne nettleser som Chrome eller Firefox.

Du skal nå se et sjakkbrett. Du kan spille som hvit ved å klikke på en brikke og deretter på feltet du vil flytte til. Etter ditt trekk, vil JavaScript-koden sende stillingen til Gemini, som deretter vil analysere den og automatisk utføre et svar for svart.

Dette er en fullt fungerende, interaktiv "Cybersjakk"-prototype\!
