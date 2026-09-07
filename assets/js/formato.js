/** formato.js - formatação de números, moeda, percentagens e datas em pt-PT. */
(function (raiz, fabrica) {
  if (typeof module !== 'undefined' && module.exports) module.exports = fabrica();
  else raiz.Formato = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var moeda = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
  var moedaCurta = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var numero = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function n(v) {
    if (v === null || v === undefined || v === '') return 0;
    var x = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return isFinite(x) ? x : 0;
  }

  return {
    euro: function (v) { return moeda.format(n(v)); },
    euroCurto: function (v) { return moedaCurta.format(n(v)); },
    numero: function (v) { return numero.format(n(v)); },
    decimal: function (v, casas) { return numeroCasas(n(v), casas === undefined ? 1 : casas); },
    percentagem: function (v, casas) {
      return numeroCasas(n(v) * 100, casas === undefined ? 1 : casas) + '%';
    },
    percentagemDireta: function (v, casas) {
      return numeroCasas(n(v), casas === undefined ? 2 : casas) + '%';
    },
    data: function (iso) {
      if (!iso) return '—';
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return String(d.getUTCDate()).padStart(2, '0') + '/' +
        String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear();
    },
    sinal: function (v) { return n(v) > 0 ? '+' : ''; },
    numeroBruto: n
  };

  function numeroCasas(v, casas) {
    return new Intl.NumberFormat('pt-PT', {
      minimumFractionDigits: 0, maximumFractionDigits: casas
    }).format(v);
  }
});
