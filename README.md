# LiveRanking

Ranking ao vivo de equipes para qualquer competição. Suporta várias competições
cadastradas ao mesmo tempo, cada uma com seu próprio nome, etapa, ícone e cor —
a tela pública atualiza sozinha (sem F5) conforme os pontos são lançados no painel
admin, usando o Firebase Realtime Database como camada de sincronização.

Nasceu para o Dev Champions (SENAI), mas foi generalizado para qualquer evento com
equipes disputando pontos em provas/etapas.

## Principais recursos

- Multi-competição: cada competição tem suas próprias equipes, provas e pontuações,
  isoladas das outras.
- Ranking público em tempo real, com pódio animado (top 3) e lista das demais
  posições, sem precisar dar refresh na página.
- Painel admin protegido por login (Firebase Authentication) para cadastrar
  competições, equipes e provas, e lançar pontuação.
- Identidade visual customizável por competição: ícone (biblioteca Lucide) e cor de
  fundo do ícone, sólida ou gradiente, com pré-visualização ao vivo.
- Lançamento de pontos é **cumulativo** (soma ao total já existente da equipe
  naquela prova) e a listagem mostra todas as equipes cadastradas, mesmo com 0
  pontos.
- Desclassificação de equipe com motivo obrigatório: some do pódio/ranking e
  aparece numa seção separada na tela pública, com o motivo visível.
- 100% estático no frontend — sem servidor próprio para manter. Hospedagem pensada
  para o GitHub Pages.

## Stack

- **Vite** + JavaScript puro (sem framework de UI).
- **Firebase Realtime Database** para os dados e sincronização em tempo real.
- **Firebase Authentication** (email/senha) para proteger o painel admin.
- **Lucide** (`lucide-static`) para os ícones das competições, importados
  individualmente via `?raw` (sem carregar a biblioteca inteira).
- **GitHub Actions + GitHub Pages** para build e deploy automáticos.

## Estrutura do projeto

```
liveranking/
  index.html                  # tela pública: seletor de competições + ranking ao vivo
  admin.html                  # painel admin: login, competições, gestão

  src/
    firebase.js                 # único ponto que inicializa o SDK do Firebase
    icons.js                    # conjunto curado de ícones (Lucide)
    theme.css                   # identidade visual (vermelho/preto, gamificado)

    services/                   # camada de dados — só Firebase, zero DOM
      authService.js              login / logout / watchAuthState
      competitionsService.js      watch/create/update/delete de competições
      teamsService.js             watch/add/rename/remove de equipes
      testsService.js             watch/add/rename/remove de provas
      scoresService.js            watch/soma (transação) / zerar pontuação

    ui/                          # camada de apresentação compartilhada — zero Firebase
      badge.js                     ícone + cor/gradiente da competição (HTML/CSS)
      toast.js                     notificação toast

    admin.js                    # orquestrador da tela admin (liga services ↔ DOM)
    ranking.js                  # orquestrador da tela pública (liga services ↔ DOM)

  public/
    favicon.svg                 # favicon (quadrado preto + ponto vermelho)

  .github/workflows/deploy.yml  # build + deploy automático no GitHub Pages
  vite.config.js
  package.json
  .env.example                  # modelo das variáveis de ambiente (sem valores reais)
```

`admin.js` e `ranking.js` nunca chamam o Firebase diretamente — só funções dos
`services/*`. Isso mantém a lógica de acesso a dados isolada da manipulação de
HTML, e cada função tem uma responsabilidade única (ex: `scoresService.addPoints`
encapsula a transação de soma, `teamsService.removeTeam` já limpa os pontos
daquela equipe). Os arquivos maiores (`admin.js`, `ranking.js`, `theme.css`) usam
comentários `// #region Nome` / `// #endregion` pra marcar cada bloco de
responsabilidade — a maioria dos editores (VS Code, WebStorm) reconhece isso e
permite colapsar essas seções.

## Modelo de dados (Firebase Realtime Database)

```
competitions/{competitionId}
  name         -> string
  stage        -> string (opcional, ex: "Qualificatórias", "Semifinal", "Final")
  icon         -> nome do ícone lucide (ex: "trophy")
  iconBg       -> { mode: "solid" | "gradient", color1, color2, angle }
  createdAt    -> timestamp

competitions/{competitionId}/teams/{teamId}
  name                -> string
  createdAt           -> timestamp
  disqualified        -> boolean (opcional, presente só quando desclassificada)
  disqualifiedReason  -> string (opcional, motivo informado na desclassificação)

competitions/{competitionId}/tests/{testId}           -> { name, createdAt }
competitions/{competitionId}/scores/{teamId}/{testId} -> number
```

Cada competição carrega suas próprias equipes, provas e pontuações — o total de
uma equipe é sempre a soma de `scores/{teamId}/*` dentro da competição em que ela
está.

## Como rodar do zero

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior, com npm.
- Uma conta no [Firebase](https://console.firebase.google.com/) (grátis).

### 1. Instalar as dependências

```bash
git clone https://github.com/<seu-usuario>/liveranking.git
cd liveranking
npm install
```

### 2. Criar o projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com/) e
   crie um novo projeto.
2. No menu lateral, vá em **Build > Realtime Database** e clique em
   **Criar banco de dados**.
   - Escolha a localização e inicie em **modo de produção**.
3. Ainda no Realtime Database, vá na aba **Regras** e cole:

   ```json
   {
     "rules": {
       "competitions": { ".read": true, ".write": "auth != null" }
     }
   }
   ```

   Isso deixa a leitura pública (para a tela do ranking funcionar sem login) e a
   escrita liberada só para quem estiver autenticado — a regra vale para toda a
   árvore `competitions`, incluindo equipes/provas/pontos de cada uma. Clique em
   **Publicar**.

4. Vá em **Build > Authentication > Sign-in method** e ative o provedor
   **Email/Senha**.
5. Na aba **Users**, clique em **Add user** e crie a única conta admin (o email e
   a senha que você vai usar para entrar no painel).
6. Volte em **Configurações do projeto** (ícone de engrenagem) > **Seus apps** >
   clique no ícone `</>` para registrar um **Web App** (não marque Firebase
   Hosting). Copie o objeto `firebaseConfig` gerado — vai precisar dele no
   próximo passo.

### 3. Configurar as variáveis de ambiente

As credenciais do Firebase ficam fora do código, em variáveis de ambiente (o
arquivo `.env` não é commitado — está no `.gitignore`).

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
2. Abra `.env` e preencha cada variável com o valor correspondente do
   `firebaseConfig` copiado no passo anterior:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_DATABASE_URL=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

> Nota: essas chaves do Firebase acabam de qualquer forma dentro do JS que roda no
> navegador de quem acessa o site — isso é normal e esperado em apps Firebase
> client-side, a segurança real vem das regras do Realtime Database (passo 2
> acima), não do sigilo da `apiKey`. Usar `.env` aqui é mais sobre não deixar a
> chave "solta" no histórico do git e facilitar trocar/rotacionar depois, não
> sobre escondê-la de quem acessa o site publicado.

### 4. Rodar localmente

```bash
npm run dev
```

- Tela pública: `http://localhost:5173/`
- Painel admin: `http://localhost:5173/admin.html`

## Scripts disponíveis

| Comando           | O que faz                                              |
| ------------------ | ------------------------------------------------------- |
| `npm run dev`     | Sobe o servidor de desenvolvimento com hot reload.       |
| `npm run build`   | Gera o build de produção em `dist/`.                     |
| `npm run preview` | Serve o conteúdo de `dist/` localmente, como em produção.|

## Publicar no GitHub Pages

1. Crie um repositório no GitHub chamado **`liveranking`, tudo minúsculo**
   (o nome precisa bater exatamente com a opção `base` do `vite.config.js` — o
   GitHub Pages é case-sensitive nesse caminho).
2. Configure o remoto e suba o código:
   ```bash
   git remote add origin https://github.com/<seu-usuario>/liveranking.git
   git branch -M master
   git push -u origin master
   ```
3. Em **Settings > Pages** do repositório, em **Build and deployment**, selecione
   **Source: GitHub Actions**.
4. Como o `.env` não vai pro repositório, o build automático do GitHub Actions
   precisa receber as mesmas variáveis como **Secrets** (não "Variables" — são
   abas diferentes na mesma tela). Em **Settings > Secrets and variables >
   Actions**, aba **Secrets**, clique em **New repository secret** e cadastre uma
   por uma, com o mesmo nome de cada linha do seu `.env` (são 7 no total —
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
   `VITE_FIREBASE_APP_ID`).
5. O workflow em [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
   builda o projeto (injetando esses secrets como variáveis de ambiente) e
   publica automaticamente a cada push na branch `master`.
6. Se o repositório tiver um nome diferente de `liveranking`, ajuste a opção
   `base` em [`vite.config.js`](vite.config.js) para `/<nome-do-repo>/` (com a
   mesma capitalização do nome do repositório) e a `branches` do workflow, se sua
   branch padrão não for `master`.

## Como usar

1. No painel admin, a primeira tela é **Suas competições**. Clique em
   **+ Nova competição**: nome, etapa (opcional, ex: "Qualificatórias"), ícone
   (escolhido de uma grade) e cor do fundo do ícone (sólida ou gradiente, com
   pré-visualização ao vivo).
2. Clique em cima da competição na lista para entrar na tela de **gestão** dela —
   é onde ficam as abas **Equipes**, **Provas** e **Lançar pontos**, todas
   escopadas a essa competição.
3. Cadastre as equipes e as provas. Na aba **Lançar pontos**, selecione a prova
   primeiro — a tabela abaixo passa a mostrar todas as equipes com a pontuação
   delas naquela prova (0 se ainda não lançou). Selecione a equipe, digite os
   pontos e clique em **Lançar**: o valor **soma** ao que a equipe já tinha
   naquela prova, o campo de equipe volta a ficar vazio e o de prova continua
   selecionado — pensado pra lançar uma prova inteira, equipe por equipe, em
   sequência. Errou o lançamento? Use o botão **Zerar** na linha da equipe.
4. A tela pública (`index.html`), sem parâmetros, mostra um seletor com todas as
   competições cadastradas. Clicar em uma abre `index.html?c=<id-da-competição>`
   — é esse link que você deixa projetado no evento; ele atualiza sozinho, com
   pódio dos 3 primeiros e animação de troca de posição/pontuação. O botão
   **Ver ranking público** dentro da tela de gestão já abre o link certo da
   competição selecionada.
5. Competições, equipes e provas podem ser renomeadas/editadas ou excluídas a
   qualquer momento.
6. Para desclassificar uma equipe, use o botão **Desclassificar** na aba
   **Equipes** e informe o motivo (obrigatório). A equipe some do pódio e da
   lista de posições na tela pública, e passa a aparecer numa seção separada
   **Equipes desclassificadas**, com nome riscado, selo **Desclassificada** e o
   motivo visível. O botão vira **Requalificar** para reverter a qualquer
   momento.

## Solução de problemas comuns

**A tela do ranking abre em branco / 404 no GitHub Pages, mencionando outro
caminho parecido (ex: `/liveranking/liveranking/...`)**
O navegador está numa URL antiga, com capitalização diferente da configurada em
`base` no `vite.config.js`. Feche a aba e acesse de novo a partir da raiz do
site publicado (ex: `https://<usuario>.github.io/liveranking/`).

**Firebase retorna `permission_denied` ao criar competição/equipe/prova**
As regras do Realtime Database no console do Firebase estão desatualizadas ou
não foram publicadas. Confira o passo 2 de "Como rodar do zero" (regras do
Realtime Database) e clique em **Publicar** depois de colar a regra.

**`git push` recusado com "Updates were rejected... fetch first" no primeiro
push**
Normalmente acontece quando o repositório foi criado no GitHub já com um
`README`, `.gitignore` ou licença marcados — isso gera um commit no remoto que
não existe localmente. Resolva com:
```bash
git pull origin master --allow-unrelated-histories
# resolva o conflito em README.md mantendo o seu conteúdo, depois:
git add README.md
git commit --no-edit
git push -u origin master
```

**O deploy no GitHub Actions falha por falta de credenciais do Firebase**
Os 7 valores do `.env` precisam estar cadastrados como **Secrets** (não
**Variables** — são abas separadas) em Settings > Secrets and variables >
Actions, com o mesmo nome de cada variável. Veja o passo 4 de "Publicar no
GitHub Pages".

## Possível evolução futura

O campo `stage` (etapa) hoje é um texto livre por competição. Se um dia isso
crescer para múltiplas etapas relacionadas (ex: brackets, fases eliminatórias
com equipes avançando entre elas), o caminho natural é trocar
`competitions/{id}.stage` por uma sub-coleção
`competitions/{id}/stages/{stageId}`, mantendo o resto do modelo de dados igual.

---

Powered by mCszao.
