// Aplica o tema salvo ANTES do primeiro paint, evitando flash light->dark.
// O padrão do site é claro e o index.html já sai com class="light" no <html>,
// então aqui só é preciso REMOVER a classe para quem escolheu escuro.
// Servido de 'self' (dispensa flexibilizar a CSP).
try {
  if (localStorage.getItem('pulsar-theme-v2') === 'dark') {
    document.documentElement.classList.remove('light');
  }
} catch (e) {
  /* localStorage indisponível: mantém o tema padrão (claro) */
}
