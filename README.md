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
- Orçamento de elenco opcional: definir na criação, adicionar depois, alterar ou desligar
- Universos para agrupar filmes
- Busca por título/tag e filtro por universo
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
