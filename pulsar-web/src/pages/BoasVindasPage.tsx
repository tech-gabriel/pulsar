import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FeatureCollection } from 'geojson';
import { useAuth } from '../contexts/AuthContext';
import { useFavoritos } from '../hooks/useFavoritos';
import { useNotificacoesPrefs } from '../hooks/useNotificacoesPrefs';
import { usePushSubscription } from '../hooks/usePushSubscription';
import { useSubprefeituras } from '../hooks/useSubprefeituras';
import { useGeolocalizacao } from '../hooks/useGeolocalizacao';
import { resolverSelecao } from '../utils/selecaoPorPonto';
import { track } from '../analytics';
import { useInstalacao } from '../features/ativacao/useInstalacao';
import { useAtivacao } from '../features/ativacao/useAtivacao';
import { marcarAtivacaoVista, type ContextoAtivacao } from '../features/ativacao/passos';
import Moldura from '../features/ativacao/telas/Moldura';
import TelaPromessa from '../features/ativacao/telas/TelaPromessa';
import TelaEscolher from '../features/ativacao/telas/TelaEscolher';
import TelaInstalar from '../features/ativacao/telas/TelaInstalar';
import TelaAlerta from '../features/ativacao/telas/TelaAlerta';
import TelaPronto from '../features/ativacao/telas/TelaPronto';

export default function BoasVindasPage() {
  const navigate = useNavigate();
  // Deep-link (?regiao=) que trouxe a pessoa: devolvido ao mapa no fim.
  const { search } = useLocation();
  const { usuario } = useAuth();
  const { favoritos, carregando, adicionarVarios } = useFavoritos(usuario?.id ?? null);
  const { prefs } = useNotificacoesPrefs();
  const push = usePushSubscription(prefs);
  const { instalacao, instalar } = useInstalacao();
  const { subprefeituras } = useSubprefeituras();
  const { detectar } = useGeolocalizacao();
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [alerta, setAlerta] = useState<'ativo' | 'negado' | 'nao-pedido'>('nao-pedido');
  const [instalou, setInstalou] = useState(false);

  useEffect(() => {
    fetch('/subprefeituras_wgs84.geojson').then((r) => r.json()).then(setGeojson).catch(() => setGeojson(null));
  }, []);

  const ctx: ContextoAtivacao | null = carregando || push.estado === 'carregando'
    ? null
    : { favoritas: favoritos.length, push: push.estado, instalacao };
  const { passos, passo, indice, direcao, avancar, voltar, pularPasso, irPara } = useAtivacao(ctx);

  const irAoMapa = useCallback(() => navigate(`/app${search}`, { replace: true }), [navigate, search]);
  const encerrar = useCallback(() => {
    marcarAtivacaoVista();
    irAoMapa();
  }, [irAoMapa]);

  useEffect(() => {
    if (passo !== 'pronto') return;
    marcarAtivacaoVista();
    track.ativacaoConcluida({ favoritas: favoritos.length, alerta: alerta === 'ativo', instalou });
  }, [passo]); // eslint-disable-line react-hooks/exhaustive-deps -- registra uma vez ao chegar no fim

  // Nada a fazer (ex.: entrou por Configurações já com tudo pronto): volta ao mapa.
  useEffect(() => {
    if (passos && passos.length === 0) encerrar();
  }, [passos, encerrar]);

  const localizar = useCallback(async () => {
    try {
      const { lat, lon } = await detectar();
      return resolverSelecao(lat, lon, geojson, subprefeituras, 'localizacao').sub?.id ?? null;
    } catch {
      return null;
    }
  }, [detectar, geojson, subprefeituras]);

  async function ativarAlerta() {
    const final = await push.ativar();
    if (final === 'ativo' || final === 'negado') {
      setAlerta(final);
      irPara('pronto'); // alerta é sempre o penúltimo passo
    }
    // 'inativo' = pedido fechado sem resposta: fica na tela para tentar de novo.
  }

  if (!passos || !passo) return null;

  const escolhidas = subprefeituras.filter((s) => favoritos.some((f) => f.subprefeituraId === s.id));
  const acaoTopo = passo === 'promessa'
    ? { rotulo: 'Pular', onClick: encerrar }
    : passo === 'pronto' ? undefined : { rotulo: 'Agora não', onClick: pularPasso };

  return (
    <Moldura total={passos.length} indice={indice} direcao={direcao} chave={passo}
      onVoltar={indice > 0 && passo !== 'pronto' ? voltar : undefined} acaoTopo={acaoTopo}>
      {passo === 'promessa' && <TelaPromessa onComecar={avancar} />}
      {passo === 'escolher' && (
        <TelaEscolher subprefeituras={subprefeituras} localizar={localizar}
          onContinuar={async (ids) => { const ok = await adicionarVarios(ids); if (ok) avancar(); return ok; }} />
      )}
      {passo === 'instalar' && (
        <TelaInstalar variante={instalacao === 'ios-safari' ? 'ios' : 'prompt'} onInstalar={instalar}
          onInstalado={() => { setInstalou(true); avancar(); }} onSemAlertas={() => irPara('pronto')} />
      )}
      {passo === 'alerta' && (
        <TelaAlerta nomes={escolhidas.map((s) => s.nome)} ocupado={push.ocupado} onAtivar={ativarAlerta}
          retomada={instalacao === 'instalado' && passos[0] === 'alerta'} />
      )}
      {passo === 'pronto' && (
        <TelaPronto primeiroNome={usuario?.nome.split(' ')[0] ?? ''} escolhidas={escolhidas} alerta={alerta} onVerMapa={irAoMapa} />
      )}
    </Moldura>
  );
}
