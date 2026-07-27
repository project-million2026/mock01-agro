# Spike — Downlink ao Virloc VC07 (alerta ao operador em campo)

> Status: **plano de descoberta**. Único item pendente do marco Oficina Inteligente (ver
> `MARCO_OFICINA_INTELIGENTE.md` §6). Objetivo: confirmar se dá para **sinalizar o operador no
> próprio rastreador** (buzzer/display/terminal) quando o worker detecta desvio de rota
> (`route_deviation`) e, se sim, **qual o formato do comando** aceito pelo Flespi para o VC07.
> Sem isso o alerta fica só no painel/app (comportamento atual — stub em `services/virloc.py`).

## 0. Pergunta central (o que precisa ser respondido)

> **A pergunta "o VC07 sinaliza o operador?" já está RESPONDIDA = SIM** pela wiki da própria Newtec
> (mirror local — ver §1.5). O VC07 tem **display LCD + teclado**, **saída de áudio 3W (beeps)** e
> **saídas digitais OUT0/OUT1**. O caminho (B) "hardware não sinaliza" caiu. Restam só perguntas de
> **transporte** (como levar o comando XVM até o device via Flespi):

1. ~~O VC07 sinaliza o operador?~~ **SIM** — display (texto), áudio (beep) ou saída digital.
2. **Como o Flespi `newtec` entrega um comando XVM ao device?** (device command REST na
   `commands-queue` × publish MQTT). Existe um comando "raw/custom" que carrega a string XVM?
3. **Qual o `name` + `properties`** desse comando no device-type do VC07 no Flespi.
4. Latência e confirmação de entrega.

**Regra de saída:** escolher o canal (recomendado: **texto no display** via `TSSB`+`TSSC`, mais claro
que beep) e confirmar o formato do comando Flespi → implementar `virloc._send()`.

## 1. O que já temos no código (ponto de partida)

| Recurso | Onde |
|---|---|
| Token + auth REST (`Authorization: FlespiToken <token>`) | `flespi_config.py::get_flespi_headers()`, base `FLESPI_API_BASE = https://flespi.io` |
| Helpers HTTP (httpx async, timeout 10s) | `flespi_routes.py::_flespi_get/_flespi_post/_flespi_patch` |
| Device criado no Flespi por device (`flespi_device_id`) + IMEI (`flespi_ident`) | `models.Fleet.flespi_device_id` / `flespi_ident`; protocolo `newtec` (VC07) |
| Tópico MQTT de mensagens do device | `flespi/message/gw/devices/<device_id>` (uplink, hoje só escutamos) |
| **Gancho do downlink pronto** | `services/virloc.py::notify_deviation()` → `_send()` (stub, gate `VIRLOC_DOWNLINK_ENABLED`) |
| Call-site no worker | `workers/telemetry_worker.py` — dispara em `route_deviation` |
| Devices de teste | `8539920` (ident 0009) e `8592857` (ident 0010) |

> ⚠️ **Token é segredo** (só no `.env`, gitignored). Nada de spike commita token nem cola em issue.

## 1.5 Achados da wiki Newtec (mirror local `public/wiki/pt-br/` — a "Base de Conhecimento" do app)

A wiki do fabricante já responde o essencial. Fontes: `vc7`, `vc7-telas`, `sms-f4` (family F4 =
VL08/VL12/**VC07**).

**O VC07 (Vircom 07) TEM como sinalizar o operador:**
- **Display LCD 128×64 + teclado.** 61 telas programáveis (00–60). Monta-se uma tela com
  `TSSB<idx>{TTXT,<col>,<lin>,<TEXTO EM MAIÚSCULAS>}` e exibe-se com `TSSC<idx>`. Pode ser disparada
  por evento: `SED001 IN07++ +- SGN NN {TSSC03}`. **→ dá para mostrar "DESVIO DE ROTA — CORRIJA" na tela.**
- **Saída de áudio amplificada 3W** — há comandos de padrões de **beep**.
- **Saídas digitais OUT0/OUT1** (coletor aberto, 400 mA) — para buzzer/lâmpada externa.

**Protocolo de comando = XVM.** Formato completo: `CMD;ID=<id>;#<num>;*<checksum>`, onde `num` ∈
`8000..FFFF` e `*XX` é o checksum. Há **modo transparente** (fw ≥ `154B04`) que dispensa o
encapsulamento (envia-se só o comando). Comandos podem ser **concatenados**. Exemplos da wiki:
`QTT;ID=0000;#8000;*4F`, `TSSB00{TTXT,10,00,INICIO NEWTEC}`, `TSSC03`.

**O que a wiki NÃO cobre (fica pro spike):** como o **Flespi** (protocolo `newtec`) empacota esse
comando XVM no downlink — se há um comando "custom/raw" na `commands-queue` que transporta a string,
ou se o Flespi já expõe os comandos XVM nomeados. É a única incógnita real restante.

## 2. Passos do spike (Flespi console + API REST, sem tocar produção)

Fazer com **1 device de teste** (ex.: `8539920`), fora do fluxo de produção.

### Passo 1 — O device-type suporta comandos?
- REST: `GET /gw/devices/<id>/settings` e `GET /gw/channel-protocols/newtec/...` para ver se o
  protocolo `newtec` expõe **commands**. No console: device → aba **Settings/Commands**.
- Alternativa direta: `GET /gw/devices/<device_id>/commands` — se retornar lista de comandos
  disponíveis, o device-type os suporta. Se vier vazio/404, provavelmente **não há downlink** para
  esse protocolo → caminho (B).

### Passo 2 — Achar como o Flespi transporta o comando XVM
- Listar os comandos do device-type (`GET /gw/device-types/<type_id>/commands`) ou ver no console:
  device → aba **Commands / Settings**.
- Procurar um comando **"custom"/"raw"/"send"** que aceite uma **string livre** (é ele que carrega a
  string XVM — ex.: `TSSC03`, ou um `TSSB`+`TSSC` concatenado). Anotar `name` + schema de `properties`.
- Se o Flespi já expõe comandos XVM nomeados (ex.: um "screen"/"text"), melhor ainda — anotar o schema.

### Passo 3 — Enfileirar o comando de texto na tela e observar o VC07
- Pré-condição: existir uma tela com o texto do alerta (ex.: criar `TSSB05{TTXT,00,00,DESVIO DE ROTA}`
  uma vez), OU montar+exibir no mesmo downlink (concatenar `TSSB05{...}` e `TSSC05`).
- REST: `POST /gw/devices/<device_id>/commands-queue` com o comando XVM da tela (via o comando
  "custom/raw" do Passo 2). Ex. de payload (ajustar ao schema real):
  `[{"name": "<custom>", "properties": {"payload": "TSSC05"}}]`.
- **Observar o VC07 físico**: a tela mudou e mostrou o texto? (ou beep/saída, se optar por esses).
  Cronometrar latência. Verificar status na fila (`GET .../commands-queue`).

### Passo 4 — Confirmação de entrega
- Ver se o Flespi reporta `executed`/`delivered` para o comando (campo de status na fila).
- Repetir 2–3× para medir consistência e latência típica.

## 3. Saída esperada do spike (o que documentar aqui ao final)

- [x] VC07 sinaliza o operador? **SIM** — display/áudio/saída digital (wiki §1.5).
- [ ] Canal escolhido: **display (texto)** / áudio / saída digital → `__________`
- [ ] Comando XVM a enviar (ex. texto): `__________` (ex.: `TSSB05{TTXT,00,00,DESVIO DE ROTA}` + `TSSC05`)
- [ ] Comando Flespi que carrega o XVM — `name`: `__________` / `properties` (schema): `__________`
- [ ] Endpoint: `POST /gw/devices/<id>/commands-queue` (confirmar) ou outro.
- [ ] Latência típica: `__________` s; confirmação de entrega: **(sim/não)**.
- [ ] Restrições (rate limit, precisa tela pré-criada, fw mín. p/ modo transparente, etc.).

## 4. Como implementar depois (encaixe já preparado)

`services/virloc.py::_send(fleet_number, message)` já é o único ponto a mexer. Com a saída do spike:

```python
# services/virloc.py (esboço pós-descoberta — NÃO ativar sem os valores do spike)
import httpx
from flespi_config import FLESPI_API_BASE, get_flespi_headers

async def _send(device_id: int, message: str) -> None:
    payload = {"name": VIRLOC_CMD_NAME,           # do Passo 2
               "properties": _build_props(message)}  # do Passo 2/3
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(
            f"{FLESPI_API_BASE}/gw/devices/{device_id}/commands-queue",
            headers=get_flespi_headers(), json=[payload])
        r.raise_for_status()
```

Ajustes ao ativar:
- **Resolver `device_id`:** `notify_deviation` recebe `fleet_number`; buscar `Fleet.flespi_device_id`
  (passar o id pelo call-site do worker, que já tem a sessão de DB, OU um cache fleet→device_id).
- **Assíncrono:** `notify_deviation` hoje é sync; ao ativar, tornar o `_send` async e chamar via
  `asyncio.create_task` best-effort no worker (nunca bloquear a ingestão).
- **Gate:** manter `VIRLOC_DOWNLINK_ENABLED` (default off); adicionar `VIRLOC_CMD_NAME` no `.env`.
- **Dedup:** já garantido — o alerta `route_deviation` só dispara uma vez por entrada em talhão fora
  do plano (via `_maybe_create_alert`), então o downlink não spamma.

## 5. Caminho (B) — improvável (VC07 sinaliza o operador)

A wiki (§1.5) já confirma que o VC07 tem display/áudio/saídas — então (B) só se aplicaria se o
**Flespi** não oferecer nenhum comando que transporte a string XVM até o device (Passo 2 vazio). Nesse
caso: manter `_send()` como stub logado (alerta segue no painel/app + WebSocket, que já funciona) e
avaliar transporte alternativo (SMS via gateway, ou comando por outro canal do device).
