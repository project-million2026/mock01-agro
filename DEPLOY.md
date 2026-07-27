# DEPLOY — AgroTelemetry (SPRINT-01, teste de campo)

Runbook para subir o backend no servidor Ubuntu cru e validar com o VC07 real
(Flespi Device **8539920**). Segue `.agents/workflows/deploy.md` e os gates G5/G7/G9.

## 0. Pré-requisitos no servidor

```bash
# Ubuntu — instalar Docker + Compose plugin
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # relogar após este comando
docker compose version          # confirmar plugin compose
```

## 1. ⚠️ Segurança primeiro — ROTACIONAR o token Flespi

O token antigo foi commitado no repositório (`docker-compose.yml` e `testes/local-layer`),
portanto está **comprometido no histórico do git**. Antes de subir:

1. No painel Flespi → Tokens → **revogar** o token antigo e **gerar um novo**.
2. Colocar o novo token apenas no `.env` (nunca no compose/repo).
3. (Opcional, recomendado) limpar o histórico com `git filter-repo`/BFG e forçar push.

## 2. Configurar segredos

```bash
git clone <repo> && cd Project-Agro
cp .env.example .env
# Edite .env: senha forte do Postgres, JWT_SECRET/HMAC_SECRET aleatórios,
# FLESPI_TOKEN novo, FLESPI_DEVICE_IDS=8539920, ENVIRONMENT=production
python3 - <<'PY'   # gera segredos aleatórios
import secrets; print("JWT_SECRET=", secrets.token_urlsafe(48)); print("HMAC_SECRET=", secrets.token_urlsafe(48))
PY
```

> Em `ENVIRONMENT=production`, a API **falha no boot** se `JWT_SECRET`/`HMAC_SECRET` estiverem
> default (guarda de segurança S1 em `core/config.py`).

## 3. Subir a stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps      # postgres/redis/api/frontend 'healthy'
```

Sobe o **stack completo**: `postgres` + `redis` + `api` (FastAPI REST/WS) + **`worker`** (ingestão
MQTT + processamento do Outbox, processo dedicado — SPRINT-10/M5; a API sobe com
`RUN_MQTT=0`/`RUN_WORKER=0`) + `frontend` (dashboard Next.js) + **`proxy`** (nginx, porta **80**).
O worker paraleliza por dispositivo (`WORKER_CONCURRENCY`, default 8). A partir da SPRINT-07 **o browser
acessa só o `proxy`** (`http://<host>/`), que roteia `/api` e **`/ws`** (WebSocket do dashboard em
tempo real) → `api:8000` e todo o resto → `frontend:3000`. Isso resolve o WebSocket (o rewrite do
Next **não** encaminha upgrade de WS) e centraliza o proxy REST na mesma origem — sem CORS entre
front e back e sem expor a API publicamente.

> **Tempo real (WebSocket):** em produção o cliente usa a **mesma origem** (`/ws/dashboard` via
> nginx) — não precisa de configuração extra. **Em desenvolvimento** (Next em `:3000`, API em
> `:8000`, sem nginx), defina `NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000` no ambiente do frontend, pois
> o rewrite do Next não encaminha WebSocket. Se servir sob TLS, use `wss://` e um certificado no nginx.

A imagem `timescale/timescaledb-ha:pg16` traz **TimescaleDB + PostGIS**. No boot, o container `api`
roda **`python scripts/prod_bootstrap.py`** (como DONO, via `ALEMBIC_DATABASE_URL`) antes do `uvicorn`:
aplica `alembic upgrade head` (schema + papéis) e define LOGIN/senha de `agro_app`/`agro_worker`. A
API também cria as extensões e converte `telemetry_events` em hypertable (idempotente).

> **RLS ativo (multi-tenant — F2.2b):** a partir deste ponto a **API conecta como `agro_app`**
> (NÃO-superuser → o Row-Level Security por organização+fazenda é aplicado de verdade; um cliente não
> consegue ler/escrever dados de outra org nem pelo front) e o **worker como `agro_worker`**
> (BYPASSRLS — processo de sistema). O DONO (`POSTGRES_USER`/`agro_admin`) é usado **só** por migração
> e bootstrap. Defina **`AGRO_APP_PASSWORD`** e **`AGRO_WORKER_PASSWORD`** no `.env` (senhas fortes e
> distintas) — o `prod_bootstrap` as aplica aos papéis a cada start (idempotente); o compose monta as
> URLs de runtime a partir delas. Se as trocar, basta reiniciar o `api` (reaplica) e o `worker`.

> **Acesso de fora?** A entrada pública é o `proxy` na porta **80** (`http://<host>/`). Para
> internet/domínio, ponha um TLS na frente (ou adicione um certificado ao `nginx.conf`) e sirva em
> `https`/`wss`; adicione o domínio a `CORS_ORIGINS` no `.env`. As portas `3000` (frontend) e `8000`
> (api) publicadas no host servem só para debug local e podem ser fechadas em produção.

### Atualizações subsequentes (deploy sobre banco já existente)

Como o `api` roda o `prod_bootstrap` (migração + senhas dos papéis) no próprio start, um `docker
compose up -d --build` normal já aplica migrações pendentes e reafirma os papéis automaticamente —
sem passo manual. Para rodar uma migração isolada (debug) como DONO sem reiniciar o container:
`docker compose -f docker-compose.prod.yml exec -e DATABASE_URL="$ALEMBIC_DATABASE_URL" api alembic
upgrade head` (ou simplesmente reinicie o `api`).

## 4. Verificação de saúde (smoke)

```bash
curl -s http://localhost:8000/health          # {"status":"online",...}
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/           # dashboard: 200
# Proxy do frontend chega na API (resposta do FastAPI, não 404 do Next):
curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"x","password":"y"}'            # {"detail":"Email ou senha incorretos"} (401)
# Migrações aplicadas:
docker exec agro_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "select version_num from alembic_version;"   # 0004 (ou a head atual)
# Extensões criadas:
docker exec agro_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "select extname from pg_extension where extname in ('timescaledb','postgis');"
# Hypertable:
docker exec agro_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "select hypertable_name from timescaledb_information.hypertables;"
```

## 5. Ligar o device real (MQTT primário)

O listener conecta em `mqtt.flespi.io` usando o `FLESPI_TOKEN` e assina os `FLESPI_DEVICE_IDS`.
Com o VC07 8539920 publicando, os eventos devem aparecer:

```bash
docker compose -f docker-compose.prod.yml logs -f api | grep -iE "flespi|mqtt|worker"
# Eventos gravados:
docker exec agro_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "select time, device_id, engine_rpm, fuel_consumed, ignition from telemetry_events order by time desc limit 5;"
# Fila Outbox drenando (pending deve tender a 0; dead deve ser 0):
docker exec agro_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "select status, count(*) from telemetry_outbox group by status;"
```

Alternativa de teste sem device (simulador):
```bash
curl -s -X POST http://localhost:8000/api/telemetry/simulate -H 'Content-Type: application/json' -d '{"count":20}'
```

## 6. Critérios de aceite (campo)

- `/health` OK; extensões `timescaledb` + `postgis` presentes; hypertable criada.
- Eventos reais do 8539920 em `telemetry_events` com `fuel_consumed`, `engine_load`, `digital_inputs`, `server_timestamp`.
- Outbox drena (`pending→0`, `dead=0`); reinício da API **não perde** eventos enfileirados (fila é durável no Postgres).
- Passar RFID abre turno em `shifts`; desligar/trocar fecha; ordenação por `timestamp` mantém turnos corretos com pacotes offline.
- Entrar no talhão → estado `work`; entrar na oficina → `maintenance_downtime` + alerta `maintenance_question`.
- Dashboard: `/api/dashboard/stats` mostra fila real; `/api/dashboard/machine-states` mostra estado processado.

## 7. Rollback

```bash
docker compose -f docker-compose.prod.yml down            # mantém volumes (dados)
# voltar versão anterior:
git checkout <tag-anterior> && docker compose -f docker-compose.prod.yml up -d --build
```
Dados persistem nos volumes `pgdata`/`redisdata`. Ver `.agents/workflows/rollback.md`.

## 8. Operação

- Logs estruturados (loguru JSON) no stdout dos containers.
- Vigiar DLQ: `select count(*) from telemetry_outbox where status='dead';` — deve ser 0.
- O `worker` já é um serviço dedicado (ingestão MQTT + processamento). Paralelismo por dispositivo
  via `WORKER_CONCURRENCY` (default 8). A `api` sobe com `RUN_MQTT=0`/`RUN_WORKER=0` — **não** processa.

## 9. Dois ambientes: Homologação + Produção

Mesma stack (`docker-compose.prod.yml`), `.env` próprio por servidor. **Fluxo:** merge em `main` →
deploy **homologação** → smoke → deploy **produção**. Ver `.agents/migration/10_DEPLOYMENT_PLAN.md`.

**Banco:** Postgres roda **em container no próprio VPS** (imagem `timescaledb-ha` traz TimescaleDB +
PostGIS). Não usar Postgres gerenciado sem confirmar as duas extensões (o gerenciado da Hostinger
não tem TimescaleDB).

### 9.1 Exposição de portas (hardening já no compose)
Só o **proxy nginx** é público (`80`/`443`). `postgres` (5432), `api` (8000) e `frontend` (3000)
ficam em **`127.0.0.1`** — acesso de fora só por **túnel SSH** (ex.: `ssh -L 5432:127.0.0.1:5432 user@host`).

### 9.2 Firewall (produção)
```bash
ufw default deny incoming && ufw default allow outgoing
ufw allow 22/tcp        # SSH (idealmente restrito por IP/VPN)
ufw allow 80,443/tcp    # proxy nginx
ufw enable              # 5432/6379/8000/3000 NÃO são abertos — ficam internos
```
Homologação atrás da **VPN**: pode manter só `:80` (sem TLS público).

### 9.3 TLS (produção pública)
1. Emitir cert: `certbot certonly --standalone -d SEU_DOMINIO` (pare o proxy no :80 durante a emissão).
2. Copiar `fullchain.pem`/`privkey.pem` para `./certs/`.
3. **Descomentar** o bloco `server { listen 443 ssl; ... }` no `nginx.conf` (e, se quiser forçar
   HTTPS, trocar o corpo do `server :80` por `return 301 https://$host$request_uri;`).
4. `docker compose -f docker-compose.prod.yml restart proxy`. Renovação: cron do certbot + restart.

### 9.4 Backup do banco (produção)
```bash
# Dump diário (cron) + cópia off-site; testar restore periodicamente.
docker exec agro_postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backup_$(date +%F).sql.gz
```

### 9.5 Recursos (2 vCPU / 8 GB)
Redis limitado a 256 MB (no compose). O `timescaledb-tune` da imagem auto-dimensiona o Postgres pela
RAM. Suficiente para a fase de campo e ~100 máquinas (ver `.agents/migration/09_INFRA_CAPACITY_AND_OPTIONS.md`).

## 10. ⚠️ Painel admin do sistema (F3) — BLOQUEADOR pré-produção

O painel (`/sys-admin` na UI; `/api/sys-admin` na API) gerencia **todas as organizações** com um papel
**BYPASSRLS** (`agro_sysadmin`). Hoje ele tem **apenas login e-mail+senha** — **IP-allowlist e MFA/TOTP
ainda NÃO estão implementados** (fatia 2). Portanto:

> **NÃO exponha `/api/sys-admin` à internet sem antes restringir o acesso.** Enquanto a fatia 2 (IP-allowlist
> no app + MFA/TOTP + rate-limit) não entra, use a mitigação interina no **nginx**: descomente o bloco
> `location /api/sys-admin/` em `nginx.conf` e libere só o(s) IP(s) da sua **VPN/escritório** (`allow ...; deny all;`).
> Idealmente, acesse o painel **só via VPN** (o ambiente de homologação já fica atrás de VPN).

Checklist antes de usar o painel em produção:
- [ ] `AGRO_SYSADMIN_PASSWORD` e `SYSADMIN_JWT_SECRET` fortes e aleatórios no `.env` (o boot já exige o 2º).
- [ ] Bloco `location /api/sys-admin/` do `nginx.conf` **descomentado** com os IPs liberados (ou acesso só por VPN).
- [ ] 1º admin do sistema criado: `docker compose -f docker-compose.prod.yml exec api python scripts/create_sysadmin.py "Nome" email@dominio 'senha-forte'`.
- [ ] **Pendente (fatia 2):** IP-allowlist no app + **MFA/TOTP** + rate-limit — recomendado antes de operação real.

## 11. Clima (Open-Meteo)

Módulo de clima por fazenda (feature `weather`). Usa a **Open-Meteo** — busca sob demanda com cache
Redis (TTL `WEATHER_CACHE_TTL`, ~1h). A localização vem do centroide do polígono da fazenda ou do
override manual (`weather_lat/lon`, definível na própria tela). Nenhuma infra nova: reaproveita o
Redis existente.

> [!IMPORTANT]
> **Licença.** O tier **free** da Open-Meteo é **exclusivo para uso não-comercial / dev / homologação**
> e exige atribuição CC BY 4.0 (a UI já exibe "Weather data by Open-Meteo.com"). Para **produção
> comercial** (clientes pagando), assine o plano (~$29/mês) e no `.env` aponte
> `OPEN_METEO_BASE_URL=https://customer-api.open-meteo.com/v1/forecast` + `OPEN_METEO_API_KEY=...`.
> **O código não muda** — só as duas variáveis. Sem key, o consumo fica muito abaixo do limite free
> (10k/dia) graças ao cache.

Checklist para produção comercial:
- [ ] Assinar o plano pago da Open-Meteo e preencher `OPEN_METEO_BASE_URL` + `OPEN_METEO_API_KEY` no `.env`.
- [ ] Manter a atribuição visível (já incluída na tela de Clima).

### 11.1 Mapa de clima (add-on visual opcional — feature `weather_map`)

Camada **visual** (estilo Windy) sobreposta ao mapa Leaflet das fazendas, usando **tiles da
OpenWeatherMap** (Weather Maps 1.0, incluído no free): temperatura, precipitação, nuvens, vento,
pressão. É um **add-on opcional**, separado do relatório de clima:
- **Habilitar por cliente:** `FEATURES_EXTRA=weather_map` no `.env` (ou plano `enterprise`, que já leva).
  Sem o add-on, a aba **Mapa** nem aparece e o backend recusa (403) a sessão de tiles.
- **Chave OWM:** cadastro gratuito em `home.openweathermap.org/api_keys` → `OPENWEATHER_API_KEY` no
  `.env`. A key é servida **só pelo backend** (proxy `/api/weather/tiles`, autenticado por token curto
  assinado); **nunca vai ao browser**. Sem key, a aba Mapa avisa que falta configurar.
- **Rate limit:** tiles são globais (não-tenant) e cacheados no Redis (`WEATHER_TILE_CACHE_TTL`),
  compartilhados entre orgs/usuários → consumo muito abaixo do free da OWM (60/min, 1M/mês).

> [!NOTE]
> Diferente do Open-Meteo, o **free da OpenWeatherMap permite uso comercial** (1M chamadas/mês). O
> gargalo prático some com o cache de tiles.
