import { useId, useState } from "react";
import { buttonSecondary } from "./FibtActionLoop";

export interface PracticeCase {
  recall: string;
  situation: string;
  question: string;
  options: ReadonlyArray<{ label: string; feedback: string }>;
}

/** As escolhas são descartadas com o componente. A prática não tem escrita ou pontuação. */
export function PrivatePracticeCase({ example }: { example: PracticeCase }) {
  const id = useId();
  const [opened, setOpened] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  return (
    <div className="min-w-0 space-y-3 rounded-lg border border-border bg-background/60 p-3 text-sm">
      <p className="font-medium">Exercício fictício</p>
      <p>{example.recall}</p>
      <button
        className={buttonSecondary}
        type="button"
        aria-expanded={opened}
        aria-controls={`${id}-caso`}
        onClick={() => {
          if (opened) setChoice(null);
          setOpened(!opened);
        }}
      >
        {opened ? "Fechar o caso" : "Ver o novo caso"}
      </button>
      <div hidden={!opened} id={`${id}-caso`} className="space-y-3">
        <p>{example.situation}</p>
        <fieldset className="min-w-0 space-y-1">
          <legend className="font-medium">{example.question}</legend>
          {example.options.map((option, index) => (
            <label
              key={option.label}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 has-[:checked]:bg-primary/10"
            >
              <input
                type="radio"
                name={id}
                checked={choice === index}
                onChange={() => setChoice(index)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
        <div aria-live="polite" className="text-muted-foreground">
          {choice !== null ? <p>{example.options[choice]?.feedback}</p> : null}
        </div>
      </div>
    </div>
  );
}
