---
title: Event Storming
description: Mapeamento completo de domain events, commands, aggregates e policies do sistema de gestão de associações de cannabis.
---

<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:#052e16;border:1px solid #166534;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;">
  <span style="color:#86efac;">🎯 Clique em qualquer sticky note para ver payload, invariantes e base legal. Scroll horizontal para navegar os 7 fluxos.</span>
  <a href="/event-storming-board.html" target="_blank" style="color:#22c55e;font-weight:600;white-space:nowrap;text-decoration:none;border:1px solid #166534;padding:4px 12px;border-radius:6px;">Tela cheia ↗</a>
</div>

<div style="width:100%;height:82vh;border:1px solid #3f3f46;border-radius:8px;overflow:hidden;margin-bottom:24px;">
  <iframe src="/event-storming-board.html" style="width:100%;height:100%;border:none;" title="Event Storming Board — canna-br" />
</div>

<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:28px;">
  <div style="background:#431407;border:1px solid #ea580c;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px;"><div style="width:12px;height:12px;border-radius:2px;background:#ea580c;flex-shrink:0;"></div><span style="font-size:12px;font-weight:600;color:#fed7aa;">Domain Event</span></div>
  <div style="background:#1e3a8a;border:1px solid #2563eb;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px;"><div style="width:12px;height:12px;border-radius:2px;background:#2563eb;flex-shrink:0;"></div><span style="font-size:12px;font-weight:600;color:#bfdbfe;">Command</span></div>
  <div style="background:#1c1917;border:1px solid #ca8a04;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px;"><div style="width:12px;height:12px;border-radius:4px;background:#ca8a04;flex-shrink:0;"></div><span style="font-size:12px;font-weight:600;color:#fef08a;">Aggregate</span></div>
  <div style="background:#2e1065;border:1px solid #7c3aed;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px;"><div style="width:12px;height:12px;border-radius:2px;background:#7c3aed;flex-shrink:0;"></div><span style="font-size:12px;font-weight:600;color:#e9d5ff;">Policy</span></div>
  <div style="background:#500724;border:1px solid #be185d;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px;"><div style="width:12px;height:12px;border-radius:2px;background:#be185d;flex-shrink:0;"></div><span style="font-size:12px;font-weight:600;color:#fbcfe8;">Ext. System</span></div>
  <div style="background:#052e16;border:1px solid #15803d;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px;"><div style="width:12px;height:12px;border-radius:2px;background:#15803d;flex-shrink:0;"></div><span style="font-size:12px;font-weight:600;color:#bbf7d0;">Read Model</span></div>
  <div style="background:#450a0a;border:1px solid #b91c1c;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px;"><div style="width:12px;height:12px;border-radius:2px;background:#b91c1c;flex-shrink:0;"></div><span style="font-size:12px;font-weight:600;color:#fecaca;">Hotspot</span></div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px;">

  <div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:16px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#22c55e;margin-bottom:10px;">Fluxo 1 — Onboarding<span style="background:#052e16;color:#86efac;border:1px solid #166534;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;margin-left:8px;letter-spacing:.05em;">CORE SPINE</span></div>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
      <span style="background:#500724;color:#fbcfe8;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">Médico Prescritor</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#1e3a8a;color:#bfdbfe;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">SubmitMedicalRecord</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#431407;color:#fed7aa;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">MedicalRecordSubmitted</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#2e1065;color:#e9d5ff;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">→ Request Consent</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#431407;color:#fed7aa;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">MemberActivated</span>
    </div>
    <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #b91c1c;">⚠ Receita digital vs papel?</span>
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #b91c1c;">⚠ Validade 30 dias?</span>
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #b91c1c;">⚠ Menores de idade?</span>
    </div>
  </div>

  <div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:16px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#22c55e;margin-bottom:10px;">Fluxo 2 — Cultivo<span style="background:#1c1917;color:#a8a29e;border:1px solid #44403c;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;margin-left:8px;letter-spacing:.05em;">LATER MODULE</span></div>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
      <span style="background:#1e3a8a;color:#bfdbfe;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">StartBatch</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#431407;color:#fed7aa;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">BatchStarted</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#1e3a8a;color:#bfdbfe;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">RegisterPlant</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#431407;color:#fed7aa;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">PlantRegistered (ULID)</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#431407;color:#fed7aa;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">StageAdvanced ×N</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#431407;color:#fed7aa;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">HarvestRecorded</span>
    </div>
    <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #b91c1c;">⚠ GPS: planta ou batch?</span>
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #b91c1c;">⚠ Tag: QR ou NFC?</span>
    </div>
  </div>

  <div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:16px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#22c55e;margin-bottom:10px;">Fluxo 3 — Processamento & Lab<span style="background:#1c1917;color:#a8a29e;border:1px solid #44403c;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;margin-left:8px;letter-spacing:.05em;">LATER MODULE</span></div>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
      <span style="background:#1e3a8a;color:#bfdbfe;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">CreateProcessingRun</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#500724;color:#fbcfe8;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">Laboratório</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#1c1917;border:1px solid #ca8a04;color:#fef08a;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">LabSample</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#431407;color:#fed7aa;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">Approved ✓</span>
      <span style="color:#3f3f46;font-size:12px;">|</span>
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">Rejected ✗</span>
    </div>
    <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #b91c1c;">⚠ Lab ANVISA homologado?</span>
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #b91c1c;">⚠ Reprocessamento: quantas vezes?</span>
    </div>
  </div>

  <div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:16px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#22c55e;margin-bottom:10px;">Fluxo 4 — Inventário<span style="background:#052e16;color:#86efac;border:1px solid #166534;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;margin-left:8px;letter-spacing:.05em;">CORE SPINE</span><span style="background:#27272a;color:#71717a;font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;margin-left:4px;">lote manual</span></div>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
      <span style="background:#2e1065;color:#e9d5ff;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">→ QuarantineLot</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#431407;color:#fed7aa;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">LotQuarantined</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#052e16;color:#bbf7d0;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">COA Aprovado?</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#431407;color:#fed7aa;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">LotReleased</span>
      <span style="color:#3f3f46;font-size:12px;">|</span>
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">LotRecalled</span>
    </div>
    <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #b91c1c;">⚠ Prazo quarentena: RDC ou livre?</span>
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #b91c1c;">⚠ Recall: prazo ANVISA?</span>
    </div>
  </div>

  <div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:16px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#22c55e;margin-bottom:10px;">Fluxo 5 — Dispensação<span style="background:#052e16;color:#86efac;border:1px solid #166534;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;margin-left:8px;letter-spacing:.05em;">CORE SPINE</span></div>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
      <span style="background:#052e16;color:#bbf7d0;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">Quota · Receita · Lote</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#1e3a8a;color:#bfdbfe;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">RecordDispensation</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#431407;color:#fed7aa;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">DispensationRecorded</span>
      <span style="background:#431407;color:#fed7aa;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">+ MemberQuotaConsumed</span>
      <span style="background:#431407;color:#fed7aa;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">+ LotQuantityDeducted</span>
    </div>
    <div style="margin-top:6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:10px;color:#a1a1aa;">
      <span style="background:#1c1917;color:#a8a29e;border:1px solid #44403c;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;letter-spacing:.05em;">ASYNC →</span>
      <span style="background:#500724;color:#fbcfe8;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">SNGPC XML (BullMQ)</span>
      <span style="background:#500724;color:#fbcfe8;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">PDF recibo</span>
      <span style="background:#500724;color:#fbcfe8;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">Email</span>
    </div>
    <div style="margin-top:10px;background:#0c0a09;border-left:3px solid #166534;padding:8px 12px;border-radius:4px;font-size:11px;color:#a1a1aa;line-height:1.5;">
      <strong style="color:#86efac;">Atomicidade:</strong> <code>decide()</code> retorna os 3 eventos em um único append no stream da Dispensation. Optimistic concurrency garante consistência sem 2PC. Side effects externos vão para fila — falha de SNGPC não invalida dispensação.
    </div>
    <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #b91c1c;">⚠ PIN ou ICP-Brasil?</span>
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #b91c1c;">⚠ Endpoint farmácia ou sandbox?</span>
      <span style="background:#450a0a;color:#fca5a5;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #b91c1c;">⚠ CPF em claro no XML?</span>
    </div>
  </div>

  <div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:16px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#22c55e;margin-bottom:10px;">Fluxo 6 — Compliance<span style="background:#1c1917;color:#a8a29e;border:1px solid #44403c;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;margin-left:8px;letter-spacing:.05em;">LATER MODULE</span><span style="background:#27272a;color:#71717a;font-size:9px;font-weight:600;padding:2px 6px;border-radius:3px;margin-left:4px;">KPI básico = core</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      <span style="background:#2e1065;color:#e9d5ff;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">Dia 1/mês → KPI Report</span>
      <span style="background:#2e1065;color:#e9d5ff;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">15 jan/abr/jul/out → BSPO Trim</span>
      <span style="background:#2e1065;color:#e9d5ff;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">31 jan → BSPO Anual</span>
      <span style="background:#2e1065;color:#e9d5ff;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">Dia 1/mês → DRE + CPC 29</span>
      <span style="background:#2e1065;color:#e9d5ff;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">Semestral → Relatório Judicial</span>
    </div>
  </div>

  <div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:16px;grid-column:1/-1;">
    <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#22c55e;margin-bottom:10px;">Fluxo 7 — LGPD Anonimização<span style="background:#052e16;color:#86efac;border:1px solid #166534;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;margin-left:8px;letter-spacing:.05em;">CORE SPINE</span></div>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
      <span style="background:#1e3a8a;color:#bfdbfe;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">RequestAnonymization</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#052e16;color:#bbf7d0;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">Dispensações Pendentes?</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#1e3a8a;color:#bfdbfe;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">ExecuteCryptoDeletion</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#1c1917;border:1px solid #ca8a04;color:#fef08a;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">Member</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#431407;color:#fed7aa;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">MemberAnonymized</span>
      <span style="color:#52525b;font-size:12px;">→</span>
      <span style="background:#2e1065;color:#e9d5ff;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;">→ LGPD Entry + Notify</span>
    </div>
    <div style="margin-top:10px;background:#27272a;border-radius:6px;padding:10px 14px;font-size:11px;color:#a1a1aa;line-height:1.6;">
      <strong style="color:#f4f4f5;">Crypto-deletion (LGPD Art. 18 IV):</strong> DELETE member_key FROM Vault → name_enc, dob_enc, address_enc = lixo irrecuperável. Dado permanece fisicamente, chave não existe mais.
    </div>
  </div>

</div>

<div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:20px;margin-bottom:24px;">
  <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#a1a1aa;margin-bottom:16px;">Chain of Custody — Timeline</div>
  <div style="display:flex;align-items:center;gap:0;overflow-x:auto;padding-bottom:4px;">
    <div style="text-align:center;min-width:100px;flex-shrink:0;">
      <div style="background:#052e16;border:1px solid #166534;border-radius:8px;padding:8px 10px;font-size:11px;font-weight:700;color:#22c55e;">Membro</div>
      <div style="font-size:9px;color:#52525b;margin-top:4px;">Onboarding</div>
    </div>
    <div style="color:#3f3f46;font-size:18px;padding:0 4px;flex-shrink:0;">→</div>
    <div style="text-align:center;min-width:100px;flex-shrink:0;">
      <div style="background:#1c1917;border:1px solid #ca8a04;border-radius:8px;padding:8px 10px;font-size:11px;font-weight:700;color:#eab308;">Planta (ULID)</div>
      <div style="font-size:9px;color:#52525b;margin-top:4px;">Cultivo</div>
    </div>
    <div style="color:#3f3f46;font-size:18px;padding:0 4px;flex-shrink:0;">→</div>
    <div style="text-align:center;min-width:100px;flex-shrink:0;">
      <div style="background:#1c1917;border:1px solid #ca8a04;border-radius:8px;padding:8px 10px;font-size:11px;font-weight:700;color:#eab308;">Colheita</div>
      <div style="font-size:9px;color:#52525b;margin-top:4px;">CPC 29</div>
    </div>
    <div style="color:#3f3f46;font-size:18px;padding:0 4px;flex-shrink:0;">→</div>
    <div style="text-align:center;min-width:100px;flex-shrink:0;">
      <div style="background:#1c1917;border:1px solid #ca8a04;border-radius:8px;padding:8px 10px;font-size:11px;font-weight:700;color:#eab308;">COA + Lab</div>
      <div style="font-size:9px;color:#52525b;margin-top:4px;">SHA-256</div>
    </div>
    <div style="color:#3f3f46;font-size:18px;padding:0 4px;flex-shrink:0;">→</div>
    <div style="text-align:center;min-width:100px;flex-shrink:0;">
      <div style="background:#1c1917;border:1px solid #ca8a04;border-radius:8px;padding:8px 10px;font-size:11px;font-weight:700;color:#eab308;">Lote</div>
      <div style="font-size:9px;color:#52525b;margin-top:4px;">AVAILABLE</div>
    </div>
    <div style="color:#3f3f46;font-size:18px;padding:0 4px;flex-shrink:0;">→</div>
    <div style="text-align:center;min-width:100px;flex-shrink:0;">
      <div style="background:#431407;border:1px solid #ea580c;border-radius:8px;padding:8px 10px;font-size:11px;font-weight:700;color:#fed7aa;">Dispensação</div>
      <div style="font-size:9px;color:#52525b;margin-top:4px;">Imutável</div>
    </div>
    <div style="color:#3f3f46;font-size:18px;padding:0 4px;flex-shrink:0;">→</div>
    <div style="text-align:center;min-width:100px;flex-shrink:0;">
      <div style="background:#500724;border:1px solid #be185d;border-radius:8px;padding:8px 10px;font-size:11px;font-weight:700;color:#fbcfe8;">SNGPC XML</div>
      <div style="font-size:9px;color:#52525b;margin-top:4px;">ANVISA</div>
    </div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
  <div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:16px;">
    <div style="font-size:20px;margin-bottom:8px;">🔒</div>
    <div style="font-size:12px;font-weight:700;color:#f4f4f5;margin-bottom:4px;">Dispensation é imutável</div>
    <div style="font-size:11px;color:#a1a1aa;line-height:1.5;">Sem cancelamento. Estorno = novo evento. Audit trail permanente.</div>
  </div>
  <div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:16px;">
    <div style="font-size:20px;margin-bottom:8px;">🌱</div>
    <div style="font-size:12px;font-weight:700;color:#f4f4f5;margin-bottom:4px;">Plant ULID permanente</div>
    <div style="font-size:11px;color:#a1a1aa;line-height:1.5;">Nunca reutilizado, mesmo após destruição. Trilha ANVISA completa.</div>
  </div>
  <div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:16px;">
    <div style="font-size:20px;margin-bottom:8px;">📋</div>
    <div style="font-size:12px;font-weight:700;color:#f4f4f5;margin-bottom:4px;">Compliance é read-only</div>
    <div style="font-size:11px;color:#a1a1aa;line-height:1.5;">Nunca escreve nos aggregates. Lê projeções de todos os contextos.</div>
  </div>
  <div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:16px;">
    <div style="font-size:20px;margin-bottom:8px;">⚖️</div>
    <div style="font-size:12px;font-weight:700;color:#f4f4f5;margin-bottom:4px;">Estado regulatório é síncrono</div>
    <div style="font-size:11px;color:#a1a1aa;line-height:1.5;">Quota e estoque deduzem no MESMO append do <code>DispensationRecorded</code>. Side effects externos (SNGPC, PDF, email) vão para BullMQ — falha não compromete dispensação.</div>
  </div>
  <div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:16px;">
    <div style="font-size:20px;margin-bottom:8px;">🛡️</div>
    <div style="font-size:12px;font-weight:700;color:#f4f4f5;margin-bottom:4px;">Audit imutável no banco</div>
    <div style="font-size:11px;color:#a1a1aa;line-height:1.5;">PostgreSQL RULE bloqueia UPDATE/DELETE. Não confia na app layer.</div>
  </div>
  <div style="background:#18181b;border:1px solid #3f3f46;border-radius:10px;padding:16px;">
    <div style="font-size:20px;margin-bottom:8px;">🔑</div>
    <div style="font-size:12px;font-weight:700;color:#f4f4f5;margin-bottom:4px;">Crypto-deletion ≠ DELETE</div>
    <div style="font-size:11px;color:#a1a1aa;line-height:1.5;">Dado permanece. Chave desaparece. LGPD Art. 18 IV via destruição de chave.</div>
  </div>
</div>
