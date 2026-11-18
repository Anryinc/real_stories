import { isGameState, type GameState } from "./engine";

const KEY = "narechenie.v3";

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isGameState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
