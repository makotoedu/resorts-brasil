# Verificação

O projeto tem três camadas de verificação. Elas não são redundantes: cada uma
pega uma classe de problema que as outras deixam passar.

---

## 1. Build e paridade de URLs

```bash
npm run build
```

Gera as 40 páginas e roda a purga de CSS. As URLs geradas precisam ser
idênticas às do site original — o site tem histórico de indexação e qualquer
mudança de caminho exigiria redirect 301 no [`vercel.json`](../vercel.json).

Para conferir a paridade contra o site pré-refatoração:

```bash
git ls-tree -r --name-only 74fc1fd | grep '\.html$' | sort > /tmp/antes.txt
(cd dist && find . -name '*.html' | sed 's|^\./||' | sort) > /tmp/depois.txt
diff /tmp/antes.txt /tmp/depois.txt
```

---

## 2. Suíte comportamental

```bash
npm run verify          # precisa de um preview rodando
```

[`tests/verify-behaviors.mjs`](../tests/verify-behaviors.mjs) exercita num
navegador real os comportamentos que o [`site.js`](../src/scripts/site.js)
reimplementou depois da remoção do jQuery: menu mobile, seletor de idioma, hero
(Ken Burns e legendas), carrossel de logos, contadores, abas, aviso de cookies e
voltar ao topo. Também verifica ausência de erros de console em 6 páginas dos
3 idiomas.

**Montado não é funcionando.** A verificação do Ken Burns conferia que o `<div>`
existia e que a classe de animação estava aplicada — e passou durante todo o
tempo em que o zoom não acontecia, porque a camada estava atrás do fundo do
slide. Hoje ela compara o hero consigo mesmo com 1,5 s de intervalo e exige que
os pixels mudem; sem a correção, a variação medida é **0,00**. Ao testar um
efeito, teste o efeito, não o andaime.

**Um teste que passava sem testar nada.** A verificação do carrossel comparava o
`innerHTML` do primeiro filho logo depois do `goto` e de novo 2s depois. Só que o
`site.js` embrulha cada item num `.polo-carousel-item` ao inicializar, então a
primeira leitura pegava o item cru e a segunda o embrulhado: o valor mudava com
o carrossel completamente parado. Hoje o teste espera o embrulho existir, compara
o `src` do logo visível e espera passar de uma volta de autoplay. Ao escrever um
teste de "mudou", confira **de que mudança** ele está falando.

Antes de rodar, suba o preview e ajuste a constante `BASE` do arquivo para a
porta correta:

```bash
npx astro preview --port 4330
```

Se a porta pedida estiver ocupada, o Astro sobe em outra e avisa só no log — vale
conferir antes de concluir que uma rota quebrou.

**Uma armadilha já encontrada aqui:** o CSS do tema usa `transition: all 0.2s`
em vários elementos. Medir `getComputedStyle` logo após um clique devolve o
valor **interpolado no meio da transição**, não o estado final. Um teste do
seletor de idioma falhou por isso e o código estava certo — a correção foi
esperar 400 ms antes de medir.

---

## 3. Diff visual — a que realmente importa

```bash
# terminal 1: o site original
rm -rf /tmp/original && mkdir -p /tmp/original
git archive 74fc1fd | tar -x -C /tmp/original
cd /tmp/original && python -m http.server 4340

# terminal 2: o build atual
npx astro preview --port 4330

# terminal 3
node tests/visual-diff.mjs
```

[`tests/visual-diff.mjs`](../tests/visual-diff.mjs) compara screenshots de
página inteira das **40 páginas em 3 viewports** (390, 768 e 1440 px) entre o
site original e o build atual — 120 comparações. Divergências acima de 0.5% dos
pixels geram um PNG do diff em `tests/visual-diff/`.

O script congela animações, transições e os elementos que mudam entre execuções,
para não gerar falso positivo:

- o **aviso de cookies**, que entra por timer;
- o **rodapé**, cujo ano passou a ser dinâmico de propósito;
- o **carrossel de logos**, que gira sozinho e nunca para — qual logo está em
  qual posição depende do instante do screenshot, nos dois sites. Ele fica
  `hidden`, não removido: a caixa continua ocupando espaço, então a altura da
  página e tudo abaixo continuam sendo comparados. A geometria das células, que
  é o que podia de fato regredir, está coberta pela verificação
  *carrossel: geometria das células* na suíte comportamental.

Leva cerca de 15 minutos. **Rode sempre que mexer em CSS.**

Para reconferir um grupo sem pagar a varredura inteira, as duas listas aceitam
filtro por variável de ambiente:

```bash
PAGES=/index.html,/ebook.html VIEWPORTS=desktop node tests/visual-diff.mjs
```

Só não confunda a rodada filtrada com a completa: o `N/120` do resumo passa a ser
`N/2`. Antes de dar algo por pronto, rode sem filtro.

### Por que esta camada existe

Durante a refatoração, a remoção do jQuery quebrou a responsividade da grade de
logos: os resorts renderizavam a 38×38 px em vez de 124×124 em tablet e mobile.
A causa está descrita em [decisoes.md](decisoes.md#a-armadilha-bodybreakpoint-).

**A suíte comportamental passou 14/14 durante todo esse tempo.** Ela verifica
estados pontuais — uma classe foi aplicada, um elemento ficou visível, um
contador chegou ao alvo — e nada disso muda quando a grade inteira colapsa de 3
colunas para 6.

Foi o diff visual que pegou, e só porque tinha sido escrito por desconfiança de
uma purga que havia removido 91.6% do CSS.

A lição: **teste de comportamento não substitui verificação de layout.**

---

### Como diagnosticar uma página reprovada

O PNG do diff diz *onde* diverge, não *por quê*, e ler a imagem inteira engana.
O que funcionou foi comparar as **caixas dos elementos** nos dois sites, casando
por conteúdo (tag + classe + texto) em vez de caminho no DOM — o caminho não
serve, porque o build novo embrulha tudo num `<main>` que o original não tem.

Listando só os pontos em que a diferença de `y` **muda**, a origem aparece
sozinha: dezenas de elementos deslocados viram um punhado de causas. Foi assim
que `hr.space` 10px curto, o `<h1>` no lugar do `<h2>` e o offset de -120px em
vez de -80px apareceram, cada um em uma linha de saída.

Vale sempre medir nas mesmas condições do diff (congelar animações, rolar a
página até o fim e voltar, esperar assentar). Medir sem isso produz fantasmas: um
"deslocamento de 160px" no hero da home era só o `animate__fadeInUp` no meio da
transição.

Para regras responsivas, meça nas **bordas** das faixas (575/576, 767/768,
1024/1025, 1199/1200) e não só nos três viewports do diff. Um erro de faixa
acerta nos extremos e se esconde no meio.

---

## Armadilhas de interpretação

Três coisas que já induziram a erro na leitura dos resultados:

- **Código de saída não é resumo.** Confira sempre a linha
  `N/120 comparacoes identicas` no fim da saída, e não só o exit code.
- **Contar tags no HTML gera falso positivo.** Uma comparação de contagem de
  elementos entre o HTML antigo e o gerado acusou duas páginas divergentes; os
  elementos "faltantes" estavam **dentro de um comentário HTML** que o Astro
  remove do output. Ao comparar markup, remova os comentários antes.
- **Altura total igual não é layout igual.** As páginas do ebook fechavam com
  +1px de diferença no desktop enquanto o conteúdo inteiro estava fora de lugar:
  um topbar de 41px a mais e um deslocamento de 40px a menos quase se anulavam.
  O percentual de pixels é que denunciou.

---

## Antes de promover para produção

1. As três camadas acima, limpas — ou com cada divergência explicada por escrito.
2. Conferência manual do que os números não mostram: abrir `/associados` a
   768 px e confirmar a grade em 3 colunas com os logos a ~124 px.
3. Deploy de preview na Vercel antes de promover.
