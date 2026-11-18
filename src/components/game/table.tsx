import { useEffect, useRef, useState, type ReactNode } from "react";
import { criterionById, penaltyById, themeById } from "@/lib/game/content";
import {
  dealTotal,
  fullTitle,
  initialState,
  nameError,
  reduce,
  ruPlural,
  type Action,
  type GameState,
  type Player,
} from "@/lib/game/engine";
import { loadGame, saveGame } from "@/lib/game/storage";

function pulse() {
  navigator.vibrate?.(18);
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} и ${items[items.length - 1]}`;
}

export function Table() {
  const [state, setState] = useState<GameState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadGame();
    if (saved) setState(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveGame(state);
  }, [state, hydrated]);

  const dispatch = (action: Action) => setState((prev) => reduce(prev, action));

  if (!hydrated) {
    return <main className="min-h-dvh" />;
  }

  return <Board state={state} dispatch={dispatch} />;
}

function Board({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  switch (state.phase) {
    case "cover":
      return <Cover onSit={() => dispatch({ type: "sit" })} />;
    case "count":
      return <Count state={state} dispatch={dispatch} />;
    case "names":
      return <Names state={state} dispatch={dispatch} />;
    case "lot":
      return <Lot state={state} dispatch={dispatch} />;
    case "turn":
      return <Turn state={state} dispatch={dispatch} />;
    case "dealt":
      return <Dealt state={state} dispatch={dispatch} />;
    case "penalty":
      return <Penalty state={state} dispatch={dispatch} />;
    case "vote":
      return <Vote state={state} dispatch={dispatch} />;
    case "result":
      return <Result state={state} dispatch={dispatch} />;
    case "chronicle":
      return <Chronicle state={state} dispatch={dispatch} />;
    default:
      return <Cover onSit={() => dispatch({ type: "sit" })} />;
  }
}

function Frame({ children, onEnd }: { children: ReactNode; onEnd?: () => void }) {
  const [help, setHelp] = useState(false);
  return (
    <main className="min-h-dvh text-ink">
      {help ? null : (
        <div className="fixed top-3 right-5 left-5 z-40 mx-auto flex max-w-md items-stretch justify-end gap-2">
          {onEnd ? (
            <button
              type="button"
              onClick={onEnd}
              className="flex min-h-12 flex-1 items-center justify-center border-2 border-ink bg-paper font-sans text-sm font-bold uppercase tracking-wide"
            >
              Завершение игры
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Как играть"
            onClick={() => setHelp(true)}
            className="flex size-12 shrink-0 items-center justify-center border-2 border-ink bg-paper font-display text-3xl leading-none font-semibold"
          >
            ?
          </button>
        </div>
      )}
      {help ? <HowTo onClose={() => setHelp(false)} /> : null}
      <div className="pad-safe mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-24 pb-6">{children}</div>
    </main>
  );
}

function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 px-5 py-6 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="howto-title"
        className="flex max-h-[min(85dvh,40rem)] w-full max-w-md flex-col border-4 border-ink bg-paper p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="howto-title" className="font-display text-4xl leading-none font-semibold uppercase">
            Как играть
          </h2>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center border-2 border-ink font-display text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="mt-5 space-y-4 overflow-y-auto font-sans text-base leading-relaxed">
          <p>
            <span className="font-bold">Стол.</span> Один телефон на всех. Вас от двух до шести. Каждый называет себя и
            выбирает род: от него зависят титулы.
          </p>
          <p>
            <span className="font-bold">Тема.</span> Жребий решает, кто сдаёт первым. На карточке — тема и то, какая
            история побеждает: самая смешная, самая постыдная и так далее. Снизу задание редакции. Его можно прочитать
            вслух.
          </p>
          <p>
            <span className="font-bold">Рассказы.</span> Рассказывают все, включая того, кто раздал. История должна быть
            вашей и настоящей. Смешная, стыдная или тяжёлая — всё годится. Людей вне стола не втягиваем: не звоним и не
            пишем тем, кого здесь нет.
          </p>
          <p>
            <span className="font-bold">Другие карты.</span> Один раз за ход можно взять другую тему. Тому, кто это
            сделал, сразу прилипает трусливый титул и выпадает штраф. Штраф выполняется здесь же. Если на нём написана
            минута, сначала запустите время.
          </p>
          <p>
            <span className="font-bold">Голос.</span> Когда все рассказали, стол выбирает одну историю. Голосовать можно
            за любого, в том числе за того, кто сдавал. Победитель получает балл и титул по теме. Титулы копятся перед
            именем.
          </p>
          <p>
            <span className="font-bold">Дальше.</span> Сдаёт следующий по кругу. Сдач столько, сколько людей за столом.
            «Завершение игры» можно нажать в любой момент: будет сводка баллов и выход на главную.
          </p>
        </div>
      </div>
    </div>
  );
}

function Action({
  children,
  onClick,
  disabled,
  tone = "red",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "red" | "ink" | "ghost";
  type?: "button" | "submit";
}) {
  const toneClass =
    tone === "red"
      ? "bg-red text-red-ink"
      : tone === "ink"
        ? "bg-ink text-paper"
        : "border-2 border-ink bg-transparent text-ink";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-14 w-full items-center justify-center px-5 font-sans text-base font-bold uppercase tracking-wide disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </button>
  );
}

function Nameplate({ line }: { line: string }) {
  const long = line.length > 28;
  return (
    <header>
      <p className="text-center font-display text-5xl leading-none font-semibold uppercase">
        Реальные
        <br />
        истории
      </p>
      <div className="mt-2 border-t border-ink pt-px">
        <p
          className={`border-t-4 border-ink pt-1 text-center font-sans font-bold uppercase ${
            long ? "text-sm leading-snug" : "text-xs tracking-widest"
          }`}
        >
          {line}
        </p>
      </div>
    </header>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block bg-red px-2 py-1 font-sans text-xs font-bold uppercase tracking-widest text-red-ink">
      {children}
    </span>
  );
}

function Roster({ players }: { players: Player[] }) {
  return (
    <p className="mt-4 border-b border-ink pb-2 font-sans text-sm leading-relaxed text-muted">
      {players.map((player, index) => (
        <span key={player.id}>
          {index > 0 ? "   ·   " : ""}
          {player.name} — {player.score}
        </span>
      ))}
    </p>
  );
}

function Story({
  theme,
  criterion,
}: {
  theme: { text: string; brief: string } | null;
  criterion: { text: string } | null;
}) {
  if (!theme || !criterion) return null;
  return (
    <article className="mt-6 border-t-4 border-ink pt-4">
      <h3 className="font-display text-5xl leading-none font-semibold">{theme.text}</h3>
      <p className="mt-4 font-display text-2xl leading-tight">{criterion.text}</p>
      <p className="mt-5 font-sans text-base leading-relaxed">{theme.brief}</p>
    </article>
  );
}

function Cover({ onSit }: { onSit: () => void }) {
  return (
    <Frame>
      <div className="rise flex flex-1 flex-col">
        <Nameplate line="Журнал самых увлекательных историй из вашей жизни" />
        <div className="mt-8 border-t-4 border-ink pt-4">
          <Kicker>Передовица</Kicker>
          <p className="mt-4 font-sans text-lg leading-relaxed">
            Лучшая история — это ваша реальная история. Соберитесь командой друзей, определите тему истории и
            расскажите свою историю компании. Лучшая история по теме побеждает в общем голосовании. Делитесь историями,
            зарабатывайте титулы и просто развлекайтесь.
          </p>
        </div>
        <div className="mt-auto pt-8">
          <Action onClick={onSit}>Сесть за стол</Action>
        </div>
      </div>
    </Frame>
  );
}

function Count({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  return (
    <Frame onEnd={() => dispatch({ type: "endGame" })}>
      <div className="rise flex flex-1 flex-col">
        <Nameplate line="Тираж" />
        <h2 className="mt-8 font-display text-5xl leading-none font-semibold uppercase">За столом</h2>
        <div className="mt-6 grid grid-cols-5 gap-2">
          {[2, 3, 4, 5, 6].map((count) => {
            const on = state.setupCount === count;
            return (
              <button
                key={count}
                type="button"
                onClick={() => dispatch({ type: "setCount", count })}
                className={`flex min-h-16 items-center justify-center border-2 border-ink font-display text-4xl ${
                  on ? "bg-ink text-paper" : "bg-transparent text-ink"
                }`}
              >
                {count}
              </button>
            );
          })}
        </div>
        <p className="mt-6 font-sans text-sm leading-relaxed text-muted">
          Сдач будет ровно столько, сколько вас. Круг не выбирается.
        </p>
        <div className="mt-auto pt-8">
          <Action onClick={() => dispatch({ type: "toNames" })}>К именам</Action>
        </div>
      </div>
    </Frame>
  );
}

function Names({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const [tried, setTried] = useState(false);
  const error = nameError(state.draft);
  return (
    <Frame onEnd={() => dispatch({ type: "endGame" })}>
      <form
        className="rise flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          setTried(true);
          if (!error) dispatch({ type: "throwLot" });
        }}
      >
        <Nameplate line="Подписчики" />
        <h2 className="mt-8 font-display text-5xl leading-none font-semibold uppercase">Имена</h2>
        <p className="mt-3 font-sans text-sm leading-relaxed text-muted">По часовой. Род нужен титулу.</p>
        <div className="mt-6 flex flex-col gap-3">
          {state.draft.map((seat, index) => (
            <div key={index} className="flex items-center gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Место {index + 1}</span>
                <input
                  value={seat.name}
                  maxLength={20}
                  autoComplete="off"
                  placeholder={`Место ${index + 1}`}
                  onChange={(event) => dispatch({ type: "setName", index, name: event.target.value })}
                  className="min-h-14 w-full border-2 border-ink bg-transparent px-4 font-display text-2xl text-ink uppercase placeholder:text-muted"
                />
              </label>
              <div className="flex shrink-0 border-2 border-ink">
                <button
                  type="button"
                  aria-label="Мужской род"
                  onClick={() => dispatch({ type: "setGender", index, gender: "m" })}
                  className={`min-h-12 min-w-12 font-sans text-sm font-bold ${
                    seat.gender === "m" ? "bg-ink text-paper" : "bg-transparent text-ink"
                  }`}
                >
                  М
                </button>
                <button
                  type="button"
                  aria-label="Женский род"
                  onClick={() => dispatch({ type: "setGender", index, gender: "f" })}
                  className={`min-h-12 min-w-12 border-l-2 border-ink font-sans text-sm font-bold ${
                    seat.gender === "f" ? "bg-ink text-paper" : "bg-transparent text-ink"
                  }`}
                >
                  Ж
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 min-h-6 font-sans text-sm font-semibold text-red">{tried && error ? error : ""}</p>
        <div className="mt-auto flex flex-col gap-3 pt-6">
          <Action type="submit">Бросить жребий</Action>
          <Action tone="ghost" onClick={() => dispatch({ type: "backCount" })}>
            Назад
          </Action>
        </div>
      </form>
    </Frame>
  );
}

function Lot({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const dealer = state.players[state.dealer];
  return (
    <Frame onEnd={() => dispatch({ type: "endGame" })}>
      <div className="rise flex flex-1 flex-col">
        <Nameplate line="Жребий" />
        <p className="mt-10 font-sans text-xs font-bold uppercase tracking-widest text-muted">Первым сдаёт</p>
        <h2 className="mt-2 font-display text-6xl leading-none font-semibold uppercase break-words">
          {dealer ? fullTitle(dealer) : ""}
        </h2>
        <div className="mt-auto pt-8">
          <Action onClick={() => dispatch({ type: "begin" })}>К столу</Action>
        </div>
      </div>
    </Frame>
  );
}

function DealMark({ state }: { state: GameState }) {
  const total = dealTotal(state);
  const current = Math.min(state.dealsDone + 1, total);
  return <Nameplate line={`Сдача ${current} из ${total}`} />;
}

function Turn({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const dealer = state.players[state.dealer]!;
  return (
    <Frame onEnd={() => dispatch({ type: "endGame" })}>
      <div className="rise flex flex-1 flex-col">
        <DealMark state={state} />
        <Roster players={state.players} />
        <p className="mt-8 font-sans text-xs font-bold uppercase tracking-widest text-muted">Сдаёт</p>
        <h2 className="mt-2 font-display text-5xl leading-none font-semibold uppercase break-words">{fullTitle(dealer)}</h2>
        <div className="mt-auto pt-8">
          <Action
            onClick={() => {
              dispatch({ type: "deal" });
              pulse();
            }}
          >
            Раздать
          </Action>
        </div>
      </div>
    </Frame>
  );
}

function Dealt({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const dealer = state.players[state.dealer]!;
  const theme = state.themeId ? themeById(state.themeId) : null;
  const criterion = state.criterionId ? criterionById(state.criterionId) : null;
  return (
    <Frame onEnd={() => dispatch({ type: "endGame" })}>
      <div className="rise flex flex-1 flex-col">
        <DealMark state={state} />
        <p className="mt-5 font-sans text-xs font-bold uppercase tracking-widest text-muted">Сдаёт</p>
        <h2 className="mt-1 font-display text-4xl leading-none font-semibold uppercase break-words">{fullTitle(dealer)}</h2>
        {state.flash ? (
          <p className="mt-3">
            <Kicker>Штрафной титул: {state.flash}</Kicker>
          </p>
        ) : null}
        <Story theme={theme} criterion={criterion} />
        <p className="mt-4 font-sans text-sm text-muted">Каждый сдаёт интервью. Рассказывают все, включая того, кто раздал.</p>
        <div className="mt-auto flex flex-col gap-3 pt-6">
          <Action tone="ghost" disabled={state.rerolled} onClick={() => dispatch({ type: "askReroll" })}>
            {state.rerolled ? "Другое уже взято" : "Взять другое"}
          </Action>
          <Action disabled={!theme || !criterion} onClick={() => dispatch({ type: "toVote" })}>
            Итоговое голосование
          </Action>
        </div>
      </div>
      {state.confirm ? (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-ink/70 px-5 py-6 sm:items-center">
          <div className="newsprint w-full max-w-md border-4 border-ink px-5 py-6 text-ink">
            <Kicker>Экстренный выпуск</Kicker>
            <p className="mt-4 font-display text-4xl leading-none font-semibold">
              Взять другое? Тема сгорит. Тебе прилипнет трусливый титул, и ляжет штраф.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Action onClick={() => dispatch({ type: "confirmReroll" })}>Взять</Action>
              <Action tone="ghost" onClick={() => dispatch({ type: "cancelReroll" })}>
                Оставить
              </Action>
            </div>
          </div>
        </div>
      ) : null}
    </Frame>
  );
}

function Penalty({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const card = state.penaltyId ? penaltyById(state.penaltyId) : null;
  const [now, setNow] = useState(() => Date.now());
  const dinged = useRef(false);

  useEffect(() => {
    if (!state.penaltyDeadline) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [state.penaltyDeadline]);

  const left = state.penaltyDeadline ? Math.max(0, Math.ceil((state.penaltyDeadline - now) / 1000)) : 60;
  const running = card?.timed && state.penaltyDeadline !== null;
  const done = !card?.timed || (running && left <= 0);

  useEffect(() => {
    dinged.current = false;
  }, [state.penaltyId]);

  useEffect(() => {
    if (running && left <= 0 && !dinged.current) {
      dinged.current = true;
      pulse();
    }
  }, [running, left]);

  return (
    <Frame onEnd={() => dispatch({ type: "endGame" })}>
      <div className="rise flex flex-1 flex-col">
        <Nameplate line="Штрафной выпуск" />
        <article className="mt-6 bg-ink px-4 py-6 text-paper">
          <span className="inline-block bg-red px-2 py-1 font-sans text-xs font-bold uppercase tracking-widest text-red-ink">
            Штраф
          </span>
          <p className="mt-4 font-display text-4xl leading-none font-semibold">{card?.text}</p>
          {card?.fallback ? <p className="mt-4 font-display text-2xl leading-tight text-paper/80">{card.fallback}</p> : null}
          {running ? <p className="mt-8 font-display text-7xl leading-none font-semibold">{left}</p> : null}
        </article>
        <p className="mt-4 font-sans text-sm leading-relaxed text-muted">
          Свой телефон из рук не выпускай. Ничего не отправляй и не набирай.
        </p>
        <div className="mt-auto pt-6">
          {card?.timed && !running ? (
            <Action onClick={() => dispatch({ type: "startTimer", now: Date.now() })}>Пошли</Action>
          ) : (
            <Action
              disabled={!done}
              onClick={() => {
                dispatch({ type: "completePenalty", now: Date.now() });
                pulse();
              }}
            >
              Сделал
            </Action>
          )}
        </div>
      </div>
    </Frame>
  );
}

function Vote({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const theme = state.themeId ? themeById(state.themeId) : null;
  const criterion = state.criterionId ? criterionById(state.criterionId) : null;
  return (
    <Frame onEnd={() => dispatch({ type: "endGame" })}>
      <div className="rise flex flex-1 flex-col">
        <Nameplate line="Итоговое голосование" />
        <Story theme={theme} criterion={criterion} />
        <p className="mt-4 font-sans text-sm text-muted">Любого, включая того, кто сдавал.</p>
        <div className="mt-6 flex flex-col gap-2">
          {state.players.map((player) => {
            const on = state.pick === player.id;
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => dispatch({ type: "pick", id: player.id })}
                className={`min-h-14 border-2 border-ink px-4 py-3 text-left font-display text-2xl leading-none uppercase ${
                  on ? "bg-ink text-paper" : "bg-transparent text-ink"
                }`}
              >
                {fullTitle(player)}
              </button>
            );
          })}
        </div>
        <div className="sticky bottom-0 mt-auto pt-4">
          <Action disabled={!state.pick} onClick={() => dispatch({ type: "confirmVote" })}>
            Берёт балл
          </Action>
        </div>
      </div>
    </Frame>
  );
}

function Result({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const winner = state.players.find((player) => state.winners?.includes(player.id));
  const last = state.dealsDone + 1 >= dealTotal(state);
  return (
    <Frame onEnd={() => dispatch({ type: "endGame" })}>
      <div className="rise flex flex-1 flex-col">
        <Nameplate line="Итог сдачи" />
        <h2 className="mt-6 font-display text-4xl leading-none font-semibold uppercase break-words">
          {winner ? `${fullTitle(winner)} забирает балл.` : "Балл не взят."}
        </h2>
        {state.flash ? <p className="mt-4 font-display text-2xl leading-tight">Стол признал: {state.flash}.</p> : null}
        <ul className="mt-8 flex flex-col gap-4 border-t-4 border-ink pt-4">
          {state.players.map((player) => (
            <li key={player.id} className="border-b border-ink pb-3">
              <p className="font-display text-2xl leading-none uppercase break-words">{fullTitle(player)}</p>
              <p className="mt-1 font-sans text-sm text-muted">
                {player.score} {ruPlural(player.score, "балл", "балла", "баллов")}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-8">
          <Action onClick={() => dispatch({ type: "next" })}>{last ? "Летопись" : "Следующая сдача"}</Action>
        </div>
      </div>
    </Frame>
  );
}

function Chronicle({ state, dispatch }: { state: GameState; dispatch: (action: Action) => void }) {
  const top = Math.max(...state.players.map((player) => player.score));
  const champs = state.players.filter((player) => player.score === top);
  const champIds = new Set(champs.map((player) => player.id));
  const longest = Math.max(...state.players.map((player) => player.epithets.length));
  const champLongest = Math.max(...champs.map((player) => player.epithets.length));
  const extra = state.players.filter(
    (player) => !champIds.has(player.id) && player.epithets.length === longest && player.epithets.length > champLongest,
  );
  const champLine =
    champs.length === 1
      ? `Победитель сказаний — ${fullTitle(champs[0]!)}.`
      : `Победители сказаний — ${joinList(champs.map(fullTitle))}.`;
  return (
    <Frame>
      <div className="rise flex flex-1 flex-col">
        <Nameplate line="Вечерний выпуск" />
        <h2 className="mt-6 font-display text-5xl leading-none font-semibold uppercase">Сводка</h2>
        <ul className="mt-6 flex flex-col gap-4 border-t-4 border-ink pt-4">
          {state.players.map((player) => (
            <li key={player.id} className="border-b border-ink pb-3">
              <p className="font-display text-2xl leading-none font-semibold uppercase break-words">{fullTitle(player)}</p>
              <p className="mt-1 font-sans text-sm text-muted">
                {player.score} {ruPlural(player.score, "балл", "балла", "баллов")}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-3 font-display text-2xl leading-tight font-semibold">
          <p>{champLine}</p>
          {extra.length > 0 ? <p>Длиннее всех титул у {joinList(extra.map(fullTitle))}.</p> : null}
        </div>
        <div className="mt-auto flex flex-col gap-3 pt-8">
          <Action onClick={() => dispatch({ type: "home" })}>На главную</Action>
          <Action tone="ghost" onClick={() => dispatch({ type: "rematch" })}>
            Ещё раз
          </Action>
        </div>
      </div>
    </Frame>
  );
}
