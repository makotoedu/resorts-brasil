# Verificação

O projeto tem três camadas de verificação. Elas não são redundantes: cada uma
pega uma classe de problema que as outras deixam passar.

---

## 1. Build e paridade de URLs

```bash
npm run build
```

Gera as 40 páginas, roda a purga de CSS e confere o subset de fontes
(`check-glifos.mjs`). As URLs geradas precisam ser
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
(Ken Burns e legendas), carrossel de logos, contadores, abas e voltar ao topo.
Mais duas famílias que não são do jQuery — o consentimento e os glifos do subset
— descritas adiante. Também verifica ausência de erros de console em 6 páginas
dos 3 idiomas.

**Montado não é funcionando.** A verificação do Ken Burns conferia que o `<div>`
existia e que a classe de animação estava aplicada — e passou durante todo o
tempo em que o zoom não acontecia, porque a camada estava atrás do fundo do
slide. Hoje ela compara o hero consigo mesmo com 1,5 s de intervalo e exige que
os pixels mudem; sem a correção, a variação medida é **0,00**. Ao testar um
efeito, teste o efeito, não o andaime.

**Abrir não é ir para o lugar certo.** A verificação do seletor de idioma
checava que o menu abria, ficava opaco e clicável — e passava enquanto o
seletor mandava para a home do outro idioma em vez da tradução da página atual.
Quem estava em `/historia` e trocava para inglês caía em `/en-us/home` e perdia
a página. Hoje há duas verificações do **destino**: uma numa página com
tradução, outra na 404, que não tem e precisa cair na home.

**Um teste que passava sem testar nada.** A verificação do carrossel comparava o
`innerHTML` do primeiro filho logo depois do `goto` e de novo 2s depois. Só que o
`site.js` embrulha cada item num `.polo-carousel-item` ao inicializar, então a
primeira leitura pegava o item cru e a segunda o embrulhado: o valor mudava com
o carrossel completamente parado. Hoje o teste espera o embrulho existir, compara
o `src` do logo visível e espera passar de uma volta de autoplay. Ao escrever um
teste de "mudou", confira **de que mudança** ele está falando.

**O que sai pela rede, e não o que aparece na tela.** A verificação antiga do
aviso de cookies media só o cosmético — a faixa aparece, some, grava um cookie —
e passava 3/3 enquanto o GTM disparava antes de qualquer escolha e "Recusar" não
recusava nada. Hoje o teste intercepta as requisições e exige **zero** contato
com `googletagmanager`, `google-analytics`, `analytics.google` e `doubleclick`
antes da decisão; depois, confere que aceitar carrega o container, que recusar
não carrega, e que aceitar só "Desempenho" deixa `ad_storage` em `denied`.
Mesma ideia para os vídeos: nenhum contato com o YouTube antes do clique.

**Glifo: pinte no canvas, não meça a largura.** A verificação do subset compara o
bitmap de cada codepoint com o de um codepoint sabidamente ausente da mesma
família. Tofu é idêntico para qualquer codepoint que falte, então bitmaps iguais
significam glifo perdido.

Duas tentativas anteriores não serviram, e vale registrar para ninguém repetir:

| tentativa | por que falha |
|---|---|
| medir a largura | o tofu ocupa 1em, e vários ícones também — `info-circle` e `dot-circle` dão os mesmos 100px que a caixa vazia |
| `document.fonts.check()` | no Chromium responde `true` para codepoint ausente: verifica se a família carregou, não se ela tem o glifo |

Conferido de propósito: com o subset antigo no lugar, a verificação reprova
nomeando `chevron-right` e `dot-circle`.

**Uma armadilha nova, de ordem de camadas.** A faixa de cookies agora aparece sem
atraso e, sendo `position: fixed` com `z-index` 999, cobre o canto do
`#scrollTop` (z-index 199). O teste do voltar-ao-topo passou a decidir antes de
rolar a página. O encontro **não é regressão** — mesma CSS do original, onde o
atraso de 2 s só escondia o problema do teste.

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

A refatoração fechou em **120/120 idênticas**, sem nenhuma divergência aceita. A
progressão até lá foi 20 → 57 → 65 → 77 → 103 → 120, e cada salto correspondeu a
uma causa raiz — todas descritas em [decisoes.md](decisoes.md).

### O valor de referência hoje é 93/120

A terceira passagem (agosto/2026) acrescentou 24 divergências às 3 anteriores.
Todas são **mudança pedida**, e nenhuma vem de fontes ou de consentimento:

| comparações | o que mudou | por quê |
|---|---|---|
| 9 — `resorts-brasil`, 3 idiomas × 3 viewports | fachada no lugar do `<iframe>` | 4,6% a 6,7%, tudo dentro do retângulo do vídeo |
| 6 — `ebook`, 3 idiomas × mobile e desktop | idem | 0,54% a 0,89%, rente ao limiar; o tablet fecha idêntico nos 3 idiomas |
| 9 — as 3 políticas de privacidade × 3 viewports | tabela de cookies reescrita | a antiga descrevia outro site; a nova é menor (−608 a −1541px) |

**As duas partes que mais mexeram no site não movem um pixel**, e isso foi
conferido em rodada própria antes de seguir: o subset de fontes e o Google Fonts
fecharam **117/120**, o valor de referência anterior, sem uma única divergência
nova. Subset preserva as métricas de avanço, e `display=swap` não muda o estado
assentado que o diff mede.

O consentimento inteiro — faixa nova, terceiro botão, painel de categorias,
botão de revogar no rodapé — **também não move pixel**, por construção:
`.modal-strip` é `position: fixed` e o `FREEZE` do diff já esconde
`.cookie-notify` e `.copyright-content`.

#### O que a fachada dos vídeos custa, e o que não custa

Os 4,6%–8,4% ficam **dentro do retângulo do vídeo**; o resto de cada página fecha
idêntico. A fachada não tem como coincidir com o player do YouTube, que desenha
barra de título, botão de compartilhar e o selo "Assista no YouTube".

Duas medições que valem a pena registrar, porque a intuição errou nas duas:

- **`object-fit: cover`, não `contain`.** A suposição era que o player
  letterboxava o vídeo na caixa 1,65:1. Comparando as duas capturas lado a lado,
  ele **sangra até as bordas**. O `contain` chegou a ser tentado: piorou o
  enquadramento e não melhorou o diff.
- **O `<iframe>` original era inline.** Um `<div>` block no lugar dele não cria
  caixa de linha, e as 6 páginas encolhiam **7px** — o espaço do descendente da
  fonte. Resolvido com `display: inline-block` no `.yt-facade`. Sem isso, o
  deslocamento de 7px contaminava tudo abaixo do vídeo e inflava o percentual.

`/ebook.html` fecha em 0,55% no mobile e 0,88% no desktop, e **idêntica no
tablet**: o vídeo dele tem `controls=0`, então o player original desenha bem
menos cromo para a fachada ter de imitar.

A fachada é um `<a>` com `href` de verdade, não um `<button>` — sem JavaScript um
botão aqui não faria nada e o visitante ficaria sem o vídeo. Trocar o elemento
não moveu um pixel: as cinco comparações fecharam nos mesmos percentuais.

### O valor de referência anterior era 117/120

O refino de 20/08/2026 manteve 120/120 em tudo o que era SEO, acessibilidade e
extração de dados — nada daquilo move um pixel em repouso. Depois disso,
**correções de conteúdo pedidas pelo cliente** mudam o layout de propósito:

| comparação | o que mudou | por quê |
|---|---|---|
| `/en-us/join-us` mobile (−144px) | 2 logos de parceiro a menos | a lista inglesa tinha 10, a portuguesa 8; o cliente confirmou que a portuguesa é a correta |
| `/en-us/join-us` tablet (−197px) | idem | idem |
| `/en-us/board` mobile (−23px, 6.42%) | cargos traduzidos | "Chair of the Board" cabe em 1 linha onde "Presidente do Conselho" ocupava 2, e "Vice President of Human Intelligence" em 2 onde o português ocupava 3 |

Qualquer número menor que **93/120** é regressão; qualquer divergência fora das
27 listadas também é.

Nos dois casos a divergência **só aparece onde o texto reflui**. `/en-us/join-us`
fecha idêntica no desktop, porque 10 e 8 logos ocupam as mesmas duas linhas numa
grade de 6 colunas; `/en-us/board` fecha idêntica no tablet e no desktop, onde os
cargos cabem na mesma quantidade de linhas nos dois idiomas. É o mesmo padrão das
faixas de `body.breakpoint-*`: **a divergência se esconde num viewport e aparece
em outro.**

A saída do Wyndham Gramado do carrossel da home, feita na mesma leva, **não**
gera divergência: o carrossel fica `hidden` durante o diff e é de uma linha só,
então um logo a menos não muda altura nenhuma. Conferido nas três homes.

### O limiar de 0,5% deixa passar mudança de texto

Este número merece atenção porque contraria a intuição de que "o diff é o juiz".

A página `/es-es/directorio` teve **os seis cargos trocados de português para
espanhol** e mesmo assim entrou na conta como idêntica. Medido:

| viewport | altura | pixels diferentes | veredito |
|---|---|---|---|
| mobile | 4466 → 4466 | 0,235% | passa |
| tablet | 5303 → 5303 | 0,145% | passa |
| desktop | 2393 → 2393 | 0,160% | passa |

O texto mudou, mas coube na mesma quantidade de linhas — a altura não mexeu e a
área alterada é pequena demais para o limiar. Para comparação, `/diretoria`, onde
nada mudou, fica entre 0,016% e 0,045%: esse é o piso de ruído de antialiasing.

Duas consequências práticas:

1. **Para trabalho de tradução, o diff visual não serve de detector.** Ele pega o
   que empurra layout, não o que troca palavra. Confira o texto no HTML gerado.
2. **Um número entre 0,05% e 0,5% não é ruído** — é mudança real que passou. Se
   quiser investigar uma página específica, meça o percentual em vez de confiar
   no veredito binário.

Para reconferir um grupo sem pagar a varredura inteira, as duas listas aceitam
filtro por variável de ambiente:

```bash
PAGES=/index.html,/ebook.html VIEWPORTS=desktop node tests/visual-diff.mjs
```

Só não confunda a rodada filtrada com a completa: o `N/120` do resumo passa a ser
`N/2`. Antes de dar algo por pronto, rode sem filtro.

### Uma camada 0, para não pagar 15 minutos à toa

Ao mexer em markup — extrair um componente, trocar um bloco — compare antes o
**HTML gerado**, que custa segundos:

1. guarde o `dist/` de antes (`cp -r dist /tmp/antes`);
2. rebuild;
3. para cada página, normalize espaço em branco, ignore os atributos que não
   afetam layout (`href`, `alt`, `rel`, `target`, `aria-*`) e compare a
   sequência de tags, classes e texto.

A vantagem não é só velocidade: o diff de pixel diz *que a página mudou*, este
diz *qual tag* mudou. Na extração de `src/data/` ele apontou em segundos as duas
omissões que o olho não pegaria — os 11 `<div class="line">` entre estados e os
`</div>` de fechamento do carrossel engolidos por um recorte largo demais.

Use-o para chegar ao diff visual já sabendo que a árvore está igual. O diff
visual continua sendo o juiz: só ele pega o que muda sem mudar o HTML.

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

## 4. Rede, à mão

O que a suíte automatiza vale confirmar uma vez com os olhos, nos três idiomas,
com o navegador limpo:

1. DevTools aberto na aba Network, `Disable cache`, cookies apagados.
2. Carregar a home. **Nenhuma requisição para `googletagmanager.com`,
   `google-analytics.com`, `doubleclick.net` ou `youtube.com`.** O
   `fonts.googleapis.com` continua aparecendo — é a decisão registrada em
   [decisoes.md](decisoes.md).
3. Aceitar. O `gtm.js` aparece, e o cookie `rb_consent` fica com `a:1|p:1`.
4. Clicar num vídeo em `/resorts-brasil`. Só então aparece
   `youtube-nocookie.com`.
5. Rodapé → "Preferências de cookies": o painel reabre com a escolha salva.

---

## Antes de promover para produção

1. As três camadas acima, limpas — ou com cada divergência explicada por escrito.
2. Conferência manual do que os números não mostram: abrir `/associados` a
   768 px e confirmar a grade em 3 colunas com os logos a ~124 px.
3. A conferência de rede da camada 4.
4. Conferir que `/webfonts/` está sendo servido com a query de versão em vigor —
   o `immutable` é de um ano, e uma fonte trocada sem trocar a query fica presa
   no cache de quem já visitou.
5. Deploy de preview na Vercel antes de promover.
