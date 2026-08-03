# LiveRanking

Ranking ao vivo de equipes para qualquer competição (nasceu para o Dev Champions do
SENAI, mas hoje suporta várias competições cadastradas, cada uma com seu próprio
ícone, cor e conjunto de equipes/provas). A tela pública (`index.html`) atualiza
sozinha conforme os pontos são lançados no painel admin (`admin.html`), usando o
Firebase Realtime Database.

## Stack

- **Vite** + JavaScript puro (sem framework).
- **Firebase Realtime Database** para os dados (competições, equipes, provas,
  pontuações) e sincronização em tempo real.
- **Firebase Authentication** (email/senha) para proteger o painel admin.
- **Lucide** (`lucide-static`) para os ícones das competições.
- **GitHub Pages** para hospedar o frontend (build estático, sem servidor próprio).

## Modelo de dados

```
competitions/{competitionId}
  name         -> string
  stage        -> string (opcional, ex: "Qualificatórias", "Semifinal", "Final")
  icon         -> nome do ícone lucide (ex: "trophy")
  iconBg       -> { mode: "solid" | "gradient", color1, color2, angle }
  createdAt    -> timestamp

competitions/{competitionId}/teams/{teamId}      -> { name, createdAt }
competitions/{competitionId}/tests/{testId}      -> { name, createdAt }
competitions/{competitionId}/scores/{teamId}/{testId} -> number
```

Cada competição carrega suas próprias equipes, provas e pontuações — o total de uma
equipe é sempre a soma de `scores/{teamId}/*` dentro da competição em que ela está.

## 1. Criar o projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com/) e crie um novo projeto.
2. No menu lateral, vá em **Build > Realtime Database** e clique em **Criar banco de dados**.
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
   árvore `competitions`, incluindo equipes/provas/pontos de cada uma.

   > Se você já tinha as regras antigas (`teams`, `tests`, `scores` na raiz, de
   > antes das competições existirem), pode substituir tudo por essa regra nova —
   > os nós antigos ficam órfãos e sem uso, dá pra apagá-los manualmente na aba
   > **Dados** do Realtime Database se quiser limpar.

4. Vá em **Build > Authentication > Sign-in method** e ative o provedor **Email/Senha**.
5. Na aba **Users**, clique em **Add user** e crie a única conta admin (o email e a
   senha que você vai usar para entrar no painel).
6. Volte em **Configurações do projeto** (ícone de engrenagem) > **Seus apps** > clique
   no ícone `</>` para registrar um **Web App**. Copie o objeto `firebaseConfig` gerado.

## 2. Configurar o projeto

As credenciais do Firebase ficam em variáveis de ambiente, fora do código (o arquivo
`.env` não é commitado — está no `.gitignore`).

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
2. Abra `.env` e preencha cada variável com o valor correspondente do `firebaseConfig`
   copiado no passo anterior:
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
> client-side, a segurança real vem das regras do Realtime Database (passo 3 acima),
> não do sigilo da `apiKey`. Usar `.env` aqui é mais sobre não deixar a chave "solta"
> no histórico do git e facilitar trocar/rotacionar depois, não sobre escondê-la de
> quem acessa o site publicado.

Instale as dependências:

```bash
npm install
```

Rode localmente:

```bash
npm run dev
```

- Tela pública: `http://localhost:5173/`
- Painel admin: `http://localhost:5173/admin.html`

## 3. Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex: `liveranking`, tudo minúsculo) e faça o push deste projeto.
2. Em **Settings > Pages** do repositório, em **Build and deployment**, selecione
   **Source: GitHub Actions**.
3. Como o `.env` não vai pro repositório, o build automático do GitHub Actions
   precisa receber as mesmas variáveis como **Secrets**. Em **Settings > Secrets and
   variables > Actions > New repository secret**, crie um secret para cada linha do
   seu `.env` (mesmo nome, ex: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   etc — são 7 no total, o workflow já está preparado para lê-los).
4. O workflow em [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builda
   o projeto (injetando esses secrets como variáveis de ambiente) e publica
   automaticamente a cada push na branch `master`.
5. Se o repositório tiver um nome diferente de `liveranking`, ajuste a opção `base`
   em [`vite.config.js`](vite.config.js) para `/<nome-do-repo>/` (o valor precisa
   bater exatamente, com a mesma capitalização, com o nome do repositório).

## Uso

1. No painel admin, a primeira tela é **Suas competições**. Crie uma competição:
   nome, ícone (escolhido de uma grade de ícones) e cor do fundo do ícone (sólida
   ou gradiente, com pré-visualização ao vivo).
2. Clique em **Gerenciar** na competição para entrar na tela de gestão dela —
   é onde ficam as abas **Equipes**, **Provas** e **Lançar pontos**, exatamente como
   antes, só que agora escopadas a essa competição.
3. Cadastre as equipes e as provas, e conforme cada prova terminar, use a aba
   **Lançar pontos** para registrar a pontuação de cada equipe.
4. A tela pública (`index.html`) sem parâmetros mostra um seletor com todas as
   competições cadastradas (ícone + nome). Clicar em uma abre
   `index.html?c=<id-da-competição>` — é esse link que você deixa projetado no
   evento; ele atualiza sozinho, sem precisar dar F5, com pódio dos 3 primeiros e
   animação de troca de posição/pontuação. O botão **Ver ranking público** dentro
   da tela de gestão já abre o link certo da competição selecionada.
5. Lançamentos podem ser corrigidos a qualquer momento na tabela da aba **Lançar
   pontos** (editar valor e Salvar, ou Excluir). Competições, equipes e provas também
   podem ser renomeadas/editadas ou excluídas a qualquer momento.
