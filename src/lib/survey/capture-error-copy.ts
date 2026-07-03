// Mensagem humana por motivo de recusa de submissão — fonte única para as
// rotas /responder (demo) e /convite/:token (cloud). Evita duas cópias que
// divergiam silenciosamente cada vez que um motivo novo era adicionado.

import type { CaptureResult } from "@/engine/survey/response-capture-engine";

export const CAPTURE_ERROR_COPY: Record<Exclude<CaptureResult, { accepted: true }>["reason"], string> = {
  invalid_submission: "O envio está incompleto ou malformado e foi recusado.",
  duplicate_item: "O envio contém um item repetido e foi recusado.",
  item_set_mismatch: "O conjunto de itens não corresponde ao instrumento desta onda.",
  invalid_value: "Uma resposta está fora da escala declarada pelo instrumento.",
  unknown_wave: "A onda informada não está ativa para este setor.",
  unknown_survey: "O instrumento informado não corresponde à onda ativa.",
  already_used: "Este convite já foi utilizado e não aceita um novo envio.",
  wave_not_open: "Esta onda já foi encerrada e não aceita mais respostas.",
  cloud_adapter_missing:
    "O modo Cloud foi solicitado, mas a persistência segura ainda não está disponível. Nenhum fallback local foi usado.",
};
