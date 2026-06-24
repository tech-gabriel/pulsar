/// <reference lib="webworker" />
// Service worker do Pulsar. Foco em Web Push: recebe o payload do servidor e
// exibe a notificação; ao clicar, foca uma aba aberta ou abre a URL do alerta.
// Transpilado pelo vite-plugin-pwa (esbuild) — não é checado pelo tsc do app.

declare const self: ServiceWorkerGlobalScope;

interface PushPayload {
  titulo: string;
  corpo: string;
  url?: string;
  tag?: string;
}

// Ativa a nova versão imediatamente (combina com registerType: 'autoUpdate').
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let dados: PushPayload;
  try {
    dados = event.data?.json() as PushPayload;
  } catch {
    dados = { titulo: 'Pulsar', corpo: 'Novo alerta de risco na sua região.' };
  }
  if (!dados?.titulo) return;

  const url = dados.url ?? '/';
  event.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: dados.tag,
      // Reabre/atualiza a notificação ao invés de empilhar duplicatas (mesma tag).
      renotify: Boolean(dados.tag),
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = (event.notification.data as { url?: string } | undefined)?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientes) => {
        // Foca uma aba já aberta do app, se houver; senão abre uma nova.
        for (const cliente of clientes) {
          if ('focus' in cliente) {
            void cliente.focus();
            if ('navigate' in cliente) void cliente.navigate(destino);
            return;
          }
        }
        return self.clients.openWindow(destino);
      }),
  );
});
