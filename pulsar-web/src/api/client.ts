import axios from 'axios';
import { irPara } from '../utils/navegacao';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pulsar_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const URL_SESSAO_ENCERRADA = '/login?sessao=encerrada';

/**
 * 401 numa requisição que levava token = sessão encerrada (SEC2: senha trocada, conta desativada,
 * "sair de todos" ou token antigo). 401 sem token é só credencial errada no login: não mexe em nada,
 * para a tela mostrar o erro dela.
 */
export function tratarErroResposta(err: unknown): Promise<never> {
  const e = err as { response?: { status?: number }; config?: { headers?: Record<string, unknown> } };
  if (e.response?.status === 401 && e.config?.headers?.Authorization) {
    localStorage.removeItem('pulsar_token');
    localStorage.removeItem('pulsar_usuario');
    irPara(URL_SESSAO_ENCERRADA);
  }
  return Promise.reject(err);
}

api.interceptors.response.use((res) => res, tratarErroResposta);

export default api;
