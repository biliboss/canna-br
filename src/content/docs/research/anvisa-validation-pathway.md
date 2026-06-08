---
title: "Pathway de Validação ANVISA"
description: "Como software para associações de cannabis se encaixa na regulação ANVISA: RDC 657 (SaMD), SNGPC, GGMED."
---

## Insight Central

**A ANVISA certifica associações — não software.**

```
ANVISA
  └─ certifica → Associação
                    └─ demonstra → processos
                                      └─ suportados por → sistemas
                                                              └─ evidenciados no → dossier
```

O software de gestão não tem um caminho de certificação próprio na ANVISA. Ele entra no processo como **evidência técnica** no dossier da associação candidata ao sandbox RDC 1.014/2026.

---

## RDC 657 (SaMD) — Não Se Aplica

A RDC 657/2022 regula **Software como Dispositivo Médico (SaMD)** — softwares com função diagnóstica, terapêutica ou de monitoramento clínico.

| Tipo de sistema | É SaMD? | Consequência |
|---|---|---|
| Gestão de membros | Não | Sem registro ANVISA obrigatório |
| Rastreabilidade de estoque | Não | Sem registro ANVISA obrigatório |
| Relatórios de KPIs | Não | Sem registro ANVISA obrigatório |
| Algoritmo de dosagem terapêutica | **Sim — Classe II** | Registro ANVISA obrigatório |
| Módulo de farmacovigilância com alerta clínico | **Sim — avaliar** | Consultar GGMED antes de implementar |

**Regra prática**: enquanto o sistema não toma ou sugere decisões clínicas sobre o paciente, não é SaMD e não exige registro na RDC 657.

---

## SBIS/CFM — Não Exigido

O **Manual de Certificação SBIS/CFM** (Sociedade Brasileira de Informática em Saúde) cobre sistemas de prontuário eletrônico (RNDS, TISS). Não é exigido para sistemas de gestão de associações de cannabis — a não ser que a associação decida integrar com a RNDS futuramente.

---

## SNGPC — Único Ponto de Homologação Formal

O **SNGPC** (Sistema Nacional de Gerenciamento de Produtos Controlados) é o único componente do sistema com processo de homologação formal obrigatório junto à ANVISA.

Passos para homologação SNGPC:

1. Credenciamento no portal SNGPC (CNPJ da associação)
2. Obtenção de certificado digital ICP-Brasil (A1 ou A3)
3. Testes no **sandbox SNGPC** com envios fictícios
4. Validação dos XMLs contra os XSDs publicados
5. Autorização para envio em produção

Sem essa homologação, a associação não pode operar legalmente com substâncias controladas sob a Lista C1/C5 da Portaria 344/98.

---

## Checklist de Preparação Técnica para o Dossier

O dossier do "Plano de Capacidade Técnico-Operacional" deve evidenciar:

- [ ] Sistema operacional em ambiente homologado (não local/dev)
- [ ] Audit log com retenção mínima de 30 dias (recomendado: 5 anos, alinhado com KCanG alemão)
- [ ] RBAC documentado com mapa de papéis e permissões
- [ ] LGPD: RIPD (Relatório de Impacto à Proteção de Dados) elaborado
- [ ] Backup testado e procedimento de recuperação documentado
- [ ] Integração SNGPC homologada (ou cronograma de homologação)
- [ ] Política de controle de acesso para dados sensíveis de saúde

---

## Gaps Críticos (Jun 2026)

| Gap | Impacto |
|---|---|
| Schema XML SNGPC para sandbox de associações não publicado | Desenvolvimento da integração bloqueado até publicação |
| Endpoint específico para associações vs. farmácias ainda não confirmado | Pode exigir adaptação do XML padrão de farmácias |
| Número de vagas no sandbox não publicado | Incerteza sobre janela de oportunidade |
| Critérios de pontuação do dossier não detalhados pela GGMED | Dificulta priorização de funcionalidades para o dossier |
