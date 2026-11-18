import { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { GeoJsonObject, FeatureCollection } from 'geojson';
import MapaBase, { type PontoBusca } from '../components/mapa/MapaBase';
import BuscaUnificada from '../components/mapa/BuscaUnificada';
import LayerControl from '../components/mapa/LayerControl';
import PainelLateral from '../components/painel/PainelLateral';
import DetalheSubprefeitura from '../components/painel/DetalheSubprefeitura';
import FolhaLugar from '../components/painel/FolhaLugar';
import ErrorBanner from '../components/ui/ErrorBanner';
import Header from '../components/ui/Header';
import type { Camada } from '../utils/camadas';
import { useAuth } from '../contexts/AuthContext';
import { useSubprefeituras } from '../hooks/useSubprefeituras';
import { useFavoritos } from '../hooks/useFavoritos';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNotificacoesPrefs } from '../hooks/useNotificacoesPrefs';
import { usePushSubscription } from '../hooks/usePushSubscription';
import { useInstalacao } from '../features/ativacao/useInstalacao';
import { jaViuAtivacao, precisaDeAtivacao } from '../features/ativacao/passos';
import ConvitePush from '../components/notificacoes/ConvitePush';
import BannerEscolherSubprefeituras from '../components/mapa/BannerEscolherSubprefeituras';
import { useGeolocalizacao, GeoError } from '../hooks/useGeolocalizacao';
import { resolverSelecao } from '../utils/selecaoPorPonto';
import { resumoAlertas } from '../utils/risco';
import { useToast } from '../contexts/ToastContext';
import { resolverDeepLink } from '../data/regioes-seo';
import OverlayAlagamentoToggle from '../components/mapa/OverlayAlagamentoToggle';
import CardAlagamentoProximo from '../components/mapa/CardAlagamentoProximo';
import { useOcorrenciasAlagamento } from '../hooks/useOcorrenciasAlagamento';
import { buscarOcorrenciasProximas, RAIO_PROXIMAS_M } from '../api/ocorrencias';
import type { SubprefeituraMapaDto, EnderecoBusca, OcorrenciasProximasDto } from '../types';
import { useAlturaFluida } from '../motion/useAlturaFluida';
import { useRota, ROTULO_LOCALIZACAO } from '../hooks/useRota';
import { useJsonPublico } from '../hooks/useJsonPublico';
import { comContornosDaBaixada } from '../utils/geo';
import { nomeDaCobertura } from '../features/cidade/cidade';
import { escolherDestinoComoChegar, rotuloDoPino, rotuloDoTrecho } from '../features/rota/destino';
import { buscarRuaPerto } from '../api/busca';
import { useRuaPerto } from '../hooks/useRuaPerto';
import CamposDePara from '../components/rota/CamposDePara';
import PainelRota from '../components/rota/PainelRota';
import { track } from '../analytics';
import type { PontoRota } from '../features/rota/tipos';
import type { LocalSalvoDto, TipoLocal } from '../types';
import { useLocaisSalvos } from '../hooks/useLocaisSalvos';
import { pontoDoLocal, subprefeituraIdDoPonto } from '../features/locais/regras';
import { centroDoTrecho, estacaoMaisForte, h3DoPonto, montarTrechos, ondeChoveuMais, trechosDe } from '../features/cidade/trechos';
import { useCelulasAgora } from '../hooks/useCelulasAgora';
import type { OrigemTrecho } from '../components/painel/DetalheSubprefeitura';

/** ?lugar= do aviso de chuva: "casa" | "trabalho"; outro valor não abre nada. */
const tipoDoParam = (v: string | null): TipoLocal | null => (v === 'casa' ? 'CASA' : v === 'trabalho' ? 'TRABALHO' : null);

export default function MapaPage() {
  const { usuario } = useAuth();
  const { subprefeituras, carregando, erro, recarregar, ultimaAtualizacao } = useSubprefeituras();
  const { favoritos, isFavorito, toggleFavorito, carregando: carregandoFavoritos } = useFavoritos();
  const semFavoritas = !!usuario && !carregandoFavoritos && favoritos.length === 0;
  const favoritas = subprefeituras.filter((s) => isFavorito(s.id));
  // Baixada escondida até o lançamento: só quem a recebe na lista (o Admin) baixa os contornos dela.
  const comBaixada = subprefeituras.some((a) => a.cidade === 'Baixada Santista');
  const contornosDaBaixada = useJsonPublico<FeatureCollection>('/baixada-santista-leve.geojson', comBaixada);
  const isMobile = useIsMobile(768);
  const navigate = useNavigate();
  const { search } = useLocation();
  const { prefs } = useNotificacoesPrefs();
  const push = usePushSubscription(prefs);
  const { instalacao } = useInstalacao();
  useEffect(() => {
    // Espera os dados: decidir com favoritos/push carregando mandaria todo mundo ao onboarding.
    if (!usuario || carregandoFavoritos || push.estado === 'carregando' || jaViuAtivacao()) return;
    if (precisaDeAtivacao({ favoritas: favoritos.length, push: push.estado, instalacao })) {
      navigate(`/app/boas-vindas${search}`, { replace: true });
    }
  }, [usuario, carregandoFavoritos, push.estado, favoritos.length, instalacao, navigate, search]);
  const { detectar, carregando: localizando } = useGeolocalizacao();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [geojson, setGeojson] = useState<GeoJsonObject | null>(null);
  const geojsonMapa = useMemo(() => {
    const capital = geojson as FeatureCollection | null;
    return capital && contornosDaBaixada.dados ? comContornosDaBaixada(capital, contornosDaBaixada.dados) : capital;
  }, [geojson, contornosDaBaixada.dados]);
  // Deep link /app?regiao=<slug> (SEO, sino, busca): reage a CADA troca do parâmetro,
  // não só ao primeiro carregamento. Subprefeitura abre o detalhe; zona só enquadra o mapa.
  // Slug inválido não repassa nada adiante: degradação limpa, sem foco.
  const slugParam = searchParams.get('regiao');
  const [slugAplicado, setSlugAplicado] = useState<string | null>(null);
  const [zonaEmFoco, setZonaEmFoco] = useState<string | null>(null);
  const [subSelecionada, setSubSelecionada] = useState<SubprefeituraMapaDto | null>(null);
  // Trecho tocado no mapa (índice H3). Toda outra forma de escolher a área o limpa.
  const [trechoTocado, setTrechoTocado] = useState<string | null>(null);
  // Trecho de onde a pessoa subiu para a área inteira (linha da área no cartão): fica fechado até outro toque.
  const [regiaoInteira, setRegiaoInteira] = useState<string | null>(null);
  // Casa ou trabalho aberto no mapa (F4b): a folha do lugar toma o lugar do detalhe. Declarado
  // aqui porque o ?regiao= abaixo precisa fechá-lo (alerta tocado com a casa aberta).
  const [lugarAberto, setLugarAberto] = useState<TipoLocal | null>(null);
  // Cada toque (ou abertura pelo aviso) conta: o mapa volta a aproximar mesmo no mesmo lugar.
  const [toqueLugar, setToqueLugar] = useState(0);
  // Cada "fechar" da folha do lugar: o mapa volta ao enquadramento de antes do toque.
  const [voltarDoLugar, setVoltarDoLugar] = useState(0);
  // Ajuste de estado durante o render (padrão do React p/ derivar de dados que chegam depois).
  if (slugParam !== slugAplicado && (subprefeituras.length > 0 || !slugParam)) {
    setSlugAplicado(slugParam);
    const alvo = slugParam ? resolverDeepLink(slugParam) : undefined;
    const sub = alvo?.nomeSub ? subprefeituras.find((s) => s.nome === alvo.nomeSub) ?? null : null;
    setZonaEmFoco(alvo && !alvo.nomeSub ? alvo.nomeRegiao : null);
    if (sub) {
      setLugarAberto(null);
      setSubSelecionada(sub);
      setTrechoTocado(null);
    }
  }
  const [painelMobileAberto, setPainelMobileAberto] = useState(false);
  // Tablet: o cartão do pé recolhe até só a busca, para devolver o mapa.
  const [painelRecolhido, setPainelRecolhido] = useState(false);
  const painelRef = useRef<HTMLElement>(null);
  useAlturaFluida(painelRef);
  const folhaRef = useRef<HTMLDivElement>(null);
  const menosMovimento = useReducedMotion();
  const detalheNaFolha = isMobile && subSelecionada;
  // Folha do detalhe aberta, guardada pelo id: trocar de subprefeitura volta para a curta sozinho.
  const [detalheAbertoEm, setDetalheAbertoEm] = useState<string | null>(null);
  const detalheAberto = !!subSelecionada && detalheAbertoEm === subSelecionada.id;
  const [camadaAtiva, setCamadaAtiva] = useState<Camada>('score');
  const [pontoBusca, setPontoBusca] = useState<PontoBusca | null>(null);
  const [avisoBusca, setAvisoBusca] = useState<string | null>(null);
  const [overlayAlagamento, setOverlayAlagamento] = useState(false);
  const [proximas, setProximas] = useState<OcorrenciasProximasDto | null>(null);
  // Modo rota: o De/Para toma o lugar da busca e o resultado, o do painel/folha.
  const [rotaAberta, setRotaAberta] = useState(false);
  const [rotuloBusca, setRotuloBusca] = useState<string | null>(null);
  // Trecho de destino da rota aberta a partir de um toque: fica contornado com a rota aberta.
  // Último ponto onde a pessoa soltou o pino: a rua dele chega depois e só vale se o pino não mudou.
  const ultimoSolto = useRef<{ lat: number; lon: number } | null>(null);
  // A rua de onde o pino caiu também vai para o campo da busca (crítica de 15/11).
  const [textoArrastado, setTextoArrastado] = useState<string | null>(null);
  // Lista da busca aberta: o convite de alertas sai do caminho.
  const [buscaAberta, setBuscaAberta] = useState(false);
  // Uma coisa por vez no celular: com a dica da localização na tela, o convite do push espera.
  const [dicaLocalNaTela, setDicaLocalNaTela] = useState(false);
  // O traçado do corredor roda sobre o contorno leve (247 kB); o completo (4,7 MB) fica só para o desenho do mapa.
  const contornoLeveCapital = useJsonPublico<FeatureCollection>('/subprefeituras-leve.geojson', rotaAberta);
  const contornoLeve = useMemo(
    () => ({ dados: contornoLeveCapital.dados && contornosDaBaixada.dados ? comContornosDaBaixada(contornoLeveCapital.dados, contornosDaBaixada.dados) : contornoLeveCapital.dados }),
    [contornoLeveCapital.dados, contornosDaBaixada.dados],
  );
  const rota = useRota(contornoLeve.dados, subprefeituras, rotaAberta);
  const locaisSalvos = useLocaisSalvos(usuario?.id ?? null);
  const localAberto = lugarAberto ? locaisSalvos.locais[lugarAberto] ?? null : null;
  const lugarEmFoco = useMemo(() => (localAberto ? { local: localAberto, toque: toqueLugar } : null), [localAberto, toqueLugar]);
  const lugarNaFolha = isMobile && !!localAberto;
  const lugaresNoMapa = useMemo(
    () => Object.values(locaisSalvos.locais).filter((l): l is LocalSalvoDto => !!l),
    [locaisSalvos.locais],
  );
  // Alagamento ativo na região da casa ou do trabalho: o marcador avisa antes do toque.
  const lugaresEmAlerta = useMemo(
    () => lugaresNoMapa
      .filter((l) => (subprefeituras.find((s) => s.id === l.subprefeituraId)?.alagamentosCge?.length ?? 0) > 0)
      .map((l) => l.tipo),
    [lugaresNoMapa, subprefeituras],
  );
  // Deep link do aviso de chuva (/app?lugar=casa): aplica quando os locais chegam, mesmo padrão
  // do ?regiao= (ajuste de estado no render); o efeito abaixo tira o parâmetro da URL.
  const lugarParam = searchParams.get('lugar');
  const [lugarAplicado, setLugarAplicado] = useState<string | null>(null);
  if (!lugarParam && lugarAplicado) setLugarAplicado(null);
  if (lugarParam && lugarParam !== lugarAplicado && !locaisSalvos.carregando) {
    setLugarAplicado(lugarParam);
    const tipo = tipoDoParam(lugarParam);
    if (tipo && locaisSalvos.locais[tipo]) {
      // O mesmo que abrirLugar faz, sem o evento (o efeito conta como 'aviso').
      setSubSelecionada(null);
      setTrechoTocado(null);
      setZonaEmFoco(null);
      setPainelRecolhido(false);
      setPainelMobileAberto(false);
      setToqueLugar((n) => n + 1);
      setLugarAberto(tipo);
    }
  }
  const rotaSemPontos = rotaAberta && !(rota.origem && rota.destino);
  const rotaNoCelular = isMobile && rotaAberta;
  useAlturaFluida(folhaRef, !rotaSemPontos); // a folha sai e volta (AnimatePresence)
  const { ocorrencias } = useOcorrenciasAlagamento(overlayAlagamento);

  // Trechos (hexágonos da grade): só na camada de risco e fora da rota. Os dados vêm quando o
  // mapa chega perto ou quando há um ponto (busca, localização), nunca na abertura de longe.
  const [perto, setPerto] = useState(false);
  // Também com a rota aberta (crítica de 15/11): o que a pessoa viu antes de tocar em Rota continua
  // no mapa, sem toque; o trecho de destino fica contornado.
  const comTrechos = camadaAtiva === 'score';
  const ativoTrechos = comTrechos && (perto || !!pontoBusca);
  const contornoCapital = useJsonPublico<FeatureCollection>('/grade-sao-paulo.geojson', ativoTrechos);
  // Baixada escondida: só quem a recebe na lista (o Admin) baixa o desenho dos trechos dela.
  const contornoBaixada = useJsonPublico<FeatureCollection>('/grade-baixada-santista.geojson', ativoTrechos && comBaixada);
  const contornoTrechos = useMemo(
    () => ({
      dados: contornoCapital.dados && contornoBaixada.dados
        ? { ...contornoCapital.dados, features: [...contornoCapital.dados.features, ...contornoBaixada.dados.features] }
        : contornoCapital.dados,
    }),
    [contornoCapital.dados, contornoBaixada.dados],
  );
  // Com uma área aberta as células também vêm: nomeiam a estação da chuva que gerou o risco dela.
  const celulasAgora = useCelulasAgora(ativoTrechos || !!subSelecionada, ultimaAtualizacao?.getTime() ?? null);
  const trechos = useMemo(() => (celulasAgora ? trechosDe(celulasAgora, subprefeituras) : null), [celulasAgora, subprefeituras]);
  const dadosTrechos = useMemo(
    () => (contornoTrechos.dados && trechos ? montarTrechos(contornoTrechos.dados, trechos) : null),
    [contornoTrechos.dados, trechos],
  );
  // Sem dica do trecho (H1, 16/11/2026): de perto só há hexágonos para tocar, e o "Como ler" explica.
  // O trecho tocado ganha do trecho do ponto; os dois só valem se forem da área aberta.
  // Na rota, o trecho do destino fica marcado, venha ele de um toque, de uma busca ou do campo Para.
  const [dLat, dLon] = [rota.destino?.lat, rota.destino?.lon];
  const h3DoDestino = useMemo(
    () => (dLat != null && dLon != null ? h3DoPonto(dLat, dLon, contornoTrechos.dados) : null),
    [dLat, dLon, contornoTrechos.dados],
  );
  const h3DoPontoBusca = useMemo(
    () => (pontoBusca ? h3DoPonto(pontoBusca.lat, pontoBusca.lon, contornoTrechos.dados) : null),
    [pontoBusca, contornoTrechos.dados],
  );
  const trechoAberto = (() => {
    const h3 = trechoTocado ?? h3DoPontoBusca;
    const t = h3 && h3 !== regiaoInteira ? trechos?.get(h3) : undefined;
    if (!t || !subSelecionada || t.areaId !== subSelecionada.id) return undefined;
    const origem: OrigemTrecho = trechoTocado ? 'toque'
      : pontoBusca?.precisao !== undefined ? 'localizacao'
      : pontoBusca?.ajustado ? 'ponto' : 'busca';
    return { ...t, origem };
  })();
  // O título do cartão do trecho: o endereço buscado ou a rua mais perto do ponto (escolha A, 16/11/2026).
  const pontoDaRua = !trechoAberto ? null
    : trechoAberto.origem === 'toque' ? centroDoTrecho(trechoAberto.h3, contornoTrechos.dados)
    : trechoAberto.origem === 'localizacao' ? pontoBusca : null;
  const ruaDoTrecho = useRuaPerto(pontoDaRua);
  const trechoNoCartao = trechoAberto && subSelecionada ? {
    ...trechoAberto,
    titulo: (trechoAberto.origem === 'busca' || trechoAberto.origem === 'ponto') && rotuloBusca ? rotuloBusca
      : ruaDoTrecho ? rotuloDoTrecho(subSelecionada.nome, ruaDoTrecho) : undefined,
  } : undefined;
  const verRegiaoInteira = () => { if (trechoAberto) setRegiaoInteira(trechoAberto.h3); setTrechoTocado(null); };
  // Onde foi medida a chuva do risco aberto: a estação do trecho, ou a que mais mediu na área
  // quando o número dela veio da medida. O mapa marca esse ponto.
  const estacaoDoRisco = trechoAberto?.estacao
    ?? (subSelecionada && (subSelecionada.scoreAtual?.chuva3hMedidaMm ?? 0) > 0 ? estacaoMaisForte(trechos, subSelecionada.id) : null);
  const pontoMedida = estacaoDoRisco?.lat != null && estacaoDoRisco.lon != null && estacaoDoRisco.mm3h > 0
    ? { lat: estacaoDoRisco.lat, lon: estacaoDoRisco.lon, rotulo: `Chuva medida ${ondeChoveuMais(estacaoDoRisco)}` }
    : null;

  function handleTocarTrecho(h3: string) {
    const t = trechos?.get(h3);
    const area = t && subprefeituras.find((s) => s.id === t.areaId);
    if (!t || !area) return;
    track.tocouTrecho(t.faixa);
    limparDeepLink();
    setLugarAberto(null);
    setSubSelecionada(area);
    setRegiaoInteira(null);
    setTrechoTocado(h3);
    setPainelRecolhido(false);
    setZonaEmFoco(null);
    if (isMobile) setPainelMobileAberto(false);
  }




  useEffect(() => {
    fetch('/subprefeituras_wgs84.geojson')
      .then((r) => r.json())
      .then(setGeojson)
      .catch(() => console.warn('GeoJSON não encontrado'));
  }, []);

  // Trava o scroll do body enquanto o mapa está montado (evita pull-to-refresh /
  // bounce no mobile). Páginas com scroll (histórico, auth) não usam esta classe.
  useEffect(() => {
    document.body.classList.add('mapa-lock');
    return () => document.body.classList.remove('mapa-lock');
  }, []);

  // O deep link já foi aplicado; tirá-lo da URL faz o próximo toque no mesmo link
  // (sino, busca) contar como novo, em vez de cair numa URL que não mudou.
  function limparDeepLink() {
    if (!searchParams.has('regiao')) return;
    const p = new URLSearchParams(searchParams);
    p.delete('regiao');
    setSearchParams(p, { replace: true });
  }

  // O ?lugar= já foi aplicado (aberto ou descartado): conta o evento e sai da URL.
  useEffect(() => {
    if (!lugarParam || lugarAplicado !== lugarParam) return;
    // Conta pelo que o link pediu e só se ele existe (não pelo lugar que já estava aberto).
    const tipo = tipoDoParam(lugarParam);
    if (tipo && locaisSalvos.locais[tipo]) track.abriuLugar(tipo === 'CASA' ? 'casa' : 'trabalho', 'aviso');
    const p = new URLSearchParams(searchParams);
    p.delete('lugar');
    setSearchParams(p, { replace: true });
  }, [lugarParam, lugarAplicado, locaisSalvos.locais, searchParams, setSearchParams]);

  function abrirLugar(tipo: TipoLocal) {
    limparDeepLink();
    track.abriuLugar(tipo === 'CASA' ? 'casa' : 'trabalho', 'mapa');
    setSubSelecionada(null);
    setTrechoTocado(null);
    setZonaEmFoco(null);
    setPainelRecolhido(false);
    if (isMobile) setPainelMobileAberto(false);
    setToqueLugar((n) => n + 1);
    setLugarAberto(tipo);
  }

  // A origem padrão é onde a pessoa está; sem localização, o campo De fica vazio e pede um lugar.
  async function abrirRota(de: 'chip' | 'como_chegar', destino: PontoRota | null = null) {
    track.abriuRota(de);
    setLugarAberto(null);
    setRotaAberta(true);
    setPainelRecolhido(false);
    rota.setOrigem(null);
    rota.setDestino(destino);
    try {
      const { lat, lon } = await detectar();
      rota.setOrigem((atual) => atual ?? { lat, lon, rotulo: ROTULO_LOCALIZACAO });
    } catch {
      /* sem localização: a pessoa escolhe o ponto de partida */
    }
  }

  // "Minha localização" no campo De: volta a sair de onde a pessoa está.
  async function origemNaLocalizacao() {
    try {
      const { lat, lon } = await detectar();
      rota.setOrigem({ lat, lon, rotulo: ROTULO_LOCALIZACAO });
    } catch (err) {
      showToast(err instanceof GeoError && err.tipo === 'negado'
        ? 'Permita o acesso à localização no navegador para sair de onde você está.'
        : 'Não consegui te localizar agora. Escolha o ponto de partida pelo endereço.', 'error');
    }
  }

  function fecharRota() {
    setRotaAberta(false);
    rota.setOrigem(null);
    rota.setDestino(null);
  }

  // "Rota até aqui" no detalhe: a ordem dos destinos fica em escolherDestinoComoChegar.
  function comoChegar(sub: SubprefeituraMapaDto) {
    const centro = trechoAberto?.origem === 'toque' ? centroDoTrecho(trechoAberto.h3, contornoTrechos.dados) : null;
    const destino = escolherDestinoComoChegar(sub, pontoBusca, rotuloBusca, contornoLeve.dados ?? geojsonMapa, centro);
    const paraOTrecho = !!centro && destino.lat === centro.lat && destino.lon === centro.lon;
    // Trecho: o rótulo final é a rua, que chega em seguida; até lá diz que está buscando, em vez
    // de mostrar um nome e trocá-lo depois.
    void abrirRota('como_chegar', paraOTrecho ? { ...destino, rotulo: 'Buscando a rua…' } : destino);
    // Destino no trecho: a rota abre com o nome da região e ganha a rua mais perto quando ela chega
    // (só se a pessoa ainda não trocou o destino).
    if (centro && paraOTrecho) {
      // Sem rua por perto (ou com a busca fora do ar) fica o nome da região: "Trecho na Mooca".
      void buscarRuaPerto(centro.lat, centro.lon).then((r) => {
        rota.setDestino((d) => (d && d.lat === centro.lat && d.lon === centro.lon ? { ...d, rotulo: rotuloDoTrecho(sub.nome, r?.rua ?? null) } : d));
      });
    }
  }

  function fecharDetalhe() {
    limparDeepLink();
    setZonaEmFoco(null);
    setSubSelecionada(null);
    setTrechoTocado(null);
    setDetalheAbertoEm(null);
    setPontoBusca(null);
    setAvisoBusca(null);
    setProximas(null);
    setRotuloBusca(null);
  }

  // Núcleo compartilhado por busca e geolocalização: resolve o ponto para uma
  // seleção de região (ou aviso) e aplica no estado do mapa. Devolve a subprefeitura (null fora da área).
  function selecionarPorPonto(ponto: PontoBusca, origem: 'busca' | 'localizacao'): SubprefeituraMapaDto | null {
    setPontoBusca(ponto);
    setTrechoTocado(null); // o trecho passa a ser o do ponto
    const sel = resolverSelecao(ponto.lat, ponto.lon, geojsonMapa, subprefeituras, origem);
    if (sel.aviso) {
      setSubSelecionada(null);
      setAvisoBusca(sel.aviso);
      return null;
    }
    setAvisoBusca(null);
    setSubSelecionada(sel.sub);
    setPainelRecolhido(false);
    setZonaEmFoco(null);
    if (isMobile) setPainelMobileAberto(false);
    return sel.sub;
  }

  // Pin arrastado: o ponto passa a ser exato (sem círculo nem aviso) e o mapa não voa. O nome
  // do destino passa a ser a rua de onde o pino caiu (escolha de 15/11), não o que foi digitado:
  // o pino pode ter ido parar em outra rua.
  function handleMoverPonto(lat: number, lon: number) {
    const sub = selecionarPorPonto({ lat, lon, ajustado: true }, 'busca');
    setRotuloBusca(null);
    ultimoSolto.current = { lat, lon };
    if (sub) {
      void buscarRuaPerto(lat, lon).then((r) => {
        const agora = ultimoSolto.current;
        if (r && agora && agora.lat === lat && agora.lon === lon) {
          const rotulo = rotuloDoPino(sub.nome, r.rua, r.metros);
          setRotuloBusca(rotulo);
          setTextoArrastado(rotulo);
        }
      });
    }
    void atualizarProximas(lat, lon);
  }

  // Seleção de um endereço na busca: marca o ponto no mapa, voa até ele e resolve
  // a subprefeitura/região correspondente (point-in-polygon sobre o GeoJSON já
  // carregado), abrindo o painel de detalhe. Fora dos polígonos → aviso.
  function handleSelecionarEndereco(endereco: EnderecoBusca, numeroFaltando?: string) {
    const dentro = selecionarPorPonto({ lat: endereco.latitude, lon: endereco.longitude }, 'busca');
    setRotuloBusca(endereco.nome || endereco.descricao);
    ultimoSolto.current = null;
    // O mapa não tem o número digitado: a rota vai exatamente para onde a pessoa soltar o pino.
    if (dentro && numeroFaltando) setAvisoBusca(`O mapa não tem o número ${numeroFaltando}. Arraste o pino até a porta.`);
  }

  async function atualizarProximas(lat: number, lon: number) {
    if (!overlayAlagamento) return;
    try {
      setProximas(await buscarOcorrenciasProximas(lat, lon));
    } catch {
      // silencioso: o card de proximidade é complementar; a região já foi resolvida
    }
  }

  // Botão "usar minha localização": detecta o ponto e reusa selecionarPorPonto.
  // Leitura pior que o raio do "perto de mim" pede ajuste manual do pin.
  async function handleUsarLocalizacao() {
    try {
      const { lat, lon, precisao } = await detectar();
      const dentro = selecionarPorPonto({ lat, lon, precisao }, 'localizacao');
      setRotuloBusca(null);
      if (dentro && precisao > RAIO_PROXIMAS_M) {
        setAvisoBusca(`Localização aproximada (±${Math.round(precisao)} m). Arraste o pin para ajustar.`);
      }
      await atualizarProximas(lat, lon);
    } catch (err) {
      const tipo = err instanceof GeoError ? err.tipo : 'indisponivel';
      showToast(
        tipo === 'negado'
          ? 'Permita o acesso à localização no navegador para ver sua subprefeitura.'
          : 'Não consegui te localizar agora. Tente de novo ou busque pelo endereço.',
        'error',
      );
    }
  }

  // Toque numa subprefeitura (mapa, painel, busca): abre o detalhe dela e marca o
  // polígono (highlight + centralização).
  function handleSelecionarSub(sub: SubprefeituraMapaDto) {
    limparDeepLink();
    setLugarAberto(null);
    setSubSelecionada(sub);
    setTrechoTocado(null);
    setPainelRecolhido(false);
    setZonaEmFoco(null);
    if (isMobile) setPainelMobileAberto(false);
  }

  const buscaMapa = (embutida: boolean) => (
    <BuscaUnificada
      areas={subprefeituras}
      onSelecionarArea={handleSelecionarSub}
      onSelecionar={handleSelecionarEndereco}
      isMobile={isMobile}
      onUsarLocalizacao={handleUsarLocalizacao}
      localizando={localizando}
      onAbrirRota={() => void abrirRota('chip')}
      embutida={embutida}
      semDica={!!localAberto}
      aviso={isMobile ? avisoBusca : null}
      textoBusca={textoArrastado}
      onListaAberta={setBuscaAberta}
      onDicaVisivel={setDicaLocalNaTela}
    />
  );

  // Casa ou trabalho salvos direto da rota: só endereço dentro da cidade.
  async function salvarLocal(tipo: TipoLocal, p: PontoRota) {
    if (!contornoLeve.dados || subprefeituras.length === 0) {
      showToast('Ainda carregando o mapa das regiões. Tente de novo em instantes.', 'info');
      return false;
    }
    const id = subprefeituraIdDoPonto(p, contornoLeve.dados, subprefeituras);
    if (!id) {
      showToast(`Esse endereço fica fora da área coberta (${nomeDaCobertura(subprefeituras)}).`, 'error');
      return false;
    }
    return locaisSalvos.salvar(tipo, p, id, 'rota');
  }

  const folhaLugar = localAberto && (
    <FolhaLugar
      key={localAberto.tipo}
      local={localAberto}
      area={subprefeituras.find((s) => s.id === localAberto.subprefeituraId)}
      carregando={carregando}
      onFechar={() => {
        setLugarAberto(null);
        setVoltarDoLugar((n) => n + 1);
      }}
      onVerRegiao={() => {
        const area = subprefeituras.find((s) => s.id === localAberto.subprefeituraId);
        setLugarAberto(null);
        if (area) handleSelecionarSub(area);
      }}
      onRota={() => void abrirRota('como_chegar', pontoDoLocal(localAberto))}
    />
  );

  const camposRota = (embutida: boolean) => (
    <CamposDePara
      areas={subprefeituras}
      origem={rota.origem}
      destino={rota.destino}
      onOrigem={rota.setOrigem}
      onDestino={rota.setDestino}
      onInverter={() => { const o = rota.origem; rota.setOrigem(rota.destino); rota.setDestino(o); }}
      onFechar={fecharRota}
      embutida={embutida}
      locais={locaisSalvos.locais}
      onSalvarLocal={salvarLocal}
      carregandoLocais={locaisSalvos.carregando}
      onMinhaLocalizacao={() => void origemNaLocalizacao()}
    />
  );

  const resultadoRota = (
    <PainelRota
      resultado={rota.resultado}
      origem={rota.origem}
      destino={rota.destino}
      carregando={rota.carregando}
      erro={rota.erro}
      avisoPedido={rota.avisoPedido}
      onPedirAviso={() => void rota.pedirAviso()}
      avisoIndisponivel={rota.avisoIndisponivel}
      onTentarDeNovo={rota.tentarDeNovo}
      onCancelarAviso={() => void rota.cancelarAviso()}
      faixaDaArea={(id) => subprefeituras.find((s) => s.id === id)?.faixaRisco}
      cobertura={nomeDaCobertura(subprefeituras)}
      onTrocar={(ponto) => {
        (ponto === 'origem' ? rota.setOrigem : rota.setDestino)(null);
        // O De/Para é o mesmo no celular e no painel: um só está montado.
        document.querySelector<HTMLInputElement>(`[data-campos-rota] input[aria-label="${ponto === 'origem' ? 'De' : 'Para'}"]`)?.focus();
      }}
      atualizadoEm={rota.atualizadoEm}
    />
  );

  return (
    <div className="relative h-[calc(100dvh-var(--seguro-topo))] overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* Header de navegação (ETAPA B.1): top bar + tab bar mobile no rodapé */}
      <Header />

      {/* ══════════════════════════════════════════
          PAINEL FLUTUANTE — tablet e computador
          Cartão de vidro do tamanho do conteúdo, com a busca dentro (pesquisou, a resposta
          aparece embaixo). Tablet: no pé do mapa, recolhível. Computador: à direita.
          A altura anima ao trocar lista, detalhe e resultados (useAlturaFluida).
          Vem antes do mapa no DOM: no Tab, a busca chega logo depois do cabeçalho, não depois
          dos 32 números (o z-index do painel, não a ordem, o põe sobre o mapa).
      ══════════════════════════════════════════ */}
      <aside
        ref={painelRef}
        data-painel-mapa
        className={[
          'painel-flutuante painel-mapa vidro-painel vidro-surge hidden md:flex flex-col',
          (subSelecionada || localAberto) && !painelRecolhido ? 'com-detalhe' : '',
        ].join(' ')}
      >
        {/* Alça do tablet: recolhe o cartão até só a busca. */}
        <button
          type="button"
          className="lg:hidden flex-shrink-0 h-5 w-full flex items-end justify-center"
          onClick={() => setPainelRecolhido((v) => !v)}
          aria-expanded={!painelRecolhido}
          aria-label={painelRecolhido ? 'Mostrar o painel' : 'Recolher o painel'}
        >
          <span className="w-9 h-[5px] rounded-full" style={{ background: 'color-mix(in srgb, var(--text-primary) 22%, transparent)' }} />
        </button>

        {!isMobile && (rotaAberta ? camposRota(true) : buscaMapa(true))}

        <div key={rotaAberta ? 'rota' : localAberto ? `lugar-${localAberto.tipo}` : subSelecionada?.id ?? 'lista'} className={['painel-conteudo flex-1 min-h-0 flex flex-col', painelRecolhido ? 'lg:flex hidden' : ''].join(' ')}>
          {rotaAberta ? (
            <div className="painel-scroll flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{resultadoRota}</div>
          ) : !isMobile && folhaLugar ? (
            folhaLugar
          ) : subSelecionada ? (
            <DetalheSubprefeitura
              key={subSelecionada.id}
              area={subSelecionada}
              onFechar={fecharDetalhe}
              isFavorito={isFavorito}
              onToggleFavorito={toggleFavorito}
              onComoChegar={() => comoChegar(subSelecionada)}
              trecho={trechoNoCartao}
              onVerRegiao={verRegiaoInteira}
              estacaoMaisForte={estacaoMaisForte(trechos, subSelecionada.id)}
            />
          ) : (
            <PainelLateral
              areas={subprefeituras}
              favoritas={favoritas}
              carregando={carregando}
              erro={erro}
              ultimaAtualizacao={ultimaAtualizacao}
              onRecarregar={recarregar}
              onSelecionar={handleSelecionarSub}
            />
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MAPA — camada de fundo absoluta
          Abaixo do header (48px mobile / 64px desktop); no mobile termina
          acima da tab bar inferior (48px).
      ══════════════════════════════════════════ */}
      <div data-transicao className={`mapa-app absolute inset-0 z-0 `}>
        {/* Celular: busca sobreposta ao mapa, antes dele no Tab. Tablet e computador: ela mora no painel. */}
        {isMobile && (rotaAberta ? camposRota(false) : buscaMapa(false))}

        <MapaBase
          geojson={geojsonMapa}
          subprefeituras={subprefeituras}
          subSelecionada={subSelecionada}
          onSelecionarSub={handleSelecionarSub}
          camadaAtiva={camadaAtiva}
          zonaEmFoco={zonaEmFoco}
          subSelecionadaAtiva={!!subSelecionada}
          pontoBusca={rotaAberta ? null : pontoBusca}
          onMoverPonto={handleMoverPonto}
          overlayAlagamento={overlayAlagamento}
          ocorrencias={ocorrencias}
          rota={rotaAberta ? rota.linha : null}
          destinoSemRota={rotaAberta && !rota.linha ? rota.destino : null}
          semZoom={rotaNoCelular}
          lugares={rotaAberta ? undefined : lugaresNoMapa}
          onTocarLugar={abrirLugar}
          lugarEmFoco={lugarEmFoco}
          voltarDoLugar={voltarDoLugar}
          lugaresEmAlerta={lugaresEmAlerta}
          trechos={comTrechos ? dadosTrechos : null}
          trechoSelecionado={rotaAberta
            ? h3DoDestino
            : trechoAberto?.h3 ?? null}
          onTocarTrecho={rotaAberta ? undefined : handleTocarTrecho}
          onPerto={setPerto}
          pontoMedida={pontoMedida}
        />

        {/* Na rota do celular os controles do mapa saem: a tela é do caminho (voltam ao fechar). */}
        {!rotaNoCelular && (
          <>
            {/* Sidebar de camadas (ETAPA 3): vertical no desktop, horizontal no mobile */}
            <LayerControl
              camadaAtiva={camadaAtiva}
              onChange={setCamadaAtiva}
              isMobile={isMobile}
              overlayAlagamento={overlayAlagamento}
            />

            {/* Overlay de alagamentos (12 meses) — liga/desliga independente das camadas */}
            <OverlayAlagamentoToggle
              ativo={overlayAlagamento}
              onToggle={() => setOverlayAlagamento((v) => !v)}
              isMobile={isMobile}
            />
          </>
        )}

        {/* Pilha da legenda e dos avisos (tablet: à direita, no alto; computador: à esquerda, no pé).
            No celular a pilha some (display: contents) e cada peça se posiciona sozinha. */}
        <div className="pilha-mapa">
          {/* Aviso do ponto buscado. Só no computador: no celular ele fica embaixo da busca. */}
          {avisoBusca && !isMobile && (
            <div className="superficie rounded-2xl mapa-txt cartao-pe-mapa px-4 py-2.5 text-xs">
              {avisoBusca}
            </div>
          )}

          {/* Convite para ativar notificações push. Sem favorita o push não tem o que mandar:
              primeiro escolher, depois ativar. Com a rota aberta ele sai: o mapa é do caminho. */}
          {!rotaAberta && !buscaAberta && !(isMobile && dicaLocalNaTela) && (semFavoritas
            ? <BannerEscolherSubprefeituras onEscolher={() => setPainelMobileAberto(true)} />
            : <ConvitePush favoritas={favoritas} />)}

          {/* Card "perto de mim": contagem de alagamentos + risco elevado (Fase B) */}
          {proximas && (
            <CardAlagamentoProximo dados={proximas} onFechar={() => setProximas(null)} />
          )}
        </div>
      </div>

      {/* Banner de erro sobre o mapa */}
      {erro && !subSelecionada && (
        <div className="absolute top-[calc(var(--topo-app)+0.5rem)] left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 pointer-events-none">
          <div className="pointer-events-auto">
            <ErrorBanner mensagem={erro} onRetry={recarregar} />
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════
          FOLHA DO CELULAR: o mesmo cartão de vidro do computador, flutuando acima da barra de
          abas e do tamanho do conteúdo (useAlturaFluida anima a troca). Fechada, é só a linha do
          resumo; aberta, a lista; com uma subprefeitura escolhida, o detalhe dela.
      ══════════════════════════════════════════ */}
      {/* Na rota sem os dois pontos a folha sai por baixo, e volta pelo mesmo caminho quando há
          caminho para avaliar (ou ao fechar a rota). Com menos movimento, só opacidade. */}
      <AnimatePresence initial={false}>
      {!rotaSemPontos && (
      <motion.div
        key="folha"
        ref={folhaRef}
        data-painel-mapa
        data-aberta={painelMobileAberto || detalheNaFolha || lugarNaFolha || rotaAberta ? '' : undefined}
        data-detalhe={rotaAberta || lugarNaFolha ? '' : detalheNaFolha ? (detalheAberto ? 'aberta' : 'curta') : undefined}
        className="folha-mapa painel-mapa vidro-painel md:hidden fixed z-[500] flex flex-col overflow-hidden"
        initial={menosMovimento ? { opacity: 0 } : { y: 'calc(100% + 16px)' }}
        animate={menosMovimento
          ? { opacity: 1, transition: { duration: 0.15 } }
          : { y: 0, transition: { type: 'spring', bounce: 0.15, visualDuration: 0.45 } }}
        exit={menosMovimento
          ? { opacity: 0, transition: { duration: 0.15 } }
          : { y: 'calc(100% + 16px)', transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }}
      >
        {rotaAberta ? (
          <div key="rota" className="painel-conteudo flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-2 pb-4">{resultadoRota}</div>
        ) : lugarNaFolha ? (
          <div key={`lugar-${localAberto?.tipo}`} className="painel-conteudo flex-1 min-h-0 flex flex-col">{folhaLugar}</div>
        ) : detalheNaFolha ? (
          <div key={detalheNaFolha.id} className="painel-conteudo flex-1 min-h-0 flex flex-col">
            <DetalheSubprefeitura
              area={detalheNaFolha}
              onFechar={fecharDetalhe}
              isFavorito={isFavorito}
              onToggleFavorito={toggleFavorito}
              onComoChegar={() => comoChegar(detalheNaFolha)}
              trecho={trechoNoCartao}
              onVerRegiao={verRegiaoInteira}
              estacaoMaisForte={estacaoMaisForte(trechos, detalheNaFolha.id)}
              folha={{ aberta: detalheAberto, onMudar: (a) => setDetalheAbertoEm(a ? detalheNaFolha.id : null) }}
            />
          </div>
        ) : (
          <>
            <button
              type="button"
              className={['flex-shrink-0 w-full flex flex-col items-center select-none', painelMobileAberto ? 'h-6 justify-end' : 'h-14 justify-center'].join(' ')}
              onClick={() => setPainelMobileAberto((v) => !v)}
              aria-expanded={painelMobileAberto}
              aria-label={painelMobileAberto ? 'Recolher painel' : 'Expandir painel'}
            >
              <span className="w-9 h-[5px] rounded-full flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--text-primary) 22%, transparent)' }} />
              {/* Fechada, a alça é a única linha visível: mostra o resumo. Aberta, o cartão da cidade já resume. */}
              {!painelMobileAberto && (
                <span className="w-full px-5 mt-2 text-sm font-semibold truncate text-center" style={{ color: 'var(--text-primary)' }}>
                  {resumoAlertas(subprefeituras, carregando)}
                </span>
              )}
            </button>
            {painelMobileAberto && (
              <div className="painel-conteudo flex-1 min-h-0 flex flex-col">
                <PainelLateral
                  areas={subprefeituras}
                  favoritas={favoritas}
                  carregando={carregando}
                  erro={erro}
                  ultimaAtualizacao={ultimaAtualizacao}
                  onRecarregar={recarregar}
                  onSelecionar={handleSelecionarSub}
                />
              </div>
            )}
          </>
        )}
      </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
