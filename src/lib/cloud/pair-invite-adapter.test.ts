import { describe, expect, test, mock, beforeEach } from "bun:test";
import { fakeSupabase, fakeSupabaseState } from "./learning-adapter.fake-client";

// MESMO fake compartilhado do S5/I7 (lição documentada: dois arquivos de
// teste nunca registram fakes DIFERENTES para o mesmo módulo singleton).
mock.module("@/integrations/supabase/client", () => ({ supabase: fakeSupabase }));

const { loadMyPendingInvites, loadMyActivePair, sendPairInvite, acceptPairInvite, declinePairInvite, cancelPairInvite } =
  await import("./pair-invite-adapter");

beforeEach(() => {
  fakeSupabaseState.pairInviteRows = [];
  fakeSupabaseState.pairRecordRow = null;
  fakeSupabaseState.rpcResults = {};
  fakeSupabaseState.rpcCalls = [];
  fakeSupabaseState.lastInsert = null;
  fakeSupabaseState.insertError = null;
});

describe("pair-invite-adapter — leitura (RLS já recorta, o fake só transporta)", () => {
  test("loadMyPendingInvites mapeia as linhas do banco", async () => {
    fakeSupabaseState.pairInviteRows = [
      { id: "inv-1", from_user: "u-a", to_user: "u-b", focus_driver_id: "energia", status: "pending" },
    ];
    const invites = await loadMyPendingInvites();
    expect(invites).toEqual([
      { id: "inv-1", fromUser: "u-a", toUser: "u-b", focusDriverId: "energia", status: "pending" },
    ]);
  });

  test("loadMyActivePair: null quando não há dupla", async () => {
    expect(await loadMyActivePair()).toBeNull();
  });

  test("loadMyActivePair mapeia a linha quando existe", async () => {
    fakeSupabaseState.pairRecordRow = {
      id: "pair-1",
      member_a: "u-a",
      member_b: "u-b",
      focus_driver_id: "energia",
      formed_on: "2026-07-10",
    };
    expect(await loadMyActivePair()).toEqual({
      id: "pair-1",
      memberA: "u-a",
      memberB: "u-b",
      focusDriverId: "energia",
      formedOn: "2026-07-10",
    });
  });
});

describe("pair-invite-adapter — sendPairInvite", () => {
  test("envia o shape correto e reporta sucesso", async () => {
    const result = await sendPairInvite("org-1", "u-a", "u-b", "energia");
    expect(result).toEqual({ sent: true });
    expect(fakeSupabaseState.lastInsert).toEqual({
      org_id: "org-1",
      from_user: "u-a",
      to_user: "u-b",
      focus_driver_id: "energia",
    });
  });

  test("violação de UNIQUE (23505) vira already_invited, nunca um erro genérico", async () => {
    fakeSupabaseState.insertError = { code: "23505", message: "duplicate key" };
    const result = await sendPairInvite("org-1", "u-a", "u-b", "energia");
    expect(result).toEqual({ sent: false, reason: "already_invited" });
  });

  test("outro erro qualquer vira insert_failed, best-effort", async () => {
    fakeSupabaseState.insertError = { code: "42501", message: "RLS negou" };
    const result = await sendPairInvite("org-1", "u-a", "u-b", "energia");
    expect(result).toEqual({ sent: false, reason: "insert_failed" });
  });
});

describe("pair-invite-adapter — acceptPairInvite (aperto de mão via RPC)", () => {
  test("aceite bem-sucedido devolve pairId", async () => {
    fakeSupabaseState.rpcResults.accept_pair_invite = [
      { accepted: true, reason: null, pair_id: "pair-novo" },
    ];
    const result = await acceptPairInvite("inv-1");
    expect(result).toEqual({ accepted: true, pairId: "pair-novo" });
    expect(fakeSupabaseState.rpcCalls[0]).toEqual({
      name: "accept_pair_invite",
      args: { p_invite_id: "inv-1" },
    });
  });

  test("recusa da RPC propaga o motivo exato (already_paired, left_directory...)", async () => {
    fakeSupabaseState.rpcResults.accept_pair_invite = [
      { accepted: false, reason: "already_paired", pair_id: null },
    ];
    expect(await acceptPairInvite("inv-1")).toEqual({ accepted: false, reason: "already_paired" });
  });

  test("falha de rede/RPC ausente → accepted:false, reason rpc_error, nunca lança", async () => {
    // Nenhum rpcResults.accept_pair_invite configurado → o fake devolve error.
    const result = await acceptPairInvite("inv-1");
    expect(result).toEqual({ accepted: false, reason: "rpc_error" });
  });
});

describe("pair-invite-adapter — declinePairInvite / cancelPairInvite", () => {
  test("decline: true quando a RPC confirma (FOUND)", async () => {
    fakeSupabaseState.rpcResults.decline_pair_invite = true;
    expect(await declinePairInvite("inv-1")).toBe(true);
  });

  test("decline: false quando a RPC não encontra nada para atualizar", async () => {
    fakeSupabaseState.rpcResults.decline_pair_invite = false;
    expect(await declinePairInvite("inv-1")).toBe(false);
  });

  test("cancel: mesmo contrato do decline, RPC separada", async () => {
    fakeSupabaseState.rpcResults.cancel_pair_invite = true;
    expect(await cancelPairInvite("inv-1")).toBe(true);
    expect(fakeSupabaseState.rpcCalls.at(-1)).toEqual({
      name: "cancel_pair_invite",
      args: { p_invite_id: "inv-1" },
    });
  });
});
