import { useEffect, useRef, useState } from 'react';
import { Loader2, Share2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useCatalogoDicas } from '../../hooks/useCatalogoDicas';
import { CIDADE_ATUAL } from '../cidade/cidade';
import type { Area } from '../cidade/areas';
import { dadosDoCard } from './dadosDoCard';
import { desenharCard } from './desenharCard';
import { carregarFontesCard, compartilharCard, gerarPng } from './compartilhar';

/** Gera o card da subprefeitura no próprio aparelho e abre o compartilhar (ou baixa e copia). */
export default function BotaoCompartilhar({ area }: { area: Area }) {
  const catalogo = useCatalogoDicas();
  const { showToast } = useToast();
  const [gerando, setGerando] = useState(false);
  // O state só muda no próximo render; o ref barra o segundo toque no mesmo tick.
  const ocupado = useRef(false);

  // Fontes já no aparecer do botão: o compartilhar nativo exige o gesto recente, e esperar
  // a rede depois do toque pode estourar esse limite. A falha aqui é ignorada: o toque tenta de novo.
  useEffect(() => { carregarFontesCard().catch(() => {}); }, []);

  async function compartilhar() {
    if (ocupado.current) return;
    ocupado.current = true;
    setGerando(true);
    try {
      await carregarFontesCard();
      const dados = dadosDoCard(area, catalogo);
      const canvas = document.createElement('canvas');
      desenharCard(canvas, dados, CIDADE_ATUAL.areas);
      const r = await compartilharCard(await gerarPng(canvas), dados);
      if (r === 'baixado') showToast('Imagem salva e link copiado', 'success');
      if (r === 'baixado-sem-link') showToast('Imagem salva', 'success');
      if (r === 'aberto') showToast('Toque e segure a imagem para salvar. Link copiado.', 'success');
      if (r === 'aberto-sem-link') showToast('Toque e segure a imagem para salvar.', 'success');
    } catch (e) {
      console.error('Falha ao gerar o card compartilhável', e);
      showToast('Não foi possível gerar a imagem agora', 'error');
    } finally {
      ocupado.current = false;
      setGerando(false);
    }
  }

  return (
    <button type="button" onClick={compartilhar} aria-disabled={gerando} aria-busy={gerando}
      className="rounded-xl min-h-11 flex items-center justify-center gap-1.5 font-semibold"
      style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13 }}>
      {gerando ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />} Compartilhar
    </button>
  );
}
