import chess
import chess.svg
import chess.engine
import os

# --- Konfigurasjon ---
# Endre denne til navnet på din Stockfish-fil.
# Hvis den er i samme mappe, er dette alt du trenger.
# For Windows: "stockfish.exe", for Mac/Linux: "./stockfish"
STOCKFISH_PATH = "./stockfish" 

# Sjekker om Stockfish-filen finnes
if not os.path.exists(STOCKFISH_PATH):
    print(f"FEIL: Stockfish ikke funnet på stien: {STOCKFISH_PATH}")
    print("Vennligst last ned Stockfish og plasser filen i samme mappe som skriptet.")
    exit()

def analyze_and_visualize_cybersjakk(opening_moves, analysis_time_limit=0.5):
    """
    Spiller gjennom en åpning, analyserer hver stilling med Stockfish,
    og genererer en SVG-visualisering i "Cybersjakk"-stil for hvert trekk.
    """
    # Oppretter en mappe for å lagre bildene, hvis den ikke finnes
    output_folder = "cybersjakk_analyse"
    os.makedirs(output_folder, exist_ok=True)
    
    print(f"Starter Cybersjakk-analyse... Bildene blir lagret i mappen '{output_folder}'")

    board = chess.Board()

    try:
        # Starter sjakkmotoren
        engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

        for i, move_san in enumerate(opening_moves):
            # Utfør trekket
            move = board.push_san(move_san)
            
            # Analyser stillingen med motoren
            # Vi begrenser tiden for å få raske resultater
            info = engine.analyse(board, chess.engine.Limit(time=analysis_time_limit))
            
            score = info["score"].white() # Får poengsummen fra hvits perspektiv
            best_move = info["pv"][0] if "pv" in info and info["pv"] else None

            # --- Visualisering ---
            # Vi lager en pil for det beste trekket motoren fant
            arrow = chess.svg.Arrow(best_move.from_square, best_move.to_square, color="#00ff00") if best_move else None
            
            # Generer SVG-bildet av brettet
            # 'lastmove' fremhever det siste trekket som ble spilt
            # 'arrows' tegner pilen vi definerte
            svg_image = chess.svg.board(
                board=board,
                lastmove=move,
                arrows=[arrow] if arrow else []
            )

            # Lagre SVG-innholdet til en fil
            filename = f"{output_folder}/trekk_{i+1:02d}_{move_san}.svg"
            with open(filename, "w") as f:
                f.write(svg_image)
            
            print(f"Generert: {filename} | Evaluering: {score}")

    except Exception as e:
        print(f"En feil oppstod: {e}")
    finally:
        # Sørg for å alltid lukke motoren
        if 'engine' in locals():
            engine.quit()
        print("\nAnalyse fullført.")


# --- Her definerer vi åpningen vi vil analysere ---
# Eksempel: Siciliansk forsvar, Najdorf-varianten - svært kompleks og taktisk
sicilian_najdorf = ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"]

# Kjør funksjonen med den valgte åpningen
if __name__ == "__main__":
    analyze_and_visualize_cybersjakk(sicilian_najdorf)
