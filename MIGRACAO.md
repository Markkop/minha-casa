# Migração do Simulador de Financiamento - Documentação

## Status da Migração

### ✅ Concluído

1. **Estrutura de Diretórios**
   - Criada estrutura completa em `app/casa/components/utils/`
   - Todos os diretórios necessários foram criados

2. **Arquivos Copiados**
   - `app/casa/page.jsx` - Página principal do simulador
   - `app/casa/components/simulator-client.jsx` - Componente principal do cliente
   - `app/casa/components/parameter-card.jsx` - Cards de parâmetros
   - `app/casa/components/scenario-card.jsx` - Cards de cenários
   - `app/casa/components/results-table.jsx` - Tabelas de resultados
   - `app/casa/components/utils/calculations.js` - Funções de cálculo

3. **Componentes Shadcn UI**
   - Todos os componentes necessários já estão instalados:
     - ✅ card.tsx
     - ✅ input.tsx
     - ✅ label.tsx
     - ✅ select.tsx
     - ✅ slider.tsx
     - ✅ switch.tsx
     - ✅ table.tsx
     - ✅ tabs.tsx
     - ✅ tooltip.tsx

4. **Configuração Tailwind**
   - Arquivo de referência copiado: `tailwind.config.nexus-reference.js`
   - Contém todas as cores customizadas do projeto the-nexus

## 🔧 Pendências (Próxima Fase)

### 1. Conversão de TypeScript
   - Converter todos os arquivos `.jsx` para `.tsx`:
     - `app/casa/page.jsx` → `app/casa/page.tsx`
     - `app/casa/components/simulator-client.jsx` → `app/casa/components/simulator-client.tsx`
     - `app/casa/components/parameter-card.jsx` → `app/casa/components/parameter-card.tsx`
     - `app/casa/components/scenario-card.jsx` → `app/casa/components/scenario-card.tsx`
     - `app/casa/components/results-table.jsx` → `app/casa/components/results-table.tsx`
     - `app/casa/components/utils/calculations.js` → `app/casa/components/utils/calculations.ts`
   
   - Adicionar tipos TypeScript apropriados em todos os arquivos
   - Corrigir imports que podem estar usando paths diferentes

### 2. Configuração de Cores Tailwind v4
   O projeto `minha-casa` usa Tailwind v4 que configura cores via CSS em vez de JS.
   
   **Cores customizadas necessárias** (ver `tailwind.config.nexus-reference.js`):
   - primary: #C5FF01 (Lime Green)
   - secondary: #C6CEC5
   - salmon: #FF8A59
   - green: #00F773
   - ashGray: #c4cec4
   - brightGrey: #53545A
   - raisinBlack: #1A1C23
   - eerieBlack: #242424
   - dimGray: #636A70
   - middleGray: #323232
   - middleGray50: #161616
   - fadedGray: #4C4C4C
   - davysGray: #595C58
   - cadetGray: #9BA1A5
   - darkGrey: #1f1f1f
   - jetGray: #2C2C2C
   - jetBlack: #272827
   - charcoalGray: #454141
   - battleshipGrey: #979696
   - seasalt: #F8F8F8
   - silver: #AAAAAA
   - platinum: #D9D9D9
   - blue: #273058
   - white: #FFFFFF
   - black: #000000
   - notFound: #1D1F28
   - lightBlue: #94b0ff
   - greenLink: #84CD17
   - tooltipBg: #3d4451
   - tooltipText: #FFFFFF
   - other: #151822
   - footer: #BBBCBE
   - offWhite: #EDEDED
   - yellow: #f3cb53
   
   **Ação necessária**: Adicionar essas cores no `app/globals.css` usando a sintaxe do Tailwind v4 (@theme)

### 3. Customização do Componente Slider
   O slider do the-nexus tem customizações específicas para dark mode:
   - Track: `bg-brightGrey`
   - Range: `bg-primary`
   - Thumb: `border-primary bg-black`
   
   O slider atual do minha-casa usa classes genéricas (`bg-muted`, `bg-white`).
   
   **Ação necessária**: Atualizar `components/ui/slider.tsx` com as cores customizadas

### 4. Ajustes de Imports
   - Verificar se todos os imports estão corretos
   - Ajustar paths se necessário (o projeto usa `@/` para aliases)
   - Verificar se `@/lib/utils` está funcionando corretamente

### 5. Dependências
   Verificar se todas as dependências necessárias estão no `package.json`:
   - `@radix-ui/react-icons` (já existe)
   - `clsx` (já existe)
   - `tailwind-merge` (já existe)
   - Verificar se precisa de outras dependências específicas do simulador

### 6. Testes e Ajustes Finais
   - Rodar o projeto e verificar erros de compilação
   - Testar todas as funcionalidades do simulador
   - Ajustar estilos se necessário
   - Verificar responsividade

## Estrutura de Arquivos Migrados

```
minha-casa/
├── app/
│   └── casa/
│       ├── page.jsx
│       └── components/
│           ├── simulator-client.jsx
│           ├── parameter-card.jsx
│           ├── scenario-card.jsx
│           ├── results-table.jsx
│           └── utils/
│               └── calculations.js
├── components/
│   └── ui/
│       ├── card.tsx ✅
│       ├── input.tsx ✅
│       ├── label.tsx ✅
│       ├── select.tsx ✅
│       ├── slider.tsx (precisa customização)
│       ├── switch.tsx ✅
│       ├── table.tsx ✅
│       ├── tabs.tsx ✅
│       └── tooltip.tsx ✅
├── tailwind.config.nexus-reference.js (referência)
└── MIGRACAO.md (este arquivo)
```

## Notas Importantes

- O projeto `minha-casa` usa Next.js 16, React 19 e Tailwind v4
- O projeto `the-nexus` usa Next.js 16, React 18 e Tailwind v3
- Pode haver incompatibilidades menores que precisarão ser ajustadas
- Todos os arquivos foram copiados mas não editados nesta fase
- A próxima fase envolverá edição direta dos arquivos para completar a migração
