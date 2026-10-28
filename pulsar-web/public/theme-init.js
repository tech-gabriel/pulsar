// Aplica o tema salvo ANTES do primeiro paint, evitando flash light->dark.
// O padrão do site é claro e o index.html já sai com class="light" no <html>,
// então aqui só é preciso REMOVER a classe para quem escolheu escuro.
// Servido de 'self' (dispensa flexibilizar a CSP).
try {
  if (localStorage.getItem('pulsar-theme-v2') === 'dark') {
    document.documentElement.classList.remove('light');
    // Barra do sistema na cor do fundo escuro (mesmo valor de utils/barraDoSistema.ts).
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#052F4A');
  }
  // Efeito de vidro desligado em Configurações (useTransparencia).
  if (localStorage.getItem('pulsar-transparencia') === 'desligada') {
    document.documentElement.classList.add('sem-transparencia');
  }
} catch (e) {
  /* localStorage indisponível: mantém o tema padrão (claro) */
}
