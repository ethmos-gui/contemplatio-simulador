// materiais/simulador.calc.js
(function (global) {
  'use strict';

  const Calc = {};

  // ── Tabela de impressão (custo bruto sem margem) ───────────
  const PRINT_TABLE = {
    offset_75_sem_orelha: {
      20:  { 100: 240.40,  150: 313.60,  200: 386.60,  250: 459.80  },
      50:  { 100: 579.50,  150: 759.50,  200: 940.00,  250: 1120.00 },
      100: { 100: 1077.00, 150: 1431.00, 200: 1784.00, 250: 2138.00 },
      200: { 100: 1956.00, 150: 2596.00, 200: 3238.00, 250: 3878.00 },
      500: { 100: 4495.00, 150: 5955.00, 200: 7410.00, 250: 8870.00 },
    },
    polen_80_com_orelha: {
      20:  { 100: 268.20,  150: 348.80,  200: 429.40,  250: 510.00  },
      50:  { 100: 646.50,  150: 845.50,  200: 1044.50, 250: 1243.50 },
      100: { 100: 1191.00, 150: 1577.00, 200: 1962.00, 250: 2348.00 },
      200: { 100: 2166.00, 150: 2868.00, 200: 3568.00, 250: 4270.00 },
      500: { 100: 4980.00, 150: 6575.00, 200: 8165.00, 250: 9760.00 },
    },
  };
  const PRINT_TIRAGEMS = [20, 50, 100, 200, 500];
  const PRINT_PAGINAS  = [100, 150, 200, 250];
  const PRINT_MARGEM = 1.35;

  Calc.PAPEL_LABELS = {
    offset_75_sem_orelha: 'offset 75g · sem orelha',
    polen_80_com_orelha:  'pólen 80g · com orelha',
  };

  function findBracket(val, ladder) {
    if (val <= ladder[0]) return [ladder[0], ladder[0], 0];
    if (val >= ladder[ladder.length - 1]) return [ladder[ladder.length - 1], ladder[ladder.length - 1], 0];
    for (let i = 0; i < ladder.length - 1; i++) {
      if (val >= ladder[i] && val <= ladder[i + 1]) {
        return [ladder[i], ladder[i + 1], (val - ladder[i]) / (ladder[i + 1] - ladder[i])];
      }
    }
    return [ladder[ladder.length - 1], ladder[ladder.length - 1], 0];
  }

  function bilinearLookup(tiragem, paginas, tbl) {
    // Acima de 500 ex: extrapola linearmente baseado na faixa 200→500
    if (tiragem > 500) {
      const v500 = bilinearLookup(500, paginas, tbl);
      const v200 = bilinearLookup(200, paginas, tbl);
      const margUnit = (v500 - v200) / 300;
      return v500 + (tiragem - 500) * margUnit;
    }
    // Acima de 250 pp: extrapola da faixa 200→250
    if (paginas > 250) {
      const v250 = bilinearLookup(tiragem, 250, tbl);
      const v200 = bilinearLookup(tiragem, 200, tbl);
      const margPp = (v250 - v200) / 50;
      return v250 + (paginas - 250) * margPp;
    }
    const [t1, t2, ti] = findBracket(tiragem, PRINT_TIRAGEMS);
    const [p1, p2, pi] = findBracket(paginas, PRINT_PAGINAS);
    const v11 = tbl[t1][p1], v12 = tbl[t1][p2];
    const v21 = tbl[t2][p1], v22 = tbl[t2][p2];
    const v1 = v11 * (1 - pi) + v12 * pi;
    const v2 = v21 * (1 - pi) + v22 * pi;
    return v1 * (1 - ti) + v2 * ti;
  }

  Calc.custoImpressao = function (tiragem, paginas, papel) {
    const tbl = PRINT_TABLE[papel] || PRINT_TABLE.offset_75_sem_orelha;
    if (tiragem < 20) return 0;
    const pp = paginas < 100 ? 100 : paginas;
    return bilinearLookup(tiragem, pp, tbl);
  };

  Calc.priceImpressao = function (tiragem, paginas, papel) {
    return Calc.custoImpressao(tiragem, paginas, papel) * PRINT_MARGEM;
  };

  // ── Preços à la carte (cliente seleciona individualmente) ──
  const PRECOS_SERVICO = {
    ghostwriting:      { preco: 6000, label: 'Ghostwriting' },
    edicao_profunda:   { preco: 2250, label: 'Edição profunda' },
    capa:              { preco: 850,  label: 'Capa personalizada' },
    isbn:              { preco: 500,  label: 'ISBN e cadastros legais' },
    ebook:             { preco: 250,  label: 'Adaptação para ebook (Amazon)' },
    audiolivro:        { preco: 4500, label: 'Audiolivro' },
    comunicacao:       { preco: 2100, label: 'Comunicação / assessoria' },
    kit_influenciador: { preco: 750,  label: 'Kits para influenciadores (10 un)' },
    press_release:     { preco: 210,  label: 'Press release' },
    banner:            { preco: 250,  label: 'Material gráfico (banner, marca-página)' },
  };
  const PRECOS_POR_PAGINA = {
    revisao:     { preco_lauda: 9, label: 'Revisão profissional' },
    diagramacao: { preco_lauda: 6, label: 'Diagramação' },
  };

  Calc.servicoLabel = function (svc) {
    return (PRECOS_SERVICO[svc] || PRECOS_POR_PAGINA[svc] || {}).label || svc;
  };

  Calc.precoServico = function (svc, paginas) {
    if (PRECOS_POR_PAGINA[svc]) return (paginas || 200) * PRECOS_POR_PAGINA[svc].preco_lauda;
    return (PRECOS_SERVICO[svc] || {}).preco || 0;
  };

  Calc.SERVICOS_EDITORIAIS = ['ghostwriting', 'revisao', 'edicao_profunda', 'capa', 'diagramacao', 'isbn', 'ebook', 'audiolivro'];
  Calc.SERVICOS_LANCAMENTO = ['comunicacao', 'kit_influenciador', 'press_release', 'banner'];

  // ── Componente editorial fixo de cada pacote (legado) ──────
  const EDITORIAL_BASE = {
    semente:  4550,
    arvore:   4550,
    floresta: 7050,
  };

  // Pacotes-atalho: o que cada um inclui
  Calc.PACOTE_INCLUI = {
    semente: { servicos: ['revisao', 'capa', 'diagramacao', 'isbn', 'ebook'], impressao: false, lancamento: [] },
    arvore:  { servicos: ['revisao', 'capa', 'diagramacao', 'isbn', 'ebook'], impressao: { tiragem: 500, paginas: 200, papel: 'offset_75_sem_orelha' }, lancamento: [] },
    floresta:{ servicos: ['revisao', 'capa', 'diagramacao', 'isbn', 'ebook'], impressao: { tiragem: 500, paginas: 200, papel: 'offset_75_sem_orelha' }, lancamento: ['comunicacao', 'kit_influenciador', 'press_release', 'banner'] },
  };

  Calc.editorialBase = function (key) {
    return EDITORIAL_BASE[key] || 0;
  };

  // packageBase = preço default exibido nos cards (500 ex × 200 pp × offset 75g s/orelha)
  Calc.packageBase = function (key) {
    const ed = EDITORIAL_BASE[key] || 0;
    if (key === 'arvore' || key === 'floresta') {
      return ed + Calc.priceImpressao(500, 200, 'offset_75_sem_orelha');
    }
    return ed;
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
    const ed = Calc.editorialBase(state.pacote);
    const extras = Calc.extrasTotal(state.extras);
    const paginas = Calc.deltaPaginas(state.paginas);
    let imp = 0;
    if (PACOTES_COM_TIRAGEM.indexOf(state.pacote) >= 0) {
      imp = Calc.priceImpressao(
        state.tiragem,
        state.paginas,
        state.papel || 'offset_75_sem_orelha'
      );
    }
    return ed + extras + paginas + imp;
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
    linhas.push(`📦 Pacote: ${baseLabel}`);
    linhas.push(`   Editorial: ${Calc.formatBRL(Calc.editorialBase(s.pacote))}`);

    (s.extras || []).forEach(e => {
      const nome = EXTRA_NOMES[e] || e;
      const valor = Calc.extrasTotal([e]);
      linhas.push(`   + ${nome}: ${Calc.formatBRL(valor)}`);
    });

    if (s.paginas !== 200) {
      const delta = Calc.deltaPaginas(s.paginas);
      if (delta > 0) {
        linhas.push(`   + Editorial extra (${s.paginas}pp): ${Calc.formatBRL(delta)}`);
      }
    }

    if (PACOTES_COM_TIRAGEM.indexOf(s.pacote) >= 0) {
      const papelKey = s.papel || 'offset_75_sem_orelha';
      const imp = Calc.priceImpressao(s.tiragem, s.paginas, papelKey);
      linhas.push(`📚 Impressão: ${s.tiragem} ex. × ${s.paginas} pp · ${Calc.PAPEL_LABELS[papelKey]}`);
      linhas.push(`   ${Calc.formatBRL(imp)}`);
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
