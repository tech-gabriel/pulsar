import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// Registra os matchers do jest-dom no `expect` e augmenta os tipos do Vitest
// (toBeInTheDocument, toHaveClass, etc.) para o typecheck do `npm run build`.
import '@testing-library/jest-dom/vitest';

afterEach(cleanup);
