import {
  criteria,
  penalties,
  penaltyById,
  penaltyEpithets,
  themeById,
  themes,
  type Gender,
} from "./content";

export type Phase =
  | "cover"
  | "count"
  | "names"
  | "lot"
  | "turn"
  | "dealt"
  | "penalty"
  | "vote"
  | "result"
  | "chronicle";

export type Player = {
  id: string;
  name: string;
  gender: Gender;
  epithets: string[];
  score: number;
};

export type Draft = { name: string; gender: Gender };

export type GameState = {
  v: 2;
  phase: Phase;
  setupCount: number;
  draft: Draft[];
  players: Player[];
  dealer: number;
  dealsDone: number;
  themeDeck: string[];
  themeDiscard: string[];
  criterionDeck: string[];
  criterionDiscard: string[];
  penaltyDeck: string[];
  penaltyDiscard: string[];
  themeId: string | null;
  criterionId: string | null;
  rerolled: boolean;
  flash: string | null;
  penaltyId: string | null;
  penaltyDeadline: number | null;
  penaltiesThisDeal: string[];
  pendingReroll: "both" | null;
  confirm: "both" | null;
  pick: string | null;
  winners: string[] | null;
};

export type Action =
  | { type: "sit" }
  | { type: "backCount" }
  | { type: "setCount"; count: number }
  | { type: "setName"; index: number; name: string }
  | { type: "setGender"; index: number; gender: Gender }
  | { type: "toNames" }
  | { type: "throwLot" }
  | { type: "begin" }
  | { type: "deal" }
  | { type: "askReroll" }
  | { type: "cancelReroll" }
  | { type: "confirmReroll" }
  | { type: "startTimer"; now: number }
  | { type: "completePenalty"; now: number }
  | { type: "toVote" }
  | { type: "pick"; id: string }
  | { type: "confirmVote" }
  | { type: "endGame" }
  | { type: "next" }
  | { type: "rematch" }
  | { type: "home" }
  | { type: "newTable" };

const PHASES: readonly Phase[] = [
  "cover",
  "count",
  "names",
  "lot",
  "turn",
  "dealt",
  "penalty",
  "vote",
  "result",
  "chronicle",
];

export function shuffle<T>(list: readonly T[]): T[] {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = swap;
  }
  return copy;
}

function blankDraft(count: number, prev: Draft[] = []): Draft[] {
  return Array.from({ length: count }, (_, i) => prev[i] ?? { name: "", gender: "m" });
}

function emptyRound(): Pick<
  GameState,
  | "themeId"
  | "criterionId"
  | "rerolled"
  | "flash"
  | "penaltyId"
  | "penaltyDeadline"
  | "penaltiesThisDeal"
  | "pendingReroll"
  | "confirm"
  | "pick"
  | "winners"
> {
  return {
    themeId: null,
    criterionId: null,
    rerolled: false,
    flash: null,
    penaltyId: null,
    penaltyDeadline: null,
    penaltiesThisDeal: [],
    pendingReroll: null,
    confirm: null,
    pick: null,
    winners: null,
  };
}

function freshDecks(): Pick<
  GameState,
  "themeDeck" | "themeDiscard" | "criterionDeck" | "criterionDiscard" | "penaltyDeck" | "penaltyDiscard"
> {
  return {
    themeDeck: shuffle(themes.map((theme) => theme.id)),
    themeDiscard: [],
    criterionDeck: shuffle(criteria.map((card) => card.id)),
    criterionDiscard: [],
    penaltyDeck: shuffle(penalties.map((card) => card.id)),
    penaltyDiscard: [],
  };
}

export function initialState(): GameState {
  return {
    v: 2,
    phase: "cover",
    setupCount: 4,
    draft: blankDraft(4),
    players: [],
    dealer: 0,
    dealsDone: 0,
    ...freshDecks(),
    ...emptyRound(),
  };
}

export function ruPlural(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

export function fullTitle(player: Player): string {
  return [...player.epithets, player.name].join(" ");
}

export function nameError(draft: Draft[]): string | null {
  const trimmed = draft.map((seat) => seat.name.trim());
  if (trimmed.some((name) => name.length === 0)) return "Впиши всех, кто за столом.";
  if (trimmed.some((name) => name.length > 20)) return "Имя — до 20 букв.";
  const folded = trimmed.map((name) => name.toLocaleLowerCase("ru"));
  if (new Set(folded).size !== folded.length) return "Одинаковых имён за столом не бывает.";
  return null;
}

export function dealTotal(state: GameState): number {
  return Math.max(state.players.length, 1);
}

function take(deck: string[], discard: string[], blocked: string[]): { id: string; deck: string[]; discard: string[] } {
  let pool = deck.slice();
  let burned = discard.slice();
  if (pool.length === 0) {
    pool = shuffle(burned);
    burned = [];
  }
  if (pool.length === 0) pool = shuffle(blocked);
  let spins = 0;
  while (pool.length > 1 && blocked.includes(pool[0]!) && spins < pool.length) {
    pool.push(pool.shift()!);
    spins += 1;
  }
  const id = pool.shift();
  if (!id) throw new Error("empty deck");
  return { id, deck: pool, discard: burned };
}

function grant(player: Player, themeId: string): { player: Player; word: string } {
  const pool = themeById(themeId)[player.gender];
  const fresh = pool.filter((word) => !player.epithets.includes(word));
  const bag = fresh.length > 0 ? fresh : pool;
  const word = bag[Math.floor(Math.random() * bag.length)]!;
  return { player: { ...player, epithets: [...player.epithets, word] }, word };
}

function grantPenalty(player: Player): { player: Player; word: string } {
  const pool = penaltyEpithets[player.gender];
  const fresh = pool.filter((word) => !player.epithets.includes(word));
  const bag = fresh.length > 0 ? fresh : pool;
  const word = bag[Math.floor(Math.random() * bag.length)]!;
  return { player: { ...player, epithets: [...player.epithets, word] }, word };
}

function withPlayer(players: Player[], index: number, next: Player): Player[] {
  return players.map((player, i) => (i === index ? next : player));
}

function bury(state: GameState): GameState {
  return {
    ...state,
    themeDiscard: state.themeId ? [...state.themeDiscard, state.themeId] : state.themeDiscard,
    criterionDiscard: state.criterionId ? [...state.criterionDiscard, state.criterionId] : state.criterionDiscard,
  };
}

export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const state = value as GameState;
  return state.v === 2 && PHASES.includes(state.phase) && Array.isArray(state.draft) && Array.isArray(state.players);
}

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "sit":
      return { ...state, phase: "count" };
    case "backCount":
      return { ...state, phase: "count" };
    case "setCount": {
      const count = Math.min(6, Math.max(2, action.count));
      return { ...state, setupCount: count, draft: blankDraft(count, state.draft) };
    }
    case "setName":
      return {
        ...state,
        draft: state.draft.map((seat, i) => (i === action.index ? { ...seat, name: action.name.slice(0, 20) } : seat)),
      };
    case "setGender":
      return {
        ...state,
        draft: state.draft.map((seat, i) => (i === action.index ? { ...seat, gender: action.gender } : seat)),
      };
    case "toNames":
      return { ...state, phase: "names", draft: blankDraft(state.setupCount, state.draft) };
    case "throwLot": {
      if (nameError(state.draft)) return state;
      const players: Player[] = state.draft.map((seat, i) => ({
        id: `p${i + 1}`,
        name: seat.name.trim(),
        gender: seat.gender,
        epithets: [],
        score: 0,
      }));
      return {
        ...state,
        ...freshDecks(),
        ...emptyRound(),
        players,
        dealer: Math.floor(Math.random() * players.length),
        dealsDone: 0,
        phase: "lot",
      };
    }
    case "begin":
      if (state.players.length < 2) return state;
      return { ...state, phase: "turn" };
    case "deal": {
      if (state.phase !== "turn") return state;
      const themeDraw = take(state.themeDeck, state.themeDiscard, []);
      const criterionDraw = take(state.criterionDeck, state.criterionDiscard, state.criterionDiscard.slice(-1));
      return {
        ...state,
        ...emptyRound(),
        themeDeck: themeDraw.deck,
        themeDiscard: themeDraw.discard,
        criterionDeck: criterionDraw.deck,
        criterionDiscard: criterionDraw.discard,
        themeId: themeDraw.id,
        criterionId: criterionDraw.id,
        phase: "dealt",
      };
    }
    case "askReroll": {
      if (state.phase !== "dealt" || state.confirm || state.rerolled) return state;
      return { ...state, confirm: "both" };
    }
    case "cancelReroll":
      return { ...state, confirm: null };
    case "confirmReroll": {
      if (state.phase !== "dealt" || state.confirm !== "both" || !state.themeId || !state.criterionId) return state;
      const penaltyDraw = take(state.penaltyDeck, state.penaltyDiscard, state.penaltiesThisDeal);
      const shamed = grantPenalty(state.players[state.dealer]!);
      return {
        ...state,
        confirm: null,
        pendingReroll: "both",
        rerolled: true,
        themeDiscard: [...state.themeDiscard, state.themeId],
        criterionDiscard: [...state.criterionDiscard, state.criterionId],
        themeId: null,
        criterionId: null,
        players: withPlayer(state.players, state.dealer, shamed.player),
        flash: shamed.word,
        penaltyDeck: penaltyDraw.deck,
        penaltyDiscard: penaltyDraw.discard,
        penaltyId: penaltyDraw.id,
        penaltyDeadline: null,
        penaltiesThisDeal: [...state.penaltiesThisDeal, penaltyDraw.id],
        phase: "penalty",
      };
    }
    case "startTimer":
      if (state.phase !== "penalty" || state.penaltyDeadline) return state;
      return { ...state, penaltyDeadline: action.now + 60_000 };
    case "completePenalty": {
      if (state.phase !== "penalty" || state.pendingReroll !== "both" || !state.penaltyId) return state;
      const card = penaltyById(state.penaltyId);
      if (card.timed && (state.penaltyDeadline === null || action.now < state.penaltyDeadline)) return state;
      const penaltyDiscard = state.penaltyDiscard.includes(state.penaltyId)
        ? state.penaltyDiscard
        : [...state.penaltyDiscard, state.penaltyId];
      const themeDraw = take(state.themeDeck, state.themeDiscard, state.themeDiscard.slice(-1));
      const criterionDraw = take(state.criterionDeck, state.criterionDiscard, state.criterionDiscard.slice(-1));
      return {
        ...state,
        themeDeck: themeDraw.deck,
        themeDiscard: themeDraw.discard,
        criterionDeck: criterionDraw.deck,
        criterionDiscard: criterionDraw.discard,
        penaltyDiscard,
        themeId: themeDraw.id,
        criterionId: criterionDraw.id,
        penaltyId: null,
        penaltyDeadline: null,
        pendingReroll: null,
        phase: "dealt",
      };
    }
    case "toVote": {
      if (state.phase !== "dealt" || !state.themeId || !state.criterionId || state.confirm) return state;
      return { ...state, pick: null, phase: "vote" };
    }
    case "pick": {
      if (state.phase !== "vote") return state;
      if (!state.players.some((player) => player.id === action.id)) return state;
      return { ...state, pick: action.id };
    }
    case "confirmVote": {
      if (state.phase !== "vote" || !state.pick) return state;
      if (!state.players.some((player) => player.id === state.pick)) return state;
      const pick = state.pick;
      if (!state.themeId) return state;
      const index = state.players.findIndex((player) => player.id === pick);
      if (index < 0) return state;
      const granted = grant(state.players[index]!, state.themeId);
      const players = state.players.map((player, i) =>
        i === index ? { ...granted.player, score: player.score + 1 } : player,
      );
      return { ...state, pick: null, winners: [pick], players, flash: granted.word, phase: "result" };
    }
    case "endGame": {
      if (state.phase === "cover" || state.phase === "chronicle") return state;
      if (state.players.length < 2) return initialState();
      return { ...state, ...emptyRound(), phase: "chronicle" };
    }
    case "next": {
      if (state.phase !== "result") return state;
      const buried = bury(state);
      const dealsDone = state.dealsDone + 1;
      if (dealsDone >= state.players.length) {
        return { ...buried, ...emptyRound(), dealsDone, phase: "chronicle" };
      }
      return {
        ...buried,
        ...emptyRound(),
        dealsDone,
        dealer: (state.dealer + 1) % state.players.length,
        phase: "turn",
      };
    }
    case "rematch": {
      if (state.players.length < 2) return state;
      return {
        ...state,
        ...freshDecks(),
        ...emptyRound(),
        players: state.players.map((player) => ({ ...player, epithets: [], score: 0 })),
        dealer: Math.floor(Math.random() * state.players.length),
        dealsDone: 0,
        phase: "lot",
      };
    }
    case "home":
      return initialState();
    case "newTable":
      return { ...initialState(), phase: "count" };
    default:
      return state;
  }
}
