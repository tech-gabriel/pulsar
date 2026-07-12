// Aplica o tema salvo ANTES do primeiro paint, evitando flash dark->light.
// Servido de 'self' (dispensa flexibilizar a CSP).
try {
  if (localStorage.getItem('pulsar-theme') === 'light') {
    document.documentElement.classList.add('light');
  }
} catch (e) {
  /* localStorage indisponível: mantém o tema padrão (dark) */
}
