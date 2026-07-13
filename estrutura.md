# Arquitetura e Estrutura do Projeto (Agro Telemetria)

Este documento descreve a arquitetura do projeto **Agro Telemetria**, mapeando os arquivos e diretórios de acordo com os princípios do padrão de arquitetura de software **MVC (Model-View-Controller)** e detalhando as responsabilidades de cada componente para facilitar a manutenção por outros desenvolvedores.

O projeto é dividido em um **Backend em Python (FastAPI)** e um **Frontend em JavaScript (Next.js/React)**, orquestrados através de contêineres Docker.

---

## 1. Visão Geral da Arquitetura (Padrão Adaptado)

Como o projeto utiliza tecnologias modernas de desenvolvimento web (API RESTful + SPA/SSR Frontend), o padrão MVC clássico se divide entre o Backend e o Frontend:

*   **Model (Modelo):** Fica inteiramente no Backend. Gerencia os dados, a lógica de negócios, as validações e a comunicação com o banco de dados (PostgreSQL).
*   **Controller (Controlador):** Também reside principalmente no Backend, através das rotas da API (endpoints) que processam as requisições, interagem com os Models e retornam as respostas (JSON). Alguns controladores de UI residem no frontend para lidar com os estados e requisições à API.
*   **View (Visão):** Fica inteiramente no Frontend (Next.js). Responsável por apresentar os dados (consumidos da API) e capturar as interações do usuário.

---

## 2. Estrutura do Backend (Python / FastAPI)

Localizado no diretório: `/python-backend/`

### 2.1 Models (Modelos e Esquemas)
Responsáveis pela estrutura dos dados, integração com o banco de dados e validações.

*   **`python-backend/models.py` (Database Models - SQLAlchemy)**
    *   **Função:** Mapeia as tabelas do banco de dados relacional (PostgreSQL). Define os relacionamentos e tipos de dados.
    *   **Principais Entidades:** `User`, `Fleet` (Frotas), `Operator` (Operadores), `Farm` (Fazendas), `Field` (Talhões), `Building` (Prédios/Silos), `TelemetryData` (Dados brutos do rastreador).
    *   **Destaque:** As entidades possuem colunas de integração externa (ex: `flespi_ident`, `flespi_device_id` em `Fleet`).
*   **`python-backend/schemas.py` (Data Transfer Objects - Pydantic)**
    *   **Função:** Validação de dados (Input/Output). Garante que os dados que entram no Controller (criação/atualização) e que saem para a View (respostas JSON) tenham a tipagem e formato corretos.
    *   **Exemplos:** `FleetCreate`, `FleetOut`, `TelemetryPayload`.
*   **`python-backend/database.py` (Configuração)**
    *   **Função:** Configuração da string de conexão com o banco de dados e criação da sessão do SQLAlchemy.

### 2.2 Controllers (Controladores e Rotas)
Responsáveis por receber as requisições HTTP, aplicar a lógica de negócios e responder para o Frontend.

*   **`python-backend/routes.py` (Controlador Principal REST)**
    *   **Função:** Contém a lógica de CRUD (Create, Read, Update, Delete) de todas as entidades principais.
    *   **Métodos e Lógica:** Métodos HTTP (GET, POST, PUT, DELETE) que conversam com o `models.py` para salvar ou recuperar informações do banco e enviam o resultado (serializado via `schemas.py`) de volta à View.
    *   **Responsabilidades extras:** Rotas de autenticação (Geração de Token JWT) e lógica de autorização (verificação de sessão).
*   **`python-backend/flespi_routes.py` (Controlador de Integração Flespi)**
    *   **Função:** Isola as regras de negócio de integração bidirecional (via API REST) com a plataforma Flespi.
    *   **Métodos Principais:** 
        *   `create_flespi_device()`: Acionado na criação/atualização de uma frota; vai até a Flespi e provisiona o hardware rastreador.
        *   `delete_flespi_device()`: Remove do Flespi quando a frota é excluída do sistema.
        *   Obtenção dos tipos de dispositivos e status da conexão.
*   **`python-backend/mqtt_client.py` (Controlador Assíncrono - Worker)**
    *   **Função:** Diferente dos controllers HTTP, este arquivo atua como um ouvinte contínuo (Listener) do broker MQTT da Flespi.
    *   **Lógica:** Consome as mensagens recebidas pela telemetria física, formata os dados e insere automaticamente no Model (`TelemetryData`) e no Redis (para cache de última posição).

### 2.3 Outros Componentes
*   **`python-backend/main.py`**
    *   **Função:** Ponto de entrada (Entrypoint) da aplicação FastAPI. Orquestra a montagem das rotas, middleware (CORS) e dispara tarefas de background (como o `mqtt_client.py`).

---

## 3. Estrutura do Frontend (Next.js / React)

Localizado no diretório raiz e nos diretórios `/app/` e `/components/`.

### 3.1 Views (Visões e Interface)
Responsáveis por tudo que o usuário enxerga e interage.

*   **`/app/page.js` (Roteador e Layout Principal)**
    *   **Função:** Atua como o *Shell* (estrutura) da aplicação. Contém a barra lateral de navegação (Sidebar), o cabeçalho superior e o controle de estado para alternar entre as telas (SPA - Single Page Application).
    *   **Lógica de UI:** É onde o menu lateral é renderizado e as páginas (Dashboard, Telemetria, etc.) são montadas (`import dynamic`).
*   **`/components/pages/` (Views Específicas)**
    *   **Função:** Cada arquivo aqui representa uma "página" ou "módulo" dentro do sistema.
    *   **`CrudPage.js`:** Uma *View genérica* e reutilizável, responsável por construir formulários e tabelas dinâmicas para listar/editar registros de Frotas, Operadores, Fazendas, etc. Recebe as colunas via *props*.
    *   **`TelemetryPage.js`:** View dedicada a mostrar o mapa interativo, a posição em tempo real e desenhar o histórico de rotas dos tratores.
    *   **`DashboardPage.js`:** View responsável pelos gráficos, KPIs e indicadores gerenciais do sistema.
    *   **`FieldsPage.js`:** View focada no gerenciamento espacial, onde o usuário desenha os talhões agrícolas (polígonos).
*   **`/components/ui/` (Design System / Componentes Base)**
    *   **Função:** Pequenos blocos de construção reutilizáveis da interface visual (Botões, Modais, Inputs, Tabelas, Selects), baseados na biblioteca Shadcn/UI e Tailwind CSS.

### 3.2 Lógica do Frontend (Fetchers e Hooks)
Embora as regras de negócio rígidas fiquem no backend, o Frontend possui lógicas de comunicação (os *Clients* dos Controllers).

*   **`/lib/apiClient.js`**
    *   **Função:** Serviço centralizado responsável por conversar com o Backend. Anexa automaticamente o Token JWT nas requisições, lida com os cabeçalhos JSON e padroniza as respostas de sucesso ou erro (via exceções). Qualquer arquivo da View que precisa salvar dados ou listar tabelas, invoca as funções do `apiClient`.

---

## 4. Banco de Dados e Infraestrutura

A infraestrutura é configurada como código (IaC) visando escalabilidade e rápida implantação.

*   **`docker-compose.yml`**
    *   **PostgreSQL (`agro_postgres`)**: O banco de dados relacional persistente (Models da aplicação).
    *   **Redis (`agro_redis`)**: Banco de dados em memória utilizado para troca rápida de informações (Cache da última posição das frotas, garantindo que o mapa carregue instantaneamente sem onerar o PostgreSQL).
    *   **Backend API (`agro_python_api`)**: O contêiner rodando o servidor Python (Uvicorn).
*   **Banco de Dados (Relacional)**: 
    *   O Schema é gerado automaticamente pelo SQLAlchemy via `metadata.create_all()`.
    *   As chaves estrangeiras (`farm_id`, `fleet_number`, etc) garantem a integridade relacional.

---

## 5. Fluxo de Dados (Exemplo Prático: Cadastro de Frota)

Para ilustrar o padrão arquitetural em ação, eis o que acontece ao cadastrar uma nova Frota:

1.  **View (Frontend):** O usuário preenche os campos no formulário renderizado pelo `CrudPage.js` e aperta "Salvar".
2.  **Lógica Client:** O Frontend intercepta o envio e usa o `apiClient.js` para despachar um HTTP POST `/api/fleets`.
3.  **Controller (Backend):** O `routes.py` (FastAPI) recebe o POST.
4.  **Validação:** Os dados recebidos passam pelo schema `FleetCreate` (`schemas.py`), validando regras (ex: tipo de dados, campos obrigatórios).
5.  **Regra de Negócio (Flespi):** Se a frota possuir um IMEI (`flespi_ident`), o controller chama o método do Flespi (`flespi_routes.py`) que aciona a API externa para aprovisionar o dispositivo no servidor deles.
6.  **Model (Backend):** O controller transfere os dados validados para o `models.Fleet` e comanda o banco a persistir os dados no PostgreSQL (`db.add()`, `db.commit()`).
7.  **Resposta:** O controller retorna sucesso (HTTP 200). A **View** recebe a resposta, fecha o modal, dispara uma notificação visual (Toast) e pede uma nova listagem à API para atualizar a tabela na tela.
