const { CampoMinado } = require('../src/campoMinado');
const { aleatorioComSemente } = require('./helpers');

// Percorre todas as celulas do tabuleiro.
function todasAsCelulas(jogo) {
  const lista = [];
  for (let l = 0; l < jogo.linhas; l++) {
    for (let c = 0; c < jogo.colunas; c++) lista.push([l, c]);
  }
  return lista;
}

function posicoesDasBombas(jogo) {
  return todasAsCelulas(jogo).filter(([l, c]) => jogo.celula(l, c).bomba);
}

// 40 bombas fixas: linha 0 inteira (18), linha 1 inteira (18) e 4 bombas na linha 2.
function bombasFixas() {
  const bombas = [];
  for (let c = 0; c < 18; c++) bombas.push([0, c], [1, c]);
  for (let c = 0; c < 4; c++) bombas.push([2, c]);
  return bombas;
}

describe('Configuracao do tabuleiro (18 colunas x 14 linhas, 40 bombas)', () => {
  test('o tabuleiro padrao tem 18 colunas, 14 linhas e 40 bombas', () => {
    const jogo = new CampoMinado();
    expect(jogo.colunas).toBe(18);
    expect(jogo.linhas).toBe(14);
    expect(jogo.bombas).toBe(40);
  });

  test('o jogo comeca aguardando a primeira jogada, com todas as celulas fechadas', () => {
    const jogo = new CampoMinado();
    expect(jogo.estado).toBe('aguardando');
    const fechadas = todasAsCelulas(jogo).filter(([l, c]) => !jogo.celula(l, c).aberta);
    expect(fechadas).toHaveLength(18 * 14);
  });

  test('o contador de bandeiras restantes comeca igual ao numero de bombas', () => {
    expect(new CampoMinado().bandeirasRestantes()).toBe(40);
  });

  test.each([
    ['colunas zero', { colunas: 0 }],
    ['linhas negativas', { linhas: -3 }],
    ['colunas nao inteiras', { colunas: 4.5 }],
    ['bombas negativas', { bombas: -1 }],
    ['mais bombas do que cabem (deve sobrar a area segura da 1a jogada)', { bombas: 18 * 14 - 8 }],
  ])('rejeita configuracao invalida: %s', (_nome, opcoes) => {
    expect(() => new CampoMinado(opcoes)).toThrow(RangeError);
  });

  test('aceita o maximo de bombas que ainda deixa a area segura da primeira jogada', () => {
    expect(() => new CampoMinado({ bombas: 18 * 14 - 9 })).not.toThrow();
  });

  test('aceita bombas em posicoes fixas e passa a jogar imediatamente', () => {
    const jogo = new CampoMinado({ posicoesBombas: [[0, 0], [5, 5]] });
    expect(jogo.bombas).toBe(2);
    expect(jogo.estado).toBe('jogando');
    expect(posicoesDasBombas(jogo)).toEqual([[0, 0], [5, 5]]);
  });

  test.each([
    ['linha fora do tabuleiro', [[14, 0]]],
    ['coluna fora do tabuleiro', [[0, 18]]],
    ['posicao repetida', [[1, 1], [1, 1]]],
    ['posicao nao inteira', [[0.5, 1]]],
  ])('rejeita posicoes de bombas invalidas: %s', (_nome, posicoes) => {
    expect(() => new CampoMinado({ posicoesBombas: posicoes })).toThrow(RangeError);
  });
});

describe('Posicionamento das bombas na primeira jogada', () => {
  test('apos a primeira jogada existem exatamente 40 bombas distintas', () => {
    const jogo = new CampoMinado({ aleatorio: aleatorioComSemente(1) });
    jogo.revelar(7, 9);
    const bombas = posicoesDasBombas(jogo);
    expect(bombas).toHaveLength(40);
    expect(new Set(bombas.map(([l, c]) => `${l},${c}`)).size).toBe(40);
  });

  test('a primeira jogada nunca cai em bomba nem tem bombas ao redor (varias sementes)', () => {
    for (let semente = 1; semente <= 50; semente++) {
      const jogo = new CampoMinado({ aleatorio: aleatorioComSemente(semente) });
      jogo.revelar(7, 9);
      expect(jogo.estado).toBe('jogando');
      for (let l = 6; l <= 8; l++) {
        for (let c = 8; c <= 10; c++) expect(jogo.celula(l, c).bomba).toBe(false);
      }
    }
  });

  test.each([
    [0, 0], [0, 17], [13, 0], [13, 17], [0, 9], [7, 0],
  ])('a area segura tambem vale nos cantos e bordas (%i, %i)', (linha, coluna) => {
    const jogo = new CampoMinado({ aleatorio: aleatorioComSemente(99) });
    jogo.revelar(linha, coluna);
    expect(posicoesDasBombas(jogo)).toHaveLength(40);
    for (let l = Math.max(0, linha - 1); l <= Math.min(13, linha + 1); l++) {
      for (let c = Math.max(0, coluna - 1); c <= Math.min(17, coluna + 1); c++) {
        expect(jogo.celula(l, c).bomba).toBe(false);
      }
    }
  });

  test('a mesma semente gera o mesmo tabuleiro e sementes diferentes geram tabuleiros diferentes', () => {
    const gerar = (semente) => {
      const jogo = new CampoMinado({ aleatorio: aleatorioComSemente(semente) });
      jogo.revelar(7, 9);
      return JSON.stringify(posicoesDasBombas(jogo));
    };
    expect(gerar(7)).toBe(gerar(7));
    expect(gerar(7)).not.toBe(gerar(8));
  });

  test('funciona com o gerador aleatorio padrao (Math.random)', () => {
    const jogo = new CampoMinado();
    jogo.revelar(0, 0);
    expect(posicoesDasBombas(jogo)).toHaveLength(40);
  });
});

describe('Numero de bombas vizinhas', () => {
  // Bombas em (0,0), (0,1) e (1,0).
  const novo = () => new CampoMinado({ posicoesBombas: [[0, 0], [0, 1], [1, 0]] });

  test('a celula (1,1) tem 3 bombas vizinhas', () => {
    expect(novo().celula(1, 1).vizinhas).toBe(3);
  });

  test('a celula (0,2) tem 1 bomba vizinha (borda superior)', () => {
    expect(novo().celula(0, 2).vizinhas).toBe(1);
  });

  test('a celula (2,0) tem 1 bomba vizinha (borda esquerda)', () => {
    expect(novo().celula(2, 0).vizinhas).toBe(1);
  });

  test('celulas distantes das bombas tem 0 vizinhas', () => {
    expect(novo().celula(5, 5).vizinhas).toBe(0);
  });

  test('os cantos do tabuleiro contam apenas vizinhos existentes', () => {
    const jogo = new CampoMinado({ posicoesBombas: [[12, 16], [13, 16], [12, 17]] });
    expect(jogo.celula(13, 17).vizinhas).toBe(3);
  });

  test('a propria bomba nao e contada como vizinha dela mesma', () => {
    expect(novo().celula(0, 0).vizinhas).toBe(2);
  });
});

describe('Revelar celulas', () => {
  test('revelar uma celula numerada abre somente ela', () => {
    const jogo = new CampoMinado({ posicoesBombas: [[0, 0]] });
    jogo.revelar(1, 1);
    expect(jogo.celula(1, 1).aberta).toBe(true);
    const abertas = todasAsCelulas(jogo).filter(([l, c]) => jogo.celula(l, c).aberta);
    expect(abertas).toHaveLength(1);
  });

  test('revelar uma celula sem bombas vizinhas abre a regiao em cascata', () => {
    // Bomba apenas no canto (0,0): tudo, exceto ela, deve abrir ao revelar o canto oposto.
    const jogo = new CampoMinado({ posicoesBombas: [[0, 0]] });
    jogo.revelar(13, 17);
    expect(jogo.celula(0, 1).aberta).toBe(true); // numerada na borda da cascata
    expect(jogo.celula(1, 1).aberta).toBe(true);
    expect(jogo.celula(0, 0).aberta).toBe(false);
  });

  test('a cascata para nas celulas numeradas e nao atravessa a parede de bombas', () => {
    // Linha 5 inteira de bombas separa o tabuleiro em duas regioes.
    const parede = [];
    for (let c = 0; c < 18; c++) parede.push([5, c]);
    const jogo = new CampoMinado({ posicoesBombas: parede });
    jogo.revelar(13, 0);
    expect(jogo.celula(6, 0).aberta).toBe(true); // numerada (encosta na parede)
    expect(jogo.celula(7, 0).aberta).toBe(true);
    expect(jogo.celula(4, 0).aberta).toBe(false); // lado de la da parede
    expect(jogo.celula(0, 0).aberta).toBe(false);
  });

  test('a cascata nao abre celulas marcadas com bandeira', () => {
    const jogo = new CampoMinado({ posicoesBombas: [[0, 0]] });
    jogo.alternarBandeira(10, 10);
    jogo.revelar(13, 17);
    expect(jogo.celula(10, 10).aberta).toBe(false);
    expect(jogo.celula(10, 10).bandeira).toBe(true);
  });

  test('revelar uma celula ja aberta nao altera o jogo', () => {
    const jogo = new CampoMinado({ posicoesBombas: [[0, 0]] });
    jogo.revelar(1, 1);
    expect(() => jogo.revelar(1, 1)).not.toThrow();
    expect(jogo.estado).toBe('jogando');
  });

  test('revelar uma celula com bandeira e ignorado (protege contra clique acidental)', () => {
    const jogo = new CampoMinado({ posicoesBombas: [[3, 3]] });
    jogo.alternarBandeira(3, 3);
    jogo.revelar(3, 3);
    expect(jogo.estado).toBe('jogando');
    expect(jogo.celula(3, 3).aberta).toBe(false);
  });

  test.each([
    ['linha negativa', -1, 0],
    ['linha acima do limite', 14, 0],
    ['coluna negativa', 0, -1],
    ['coluna acima do limite', 0, 18],
    ['coordenada nao inteira', 1.5, 2],
  ])('rejeita coordenada invalida ao revelar: %s', (_nome, linha, coluna) => {
    const jogo = new CampoMinado();
    expect(() => jogo.revelar(linha, coluna)).toThrow(RangeError);
  });
});

describe('Bandeiras', () => {
  test('marca e desmarca uma celula fechada', () => {
    const jogo = new CampoMinado();
    jogo.alternarBandeira(2, 2);
    expect(jogo.celula(2, 2).bandeira).toBe(true);
    jogo.alternarBandeira(2, 2);
    expect(jogo.celula(2, 2).bandeira).toBe(false);
  });

  test('o contador de bandeiras restantes diminui e aumenta conforme as marcacoes', () => {
    const jogo = new CampoMinado();
    jogo.alternarBandeira(0, 0);
    jogo.alternarBandeira(0, 1);
    expect(jogo.bandeirasRestantes()).toBe(38);
    jogo.alternarBandeira(0, 0);
    expect(jogo.bandeirasRestantes()).toBe(39);
  });

  test('o contador pode ficar negativo quando ha mais bandeiras do que bombas', () => {
    const jogo = new CampoMinado({ posicoesBombas: [[0, 0]] });
    jogo.alternarBandeira(5, 5);
    jogo.alternarBandeira(5, 6);
    expect(jogo.bandeirasRestantes()).toBe(-1);
  });

  test('nao e possivel marcar uma celula ja aberta', () => {
    const jogo = new CampoMinado({ posicoesBombas: [[0, 0]] });
    jogo.revelar(1, 1);
    jogo.alternarBandeira(1, 1);
    expect(jogo.celula(1, 1).bandeira).toBe(false);
  });

  test('rejeita coordenada invalida ao marcar', () => {
    expect(() => new CampoMinado().alternarBandeira(14, 0)).toThrow(RangeError);
  });
});

describe('Derrota', () => {
  test('revelar uma bomba termina o jogo com derrota e marca a bomba explodida', () => {
    const jogo = new CampoMinado({ posicoesBombas: [[3, 3], [4, 4]] });
    jogo.revelar(3, 3);
    expect(jogo.estado).toBe('derrota');
    expect(jogo.celula(3, 3).explodida).toBe(true);
  });

  test('na derrota todas as bombas ficam reveladas e as demais celulas continuam fechadas', () => {
    const jogo = new CampoMinado({ posicoesBombas: [[3, 3], [4, 4]] });
    jogo.revelar(3, 3);
    expect(jogo.celula(4, 4).aberta).toBe(true);
    expect(jogo.celula(4, 4).explodida).toBe(false);
    expect(jogo.celula(9, 9).aberta).toBe(false);
  });

  test('depois da derrota nao e permitido jogar', () => {
    const jogo = new CampoMinado({ posicoesBombas: [[3, 3]] });
    jogo.revelar(3, 3);
    expect(() => jogo.revelar(0, 0)).toThrow('Jogo encerrado');
    expect(() => jogo.alternarBandeira(0, 0)).toThrow('Jogo encerrado');
  });
});

describe('Vitoria', () => {
  test('abrir todas as celulas sem bomba termina o jogo com vitoria', () => {
    const jogo = new CampoMinado({ posicoesBombas: bombasFixas() });
    expect(jogo.bombas).toBe(40);
    const seguras = todasAsCelulas(jogo).filter(([l, c]) => !jogo.celula(l, c).bomba);
    expect(seguras).toHaveLength(18 * 14 - 40);
    seguras.forEach(([l, c]) => {
      if (jogo.estado === 'jogando') jogo.revelar(l, c);
    });
    expect(jogo.estado).toBe('vitoria');
  });

  test('ainda ha jogo enquanto restar alguma celula segura fechada', () => {
    const jogo = new CampoMinado({ posicoesBombas: bombasFixas() });
    jogo.revelar(13, 17); // cascata na parte de baixo, sem abrir tudo
    expect(jogo.estado).toBe('jogando');
  });

  test('depois da vitoria nao e permitido jogar', () => {
    const jogo = new CampoMinado({ posicoesBombas: [[0, 0]] });
    jogo.revelar(13, 17); // abre tudo, menos a bomba
    expect(jogo.estado).toBe('vitoria');
    expect(() => jogo.revelar(0, 1)).toThrow('Jogo encerrado');
  });
});

describe('Consulta de celulas', () => {
  test('celula devolve uma copia: alterar o resultado nao altera o jogo', () => {
    const jogo = new CampoMinado({ posicoesBombas: [[0, 0]] });
    const copia = jogo.celula(0, 0);
    copia.bomba = false;
    expect(jogo.celula(0, 0).bomba).toBe(true);
  });

  test('rejeita coordenada invalida ao consultar', () => {
    expect(() => new CampoMinado().celula(0, 18)).toThrow(RangeError);
  });
});
