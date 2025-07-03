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
