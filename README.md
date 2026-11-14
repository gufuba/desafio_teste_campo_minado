# Desafio de Teste — Campo Minado

Casos de teste em **JavaScript (Jest)** para um Campo Minado com tabuleiro **18 x 14 e 40 bombas**.
Desenvolvido com TDD: primeiro os testes (commit `test:`, falhando), depois a implementação
(commit `feat:`).

## Colaborador

- **Gustavo Fumagalli** — [@gufuba](https://github.com/gufuba)

## Especificação do desafio

- Casos de teste para testar o **Campo Minado de tabuleiro 18 x 14 com 40 bombas**.
- Casos de teste em **JavaScript** para testar **JavaScript**.

### Interpretação adotada

| Item | Decisão |
|---|---|
| Tamanho | **18 colunas x 14 linhas** (252 células) |
| Bombas | **40**, sorteadas sem repetição |
| Primeira jogada | As bombas só são sorteadas na primeira jogada: a célula aberta **e as 8 vizinhas nunca têm bomba** (a primeira jogada sempre abre uma região) |
| Célula com 0 bombas vizinhas | Abre as vizinhas em **cascata** (flood fill), sem abrir células marcadas com bandeira |
| Vitória | Todas as células **sem bomba** abertas |
| Derrota | Abrir uma bomba; todas as bombas são reveladas |
| Bandeiras | Marcam/desmarcam células fechadas; o contador (`40 - bandeiras`) pode ficar negativo |
| Jogo encerrado | Depois de vitória ou derrota, jogar lança `Error('Jogo encerrado')` |

## Como executar

```bash
npm install
npm test        # roda os testes com relatório de cobertura (exige 100%)
```

Requer Node.js 18 ou superior.

## Estrutura

```text
src/campoMinado.js        # classe CampoMinado (regras do jogo)
tests/campoMinado.test.js # casos de teste (Jest)
tests/helpers.js          # gerador pseudoaleatório com semente, para testes reprodutíveis
```

### API usada pelos testes

```js
const jogo = new CampoMinado();            // 18 x 14, 40 bombas, estado 'aguardando'
jogo.revelar(linha, coluna);               // abre a célula
jogo.alternarBandeira(linha, coluna);      // marca/desmarca bandeira
jogo.celula(linha, coluna);                // { bomba, aberta, bandeira, explodida, vizinhas }
jogo.bandeirasRestantes();                 // bombas - bandeiras
jogo.estado;                               // 'aguardando' | 'jogando' | 'vitoria' | 'derrota'

new CampoMinado({ posicoesBombas: [[0, 0]] });   // bombas fixas (testes determinísticos)
new CampoMinado({ aleatorio: minhaFuncao });     // gerador aleatório injetável
```

## Funcionamento dos casos de teste

54 testes, organizados em grupos (`describe`):

| Grupo | O que verifica |
|---|---|
| **Configuração do tabuleiro** | 18 x 14 e 40 bombas por padrão; estado inicial `aguardando` com as 252 células fechadas; contador de bandeiras; rejeição de dimensões/quantidade de bombas inválidas (`RangeError`); bombas em posições fixas (e rejeição de posição fora do tabuleiro, repetida ou não inteira). |
| **Posicionamento das bombas** | Exatamente 40 bombas **distintas**; a primeira jogada e suas 8 vizinhas **nunca** têm bomba (50 sementes diferentes; cantos e bordas incluídos); mesma semente gera o mesmo tabuleiro e sementes diferentes geram tabuleiros diferentes; funciona com `Math.random`. |
| **Número de bombas vizinhas** | Contagem correta no meio, nas bordas e nos cantos (só conta vizinhos existentes) e uma bomba não conta a si mesma. |
| **Revelar células** | Célula numerada abre só ela; célula `0` abre em **cascata**; a cascata para nos números e **não atravessa uma parede de bombas**; não abre células com bandeira; revelar célula já aberta ou com bandeira é ignorado; coordenadas inválidas. |
| **Bandeiras** | Marcar/desmarcar; contador sobe e desce (e pode ficar negativo); não marca célula aberta; coordenada inválida. |
| **Derrota** | Abrir bomba encerra o jogo, marca a bomba explodida e revela as demais bombas; não é possível jogar depois. |
| **Vitória** | Abrir todas as 212 células seguras (252 − 40) dá vitória; enquanto restar uma célula segura fechada o jogo continua; não é possível jogar depois. |
| **Consulta de células** | `celula()` devolve uma cópia (não expõe o estado interno) e valida coordenadas. |

**Reprodutibilidade:** o sorteio das bombas recebe uma função `aleatorio` injetável. Os testes
usam um gerador com semente (`tests/helpers.js`), então não há testes "instáveis".

**Cobertura:** `jest.coverageThreshold` exige **100 %** de instruções, ramos, funções e linhas;
o `npm test` falha se a cobertura cair. O workflow do GitHub Actions
(`.github/workflows/testes.yml`) roda os testes a cada push.
