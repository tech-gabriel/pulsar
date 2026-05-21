# PULSAR | Design System — v1.0

**UNIVERSIDADE FEDERAL DE MATO GROSSO DO SUL** — Curso de Tecnologia da Informação

*Pulsar: O mapa vivo da sua segurança.* — São Paulo, SP - 2026

---

## 1. STACK TECNOLÓGICO

| Tecnologia | Uso |
|---|---|
| React | Componentes reutilizáveis |
| Tailwind CSS | Framework CSS utility-first |
| Leaflet.js | Mapas interativos + heatmap |
| Recharts | Gráficos de histórico |
| Lucide React | Ícones (tree-shakeable, MIT, 1000+) |
| Plus Jakarta Sans | Headings e destaques |
| DM Sans | Corpo de texto |
| JetBrains Mono | Dados numéricos e código |

---

## 2. DESIGN TOKENS

### Paleta Primária (Ciano/Azul)

| Nível | Hex | Uso |
|---|---|---|
| 50 | #F0F9FF | Fundo áreas destacadas |
| 100 | #DFF2FE | Fundo cards/painéis |
| 200 | #B8E6FE | Bordas suaves, hover |
| 300 | #74D4FF | Elementos decorativos |
| 400 | #00BCFF | Botões secundários, links |
| 500 | #00A6F4 | Destaque principal |
| 600 | #0084D1 | Botões primários, CTA |
| 700 | #0069A8 | Headers, bordas ativas |
| 800 | #00598A | Texto sobre fundo claro |
| 900 | #024A70 | Títulos principais |
| 950 | #052F4A | Fundo dark mode |

### Cores Semânticas

| Tipo | Score | Background | Texto |
|---|---|---|---|
| Baixo | 0–30 | #D4EDDA | #155724 |
| Moderado | 31–60 | #FFF3CD | #856404 |
| Alto | 61–100 | #F8D7DA | #721C24 |
| Info | — | #DFF2FE | #024A70 |
| Sucesso | — | #D4EDDA | #155724 |
| Erro | — | #F8D7DA | #721C24 |

### Espaçamento (múltiplos de 4px)

| Token | Valor | Contexto |
|---|---|---|
| xs | 4px | Entre ícones e texto inline |
| sm | 8px | Padding mínimo, gap entre badges |
| md | 12px | Padding de botões, gap entre cards |
| lg | 16px | Padding de cards, margens internas |
| xl | 24px | Separação entre seções |
| xxl | 32px | Padding de containers principais |
| xxxl | 48px | Margem entre módulos da página |

### Border Radius

| Token | Valor | Uso |
|---|---|---|
| sm | 6px | Badges, tags, inputs pequenos |
| md | 8px | Botões, inputs, dropdowns |
| lg | 12px | Cards, containers, modais |
| xl | 16px | Cards destacados, hero sections |
| full | 9999px | Pills, badges arredondados, avatares |

### Sombras

| Token | Valor | Uso |
|---|---|---|
| sm | 0 1px 2px rgba(0,0,0,0.06) | Cards, inputs |
| md | 0 2px 8px rgba(0,0,0,0.08) | Dropdowns, tooltips |
| lg | 0 4px 16px rgba(0,0,0,0.10) | Modais, popovers |
| xl | 0 8px 32px rgba(0,0,0,0.12) | Overlays, menus flutuantes |

---

## 3. TIPOGRAFIA

| Família | Uso | Pesos | Tracking |
|---|---|---|---|
| Plus Jakarta Sans | Headings, display | 600, 700 | -0.02em |
| DM Sans | Corpo, labels | 400, 500 | 0 |
| JetBrains Mono | Dados, código | 400, 500 | 0 |

---

## 4. SISTEMA DE ÍCONES — Lucide React

### Tamanhos Padrão

| Tamanho | Pixels | Contexto |
|---|---|---|
| Inline | 16px | Texto, labels, badges |
| Default | 20px | Botões, inputs, navegação |
| Destaque | 24px | Stat cards, alertas, cards de região |
| Display | 32px | Hero sections, estados vazios |

### Catálogo por Categoria

**Clima:**
Cloud (nublado), CloudRain (chuva), CloudLightning (tempestade), Wind (vento), Eye (visibilidade), Sun (UV), Thermometer (temperatura), Droplets (umidade)

**Navegação e Ações:**
Home, Map, BarChart3, History, Search, Bell, RefreshCw, Layers, Filter, Settings

**Status e Feedback:**
CheckCircle (sucesso), AlertTriangle (atenção), XCircle (erro), Info (informação), Shield (seguro), Zap (perigo), AlertCircle (alerta), Activity (atividade/pulso)

---

## 5. HISTÓRICO DE VERSÕES

| Versão | Data | Autor | Descrição |
|---|---|---|---|
| 1.0 | Abril/2026 | Gabriel Silva de Paula Leite | Versão inicial |
