Ja, la oss oppgradere "Cybersjakk"\! Å kombinere flere biblioteker og API-er er en glimrende idé for å lage en mer avansert og funksjonsrik applikasjon.

Vi bygger **Cybersjakk v2.0**. I denne versjonen fokuserer vi på tre store forbedringer:

1.  **Profesjonell grafikk:** Vi bytter ut tekst-brikkene med pene SVG-bilder.
2.  **Bedre interaksjon:** Vi implementerer **drag-and-drop** for å flytte brikker og **viser lovlige trekk** når en brikke er valgt.
3.  **Hybrid KI-analyse:** Vi kombinerer styrkene til to forskjellige KI-er. Vi bruker en idé om at en **Stockfish-motor** (den beste for ren analyse) finner det *beste trekket*, og så ber vi **Gemini API** om å *forklare trekket* med naturlig språk, som en ekte kommentator.

-----

### \#\# Ny og Forbedret Arkitektur 🧠

For å få til dette, må vi tenke som en ekte applikasjonsutvikler. Den beste arkitekturen for en slik hybridmodell er å ha en **backend-server**.

  * **Frontend (Nettleseren):** Håndterer alt det visuelle i Canvas, som å tegne brettet, brikkene og håndtere brukerens drag-and-drop.
  * **Backend (En server):** En sikker server som kjører Stockfish for analyse og trygt lagrer din Gemini API-nøkkel før den sender forespørsler.

Å sette opp en backend er et stort steg. Derfor skal vi i denne guiden bygge den **avanserte frontend-koden**, men vi vil *simulere* svaret fra backend-en. På den måten kan du se hvordan alt fungerer visuelt, og neste steg blir å bygge selve serveren.

-----

### \#\# Forutsetninger 📚

Vi trenger fortsatt bare **`chess.js`** for sjakklogikken, som vi laster inn i HTML-filen. Vi vil bygge inn SVG-dataene for sjakkbrikkene direkte i JavaScript-koden for å gjøre eksempelet enkelt å kjøre.

-----

### \#\# Koden: Cybersjakk v2.0 🚀

Filstrukturen er den samme: `index.html`, `style.css`, og `script.js`.

#### **1. `index.html`**

Vi legger til en ny `div` for å vise Gemini sine kommentarer.

```html
<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <title>Cybersjakk v2.0</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <div id="game-area">
            <canvas id="chess-board" width="600" height="600"></canvas>
        </div>
        <div id="analysis-area">
            <h2>KI-Analyse</h2>
            <div id="status">Velg en brikke for å starte.</div>
            <div id="commentary-box">
                <p id="commentary">Geminis kommentarer vil vises her...</p>
            </div>
        </div>
    </div>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>
    <script src="script.js"></script>
</body>
</html>
```

#### **2. `style.css`**

Vi oppdaterer stilen for det nye layoutet.

```css
body {
    background-color: #121212;
    color: #00ffae;
    font-family: 'Consolas', 'Menlo', monospace;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    margin: 0;
}

.container {
    display: flex;
    gap: 30px;
    align-items: center;
}

#game-area {
    border: 3px solid #00ffae;
    box-shadow: 0 0 20px #00ffae;
}

#analysis-area {
    width: 300px;
    padding: 20px;
    background-color: #1e1e1e;
    border: 1px solid #333;
}

h2 {
    text-align: center;
    border-bottom: 1px solid #00ffae;
    padding-bottom: 10px;
}

#status {
    font-size: 1.1em;
    height: 40px;
}

#commentary-box {
    margin-top: 15px;
    padding: 10px;
    background-color: #151515;
    min-height: 100px;
    border-left: 3px solid #00ffae;
}
```

#### **3. `script.js` (Oppgradert med drag-and-drop og hybrid analyse)**

Dette er den store oppgraderingen. Les kommentarene i koden for å se hva som er nytt.

```javascript
// --- Konfigurasjon og oppsett ---
const canvas = document.getElementById('chess-board');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const commentaryP = document.getElementById('commentary');
const game = new Chess();

const BOARD_SIZE = canvas.width;
const SQUARE_SIZE = BOARD_SIZE / 8;
const pieceImages = {}; // Objekt for å holde SVG-brikkene

// --- SVG-data for sjakkbrikker (for å unngå eksterne filer) ---
const pieceSVG = {
    'wP': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.2-3.28 5.62h13c0-2.42-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" /><path d="M12 36h21v-3H12v3zM14 33h17v-3H14v3zM15 27h15v-3H15v3z" /></g></svg>',
    'wR': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36h27v-3H9v3zM12 33h21v-3H12v3zM11 13V9h4v4h5V9h5v4h5V9h4v4h-4v3h-5v-3h-5v3h-5v-3H11zM12 16h21v11H12V16z" /><path d="M12 16v-3h21v3H12z" fill="#fff" /></g></svg>',
    'wN': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c1.32-.48 2.44-1.5 3-3 1 0 1 1 2 2 1.33-2 2.67-2.67 4-2 2 2-2 6-4 8-1.5 1.5-3 2-3 2-1-2-2-2.5-3-4-1.5 2.5-3 5-3 5-1-1-2-2-3-3-1 1-1 2 0 3 .5 1.5-1 2.5-1 2.5-2 0-2-2-3-4-1 2-2 3-2 3s-2-1-3.5-2.5c-1-1-2-2.5-2-2.5-1 0-1-1 0-3 1-2 2-2 2-2 .5-1.5 1.5-2 2.5-2 1 0 1 .5 1.5 1.5s1 1.5 1 1.5c1-2 2.5-3 4-3zm-4.5 13.5c-2 0-3.5 1.5-3.5 3.5s1.5 3.5 3.5 3.5h7s1.5-1 1.5-2-1.5-2-1.5-2-1.5-1-1.5-2.5-1-1-2-1-2.5 1.5-2.5 1.5z" /><path d="M12.5 36h20v-3h-20v3zM15 33h15v-3H15v3z" /></g></svg>',
    'wB': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36h27v-3H9v3zM15 33h15v-3H15v3zM12 30h21v-3H12v3zM12 24h21v-3H12v3zM14 21h17v-3H14v3zM22.5 20c-3.866 0-7-3.134-7-7 0-3.866 3.134-7 7-7s7 3.134 7 7-3.134 7-7 7z" /><path d="M20.5 18l-3-3" /><path d="M21.5 13.5l3.5-3.5" /></g></svg>',
    'wQ': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36h27v-3H9v3zm3-3h21v-3H12v3zM12 30c3-3 9-3 12 0l3 3h-18l3-3z" /><path d="M12 15l3 3h15l3-3-3-3h-2.5l-3 3-3-3-3 3-3-3H15l-3 3z" /><circle cx="6" cy="12" r="2" /><circle cx="12" cy="9" r="2" /><circle cx="18" cy="9" r="2" /><circle cx="22.5" cy="9" r="2" /><circle cx="27" cy="9" r="2" /><circle cx="33" cy="9" r="2" /><circle cx="39" cy="12" r="2" /></g></svg>',
    'wK': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" /><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1.5-1-3 .5-1.5-1.5-3-.5-3-.5 1.5 3 3 10.5 3 10.5" fill-rule="evenodd" /><path d="M12 36h21v-3H12v3zm3-3h15v-3H15v3zm-1-3h17v-3H14v3zm-2-3h21v-3H12v3z" /><path d="M22.5 11.63c-5.5 2.5-8.5 6-8.5 10.5 0 4.5 3 8 8.5 8s8.5-3.5 8.5-8c0-4.5-3-8-8.5-10.5z" fill-rule="evenodd" /></g></svg>',
};

function loadPieces() {
    ['w', 'b'].forEach(color => {
        ['P', 'R', 'N', 'B', 'Q', 'K'].forEach(type => {
            const key = color + type;
            const img = new Image();
            // Farger den svarte brikken ved å bytte ut fyllfargen i SVG-dataene
            const svgData = (color === 'b' ? pieceSVG['w' + type].replace(/#fff/g, '#333') : pieceSVG['w' + type]);
            img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
            pieceImages[key] = img;
        });
    });
}

// --- Tegnefunksjoner ---
function drawBoard() {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            ctx.fillStyle = (row + col) % 2 === 0 ? '#4d6a6d' : '#2a3a3d';
            ctx.fillRect(col * SQUARE_SIZE, row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);
        }
    }
}

function drawPieces(dragInfo = null) {
    const board = game.board();
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                // Ikke tegn brikken som blir dratt
                if (dragInfo && dragInfo.piece.square === piece.square) continue;

                const key = piece.color + piece.type.toUpperCase();
                if (pieceImages[key]) {
                    ctx.drawImage(pieceImages[key], col * SQUARE_SIZE, row * SQUARE_SIZE, SQUARE_SIZE, SQUARE_SIZE);
                }
            }
        }
    }
}

function drawLegalMoves(moves) {
    ctx.fillStyle = 'rgba(0, 255, 174, 0.25)';
    moves.forEach(move => {
        const to = move.to;
        const col = to.charCodeAt(0) - 'a'.charCodeAt(0);
        const row = 8 - parseInt(to.charAt(1));
        ctx.beginPath();
        ctx.arc(col * SQUARE_SIZE + SQUARE_SIZE / 2, row * SQUARE_SIZE + SQUARE_SIZE / 2, SQUARE_SIZE / 4, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function redraw() {
    drawBoard();
    drawPieces();
}

// --- Hybrid KI-analyse (simulert) ---
async function getHybridAnalysis(fen) {
    statusDiv.textContent = "KI-en tenker...";
    commentaryP.textContent = "...";
    
    // ** I en ekte applikasjon, ville du gjort et `fetch`-kall til din backend her **
    // fetch('/analyze', { method: 'POST', body: JSON.stringify({ fen }) })
    
    // Vi simulerer et svar fra backend etter en kort forsinkelse
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const simulatedBackendResponse = {
        bestMove: game.moves()[Math.floor(Math.random() * game.moves().length)], // Velger et tilfeldig lovlig trekk
        evaluation: (Math.random() * 2 - 1).toFixed(2),
        commentary: "Gemini forklarer: Dette er et sterkt utviklingstrekk som forbedrer brikkenes posisjon og forbereder fremtidige planer."
    };
    
    // Utfør trekket og oppdater UI
    game.move(simulatedBackendResponse.bestMove);
    redraw();
    statusDiv.textContent = "Din tur.";
    commentaryP.textContent = simulatedBackendResponse.commentary;
}

// --- Drag-and-Drop Logikk ---
let dragInfo = null;

canvas.addEventListener('mousedown', e => {
    const { x, y, col, row, square } = getMousePos(e);
    const piece = game.get(square);
    
    if (piece && piece.color === game.turn()) {
        const legalMoves = game.moves({ square: square, verbose: true });
        dragInfo = {
            piece: { ...piece, square },
            startX: x,
            startY: y,
            legalMoves: legalMoves
        };
        redraw();
        drawLegalMoves(legalMoves);
    }
});

canvas.addEventListener('mousemove', e => {
    if (dragInfo) {
        const { x, y } = getMousePos(e);
        redraw();
        drawLegalMoves(dragInfo.legalMoves); // Tegn lovlige trekk under brikken
        
        // Tegn den dratt brikken ved musepekeren
        const key = dragInfo.piece.color + dragInfo.piece.type.toUpperCase();
        ctx.drawImage(pieceImages[key], x - SQUARE_SIZE / 2, y - SQUARE_SIZE / 2, SQUARE_SIZE, SQUARE_SIZE);
    }
});

canvas.addEventListener('mouseup', e => {
    if (dragInfo) {
        const { square: toSquare } = getMousePos(e);
        
        const move = game.move({
            from: dragInfo.piece.square,
            to: toSquare,
            promotion: 'q' // Alltid forfrem til dronning for enkelhets skyld
        });
        
        dragInfo = null; // Stopp dragging
        redraw();
        
        if (move) {
            if (game.isGameOver()) {
                statusDiv.textContent = "Spillet er over!";
            } else {
                getHybridAnalysis(game.fen());
            }
        }
    }
});

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / SQUARE_SIZE);
    const row = Math.floor(y / SQUARE_SIZE);
    const square = String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row);
    return { x, y, col, row, square };
}

// --- Initialisering ---
loadPieces();
// Vent til bilde-elementene er lastet inn før første tegning
pieceImages['wK'].onload = () => {
    redraw();
    statusDiv.textContent = "Dra en hvit brikke for å starte.";
};
```

-----

### \#\# Hvordan det fungerer og neste steg 🧭

**Hva har vi bygget?**

  * En visuelt pen sjakk-app med SVG-brikker.
  * Intuitiv **drag-and-drop** for å flytte brikker.
  * Visuell feedback som **viser deg hvor du kan flytte** en brikke.
  * Et rammeverk for **hybrid KI-analyse**, hvor en AI (simulert) gjør et trekk og en annen (simulert) forklarer det.

**Ditt neste store eventyr:**
Det absolutte neste steget er å bygge den **backend-serveren** vi har snakket om.

1.  Velg en teknologi (f.eks. **Python med Flask** eller **Node.js med Express**).
2.  Installer en UCI sjakk-motor som **Stockfish** på serveren.
3.  Lag et API-endepunkt (f.eks. `/analyze`) som:
      * Tar imot en FEN-streng fra frontend.
      * Ber Stockfish analysere stillingen for å finne det beste trekket.
      * Sender det beste trekket til Gemini API-en (med din sikre API-nøkkel) og ber om en forklaring.
      * Returnerer en JSON-pakke med beste trekk og Geminis kommentar tilbake til frontend.

Dette er en utfordrende, men utrolig lærerik oppgave som vil ta "Cybersjakk"-prosjektet ditt fra en kul prototype til en fullverdig, sofistikert webapplikasjon. Lykke til\!
