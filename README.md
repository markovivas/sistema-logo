# Sistema de Molduras Automáticas (VERTICAL.png e HORIZONTAL.png)

Sistema desenvolvido em Python e Web moderna para aplicar molduras e marcas d'água automaticamente em fotos individuais ou em lote.

---

## 🚀 Como Iniciar

1. Dê um **duplo clique** no arquivo:
   👉 **`iniciar_sistema.bat`**

2. O sistema iniciará o servidor local e abrirá automaticamente o navegador no endereço:
   👉 **`http://localhost:5000`**

---

## 🎯 Principais Recursos

### 1. Detecção Automática de Orientação
- Fotos na **vertical** (em pé) recebem automaticamente a moldura `VERTICAL.png` (resolução final: 1080 × 1350).
- Fotos na **horizontal** (deitadas) recebem automaticamente a moldura `HORIZONTAL.png` (resolução final: 6240 × 4160).
- Tratamento automático de rotação EXIF de celulares (iPhone e Android).

### 2. Modo Individual (Editor Interativo em Tempo Real)
- **Pré-visualização 60 FPS**: Veja a foto com a moldura sobreposta na hora.
- **Redimensionamento no quadro**:
  - **Preencher Quadro (Cover)**: preenche 100% da moldura sem sobras.
  - **Caber Inteiro (Contain)**: a foto inteira fica visível no centro.
- **Zoom**: ajuste de 30% até 300% com o controle deslizante ou com a **roda do mouse** (scroll wheel).
- **Reposicionamento (Pan)**: arraste a foto diretamente com o mouse ou use os controles de posição X e Y.
- **Fundo do quadro**:
  - Fundo desfocado elegante (estilo redes sociais).
  - Branco (#FFFFFF) ou Preto (#000000).
  - Cor personalizada com conta-gotas / seletor.
- **Exportação**: Baixe a foto em altíssima qualidade (JPG 95% ou PNG) e/ou salve diretamente na pasta `fotos_processadas`.

### 3. Modo Em Lote (Múltiplas Fotos)
- Arraste dezenas de fotos de uma vez (10, 50, 100+ imagens).
- Aplicação automática da moldura correta para cada foto.
- Opção de download de todas as fotos reunidas em um único arquivo **.ZIP**.
- Opção de salvar diretamente na pasta `fotos_processadas` no seu computador.
- Botão rápido **"Abrir Pasta de Saída"** para abrir a pasta no Windows Explorer.

---

## 📁 Estrutura de Arquivos

```
sistema_logo/
├── HORIZONTAL.png        (Moldura 6240x4160)
├── VERTICAL.png          (Moldura 1080x1350)
├── iniciar_sistema.bat   (Executável com duplo clique)
├── app.py                (Servidor Web e API)
├── processor.py          (Motor de processamento de imagens)
├── templates/
│   └── index.html        (Interface gráfica)
├── static/
│   ├── css/style.css     (Estilos visuais)
│   └── js/app.js         (Lógica do editor e lote)
└── fotos_processadas/    (Pasta onde as fotos finais são salvas)
```
