# 🚜 Agro Telemetria (PH Soluções em TI)

Uma plataforma web fullstack para gerenciamento e monitoramento de máquinas agrícolas através de telemetria, utilizando dispositivos embarcados (como o VC07) para coleta de dados operacionais, localização, identificação de operadores e controle de manutenção.

O projeto foi concebido e reestruturado para ser escalável e **multi-tenant** (SaaS com isolamento por organização via RLS): **Frontend** em Next.js (App Router) e **Backend** em Python/FastAPI assíncrono, com ingestão resiliente via **Outbox Pattern** + worker, banco **PostgreSQL + PostGIS + TimescaleDB** e cache em Redis — capaz de processar dezenas de eventos simultâneos de telemetria com alta resiliência (pacotes offline, ordenação por timestamp, idempotência).

---

# 📌 Objetivo

Desenvolver uma plataforma SaaS para gerenciamento de frotas agrícolas capaz de:
- Receber dados de telemetria em tempo real via REST.
- Gerenciar frotas, operadores e propriedades rurais.
- Controlar preventivamente manutenções com base em horímetros.
- Armazenar o histórico de rotas e telemetria CAN (temperatura, RPM, combustível).
- Exibir Dashboards operacionais e controle de "Jornadas de Trabalho" automáticas.
- Oferecer uma Wiki integrada e documentação de suporte online.

---

# 🛰 Equipamentos Suportados

## Terminal de Aquisição de Dados (Linha VC07 / VIRLOC)
- **Comunicação:** 4G / Wi-Fi
- **Telemetria:** Leitura via CAN Bus (RPM, Temperatura, Combustível, Status Ignição)
- **Identificação:** Leitor RFID nativo para crachá do operador
- **Rastreamento:** GPS/GNSS integrado de alta precisão
- **Interface:** Display e Teclado Numérico

## Sensor BLE AS500 (Opcional)
- Acelerômetro e status de movimento
- Bateria de longa duração (3+ anos)
- Comunicação BLE com o terminal VC07

---

# 🏗 Arquitetura Atual

A plataforma foi construída de forma moderna separando um Backend robusto e assíncrono de um Frontend reativo de última geração:
- **Frontend (Next.js)**: Interfaces em `/app/` e `/components/` com Next.js (App Router), ShadCN/UI e Tailwind. Em produção proxia `/api/*` para o backend (o browser só fala com o frontend; sem CORS).
- **Backend (FastAPI)**: Rotas RESTful em `python-backend/api/` (auth, CRUDs, dashboard, telemetria, KPIs, manutenção). Auth JWT + RBAC (`require_role`).
- **Ingestão resiliente (Outbox + Worker)**: o webhook/MQTT do Flespi grava rápido na fila durável `telemetry_outbox` e retorna; um worker em background processa **em ordem cronológica por timestamp** (turnos, geofencing, KPIs, alertas), com idempotência e DLQ.
- **Integração Flespi (MQTT)**: listener assíncrono (`flespi_mqtt.py`) escuta `mqtt.flespi.io` e normaliza o payload bruto (CAN/GPS/RFID) para o modelo interno.
- **Banco**: PostgreSQL + **PostGIS** (geofencing com `geometry` + índice GiST) + **TimescaleDB** (hypertable de eventos), via SQLAlchemy 2.0; migrações versionadas com **Alembic**. Cache de posições ao vivo em Redis.

```text
Máquina / VC07
      │  (4G/Wi-Fi — MQTT via Flespi)
      ▼
FastAPI  ──►  telemetry_outbox (fila durável)  ──►  Worker (background)
  │  grava + 202                                       │ processa em ordem:
  │                                                     ├─ Geofencing (PostGIS: talhão/oficina)
  ├─ Rotas REST (JWT + RBAC)                            ├─ Turnos por RFID (idle × trabalho)
  ├─ Dashboard / KPIs / Manutenção                      ├─ KPIs (L/ha, ranking, custos)
  └─ Listener MQTT (Flespi)                             └─ Alertas + cache live
                    │                                            │
        ┌───────────┴───────────┐                                │
        ▼                       ▼                                ▼
 PostgreSQL + PostGIS      Redis (cache live) ◄───────────────────┘
 + TimescaleDB (Alembic)
        │
        ▼
 Frontend Next.js (dashboard)
```

---

# ⚙ Stack Tecnológica

## Core
- **Python 3.11 (FastAPI)** (Backend API + Worker + Listener MQTT no lifespan)
- **Next.js 16 (App Router)** / **React 18** (Frontend)

## Frontend & UI
- **TailwindCSS** (Estilização base)
- **ShadCN / UI** (Componentes Radix acessíveis)
- **Leaflet / React-Leaflet** (Mapas globais e rotas individuais com omissão de ruído de GPS)
- **Lucide React** (Ícones)
- **Recharts** (Dashboards)

## Backend & Infra
- **PostgreSQL** + **PostGIS** (geofencing: `geometry(Polygon,4326)` + índice GiST) + **TimescaleDB** (hypertable `telemetry_events`)
- **SQLAlchemy 2.0** (ORM async, estilo `Mapped[...]`) + **Alembic** (migrações versionadas, rodadas no boot do container)
- **GeoAlchemy2** (tipos geométricos no ORM)
- **Redis** (cache em tempo real do dashboard global de frotas)
- **Flespi IoT Cloud** (broker MQTT de recepção dos trackers VC07)
- **Docker Compose** (stack full-stack: postgres + redis + api + frontend)

## Qualidade & CI
- **ruff** (lint) + **mypy** (tipagem, gate no tree inteiro, 0 erros) + **pytest** (unitário + integração com Postgres/PostGIS real)
- **ESLint** (flat config) + **Vitest** (frontend)
- **GitHub Actions** (esteira enxuta): job `python` (ruff + mypy + pytest) e job `frontend` (eslint + vitest) rodam em todo PR; `docker-build`, `security-scan` (Trivy) e `check-gitignore` rodam no push para `main`/`develop`. `concurrency` + cancel-in-progress, `paths-ignore` de docs e `timeout-minutes` mantêm o consumo de minutos baixo.

---

# 📚 O Que Já Foi Implementado (Marcos por Sprint)

### MVP (base)
- [x] **Migração de arquitetura JS→Python concluída**: backend é 100% FastAPI. O antigo backend Next.js/`lib` foi removido; o frontend serve só a UI e proxia `/api/*`.
- [x] **Segurança e Login**: Auth JWT no FastAPI (`core/security.py`), sessão no frontend.
- [x] **Wiki Embutida**: Conversão total da antiga base SCADA para a aba "Wiki", rodando 100% nativa sem dependência externa.
- [x] **Dashboard Operacional**: Visão geral de frotas ativas, contagem de equipamentos, alertas de conexão, mapa em tempo real de posições.
- [x] **CRUDs de Cadastros**: Máquinas, Operadores (tag RFID), Fazendas, Talhões (polígonos em mapa) e Prédios.
- [x] **API de Telemetria (Ingestão)**: Endpoint/MQTT para receber eventos JSON com dados CAN e GPS.
- [x] **Visualização de Histórico de Rota**: Plotagem precisa da linha percorrida no mapa (Leaflet).
- [x] **Telemetria CAN Visual**: Cards em tempo real (RPM, Combustível, Ignição, Velocidade, Horímetro).
- [x] **Controle de Jornada Automatizado**: Turnos abrem/fecham por Ignição + RFID do operador.
- [x] **Simulador de Frotas**: Script para gerar dados e testar posições.

### SPRINT-01 — Backend robusto para campo
- [x] **Outbox Pattern + Worker ordenado**: fila durável `telemetry_outbox`; worker processa **em ordem cronológica por timestamp do dispositivo** (não distorce horímetro/consumo com pacotes offline). Idempotência + DLQ.
- [x] **Geofencing (PostGIS)**: detecção de entrada/saída de **talhão** (trabalho) e **oficina** (downtime + alerta de manutenção).
- [x] **Turnos (Shifts) por RFID**: acúmulo de tempo e combustível separando **ocioso × trabalho**.
- [x] **Normalização Flespi completa** (CAN/GPS/RFID, `server_timestamp` p/ auditoria de latência).
- [x] **Deploy de campo** (`docker-compose.prod.yml`, imagem `timescaledb-ha:pg16`, guarda de segredo em produção).

### SPRINT-02 — Dívidas & segurança funcional
- [x] **Auth consolidado** em `core/security.py` (helpers de senha, JWT, `get_current_user` busca o User no DB).
- [x] **RBAC real** (`require_role(...)`) aplicado nas rotas de gestão.
- [x] **CORS restrito por ambiente** (`CORS_ORIGINS` via env).
- [x] **CI virou gate de verdade**: `mypy`/`security-scan` reativados; frontend com ESLint + Vitest.

### SPRINT-03 — Analítico & migrações formais
- [x] **Alembic formal**: schema versionado; `alembic upgrade head` roda no boot do container (saiu do `create_all`).
- [x] **PostGIS geometry + GiST**: `fields`/`farms.polygon` migraram de JSON para `geometry(Polygon,4326)` com índice; geofencing virou **query indexada única** (antes: varria a tabela toda por evento).
- [x] **KPIs analíticos** (`docs/ESTUDO_MODELAGEM_TELEMETRIA.md §2.4-2.6`): **ranking de operadores** (produtividade × consumo ocioso), **L/ha por talhão**, **custos de manutenção** (peças + mão de obra + downtime × taxa/h).
- [x] **Gestão de Manutenção**: tela dedicada — lista downtimes de oficina, confirma O.S. e registra custos.

### Pós-SPRINT-03 — Saúde do código & prontidão de deploy
- [x] **Backend JS legado removido** (46 arquivos mortos) + deps órfãs (`mongodb`, `ioredis`, `puppeteer`, `cheerio`).
- [x] **Modelos → SQLAlchemy 2.0 (`Mapped[...]`)**; gate de `mypy` no **tree inteiro** (0 erros).
- [x] **Testes de integração** com Postgres/PostGIS real (worker, geofencing, KPIs, manutenção, RBAC) + guard-rail de drift do Alembic; testes de frontend (Vitest).
- [x] **Deploy full-stack dockerizado**: `frontend` (Next standalone) no `docker-compose.prod.yml`, proxiando `/api/*` → `api:8000` na rede interna. Smoke completo validado. Ver **`DEPLOY.md`**.

### SPRINT-04 — Alertas & Relatórios (valor ao usuário)
- [x] **Alertas operacionais**: worker gera `overspeed`/`rpm_redzone`/`low_fuel` (limiares configuráveis, dedup por frota+tipo); tela de Alertas (filtros, reconhecer/fechar com RBAC), **badge** no menu e **toast** dos novos.
- [x] **Operador identificado no alerta**: além da frota, o alerta registra **quem** estava na máquina no momento (RFID do turno/evento → nome).
- [x] **Relatórios (Excel/PDF)**: Jornada de Trabalho e Custos de Manutenção, na Central de Relatórios (openpyxl + reportlab).

### SPRINT-05 — Histórico de Rotas (filtros + exportação)
- [x] **Consulta de rota filtrada**: `GET /telemetry/route` por frota + **operador (RFID)** + **período** + **talhão** (filtro espacial `ST_Contains` com índice GiST).
- [x] **Exportação da rota**: `GET /reports/route?format=xlsx|pdf|kml` — Excel, PDF e **KML** (o KML **abre direto no Google Earth**: trajeto como `LineString` + pontos).
- [x] **UI**: card "Histórico de Rotas" na Central de Relatórios + barra de filtros na Análise de Telemetria (alimenta o mapa).

### SPRINT-06 — Central de Relatórios de Performance
- [x] **Performance de Máquina** (`/kpis/machine-performance` + relatório): por frota — horas trabalho×ocioso, aproveitamento %, L/h, combustível, horímetro, **distância percorrida (km)** (via `ST_MakeLine`/`ST_Length`), nº de alertas, custo de manutenção e faturamento potencial.
- [x] **Novos relatórios exportáveis (Excel/PDF)**: Performance de Máquina, **Ranking de Operadores**, **Consumo por Hectare (L/ha)** e **Ocorrências/Alertas** (com operador identificado; filtros por frota/tipo/status).
- [x] **UI**: Central de Relatórios reorganizada em seções — *Operacional* · *Performance* · *Custos & Ocorrências*.

### SPRINT-07 — Dashboard em Tempo Real (WebSockets)
- [x] **WebSocket `/ws/dashboard`**: autenticação por 1ª mensagem (JWT) + **Redis pub/sub** (canal `dashboard:events`); ingestão e worker publicam posições e alertas ao vivo.
- [x] **Frontend ao vivo**: Dashboard (posições/eventos), Telemetria (posição da frota) e Alertas (badge/toast + lista) atualizam via WebSocket; **polling** cai para reconciliação lenta/**fallback** (cliente com reconexão por backoff).
- [x] **Proxy de produção (nginx)**: serviço `proxy` no compose roteia `/api` e `/ws` → `api:8000` e o resto → `frontend` (o rewrite do Next não encaminha WebSocket).

### SPRINT-08 — Estoque de Peças na Manutenção
- [x] **Catálogo de peças com estoque** (`Part`) + **ledger de movimentos** (`StockMovement`: entrada/saída/ajuste) — migração `0006`.
- [x] **Baixa automática na O.S.**: confirmar a manutenção com peças **dá baixa no estoque** e **calcula o `parts_cost`** (custo manual só quando não há peças); **bloqueia (409)** se o estoque for insuficiente (tudo-ou-nada); baixa **idempotente**.
- [x] **Reposição** (`/parts/{id}/restock`) e **estoque baixo** (destaque + card de resumo).
- [x] **UI**: página **Estoque** (catálogo, repor, editar, filtro de estoque baixo) + seletor de peças no diálogo de confirmação da O.S.
- [x] **Relatório de inventário** (Excel/PDF) na Central de Relatórios.

### SPRINT-09 — Estoque Avançado (movimentação, fornecedores)
- [x] **Movimentação de estoque**: **entrada e saída manual** (além da baixa por O.S.), com **lote**, **fornecedor** e **quem movimentou** (auditoria); saída bloqueia (409) se faltar estoque.
- [x] **Histórico de movimentação**: por peça (drawer) + **visão geral** filtrável (tipo/período), na página Estoque.
- [x] **Fornecedores** (entidade/CRUD) + **marca** no cadastro de peça.
- [x] **Relatório de movimentações** (Excel/PDF) na Central de Relatórios.

### Feature flags por plano (módulos macro)
- [x] **Gate no backend** (`core/features.py` + `require_feature`): o plano da instância (`PLAN` no `.env`, imutável pelo cliente) decide os **módulos macro** — **Alertas** (+ tempo real), **Manutenção**, **Estoque**, **Relatórios**, **Integrações** (KML/Google Earth). O **CORE** (monitoramento/cadastros) é sempre ligado. Bloqueia (**403**) mesmo com request forjada — o frontend só esconde. Planos: `standard` (core+alertas+manutenção), `pro` (+estoque+relatórios), `enterprise` (+integrações). Overrides por instância via `FEATURES_EXTRA`/`FEATURES_DISABLED`. Combina com o **RBAC** (papel decide quem, dentro da organização, usa cada módulo).
- [x] `GET /api/features` (plano + módulos ativos) → o frontend esconde menu/cards não incluídos.
- [x] **Multi-tenant (F2/F3) entregue:** isolamento por organização com **RLS aplicado** (API como `agro_app` não-superuser), scoping por fazenda × papel, trava de subdomínio e **painel de admin do sistema** (`/api/sys-admin`, `agro_sysadmin` BYPASSRLS). Ver seção *Multi-tenant (F2/F3)* acima e `.agents/migration/12_MULTITENANT_F2_F3_PLAN.md`.

### SPRINT-10 — Revisão & Eficiência (sustentar ~500 equipamentos na infra atual)
- [x] **Worker paralelo por dispositivo**: drenagem do Outbox com reivindicação atômica (`FOR UPDATE SKIP LOCKED`) + processamento **concorrente por device** (ordem preservada por dispositivo), reaper de itens presos — multiplica o teto de vazão.
- [x] **Worker separável da API**: `RUN_MQTT`/`RUN_WORKER` + serviço `worker` dedicado no compose (não disputa CPU com a API).
- [x] **Rollup diário de distância** (`fleet_daily_distance`): o worker acumula os segmentos; o relatório de performance lê o rollup em vez de recalcular `ST_MakeLine` sobre pontos crus.
- [x] **Quick wins**: índice parcial de drenagem do Outbox; `events-timeline` com dados **reais** (era fabricado); cache do `/dashboard/stats`; pipeline Redis na ingestão.

### Multi-tenant (F2/F3) — organização como núcleo
- [x] **Isolamento por organização com RLS de verdade**: a API conecta como `agro_app` (papel **não-superuser** → RLS aplicado no banco). Cada tabela de negócio tem `org_id` + *policy* de organização; as tabelas derivadas (worker/ingestão) recebem `org_id`/`farm_id` por **trigger** a partir da frota/talhão. `app.current_org` setado por request a partir do JWT.
- [x] **Dois eixos de acesso**: **fazenda** (RLS — `admin`/`all_farms` vê tudo; `gerente` só as fazendas atribuídas em `user_farms`) × **papel** (RBAC — admin/gerente/operador decide as ações). Trava defensiva por **subdomínio** da org.
- [x] **Painel de admin do SISTEMA (F3)**: superfície separada (`/api/sys-admin`, auth e conexão próprias com papel `agro_sysadmin` **BYPASSRLS**) para o super-admin gerenciar organizações/planos — acima dos tenants, fora do RLS.

### Clima por fazenda (add-on)
- [x] **Dados meteorológicos (Open-Meteo)**: atual + previsão + variáveis agro por fazenda (ponto override ou centroide do polígono). Feature `weather`.
- [x] **Mapa visual opcional (`weather_map`)**: camada OpenWeatherMap (tiles via proxy do backend com token curto) com legendas e valores atuais; máquinas (última posição) plotadas. Add-on separado.

### Oficina Inteligente (marco P0 — fatias A–L)
Consolidação de **Manutenção + Ordens de Serviço + Fornecedores + Estoque + Histórico** num **módulo único "Oficina"** (feature `oficina` guarda-chuva), orientado a dados:
- [x] **Manutenção preventiva proativa**: planos por máquina/tipo (gatilho horas/km/dias); o worker emite alerta **amarelo** (`maint_preventive_due`, dentro da margem) e **vermelho** (`maint_preventive_overdue`, "a máquina irá parar"). Horímetro/odômetro auto-alimentados.
- [x] **Detecção automática de oficina** por geofence (prédio `is_workshop` + *dwell-time* → abre downtime + alerta).
- [x] **Histórico da máquina**: timeline (manutenções prev/corr, O.S., peças, km/horas, km desde a última manutenção) + manual do operador (**PDF por máquina**).
- [x] **Catálogo maduro de peças/fornecedores**: ciclo de vida da peça (instala→troca) → **durabilidade observada** (horas E km); **ranking por peça e por fornecedor** com filtros; qualidade × custo (custo sempre visível). Relatórios de cruzamento (defeito × fornecedor).
- [x] **O.S. melhoradas**: extração de PDF (quantidade, fornecedor, mão-de-obra), visualização (datas do ciclo, tipo, obs, PDF) e **associação de O.S. relacionadas** (retrabalho/mesma causa).
- [x] **Desvio de rota**: **plano de rota** (`work_plans` — máquina × talhões permitidos); o worker alerta `route_deviation` quando a máquina entra em talhão fora do plano. *(Downlink físico ao Virloc VC07 = stub; ver `SPIKE_VIRLOC_DOWNLINK.md`.)*
- [x] **Geo import/export**: importar Shapefile de **drone** (`.zip`, reprojetado via `.prj`), **Google Earth** (`.kml`) e GeoJSON no mapa de fazendas/talhões; **exportar** talhões/fazendas em Shapefile/GeoJSON.
- [x] **UX**: modo claro (toggle) + ícones de prédios no mapa.

### Refinamentos de UX + robustez (lote 2026-07-20)
- [x] **Tema**: modo claro **suave** (sem branco puro) + toggle como ícone no canto superior direito; cards e mapas theme-aware.
- [x] **Importação geo óbvia** (`GeoImportDialog`) em **Talhões / Fazendas / Plano de Rota**: detecta os polígonos do arquivo (drone/GE/GeoJSON) e cria em **lote**.
- [x] **Avisos = toasts não-bloqueantes** (sonner, à direita, theme-aware); `confirm()`/`alert()` → `confirmToast`. **Erros distinguem** conexão × regra de negócio (motivo explícito) × técnico (5xx) — `apiClient.errorMessage`.
- [x] **Ciclo da O.S. explícito**: *Orçamento → Aprovada → Fechada*, com descrição do estado + botão do próximo passo e filtro **"Aguardando aprovação"** com contadores. **Fix**: 500 ao fechar (`db.refresh` pós-commit sob RLS) em close/approve/cancel.
- [x] **Catálogo maduro (peça)**: fornecedor **obrigatório**; **seletor buscável** (nome/número) de fornecedor e de peça (`SearchSelect`); **lote** opcional; **estoque mínimo** por peça com opt-out (0 = não controla); registra **quem cadastrou** (`Part.created_by`, migração 0033).
- [x] **Mapa**: status distingue **Desligada** (ignição off) de **Parada**; **zoom maior**; **sempre a última posição conhecida** (mescla `machine_state` p/ máquinas offline).
- [x] **CI enxuto**: filtro por path (`dorny/paths-filter`) — commit só de frontend não roda o job Python (pytest); jobs pesados só no *schedule*/dispatch.

### Peças por km rodado + busca no catálogo (2026-07-21)
- [x] **Relatório automático de peças por km** (`GET /kpis/parts-per-km`, subaba **Oficina → Peças por km**). *Automático* = **nenhuma quilometragem é digitada**: o km vem do rollup `fleet_daily_distance` que o worker acumula do GPS (SPRINT-10/M8) e a peça vem da baixa `consumption` do ledger, gerada no fechamento da O.S.; a máquina é resolvida pela O.S. (`service_order_id`) ou pelo downtime (`maintenance_id`).
  - Métricas por máquina **e por peça**: `kmPerPart` (durabilidade observada), `partsPer1000Km` (taxa de consumo) e `costPerKm`. Ordena por maior consumo por km.
  - **Sem km no período → métrica `None`** (backend) e *"sem km no período"* (UI), em vez de `0` — não se exibe número enganoso.
- [x] **Busca e filtro na tela de peças por km**: peça por **nome, código ou os dois** (multi-termo) + filtro por máquina; ao filtrar, **as métricas recalculam para a peça buscada** (responde "essa correia dura quantos km em cada máquina?").
- [x] **Busca no catálogo do Estoque** (o catálogo só cresce): casa por **nome, SKU, marca, fornecedor ou lote**, multi-termo, combinável com "Só estoque baixo"; vazio distingue *nada encontrado* de *nada cadastrado*.
- [x] Testes: `test_parts_per_km_db.py` (matemática do cruzamento + caso sem km).

### Cruzamentos de valor + massa de testes (2026-07-21)
Os relatórios eram fortes em **volume** (quanto rodou/gastou) e fracos em **razão** — que é onde mora a decisão. Este bloco fecha essa lacuna.
- [x] **Confiabilidade & Custo** (`GET /kpis/reliability`, seção na Central de Relatórios):
  - **Preventiva × corretiva** e `correctivePercent` — `maintenance_type` era preenchido mas **não era usado em nenhum relatório**; corretiva subindo = plano preventivo falhando.
  - **`costPerHour`** — custo (peças + mão de obra + parada × taxa/h) ÷ hora **trabalhada**: máquina cara é a que custa muito por hora produzida, não em absoluto. Decide manter × vender.
  - **`availabilityPercent`** (uptime) e **`mtbfHours`** (horas trabalhadas ÷ corretivas).
  - Denominador zero → métrica `None` + o **motivo** na tela ("sem falha", "não trabalhou").
- [x] **Reincidência & Retrabalho** (`GET /kpis/rework`): responde *"quais defeitos voltaram?"* por duas fontes, porque uma sozinha mente — **reincidência automática** (mesma máquina + mesma causa-raiz em mais de uma O.S., sem depender de marcação) e **retrabalho marcado** (`service_order_links`, relação *retrabalho*, para quando a causa foi escrita com outras palavras). O.S. **sem causa-raiz não vira reincidência** — não se afirma sem evidência.
- [x] **Exportação Excel/PDF** de Confiabilidade e de Peças por km (`/reports/reliability`, `/reports/parts-per-km`) — reusam os KPIs como fonte única da conta.
- [x] **`seed.py` popula histórico operacional** (90 dias): 770 turnos, ~51.800 km de rollup, 60 paradas (30 preventivas × 30 corretivas), 60 O.S. com peça e baixa de estoque, alertas, reincidências e retrabalhos. Antes o seed só criava catálogo e **todo relatório nascia vazio**. Determinístico (`random.seed(42)`). Ao criar um relatório novo, popule aqui a fonte dele.
- [x] **Fix (multi-tenant)**: o seed não carimbava `org_id` — o trigger `tenant_set_org_id` depende de `app.current_org`, que só existe num request. Rodando o seed direto, tudo nascia com org nula e **ficava invisível para o app sob RLS**. Corrigido com `_stamp_org`.
- [x] Testes: `test_reliability_db.py` (números fechados na mão: 66,7 % corretiva, 97,2 % disponibilidade, MTBF 50 h, R$ 25/h) e `test_rework_db.py` (agrupamento por causa, O.S. sem causa não agrupa, link explícito).

### Arquitetura: rotas reais, service layer da O.S. e E2E (2026-07-22)
Uniformização de padrões rumo à futura quebra em microserviços (monólito modular com costuras prontas).
- [x] **Rotas reais no frontend** (App Router): SPA de página única (`app/page.js`, ~400 linhas, `useState`) → route group `app/(app)/` com layout persistente + uma rota por tela (`/dashboard`, `/oficina?tab=os`, `/telemetry?fleet=TR-001`). Casca (menu/tema/sessão) em `components/shell/`; as páginas de `components/pages/` não mudam por dentro (a fiação vive nos wrappers). Link direto, F5 e botão Voltar funcionam. `AuthGate`/`FeatureGate` = UX; autoridade continua no backend.
- [x] **Segurança**: interceptor de **401** no `apiClient` (sessão expirada → `/login?next=` em vez de toasts em loop); logout preserva o tema (remove só a credencial).
- [x] **Service layer da O.S.** (`services/service_orders.py`): a regra de aprovar/fechar/cancelar saiu dos handlers HTTP (Service Layer + Exception Translation) — chamável por ERP/mobile/jobs futuros sem HTTP, e testável sem subir a API. Router virou tradutor de exceção de domínio → status.
- [x] **Fix sistêmico — `db.refresh()` pós-commit sob RLS**: **21 ocorrências** removidas em 10 arquivos. Sob RLS o refresh re-SELECT a linha e podia estourar **500** (só com contexto de org/fazenda real — por isso escapava dos testes de integração; o **E2E** pegou). Seguro porque a sessão é `expire_on_commit=False`. Guarda: `tests/test_crud_no_refresh_db.py`.
- [x] **Limpeza**: removidas as pastas `application/`, `domain/`, `infrastructure/` (esqueleto DDD vazio que mentia sobre a arquitetura real router → service → model).
- [x] **E2E de ponta a ponta** (`yarn test:e2e`, Playwright): 14 testes navegador → API → Postgres com a massa do seed — navegação por URL, ciclo da O.S. com baixa de estoque, bloqueio de regra com motivo, relatórios, busca e exportação.

---

# 🚀 Próximos Passos (Roadmap)

## Versão 2 (Aprofundamento Operacional)
- [x] **Geofencing / Cercas Virtuais**: máquina entra/sai de Talhão (trabalho) ou Prédio/oficina (downtime) → estado + alerta. *(SPRINT-01/03, PostGIS)*
- [x] **Gestor de Alertas**: regras de `overspeed`/`rpm_redzone`/`low_fuel` + geofence de oficina; tela de alertas (reconhecer/fechar), **badge** e **toast**, com o **operador (RFID) identificado**. *(SPRINT-04)* — falta só e-mail (adiado).
- [x] **Relatórios (Exportação)**: Jornada de Trabalho e Custos de Manutenção em **Excel e PDF** (Central de Relatórios). *(SPRINT-04)*
- [x] **Histórico de Rotas**: consulta filtrada (frota/operador/período/talhão) + export **Excel/PDF/KML**, mapa e Central de Relatórios. *(SPRINT-05, PostGIS `ST_Contains`)*
- [x] **Relatórios de Performance**: Performance de Máquina (incl. distância km), Ranking de Operadores, Consumo por Hectare e Ocorrências, todos exportáveis. *(SPRINT-06)*
- [x] **WebSockets (tempo real)**: dashboard, telemetria e alertas atualizam ao vivo via WebSocket (`/ws/dashboard`, pub/sub Redis); *polling* só como reconciliação/fallback. *(SPRINT-07)*

## Versão 3 (Integração e BI)
- [x] **Custos de Manutenção (financeiro)**: peças + mão de obra + custo de downtime (horas × taxa/h) por O.S. e por frota. *(SPRINT-03)*
- [x] **Controle de Estoque de Peças**: catálogo com estoque, baixa automática na confirmação da O.S. (com custo calculado) e reposição. *(SPRINT-08)*
- [ ] **Integração ERP**: Webhooks do horímetro (manutenção preventiva) com Totvs/SAP.
- [x] **Geo import/export (drone/GIS)**: **KML** (Google Earth), **Shapefile** (`.zip`, drone) e GeoJSON — import no mapa e export de talhões/fazendas *(Oficina Inteligente)*. Falta só overlay/tempo real mais profundo.
- [x] **Clima / condições climáticas**: temp./chuva/vento por fazenda via **Open-Meteo** + mapa visual opcional (OpenWeatherMap). *(add-on `weather`/`weather_map`)*
- [x] **Alerta no rastreador (Virloc)**: desvio de rota detectado e alertado no painel/app; **downlink físico ao VC07** com plano de spike pronto (`SPIKE_VIRLOC_DOWNLINK.md`) — pendente só a validação do transporte no Flespi.
- [~] **Aplicativo Mobile** (Android + iOS, base única **Expo/React Native**): **produto à parte**, em [`mobile/`](mobile/README.md), com ciclo de release próprio (tags `mobile-vX.Y.Z`). Persona = gestor (dashboard, mapa, alertas com push, aprovar O.S. do celular). Reusa os padrões do web (apiClient/`errorMessage`, SessionProvider, AuthGate/FeatureGate) e o mesmo backend (Bearer JWT, `/ws/dashboard`, feature flags). **F1 pronto** (login + sessão); fases F2–F9 no [plano](mobile/README.md). CI: job `mobile` (eslint + jest) que só dispara em `mobile/**`.
- [ ] **Notificações via WhatsApp**: Alerta automático (API da Meta).

> Legenda: `[x]` feito · `[~]` parcial · `[ ]` pendente.

---

# ▶️ Como Rodar

**Produção / campo (stack completo em containers):**
```bash
cp .env.example .env   # preencha segredos: POSTGRES_*, JWT_SECRET, HMAC_SECRET, FLESPI_TOKEN, ENVIRONMENT=production
docker compose -f docker-compose.prod.yml up -d --build
# sobe postgres + redis + api + frontend; a API roda `alembic upgrade head` no boot.
# Dashboard em http://localhost:3000  ·  API em http://localhost:8000  ·  detalhes e smoke: DEPLOY.md
```

**Desenvolvimento local:**
```bash
# Backend (python-backend/): uvicorn main:app --reload   (precisa de Postgres+PostGIS+Redis; ver docker-compose.yml)
# Migrações: alembic upgrade head        Seed de exemplo: python seed.py
# Frontend (raiz):          yarn dev      (proxia /api/* → 127.0.0.1:8000)
# Qualidade: ruff check python-backend/ · mypy python-backend/ · pytest · yarn lint · yarn test
```

---

# 📋 Padrões de Desenvolvimento

- **Clean Code** & nomenclaturas em Inglês no código, Português nos textos.
- **Arquitetura declarada: `router → service → model`.** A regra de negócio mora em `services/`, **não** no handler HTTP. O router é um tradutor fino: carrega a entidade, chama o serviço, converte **exceção de domínio** em status HTTP e controla a transação (commit). Serviços não fazem commit e não conhecem HTTP. Isso mantém a regra **chamável** por ERP/mobile/jobs e é a costura pela qual um módulo se extrai como serviço próprio no futuro — o rumo da plataforma é microserviços, com a estratégia *monólito modular primeiro, extração por costura depois*. Ver `services/service_orders.py` (ciclo da O.S.), `services/telemetry_ingest.py`, `services/geofencing.py`.
- **Um domínio não importa o interno de outro** — conversa pela função de serviço (hoje) ou pela rede (amanhã).
- **Ingestão via Outbox**: nada de regra de negócio pesada no request de telemetria — o webhook/MQTT grava na fila e o **worker** processa (turnos, geofencing, KPIs) em ordem, com idempotência e DLQ. O worker já é o modelo do primeiro serviço extraído: processo separado, integração assíncrona por fila durável.
- **Schema versionado (Alembic)**: toda mudança de modelo gera migração; um guard-rail de teste (`alembic check`) falha o CI se `models.py` divergir das migrações.
- **ORM SQLAlchemy 2.0** (`Mapped[...]` / `mapped_column`) — tipagem estática de verdade (gate `mypy` no tree inteiro).
- **RBAC**: rotas de gestão protegidas por `require_role(...)`; segredos e origens (CORS) sempre por `.env`.
- **Frontend com rotas reais (App Router)**: cada tela é uma URL (`/dashboard`, `/oficina?tab=os`, `/telemetry?fleet=TR-001`) — link direto, F5 e botão Voltar funcionam. A casca (menu/tema/sessão) vive em `components/shell/` num layout de route group que **não remonta** ao navegar; as páginas de `components/pages/` continuam ignorando que rotas existem, e a fiação fica nos wrappers `app/(app)/*/page.js`. `AuthGate`/`FeatureGate` são gates de **UX** — a autoridade é o backend (RLS/RBAC/403).
- **Gates de qualidade no CI** (bloqueantes): `ruff` + `mypy` + `pytest` (unitário + integração com DB real) no backend; `eslint` + `vitest` + `next build` no frontend.
- **E2E de ponta a ponta** (`yarn test:e2e`, Playwright): navegador real → Next → API → Postgres com a massa do `seed.py`. Cobre o que os outros níveis não veem — navegação por URL, fiação entre rota e página e contrato front↔back. Requer a stack de API no ar e a massa carregada.
- **Contrato de API estável**: o PostGIS é transparente ao frontend — polígonos entram/saem como `[[lat,lng], ...]` (conversão no *boundary*, `services/geo.py`).

---

# 👨‍💻 Autores & Empresa
**PH Soluções em TI**  
*Desenvolvido em parceria com ferramentas modernas de Inteligência Artificial para escala agressiva de código.*

---

# 🔄 Sprints & Updates

## Sprint 03 / Fixes de Foco e UX
- **Migração PostGIS**: Implementação completa de coordenadas geográficas via WKT e validação segura de polígonos.
- **Correções do Mapa (Map Focus)**: Solucionado o crash e melhorado o sistema de foco dinâmico na listagem de fazendas, prédios e talhões, permitindo clicar no nome para focar imediatamente (via `fitBounds`), sem travamentos.
- **Identidade Visual UX**: Integrado o logotipo oficial da marca (Agro Telemetria) com formato adaptado ao painel de navegação (`AppShell`) e página de login (`AuthPage`).
