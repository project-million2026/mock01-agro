# 🚜 Agro Telemetria (PH Soluções em TI)

Uma plataforma web fullstack para gerenciamento e monitoramento de máquinas agrícolas através de telemetria, utilizando dispositivos embarcados (como o VC07) para coleta de dados operacionais, localização, identificação de operadores e controle de manutenção.

O projeto foi concebido e reestruturado para ser escalável, utilizando o ecossistema moderno do Next.js (App Router) tanto para o Frontend quanto para a API Backend, desenhado no padrão MVC para processar dezenas de eventos simultâneos de telemetria com alta resiliência.

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

A plataforma foi unificada (Fullstack) usando o Next.js, abandonando microsserviços pesados em estágio inicial e focando em máxima agilidade e padronização. Utilizamos um padrão **MVC Moderno**:
- **Views (`app/` e `components/`)**: Interfaces do usuário com ShadCN/UI e Tailwind.
- **Controllers (`app/api/`)**: Roteadores de requisições RESTful que lidam com permissão e payload.
- **Services (`lib/services/`)**: Camada de regras de negócio estritas.
- **Models / Repositories (`lib/repositories/`)**: Camada de abstração e query pro Banco de Dados.

```text
Máquina / VC07
      │
      ▼ (4G - HTTP/JSON)
      │
Next.js API Gateway (App Router)
      │
      ├── Validação (Auth) e Controllers
      ├── Camada de Serviços (Service Layer)
      └── Fila de Processamento Background (Simuladores/Processos de longo tempo)
                │
                ▼
      MongoDB (Banco de Dados Principal)
```

---

# ⚙ Stack Tecnológica

## Core (Fullstack)
- **Next.js 15 (App Router)**
- **React 19**
- **Node.js** (API Backend)

## Frontend & UI
- **TailwindCSS** (Estilização base)
- **ShadCN / UI** (Componentes Radix acessíveis)
- **Leaflet / React-Leaflet** (Mapas de rotas e posições)
- **Lucide React** (Ícones)
- **Chart.js** (Dashboards)

## Backend & Infra
- **MongoDB** (Persistência, séries temporais de rastreamento)
- **Redis & BullMQ** (Gerenciamento de filas assíncronas)
- **PM2** (Gestão de processos em produção VPS Ubuntu)

---

# 📚 O Que Já Foi Implementado (MVP & Versão Atual)

- [x] **Base Arquitetural**: Padrão MVC unificado, Services genéricos e Handlers unificados.
- [x] **Segurança e Login**: Controle de Sessão e Auth no Next.js middleware.
- [x] **Wiki Embutida**: Conversão total da antiga base SCADA para a aba "Wiki", rodando 100% nativa sem dependência externa.
- [x] **Dashboard Operacional**: Visão geral de frotas ativas, contagem de equipamentos, alertas de conexão, mapa em tempo real de posições.
- [x] **CRUDs de Cadastros**: Máquinas (com definição de próxima manutenção), Operadores (com tag RFID), Fazendas, Talhões (polígonos em mapa) e Prédios.
- [x] **API de Telemetria (Ingressão)**: Endpoint protegido para receber eventos em JSON com dados CAN e GPS.
- [x] **Visualização de Histórico de Rota**: Plotagem precisa da linha percorrida pelo veículo no mapa usando Leaflet.
- [x] **Telemetria CAN Visual**: Cards em tempo real sobre RPM, Combustível, Ignição, Velocidade e Horímetro atual.
- [x] **Controle de Jornada Automatizado**: O sistema corta e encerra os tempos de trabalho com base na Ignição (Ligada/Desligada) e leitura do RFID do Operador.
- [x] **Simulador de Frotas**: Script embarcado para gerar dados e testar posições randômicas com cálculos complexos.

---

# 🚀 Próximos Passos (Roadmap)

## Versão 2 (Aprofundamento Operacional)
- [ ] **Geofencing / Cercas Virtuais**: Disparar eventos quando a máquina entrar/sair de um Talhão ou Prédio.
- [ ] **Gestor de Alertas**: Avisos por tela (Notificações toast) ou e-mail caso velocidade seja ultrapassada, nível de combustível despenque ou RPM atinja a faixa vermelha.
- [ ] **Relatórios (Exportação)**: Exportar a "Jornada de Trabalho" para PDF/Excel para faturamento ou gestão de RH.
- [ ] **WebSockets**: Atualização do "Dashboard" sem necessidade de pooling HTTP a cada 5 segundos (Performance++).

## Versão 3 (Integração e BI)
- [ ] **Integração ERP**: Webhooks para comunicação do horímetro (disparo de manutenção preventiva) com sistemas Totvs/SAP.
- [ ] **Controle de Manutenção e Estoque**: Módulo para baixa de peças de máquinas diretamente na plataforma.
- [ ] **Aplicativo Mobile**: Versão focada em React Native/Expo para os donos da fazenda operarem e lerem dashboards via celular nativo.
- [ ] **Notificações via WhatsApp**: Alerta automático quando trator quebrar usando API da Meta.

---

# 📋 Padrões de Desenvolvimento Mantidos

- **Clean Code** & Nomenclaturas em Inglês nas variáveis/código, Português nos Textos.
- **Repository Pattern**: Qualquer *find* ou *insert* é feito obrigatoriamente pelas classes da pasta `repositories`.
- **Service Layer**: Nenhuma regra de negócio é feita dentro da rota HTTP (API). Tudo passa pela pasta `services`.
- **Documentação de Métodos**: Padrão de comentários JSDoc identificando operações MVC CRUD ([CREATE], [READ], [UPDATE], [DELETE]).

---

# 👨‍💻 Autores & Empresa
**PH Soluções em TI**  
*Desenvolvido em parceria com ferramentas modernas de Inteligência Artificial para escala agressiva de código.*
