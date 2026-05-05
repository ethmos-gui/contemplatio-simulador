// materiais/simulador.calc.js
(function (global) {
  'use strict';

  const Calc = {};

  const PACKAGE_BASE = {
    semente:  4550,
    arvore:   14700,
    floresta: 17200,
  };

  Calc.packageBase = function (key) {
    return PACKAGE_BASE[key] || 0;
  };

  const EXTRAS = {
    ghostwriting:    6000,
    edicao_profunda: 2250,
    audiolivro:      4500,
  };

  Calc.extrasTotal = function (selected) {
    return (selected || []).reduce((sum, key) => sum + (EXTRAS[key] || 0), 0);
  };

  Calc.deltaTiragem = function (qtd) {
    return Math.max(0, qtd - 500) * 20.31;
  };

  Calc.deltaPaginas = function (pp) {
    return Math.max(0, Math.floor((pp - 200) / 50)) * 750;
  };

  const PACOTES_COM_TIRAGEM = ['arvore', 'floresta'];

  Calc.totalPacote = function (state) {
    const base = Calc.packageBase(state.pacote);
    const extras = Calc.extrasTotal(state.extras);
    const tiragem = PACOTES_COM_TIRAGEM.indexOf(state.pacote) >= 0
      ? Calc.deltaTiragem(state.tiragem)
      : 0;
    const paginas = Calc.deltaPaginas(state.paginas);
    return base + extras + tiragem + paginas;
  };

  const DIST = {
    armazenagem_exemp: 0.15,
    amazon_compra_pct: 0.50,
    amazon_fee_pct:    0.14,
    ml_fixo:           5.00,
    ml_pct:            0.07,
    ml_comissao_pct:   0.12,
  };

  Calc.custoDistribuicao = function (s) {
    const preco = s.precoCapa || 0;
    const armazenagem = s.canais.armazenagem ? s.estoque * DIST.armazenagem_exemp : 0;

    const amazonUnit = preco * DIST.amazon_compra_pct * DIST.amazon_fee_pct;
    const mlLiquido  = preco * (1 - DIST.ml_comissao_pct);
    const mlPorPedido = DIST.ml_fixo + (mlLiquido * DIST.ml_pct);

    let mixA;
    if (s.canais.amazon && !s.canais.ml)        mixA = 1;
    else if (!s.canais.amazon && s.canais.ml)   mixA = 0;
    else                                        mixA = (s.mixAmazon || 0) / 100;

    const vendasA = s.vendas * mixA;
    const vendasML = s.vendas * (1 - mixA);

    const amazon = s.canais.amazon ? vendasA * amazonUnit : 0;
    const ml     = s.canais.ml     ? vendasML * mlPorPedido : 0;

    return {
      armazenagem,
      amazon,
      ml,
      total: armazenagem + amazon + ml,
    };
  };

  Calc.formatBRL = function (v) {
    if (v === null || v === undefined || isNaN(v)) v = 0;
    return 'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const PACOTE_NOMES = {
    semente:  'Semente',
    arvore:   'Árvore',
    floresta: 'Floresta',
  };

  const EXTRA_NOMES = {
    ghostwriting:    'Ghostwriting',
    edicao_profunda: 'Edição profunda',
    audiolivro:      'Audiolivro',
  };

  Calc.mensagemPacote = function (s) {
    const linhas = [];
    linhas.push('Olá! Vim pelo simulador de pacotes do site.');
    linhas.push('');

    const baseLabel = PACOTE_NOMES[s.pacote] || s.pacote;
    linhas.push(`📦 Pacote: ${baseLabel} (${Calc.formatBRL(Calc.packageBase(s.pacote))})`);

    (s.extras || []).forEach(e => {
      const nome = EXTRA_NOMES[e] || e;
      const valor = Calc.extrasTotal([e]);
      linhas.push(`+ ${nome} (${Calc.formatBRL(valor)})`);
    });

    if (PACOTES_COM_TIRAGEM.indexOf(s.pacote) >= 0 && s.tiragem !== 500) {
      const delta = Calc.deltaTiragem(s.tiragem);
      if (delta > 0) {
        linhas.push(`+ Tiragem: ${s.tiragem} ex. (+ ${Calc.formatBRL(delta)})`);
      } else {
        linhas.push(`+ Tiragem: ${s.tiragem} ex.`);
      }
    }

    if (s.paginas !== 200) {
      const delta = Calc.deltaPaginas(s.paginas);
      if (delta > 0) {
        linhas.push(`+ Páginas: ${s.paginas} (+ ${Calc.formatBRL(delta)})`);
      } else {
        linhas.push(`+ Páginas: ${s.paginas}`);
      }
    }

    linhas.push('');
    linhas.push(`💰 Total: ${Calc.formatBRL(Calc.totalPacote(s))}`);
    linhas.push('');
    linhas.push('Gostaria de conversar sobre meu projeto.');
    return linhas.join('\n');
  };

  Calc.mensagemDistribuicao = function (s) {
    const r = Calc.custoDistribuicao(s);
    const canaisAtivos = [];
    if (s.canais.amazon) canaisAtivos.push('Amazon');
    if (s.canais.ml) canaisAtivos.push('Mercado Livre');
    if (s.canais.armazenagem) canaisAtivos.push('Armazenagem');

    const linhas = [];
    linhas.push('Olá! Simulei a distribuição profissional.');
    linhas.push('');
    linhas.push(`📚 Estoque: ${s.estoque} exemplares`);
    if (s.precoCapa > 0) linhas.push(`💵 Preço de capa: ${Calc.formatBRL(s.precoCapa)}`);
    linhas.push(`📈 Vendas/mês estimadas: ${s.vendas}`);

    let canaisLabel = canaisAtivos.join(' · ');
    if (s.canais.amazon && s.canais.ml) {
      canaisLabel += ` (mix ${s.mixAmazon}% Amazon)`;
    }
    linhas.push(`📦 Canais: ${canaisLabel}`);

    linhas.push('');
    linhas.push(`💰 Custo mensal estimado: ${Calc.formatBRL(r.total)}`);
    linhas.push('');
    linhas.push('Gostaria de conversar sobre distribuição.');
    return linhas.join('\n');
  };

  // ─── Vídeo → Livro ──────────────────────────────────────────
  const VIDEO_PACOTE = {
    compilacao: { preco: 3800,  horas: 5,  paginas: 60,  nome: 'Compilação' },
    coletanea:  { preco: 7600,  horas: 15, paginas: 150, nome: 'Coletânea' },
    obra:       { preco: 12700, horas: 40, paginas: 300, nome: 'Obra' },
  };

  const VIDEO_HORA_EXTRA = 250;
  const VIDEO_BLOCO_50PP_EXTRA = 850;
  const VIDEO_TRADUCAO_PCT = 0.30;

  Calc.videoPacote = function (key) {
    return VIDEO_PACOTE[key] || null;
  };

  Calc.deltaVideoHoras = function (pacote, horas) {
    const base = VIDEO_PACOTE[pacote];
    if (!base) return 0;
    return Math.max(0, horas - base.horas) * VIDEO_HORA_EXTRA;
  };

  Calc.deltaVideoPaginas = function (pacote, paginas) {
    const base = VIDEO_PACOTE[pacote];
    if (!base) return 0;
    return Math.max(0, Math.ceil((paginas - base.paginas) / 50)) * VIDEO_BLOCO_50PP_EXTRA;
  };

  Calc.totalVideo = function (state) {
    const base = VIDEO_PACOTE[state.pacote];
    if (!base) return 0;
    const dh = Calc.deltaVideoHoras(state.pacote, state.horas);
    const dp = Calc.deltaVideoPaginas(state.pacote, state.paginas);
    const subtotal = base.preco + dh + dp;
    const traducao = state.traducao ? subtotal * VIDEO_TRADUCAO_PCT : 0;
    return subtotal + traducao;
  };

  Calc.mensagemVideo = function (s) {
    const base = VIDEO_PACOTE[s.pacote];
    if (!base) return '';
    const linhas = [];
    linhas.push('Olá! Vim pelo simulador "Vídeo → Livro".');
    linhas.push('');
    linhas.push(`📹 Pacote: ${base.nome} (${Calc.formatBRL(base.preco)})`);
    linhas.push(`⏱️  Vídeo bruto: ${s.horas}h (incluso até ${base.horas}h)`);
    const dh = Calc.deltaVideoHoras(s.pacote, s.horas);
    if (dh > 0) linhas.push(`+ Horas extras: ${s.horas - base.horas}h × R$ 250 = ${Calc.formatBRL(dh)}`);
    linhas.push(`📄 Páginas alvo: ${s.paginas} (incluso até ${base.paginas})`);
    const dp = Calc.deltaVideoPaginas(s.pacote, s.paginas);
    if (dp > 0) linhas.push(`+ Páginas extras: ${Calc.formatBRL(dp)}`);
    if (s.traducao) {
      const subtotal = base.preco + dh + dp;
      linhas.push(`+ Tradução do output: +30% sobre ${Calc.formatBRL(subtotal)} = ${Calc.formatBRL(subtotal * VIDEO_TRADUCAO_PCT)}`);
    }
    linhas.push('');
    linhas.push(`💰 Total: ${Calc.formatBRL(Calc.totalVideo(s))}`);
    linhas.push('');
    linhas.push('Gostaria de conversar sobre transformar meus vídeos em livro.');
    return linhas.join('\n');
  };

  global.Calc = Calc;
})(typeof window !== 'undefined' ? window : globalThis);
