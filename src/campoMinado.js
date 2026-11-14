'use strict';

const COLUNAS_PADRAO = 18;
const LINHAS_PADRAO = 14;
const BOMBAS_PADRAO = 40;

/**
 * Campo Minado.
 *
 * Tabuleiro padrao: 18 colunas x 14 linhas com 40 bombas.
 *
 * Estados do jogo: 'aguardando' (as bombas ainda nao foram sorteadas), 'jogando',
 * 'vitoria' e 'derrota'. As bombas so sao sorteadas na primeira jogada, para que a
 * primeira celula aberta (e as 8 vizinhas) nunca tenham bomba.
 *
 * Opcoes do construtor:
 *  - colunas, linhas, bombas: dimensoes e quantidade de bombas;
 *  - aleatorio: funcao que devolve um numero em [0, 1) (padrao: Math.random);
 *  - posicoesBombas: lista de [linha, coluna] para fixar as bombas (usado em testes).
 */
class CampoMinado {
  constructor({
    colunas = COLUNAS_PADRAO,
    linhas = LINHAS_PADRAO,
    bombas = BOMBAS_PADRAO,
    aleatorio = Math.random,
    posicoesBombas,
  } = {}) {
    if (!Number.isInteger(colunas) || colunas < 1 || !Number.isInteger(linhas) || linhas < 1) {
      throw new RangeError('Dimensoes invalidas');
    }
    this.colunas = colunas;
    this.linhas = linhas;
    this._aleatorio = aleatorio;
    this._bandeiras = 0;
    this._abertasSeguras = 0;
    this._celulas = [];
    for (let l = 0; l < linhas; l++) {
      const linha = [];
      for (let c = 0; c < colunas; c++) {
        linha.push({ bomba: false, aberta: false, bandeira: false, explodida: false, vizinhas: 0 });
      }
      this._celulas.push(linha);
    }

    if (posicoesBombas) {
      this._fixarBombas(posicoesBombas);
      this.bombas = posicoesBombas.length;
      this.estado = 'jogando';
    } else {
      // A primeira jogada precisa de uma area segura de 3x3 (ate 9 celulas).
      if (!Number.isInteger(bombas) || bombas < 0 || bombas > colunas * linhas - 9) {
        throw new RangeError('Quantidade de bombas invalida');
      }
      this.bombas = bombas;
      this.estado = 'aguardando';
    }
  }

  /** Quantas bandeiras ainda podem ser usadas (pode ficar negativo). */
  bandeirasRestantes() {
    return this.bombas - this._bandeiras;
  }

  /** Devolve uma copia do estado da celula. */
  celula(linha, coluna) {
    this._validarCoordenada(linha, coluna);
    return { ...this._celulas[linha][coluna] };
  }

  /** Marca ou desmarca uma celula fechada com bandeira. */
  alternarBandeira(linha, coluna) {
    this._validarCoordenada(linha, coluna);
    this._validarEmAndamento();
    const celula = this._celulas[linha][coluna];
    if (celula.aberta) return;
    celula.bandeira = !celula.bandeira;
    this._bandeiras += celula.bandeira ? 1 : -1;
  }

  /** Abre uma celula. Bomba = derrota; celula sem bombas vizinhas abre a regiao em cascata. */
  revelar(linha, coluna) {
    this._validarCoordenada(linha, coluna);
    this._validarEmAndamento();
    const celula = this._celulas[linha][coluna];
    if (celula.aberta || celula.bandeira) return;

    if (this.estado === 'aguardando') {
      this._sortearBombas(linha, coluna);
      this.estado = 'jogando';
    }

    if (celula.bomba) {
      this._explodir(celula);
      return;
    }
    this._abrirEmCascata(linha, coluna);
    if (this._abertasSeguras === this.colunas * this.linhas - this.bombas) {
      this.estado = 'vitoria';
    }
  }

  // ---------------------------------------------------------------- privados

  _validarCoordenada(linha, coluna) {
    const valida = Number.isInteger(linha) && Number.isInteger(coluna)
      && linha >= 0 && linha < this.linhas && coluna >= 0 && coluna < this.colunas;
    if (!valida) throw new RangeError('Coordenada invalida');
  }

  _validarEmAndamento() {
    if (this.estado === 'vitoria' || this.estado === 'derrota') {
      throw new Error('Jogo encerrado');
    }
  }

  _vizinhos(linha, coluna) {
    const lista = [];
    for (let l = linha - 1; l <= linha + 1; l++) {
      for (let c = coluna - 1; c <= coluna + 1; c++) {
        const dentro = l >= 0 && l < this.linhas && c >= 0 && c < this.colunas;
        if (dentro && !(l === linha && c === coluna)) lista.push([l, c]);
      }
    }
    return lista;
  }

  _fixarBombas(posicoes) {
    posicoes.forEach(([l, c]) => {
      this._validarCoordenada(l, c);
      if (this._celulas[l][c].bomba) throw new RangeError('Posicao de bomba repetida');
      this._celulas[l][c].bomba = true;
    });
    this._calcularVizinhas();
  }

  // Sorteia as bombas fora da area 3x3 em volta da primeira jogada (Fisher-Yates parcial).
  _sortearBombas(linhaInicial, colunaInicial) {
    const candidatas = [];
    for (let l = 0; l < this.linhas; l++) {
      for (let c = 0; c < this.colunas; c++) {
        const naAreaSegura = Math.abs(l - linhaInicial) <= 1 && Math.abs(c - colunaInicial) <= 1;
        if (!naAreaSegura) candidatas.push([l, c]);
      }
    }
    for (let i = 0; i < this.bombas; i++) {
      const j = i + Math.floor(this._aleatorio() * (candidatas.length - i));
      [candidatas[i], candidatas[j]] = [candidatas[j], candidatas[i]];
      const [l, c] = candidatas[i];
      this._celulas[l][c].bomba = true;
    }
    this._calcularVizinhas();
  }

  _calcularVizinhas() {
    for (let l = 0; l < this.linhas; l++) {
      for (let c = 0; c < this.colunas; c++) {
        this._celulas[l][c].vizinhas = this._vizinhos(l, c)
          .filter(([vl, vc]) => this._celulas[vl][vc].bomba).length;
      }
    }
  }

  _abrirEmCascata(linha, coluna) {
    const pilha = [[linha, coluna]];
    while (pilha.length > 0) {
      const [l, c] = pilha.pop();
      const celula = this._celulas[l][c];
      if (celula.aberta || celula.bandeira) continue;
      celula.aberta = true;
      this._abertasSeguras++;
      if (celula.vizinhas === 0) pilha.push(...this._vizinhos(l, c));
    }
  }

  _explodir(celula) {
    celula.explodida = true;
    this.estado = 'derrota';
    this._celulas.forEach((linha) => linha.forEach((c) => {
      if (c.bomba) c.aberta = true;
    }));
  }
}

module.exports = { CampoMinado };
