# CineSim 🎬

Protótipo de simulação de planejamento de filmes — React + Vite.

## Rodar

```bash
npm install
npm run dev
```

## Funcionalidades
- Filmes com título, sinopse, descrição, universo e até 5 tags
- Atos com cenas dentro (locação, descrição, personagens em cena), reordenáveis
- Personagens com foto opcional (redimensionada automaticamente)
- Atores com cachê, associados a um personagem (1 ator por personagem)
- Orçamento de produção opcional (sem marketing): definir na criação, adicionar depois, alterar ou desligar; mostra quanto o elenco consome (referência: 15–30%)
- Universos para agrupar filmes
- Busca por título/tag e filtro por universo
- Pôster do filme, duração planejada, ano de lançamento e posição na cronologia da história
- Ordenação de filmes: recentes, título, lançamento ou cronologia da história
- Arrastar e soltar atos e cenas (segure a alça ⠿); cenas podem mudar de ato
- Minutos por cena, com cobertura em relação à duração planejada
- Valores em dólar (USD)
- Sugestão de cachê opcional (💡 na edição do ator), em 3 camadas:
  - papel → piso (inspirado no mínimo sindical); pesa mais pra ator desconhecido
  - fama → adicional por cima do piso (maior multiplicador); vem dos filmes da pessoa no TMDB
  - orçamento de produção → ajusta o adicional (×0,25 a ×1,5; referência US$ 50 mi) e limita cada cachê a 25% do orçamento
  - valores de referência em `src/utils.js` (`ROLE_FLOOR`, `ROLE_PREMIUM`, `FAME`, `REFERENCE_BUDGET`)
- Exportar / importar backup em JSON (mesclar ou substituir)
- Dados salvos no `localStorage` do navegador

## Estrutura
```
src/
  App.jsx                 rotas (#/films, #/universes, #/film/:id, #/universe/:id) e estado global
  i18n.jsx                traduções EN / PT-BR
  utils.js                helpers (id, moeda, localStorage, imagem)
  styles.css
  components/
    FilmList.jsx          aba Filmes da página inicial
    FilmCard.jsx          card de filme reutilizável
    FilmEditor.jsx        página do filme (Detalhes, Atos & Cenas, Elenco, Orçamento)
    UniverseDetail.jsx    página do universo (Detalhes, Filmes, Elenco)
    TagInput.jsx          tags (máx. 5)
    ActsEditor.jsx        atos e cenas
    CastEditor.jsx        personagens e atores
    BudgetPanel.jsx       simulação de orçamento
    UniverseManager.jsx   aba Universos da página inicial
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
4. **Connect → Drivers** → copie a connection string e troque `<db_password>` pela senha do usuário.

### 2. Rodar no PC
1. `npm install` (instala o driver `mongodb`).
2. No `.env`, além do `VITE_TMDB_KEY`, adicione:
   ```
   MONGODB_URI=mongodb+srv://USUARIO:SENHA@...
   APP_PASSWORD=uma_senha_sua
   ```
3. `npm run dev` — a API roda junto (plugin em `vite.config.js`).
4. Na primeira vez o app pede a `APP_PASSWORD` e envia pra nuvem o que já está no navegador.

### 3. Publicar no Vercel
1. Importe o repositório do GitHub no Vercel (ele detecta Vite + a pasta `api/`).
2. **Settings → Environment Variables**: `MONGODB_URI`, `APP_PASSWORD` e `VITE_TMDB_KEY`.
3. Deploy. No celular, abra o link e digite a senha (fica lembrada no aparelho).

### Como funciona
- Cada edição é enviada ~1 s depois; ao voltar pra aba/app, ele busca as novidades de outros aparelhos.
- Sem internet, as mudanças ficam no aparelho e sobem quando a conexão volta.
- Se o mesmo item for editado em dois aparelhos antes de sincronizar, vale a versão do aparelho que sincronizar por último.
- Arquivos: `api/data.js` (servidor), `src/cloud.js` (chamadas), `src/sync.js` (merge), `src/useCloudSync.js` (hook).
- O Atlas gratuito pausa o cluster depois de 30 dias **sem nenhuma conexão**.
