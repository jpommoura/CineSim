# CineSim 🎬

Protótipo de simulação de planejamento de filmes — React + Vite.

## Rodar

```bash
npm install
npm run dev
```

## Funcionalidades
- Filmes com título, sinopse, descrição, universo e até 5 tags
- Séries: episódios agrupados por temporada (S01E01…), cada um com título, sinopse, duração e os próprios atos e cenas
  - dá pra trocar filme ↔ série na aba Detalhes (os atos de um filme viram o S01E01)
  - elenco, orçamento, universo e tags valem pra série inteira
- Atos com cenas dentro (locação, descrição, personagens em cena), reordenáveis
- Personagens com foto opcional (redimensionada automaticamente)
- Atores com cachê, associados a um personagem (1 ator por personagem)
- Orçamento de produção opcional (sem marketing): definir na criação, adicionar depois, alterar ou desligar; mostra quanto o elenco consome (referência: 15–30%)
- Universos para agrupar filmes
- Busca por título/tag e filtro por universo
- Pôster do filme, duração planejada, ano de lançamento e posição na cronologia da história
- Ordenação de filmes: recentes, título, lançamento ou cronologia da história
- Arrastar e soltar atos e cenas (segure a alça ⠿); cenas podem mudar de ato — só com mouse por enquanto
- Minutos por cena, com cobertura em relação à duração planejada
- Valores em dólar (USD)
- Sugestão de cachê opcional (💡 na edição do ator), em 3 camadas:
  - papel → piso (inspirado no mínimo sindical); pesa mais pra ator desconhecido
  - fama → adicional por cima do piso (maior multiplicador); vem dos filmes da pessoa no TMDB
  - orçamento de produção → ajusta o adicional (×0,25 a ×1,5; referência US$ 50 mi) e limita cada cachê a 25% do orçamento
  - valores de referência em `src/utils.js` (`ROLE_FLOOR`, `ROLE_PREMIUM`, `FAME`, `REFERENCE_BUDGET`)
- Exportar / importar backup em JSON (mesclar ou substituir)
- Sincronização na nuvem opcional (MongoDB Atlas): mesmos dados no PC e no celular, protegida por senha
- Sem a nuvem configurada, os dados ficam no `localStorage` do navegador

## Estrutura
```
src/
  App.jsx                 rotas (#/films, #/universes, #/film/:id, #/universe/:id) e estado global
  i18n.jsx                traduções EN / PT-BR
  utils.js                helpers (id, moeda, localStorage, imagem, cachê, ordenação)
  tmdb.js                 busca de atores e fama pela carreira (TMDB)
  cloud.js                chamadas à API /api/data
  sync.js                 merge entre aparelhos (local × nuvem)
  useCloudSync.js         hook de sincronização (envio automático, busca ao voltar pra aba)
  styles.css
  components/
    FilmList.jsx          aba Filmes da página inicial
    FilmCard.jsx          card de filme reutilizável
    FilmEditor.jsx        página do filme (Detalhes, Atos & Cenas, Elenco, Orçamento)
    UniverseDetail.jsx    página do universo (Detalhes, Filmes, Elenco)
    TagInput.jsx          tags (máx. 5)
    ActsEditor.jsx        atos e cenas
    EpisodesEditor.jsx    episódios de séries (cada um usa o ActsEditor)
    CastEditor.jsx        personagens e atores
    BudgetPanel.jsx       simulação de orçamento
    UniverseManager.jsx   aba Universos da página inicial
    ActorSearch.jsx       campo de ator com sugestões do TMDB
    Sync.jsx              indicador de sincronização e tela de senha
api/
  data.js                 API serverless (Vercel) que lê e grava no MongoDB
vite.config.js            plugin que roda a API no `npm run dev`
```

## TMDB (busca de atores)
1. Crie conta em https://www.themoviedb.org e peça uma chave em **Configurações → API**.
2. Copie `.env.example` para `.env` e cole a chave (serve a *API Key* ou o *API Read Access Token*).
3. Reinicie o `npm run dev`.

Uso gratuito apenas para fins não comerciais, com atribuição ao TMDB (o aviso está no rodapé).

## Idioma e tema
- Padrão em inglês; troque para PT-BR no seletor do topo (fica salvo).
- Botão ☀/☾ alterna entre modo escuro e claro.
- Textos ficam em `src/i18n.jsx` — pra adicionar um idioma, crie outro bloco no dicionário e inclua em `LANGS`.

## Sincronização na nuvem (MongoDB Atlas + Vercel)
Os dados ficam no MongoDB e aparecem em qualquer aparelho (PC, celular). Sem isso configurado,
o app funciona igual antes, salvando só no navegador ("💾 Só neste aparelho").

```
Navegador  →  /api/data (função serverless do Vercel)  →  MongoDB Atlas
```

### 1. MongoDB Atlas (grátis)
1. Crie um cluster **M0 (Free)**.
2. **Database Access** → crie um usuário do banco (usuário + senha).
3. **Network Access** → libere `0.0.0.0/0` (o Vercel não tem IP fixo).
4. **Connect → Drivers** (JavaScript + Node.js Driver) → copie a connection string e troque `<db_password>`
   pela senha do **usuário do banco**, sem os `< >`.
   - Perdeu a senha? **Database Access → Edit → Edit Password → Autogenerate**.
   - Evite `@ : / ? # %` na senha — quebram a connection string (use só letras e números).

### 2. Rodar no PC
1. `npm install` (instala o driver `mongodb`).
   - Avisos de *vulnerabilities* vêm de ferramentas de desenvolvimento; **não** rode `npm audit fix --force` (atualiza o Vite e pode quebrar).
   - Se aparecer erro do *esbuild*, rode `npm approve-scripts esbuild` e `npm install` de novo.
2. No `.env`, além do `VITE_TMDB_KEY`, adicione:
   ```
   MONGODB_URI=mongodb+srv://USUARIO:SENHA@...
   APP_PASSWORD=uma_senha_sua
   ```
   - `MONGODB_URI`: connection string do Atlas.
   - `APP_PASSWORD`: senha que **você inventa** pra entrar no app (diferente da senha do banco).
   - Essas duas não têm prefixo `VITE_`, então não vão pro navegador.
3. `npm run dev` — a API roda junto (plugin em `vite.config.js`).
4. Na primeira vez o app pede a `APP_PASSWORD` e envia pra nuvem o que já está no navegador.
5. Deu certo se aparecer **☁ Sincronizado** no topo.

### 3. Publicar no Vercel
1. Suba as alterações pro GitHub (o `.env` não vai, está no `.gitignore`):
   ```bash
   git add .
   git commit -m "mensagem"
   git push
   ```
2. Em vercel.com → **Add New → Project** → importe o repositório (ele detecta Vite + a pasta `api/`).
3. Antes do deploy, em **Environment Variables**, cadastre `VITE_TMDB_KEY`, `MONGODB_URI` e `APP_PASSWORD`
   (mesmos valores do `.env`). Depois dá pra mudar em **Settings → Environment Variables** — e precisa de um novo deploy.
4. **Deploy**. Cada `git push` seguinte atualiza o site sozinho.

## Acessar pelo celular
- **Pelo Vercel (recomendado):** abra o link do deploy (`cinesim-xxx.vercel.app`) e digite a `APP_PASSWORD`.
  Funciona de qualquer lugar, mesmo com o PC desligado. A senha fica lembrada no aparelho.
- **Pela rede de casa (só pra testar):** com o celular no mesmo Wi-Fi e o PC ligado:
  ```bash
  npm run dev -- --host
  ```
  Abra no celular o endereço da linha **Network** (ex.: `http://192.168.0.15:5173`).
  Se não abrir, permita o acesso em redes privadas no Firewall do Windows.
- Sem a nuvem, dá pra levar os dados com **⬇ Exportar** no PC e **⬆ Importar** no celular.
- Limitação: arrastar e soltar cenas ainda não funciona no toque.

### Como funciona
- Cada edição é enviada ~1 s depois; ao voltar pra aba/app, ele busca as novidades de outros aparelhos.
- Sem internet, as mudanças ficam no aparelho e sobem quando a conexão volta.
- Se o mesmo item for editado em dois aparelhos antes de sincronizar, vale a versão do aparelho que sincronizar por último.
- Arquivos: `api/data.js` (servidor), `src/cloud.js` (chamadas), `src/sync.js` (merge), `src/useCloudSync.js` (hook).
- Indicador no topo: ☁ Sincronizado · ⟳ Salvando… · ⚠ Offline (clique pra tentar de novo) · 💾 Só neste aparelho · 🔒 Bloqueado.
- O Atlas gratuito pausa o cluster depois de 30 dias **sem nenhuma conexão** (dá pra reativar no painel).
