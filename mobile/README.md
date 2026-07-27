# Agro Telemetria — App Mobile

App **Android + iOS com base única** (Expo + expo-router + JavaScript), voltado ao **gestor**:
dashboard, mapa, alertas (com push) e aprovação de O.S. pelo celular. É **produto à parte** do
web — mesmo repositório (`mobile/`), mas ciclo de release próprio (tags `mobile-vX.Y.Z`).

## Rodar em dev (Expo Go, sem build)

1. Backend no ar (na raiz do repo): `docker compose -f docker-compose.prod.yml -f docker-compose.demo.yml up -d` e `python-backend/seed.py` para a massa de teste.
2. Descubra o **IP do PC** na Wi-Fi (`ipconfig` no Windows) — o celular precisa alcançar o backend.
3. `cp .env.example .env` e ajuste `EXPO_PUBLIC_API_URL=http://<IP-do-PC>:8000`
   (NÃO use `localhost`: no celular, `localhost` é o próprio aparelho).
4. `yarn install` e `yarn start`. Abra o **Expo Go** no aparelho (mesma Wi-Fi) e leia o QR.

Login da massa de teste: `admin@telemetria.com` / `admin`.

## Qualidade

```bash
yarn lint    # eslint-config-expo (flat)
yarn test    # jest-expo — inclui a paridade do errorMessage com o web
```

O CI roda `lint` + `test` no job `mobile` (dispara só quando `mobile/**` muda). O bundle é validado
com `npx expo export` (empacota sem aparelho). O `expo-doctor` reporta uma duplicata benigna de
`react` porque o app vive dentro do repo do web — o `metro.config.js` isola a resolução no
`mobile/node_modules` (o `expo export` prova que compila corretamente).

## Estrutura

- `app/` — rotas (expo-router). `login.js` (fora do grupo protegido) + `(app)/` (protegido por `AuthGate`), com abas **Início** e **Ajustes**.
- `src/api/client.js` — cliente REST; `errorMessage` idêntico ao web (conexão × regra × técnico) + interceptor 401. `endpoints.js` centraliza os paths.
- `src/auth/` — `storage` (token no SecureStore), `SessionProvider` (user/features/**plan**/login/logout), `AuthGate`.
- `src/hooks/useDashboard.js` — **offline-lite**: hidrata do último snapshot (AsyncStorage) e revalida por trás; falha de rede → mantém dados com faixa "dados de HH:MM".
- `src/ui/` — `Screen` (pull-to-refresh), `KpiCard`, `AlertCard` (read-only na Home; ação é F4), `Banner`, `SectionLabel`, `haptics`.
- `src/theme.js` — paleta escura alinhada ao web.

## Roadmap (fases)

F0 fundação · F1 login/sessão · **F2 dashboard+offline (atual)** · F3 mapa+tempo real · F4 alertas ·
F5 O.S. (marco MVP em Expo Go) · F6 push (backend) · F7 dev build+push · F8 E2E Maestro · F9 produção.
Contas pagas (Apple/Google) e TLS só a partir da F7/F9.
