import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
// Registra os matchers do jest-dom no `expect` e augmenta os tipos do Vitest
// (toBeInTheDocument, toHaveClass, etc.) para o typecheck do `npm run build`.
import '@testing-library/jest-dom/vitest';

// Animações instantâneas nos testes: a saída do AnimatePresence completa na hora,
// então asserts de "elemento removido" não dependem de timing de animação.
MotionGlobalConfig.skipAnimations = true;

// jsdom não implementa IntersectionObserver; o `whileInView` do motion (usado na
// landing) precisa dele só para disparar a animação — um stub no-op basta.
if (!('IntersectionObserver' in globalThis)) {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver;
}

afterEach(cleanup);
