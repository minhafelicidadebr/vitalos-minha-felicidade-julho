import { useEffect, useId, useState } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const formats = ["image/jpeg", "image/png", "image/webp"];

export function PartnerPhotoPreview() {
  const hint = useId();
  const [photo, setPhoto] = useState<string>();
  const [error, setError] = useState("");
  useEffect(() => {
    if (photo) return () => URL.revokeObjectURL(photo);
  }, [photo]);

  return (
    <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <h3 className="font-semibold">Perfil após aprovação · demonstração</h3>
      <p id={hint} className="text-sm text-muted-foreground">
        Foto opcional. Use uma imagem de teste em JPG, PNG ou WebP de até 2 MB. A imagem fica nesta
        página e não é enviada.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {photo ? (
          <img
            src={photo}
            alt="Prévia da foto profissional"
            className="size-16 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
            <UserRound aria-hidden />
          </span>
        )}
        <label className="grid min-w-0 gap-1 text-sm font-medium">
          {photo ? "Substituir foto" : "Escolher foto"}
          <input
            type="file"
            accept={formats.join(",")}
            aria-describedby={hint}
            className="min-h-11 w-full max-w-full text-sm"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              if (!formats.includes(file.type) || file.size === 0 || file.size > 2_000_000) {
                setError("Escolha uma imagem JPG, PNG ou WebP de até 2 MB.");
                return;
              }
              setError("");
              setPhoto(URL.createObjectURL(file));
            }}
          />
        </label>
        {photo && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPhoto(undefined);
              setError("");
            }}
          >
            Remover foto
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
