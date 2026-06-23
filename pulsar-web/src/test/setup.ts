import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
// Registra os matchers do jest-dom no `expect` e augmenta os tipos do Vitest
// (toBeInTheDocument, toHaveClass, etc.) para o typecheck do `npm run build`.
import '@testing-library/jest-dom/vitest';

// Animações instantâneas nos testes: a saída do AnimatePresence completa na hora,
// então asserts de "elemento removido" não dependem de timing de animação.
MotionGlobalConfig.skipAnimations = true;

afterEach(cleanup);
