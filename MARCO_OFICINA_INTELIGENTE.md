# Marco de Evolução — Oficina Inteligente (P0)

> Status: **proposta / roadmap**. Consolida os requisitos levantados em 2026-07-19 num plano
> sequenciado por fatias entregáveis. Cada fatia vira um PR com CI verde (mesmo fluxo dos sprints).

## 0. Princípios (definidos 2026-07-19)

- **Relatórios são SUPORTE À DECISÃO, não decisores.** O sistema **traz os valores** (números
  crus e agregados) para o solicitante pensar; **nunca** decide/recomenda por ele.
- **Custo SEMPRE visível.** A priorização é por **qualidade acima de custo**, mas todo relatório de
  peça/fornecedor mostra o **custo** ao lado da qualidade.
- **Durabilidade é a métrica-chave de qualidade.** Ex.: "correia A do fornecedor A durou X; outra
  peça do mesmo fornecedor durou 2X." → medir quanto cada peça **durou** (tempo / horas / km).
- **Catálogo de peças maduro:** cada **peça tem ranking próprio** e cada **fornecedor tem ranking**
  (derivados de durabilidade + qualidade + reprovação), com custo sempre ao lado.

**Decisões (Fatia L — catálogo maduro):** durabilidade = **ciclo de vida OBSERVADO** (registra
instalação da peça na máquina com horímetro/km atuais; na próxima troca calcula quanto durou);
unidade = **horas E km** (ambas, aproveitando o horímetro/odômetro auto-alimentados); ranking por
peça e por fornecedor; relatórios sempre com custo + valores.

## 1. Visão

Transformar o que hoje são **3 módulos soltos** — Manutenção, Ordens de Serviço e Fornecedores
(+ Estoque de peças) — em **um único módulo "Oficina"**, inteligente e orientado a dados:

- **Histórico vivo da máquina** (manutenções, peças, km/horas, alertas) num só lugar.
- **Manutenção preventiva proativa**: o sistema avisa *antes* de quebrar (amarelo) e sinaliza risco
  iminente (vermelho), inclusive **no próprio rastreador (Virloc)** para o operador agir.
- **Rastreabilidade de peças e fornecedores** com qualidade, cruzando defeito × fornecedor.
- **Automação por localização**: detectar sozinho quando a máquina entra na oficina; alertar desvio
  de rota (talhão não planejado) no Virloc.

## 2. Onde estamos (base atual)

| Já existe | Arquivo/detalhe |
|---|---|
| Manutenção (downtime + custo) | `MaintenanceDowntime`, `api/maintenance.py`, `MaintenancePage.js` |
| O.S. (orçamento→aprovada→fechada, PDF) | `ServiceOrder`/`ServiceOrderItem`, `api/service_orders.py`, `services/pdf_extract.py`, `OrdensServicoPage.js` |
| Fornecedores + Estoque (ledger) | `Supplier`, `Part`, `StockMovement`, `api/crud/{suppliers,parts}.py`, `EstoquePage/FornecedoresPage` |
| Geofencing de oficina (parcial) | worker gera alerta `maintenance_question` quando entra em `Building` |
| Alertas + tempo real | `Alert`, `telemetry_worker`, WebSocket dashboard |
| Distância diária por frota | `FleetDailyDistance` (base do odômetro) |
| Import KML (frontend) | `shpjs` + `@tmcw/togeojson` já nas deps (base do shapefile) |
| Taxa horária da máquina | `Fleet.hourly_rate` |

**Feature flags hoje:** `MAINTENANCE` e `STOCK` são separadas → serão unificadas em `OFICINA`.

## 3. Consolidação do módulo (estrutural — P0)

- Nova feature macro **`oficina`** (substitui `maintenance` + `stock`), com **sub-itens**:
  **Painel da Oficina · Manutenção · Ordens de Serviço · Peças & Estoque · Fornecedores ·
  Histórico da Máquina**.
- Frontend: uma entrada "Oficina" no menu com **sub-navegação** (tabs/rotas internas), reaproveitando
  as páginas atuais como sub-telas.
- Backend: manter os routers, re-gatear todos sob `require_feature(OFICINA)`; atualizar
  `PLAN_FEATURES` (decisão em §12).

## 4. Modelo de dados — novos campos/tabelas

### 4.1 Máquina (horímetro/odômetro/manual) — `Fleet` / novo `MachineState`
- `horimeter_hours` (horímetro atual, h) e `odometer_km` (km acumulado).
- `manual_filename` (PDF do manual do operador por máquina; via `services/storage.py`).
- Fonte do horímetro: (a) se o Virloc reporta horas de motor, usar; (b) senão **acumular tempo de
  ignição ligada** (o worker já separa trabalho/idle por turno). Odômetro = soma de `FleetDailyDistance`.

### 4.2 Manutenção (tipo + preventiva)
- `maintenance_type`: **`preventiva` | `corretiva`** em `MaintenanceDowntime` e `ServiceOrder`.
- Nova tabela **`maintenance_plan`** (plano preventivo por máquina *ou* por tipo de máquina):
  gatilho por **horas**, **km** e/ou **calendário** (ex.: troca de óleo a cada 250 h). Campos:
  `fleet_number?`/`fleet_type?`, `name`, `trigger_hours?`, `trigger_km?`, `trigger_days?`,
  `warn_margin` (margem do amarelo), `last_done_at`/`last_done_hours`/`last_done_km`.
- **`km_since_maintenance`** derivado (odômetro − odômetro na última manutenção).

### 4.3 Peças & Fornecedores (qualidade + rastreio)
- `Part.supplier_id` **obrigatório** (cada peça tem um fornecedor) + `quality_rating`,
  `quality_notes`, `warranty_months`.
- `StockMovement` (entrada) já tem `lote`/`supplier_id`; adicionar **`quality`** por entrada
  (aprovado/reprovado/observação) para o cruzamento defeito × fornecedor.
- **`Supplier`**: `quality_score` (derivado dos defeitos), `contact`/`document` (já existem).

### 4.4 Associação entre serviços — ✅ Fatia H
- Relação **muitos-para-muitos** entre O.S. (`service_order_links`: `order_id`, `related_order_id`,
  `relation`) — serviços relacionados (ex.: retrabalho, mesma causa raiz). Par normalizado
  (order_id < related_order_id) → simétrico e deduplicado; RLS org-level. Endpoints
  `POST/DELETE /service-orders/{id}/links`; o detalhe da O.S. traz `related[]`.

### 4.5 Plano de rota (geofence de talhão)
- **`work_plan`**: máquina × talhões permitidos no período (`fleet_number`, `field_ids[]`,
  `valid_from/until`). Base do alerta de desvio.

### 4.6 Prédios (ícones)
- `Building.icon` (ex.: `oficina`, `galpao`, `silo`, `escritorio`, `posto`) → ícone no mapa.

## 5. Motor de manutenção preventiva + alertas (P0/P1)

Job periódico (worker) que, por máquina, calcula o "quanto falta" para cada `maintenance_plan`
(horas/km/dias) e emite alertas de novo tipo:
- **`maint_preventive_due` (amarelo)** — dentro da margem (`warn_margin`), ex.: faltam ≤10% ou ≤20 h.
  "Manutenção X próxima."
- **`maint_preventive_overdue` (vermelho)** — atingiu/passou o gatilho: **"a máquina irá parar"**.
- Aparecem na Central de Alertas + tempo real (WebSocket) e alimentam o **Painel da Oficina**
  (próximas manutenções priorizadas). Cores/severidade no `Alert.meta`.

## 6. Alertas no Virloc (downlink) + desvio de rota (P1)

- **Desvio de rota — ✅ FEITO (Fatia E):** o worker (que já faz `find_field_containing`) compara a
  posição atual com os `work_plans.field_ids` do plano ATIVO da frota. Se a máquina entra num talhão
  **fora do plano** → alerta `route_deviation` (dedup + WebSocket) na Central de Alertas. UI de
  gestão em **Plano de Rota** (`WorkPlansPage`). Fora de qualquer talhão (estrada) não conta.
- **Downlink ao Virloc (VC07) — ⏳ STUB (`services/virloc.py`, gateado por `VIRLOC_DOWNLINK_ENABLED`,
  default off):** enviar mensagem/comando ao dispositivo via Flespi (device command / publish no
  tópico do device). ⚠️ **Descoberta ainda necessária:** confirmar que o VC07 **recebe e sinaliza**
  ao operador (buzzer/display/terminal) e o formato aceito pelo Flespi. Enquanto isso, o alerta fica
  no painel/app; o call-site no worker já está pronto — implementar `virloc._send()` pós-descoberta.

## 7. Detecção automática de entrada na oficina (P1)

Já existe base (geofence de `Building` → `maintenance_question`). Evoluir para:
- Marcar `Building.icon = 'oficina'` como **oficinas**; ao entrar (geofence), **abrir automaticamente**
  um rascunho de manutenção/downtime e sugerir O.S. (o gestor confirma). Fechar downtime ao sair.
- Distinguir "passou perto" de "parada real" (dwell time mínimo + ignição).

## 8. Histórico da máquina + relatórios de cruzamento (P1)

- **Timeline por máquina** (nova tela): manutenções (prev/corr), O.S., peças trocadas, km/horas,
  km rodado desde a última manutenção, alertas — ordenados no tempo.
- **Relatórios de cruzamento** (Central de Relatórios):
  - **Qualidade de peça × fornecedor** (defeitos/retornos por fornecedor).
  - **Custo de manutenção por máquina** (prev vs corr) e por período.
  - **MTBF/《horas entre manutenções》** por máquina/tipo.
  - Export (xlsx/pdf) reaproveitando o pipeline atual.

## 9. Extração & visualização de O.S. (P1/P2)

- Melhorar `services/pdf_extract.py`: parsing mais robusto (itens/valores), **pré-visualização** do
  PDF com mapeamento assistido para itens da O.S., e correção manual antes de confirmar.
- Tela de detalhe da O.S. mais rica (itens, custos estimado×real, anexos, serviços relacionados).

## 10. Geo — import/export shapefile (P2)

- **Import:** aceitar `.zip` de shapefile (shp/shx/dbf) de drones/plataformas de georreferenciamento
  em Fazendas/Talhões (o `shpjs` já converte shapefile→GeoJSON no frontend).
- **Export:** talhões/fazendas como shapefile (ou GeoJSON + conversão). ⚠️ Export shapefile exige lib
  no backend (`pyshp`/`geopandas`) — avaliar peso; GeoJSON/KML já saem hoje.

## 11. UX (P2)

- **Ícones de prédios** por `type`/`icon` nos mapas (oficina, galpão, silo, escritório…).
- **Modo claro**: hoje o app é dark-only; introduzir tema claro (variáveis CSS + toggle persistido).
- Melhorias gerais de interface (densidade, navegação da Oficina, detalhe da O.S.).

## 12. Sequenciamento proposto (fatias → PRs)

| Fatia | Escopo | Prioridade | Depende de |
|---|---|---|---|
| **A** | ✅ Consolidação do módulo Oficina (feature `oficina` + sub-nav) | **P0** | — |
| **B** | ✅ Modelo: `maintenance_type`, horímetro/odômetro, `part.supplier_id` + qualidade, `maintenance_plans` (CRUD + RLS) | **P0** | A |
| **C** | ✅ Histórico da máquina (timeline + resumo prev/corr, km desde última manut.) | **P0/P1** | B |
| **D** | ✅ Motor preventivo + alertas amarelo/vermelho (worker + Central de Alertas) | **P1** | B |
| **E** | ✅ Desvio de rota (`work_plans` + geofence de talhão no worker → alerta `route_deviation`) + UI Plano de Rota. ⏳ Downlink Virloc = stub gateado (`services/virloc.py`), aguardando descoberta de hardware | **P1** | D + descoberta |
| **F** | ✅ Entrada automática na oficina (geofence oficina-only + dwell-time → downtime + alerta) | **P1** | A |
| **L** | ✅ Catálogo maduro: ciclo de vida da peça (instala→troca), durabilidade observada (horas+km), ranking por peça e por fornecedor, custo sempre visível | **P1** | B, auto-feed |
| **G** | ✅ Peças/fornecedores qualidade + relatório de cruzamento (qualidade × fornecedor) | **P1** | B |
| **H** | ✅ Extração de O.S. melhorada (quantidade, fornecedor, mão-de-obra) + visualização (datas/tipo/PDF/obs) + associação de O.S. relacionadas (`service_order_links`) | **P2** | A |
| **I** | ✅ Manual do operador (PDF por máquina) — upload/download no Histórico da Máquina | **P2** | A |
| **J** | ✅ Import/export shapefile (import via editor; export talhões/fazendas em Shapefile `.zip`/GeoJSON, gate `integrations`) | **P2** | — |
| **K** | ✅ UX: modo claro (toggle) + ícones de prédios no mapa | **P2** | — |

## 13. Decisões (2026-07-19)

1. **Feature flags:** ✅ **`oficina` como guarda-chuva, mantendo as sub-flags** (`maintenance`/
   `stock`). `oficina` controla o módulo/menu; cada sub-item segue gateado pela flag fina. Entra em
   todos os planos base (todos têm manutenção). — *implementado na Fatia A.*
2. **Arranque:** ✅ **Fatia A** (consolidação do módulo).
3. **Virloc downlink:** ⏳ **fazer o spike de descoberta** (Fatia E) antes de comprometer UI — confirmar
   se o VC07 sinaliza o operador e o formato de downlink do Flespi.

### Ainda a decidir (nas fatias respectivas)
- **Horímetro:** o Virloc já manda horas de motor, ou derivamos do tempo de ignição? (Fatia B)
- **Planos preventivos:** por **máquina**, por **tipo** de máquina, ou os dois? (Fatia B/D)
- **Export shapefile:** ✅ shapefile real via `pyshp` (puro-Python, sem GDAL) + GeoJSON. (Fatia J)

## 14. Riscos

- **Downlink ao Virloc** é o item de maior incerteza (hardware + Flespi) → tratado como spike isolado.
- **Horímetro/odômetro** dependem da qualidade do sinal do rastreador; ter fallback derivado.
- **Consolidação de módulo** mexe em feature flags e navegação → fazer com testes de gate para não
  quebrar planos existentes.
