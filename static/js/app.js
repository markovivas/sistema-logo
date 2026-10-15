/**
 * Sistema de Molduras Automáticas
 * Gerenciamento do Editor Canvas Interativo e Processamento em Lote
 */

// Estado da Aplicação
const state = {
    currentTab: 'individual',
    // Molduras carregadas
    frames: {
        vertical: null,
        horizontal: null,
        loaded: false
    },
    // Estado do Modo Individual
    individual: {
        file: null,
        imageObj: null,
        width: 0,
        height: 0,
        detectedOrientation: 'vertical',
        selectedFrame: 'auto', // 'auto', 'vertical', 'horizontal'
        fitMode: 'cover', // 'cover', 'contain'
        zoom: 1.0,
        offsetX: 0.0,
        offsetY: 0.0,
        bgMode: 'blur', // 'blur', 'white', 'black', 'custom'
        bgColor: '#222222',
        format: 'jpg',
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        initialOffsetX: 0,
        initialOffsetY: 0
    },
    // Estado do Modo Em Lote
    batch: {
        files: [],
        fitMode: 'cover',
        bgMode: 'blur',
        bgColor: '#ffffff',
        format: 'jpg',
        isProcessing: false
    }
};

// ==========================================
// INICIALIZAÇÃO & PRÉ-CARREGAMENTO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    preloadFrames();
    setupTabSwitching();
    setupIndividualEditor();
    setupBatchMode();
    setupGlobalButtons();
});

// Pré-carrega as imagens das molduras VERTICAL.png e HORIZONTAL.png
function preloadFrames() {
    let loadedCount = 0;
    const checkAllLoaded = () => {
        loadedCount++;
        if (loadedCount >= 2) {
            state.frames.loaded = true;
            console.log('Molduras carregadas com sucesso!');
            if (state.individual.imageObj) {
                renderCanvas();
            }
        }
    };

    const vImg = new Image();
    vImg.src = '/frames/VERTICAL.png';
    vImg.onload = () => {
        state.frames.vertical = vImg;
        checkAllLoaded();
    };

    const hImg = new Image();
    hImg.src = '/frames/HORIZONTAL.png';
    hImg.onload = () => {
        state.frames.horizontal = hImg;
        checkAllLoaded();
    };
}

// Troca de Abas (Individual vs Lote)
function setupTabSwitching() {
    const tabIndiv = document.getElementById('tabBtnIndividual');
    const tabBatch = document.getElementById('tabBtnBatch');
    const secIndiv = document.getElementById('sectionIndividual');
    const secBatch = document.getElementById('sectionBatch');

    tabIndiv.addEventListener('click', () => {
        state.currentTab = 'individual';
        tabIndiv.classList.add('border-sky-500', 'text-sky-400');
        tabIndiv.classList.remove('border-transparent', 'text-slate-400');
        tabBatch.classList.remove('border-sky-500', 'text-sky-400');
        tabBatch.classList.add('border-transparent', 'text-slate-400');

        secIndiv.classList.remove('hidden');
        secBatch.classList.add('hidden');
    });

    tabBatch.addEventListener('click', () => {
        state.currentTab = 'batch';
        tabBatch.classList.add('border-sky-500', 'text-sky-400');
        tabBatch.classList.remove('border-transparent', 'text-slate-400');
        tabIndiv.classList.remove('border-sky-500', 'text-sky-400');
        tabIndiv.classList.add('border-transparent', 'text-slate-400');

        secBatch.classList.remove('hidden');
        secIndiv.classList.add('hidden');
    });
}

// ==========================================
// MODO INDIVIDUAL - EDITOR INTERATIVO
// ==========================================
function setupIndividualEditor() {
    const dropzone = document.getElementById('dropzoneIndividual');
    const fileInput = document.getElementById('fileInputIndividual');
    const editorContainer = document.getElementById('editorContainer');
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');

    // Drag & Drop no dropzone inicial
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleSingleImageUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleSingleImageUpload(e.target.files[0]);
        }
    });

    // Trocar Foto
    document.getElementById('btnTrocarFoto').addEventListener('click', () => fileInput.click());

    // Resetar Ajustes
    document.getElementById('btnResetarAjustes').addEventListener('click', () => {
        state.individual.zoom = 1.0;
        state.individual.offsetX = 0.0;
        state.individual.offsetY = 0.0;
        updateControlsUI();
        renderCanvas();
    });

    // Drag and Drop de nova foto sobre o canvas
    const canvasWrapper = document.getElementById('canvasWrapper');
    canvasWrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvasWrapper.classList.add('ring-2', 'ring-sky-500');
    });
    canvasWrapper.addEventListener('dragleave', () => {
        canvasWrapper.classList.remove('ring-2', 'ring-sky-500');
    });
    canvasWrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        canvasWrapper.classList.remove('ring-2', 'ring-sky-500');
        if (e.dataTransfer.files.length > 0) {
            handleSingleImageUpload(e.dataTransfer.files[0]);
        }
    });

    // Interatividade do Canvas: Arrastar para Reposicionar (Pan)
    canvas.addEventListener('mousedown', (e) => {
        if (!state.individual.imageObj) return;
        state.individual.isDragging = true;
        state.individual.dragStartX = e.clientX;
        state.individual.dragStartY = e.clientY;
        state.individual.initialOffsetX = state.individual.offsetX;
        state.individual.initialOffsetY = state.individual.offsetY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!state.individual.isDragging) return;
        const dx = e.clientX - state.individual.dragStartX;
        const dy = e.clientY - state.individual.dragStartY;

        // Normaliza pelo tamanho do canvas visível
        const rect = canvas.getBoundingClientRect();
        const factorX = dx / rect.width;
        const factorY = dy / rect.height;

        state.individual.offsetX = Math.max(-0.6, Math.min(0.6, state.individual.initialOffsetX + factorX));
        state.individual.offsetY = Math.max(-0.6, Math.min(0.6, state.individual.initialOffsetY + factorY));

        updateControlsUI();
        renderCanvas();
    });

    window.addEventListener('mouseup', () => {
        state.individual.isDragging = false;
    });

    // Zoom com a roda do mouse (Wheel)
    canvas.addEventListener('wheel', (e) => {
        if (!state.individual.imageObj) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        state.individual.zoom = Math.max(0.3, Math.min(3.0, state.individual.zoom + delta));
        updateControlsUI();
        renderCanvas();
    }, { passive: false });

    // Controles de Moldura (Automático, Vertical, Horizontal)
    document.querySelectorAll('.frame-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.frame-toggle-btn').forEach(b => {
                b.classList.remove('active', 'border-sky-500', 'bg-sky-500/10', 'text-sky-300');
                b.classList.add('border-slate-800', 'bg-slate-900', 'text-slate-300');
            });
            btn.classList.add('active', 'border-sky-500', 'bg-sky-500/10', 'text-sky-300');
            btn.classList.remove('border-slate-800', 'bg-slate-900', 'text-slate-300');

            state.individual.selectedFrame = btn.dataset.frame;
            renderCanvas();
        });
    });

    // Controles de Fit (Preencher vs Caber)
    document.querySelectorAll('.fit-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.fit-toggle-btn').forEach(b => {
                b.classList.remove('active', 'border-sky-500', 'bg-sky-500/10', 'text-sky-300');
                b.classList.add('border-slate-800', 'bg-slate-900', 'text-slate-300');
            });
            btn.classList.add('active', 'border-sky-500', 'bg-sky-500/10', 'text-sky-300');
            btn.classList.remove('border-slate-800', 'bg-slate-900', 'text-slate-300');

            state.individual.fitMode = btn.dataset.fit;
            renderCanvas();
        });
    });

    // Sliders de Zoom e Posição
    const zoomSlider = document.getElementById('zoomSlider');
    const offsetXSlider = document.getElementById('offsetXSlider');
    const offsetYSlider = document.getElementById('offsetYSlider');

    zoomSlider.addEventListener('input', (e) => {
        state.individual.zoom = parseFloat(e.target.value);
        updateControlsUI();
        renderCanvas();
    });

    offsetXSlider.addEventListener('input', (e) => {
        state.individual.offsetX = parseFloat(e.target.value);
        updateControlsUI();
        renderCanvas();
    });

    offsetYSlider.addEventListener('input', (e) => {
        state.individual.offsetY = parseFloat(e.target.value);
        updateControlsUI();
        renderCanvas();
    });

    // Controles de Fundo
    document.querySelectorAll('.bg-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bgType = btn.dataset.bg;
            document.querySelectorAll('.bg-toggle-btn').forEach(b => {
                b.classList.remove('active', 'border-sky-500', 'bg-sky-500/10', 'text-sky-300');
                b.classList.add('border-slate-800', 'bg-slate-900', 'text-slate-300');
            });
            btn.classList.add('active', 'border-sky-500', 'bg-sky-500/10', 'text-sky-300');
            btn.classList.remove('border-slate-800', 'bg-slate-900', 'text-slate-300');

            state.individual.bgMode = bgType;
            renderCanvas();
        });
    });

    // Seletor de cor customizada
    const colorPicker = document.getElementById('customColorPicker');
    colorPicker.addEventListener('input', (e) => {
        state.individual.bgColor = e.target.value;
        document.getElementById('customColorCircle').style.backgroundColor = e.target.value;
        
        // Ativa o botão custom
        const btnCustom = document.getElementById('btnCustomColor');
        document.querySelectorAll('.bg-toggle-btn').forEach(b => {
            b.classList.remove('active', 'border-sky-500', 'bg-sky-500/10', 'text-sky-300');
            b.classList.add('border-slate-800', 'bg-slate-900', 'text-slate-300');
        });
        btnCustom.classList.add('active', 'border-sky-500', 'bg-sky-500/10', 'text-sky-300');
        btnCustom.classList.remove('border-slate-800', 'bg-slate-900', 'text-slate-300');

        state.individual.bgMode = 'custom';
        renderCanvas();
    });

    // Formato de Saída (JPG / PNG)
    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.individual.format = e.target.value;
        });
    });

    // Botão de Download / Salvar Foto
    document.getElementById('btnDownloadSingle').addEventListener('click', downloadSingleImage);
}

// Manipula o arquivo de imagem carregado no modo individual
function handleSingleImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
        showToast('Erro', 'Por favor, selecione um arquivo de imagem válido.', 'error');
        return;
    }

    state.individual.file = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            state.individual.imageObj = img;
            state.individual.width = img.width;
            state.individual.height = img.height;
            state.individual.detectedOrientation = img.height > img.width ? 'vertical' : 'horizontal';

            // Reseta offsets e zoom ao carregar nova foto
            state.individual.zoom = 1.0;
            state.individual.offsetX = 0.0;
            state.individual.offsetY = 0.0;

            // Atualiza UI
            document.getElementById('dropzoneIndividual').classList.add('hidden');
            document.getElementById('editorContainer').classList.remove('hidden');

            document.getElementById('photoNameBadge').textContent = file.name;
            document.getElementById('photoDimBadge').textContent = `(${img.width}×${img.height})`;

            updateControlsUI();
            renderCanvas();
            showToast('Foto Carregada', `Orientação detectada: ${state.individual.detectedOrientation.toUpperCase()}`, 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Atualiza a interface gráfica dos sliders
function updateControlsUI() {
    const { zoom, offsetX, offsetY } = state.individual;
    document.getElementById('zoomSlider').value = zoom;
    document.getElementById('zoomValueBadge').textContent = `${Math.round(zoom * 100)}%`;

    document.getElementById('offsetXSlider').value = offsetX;
    document.getElementById('offsetXBadge').textContent = `${Math.round(offsetX * 100)}%`;

    document.getElementById('offsetYSlider').value = offsetY;
    document.getElementById('offsetYBadge').textContent = `${Math.round(offsetY * 100)}%`;
}

// Renderização interativa no Canvas HTML5 em tempo real (60 FPS)
function renderCanvas() {
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    const { imageObj, selectedFrame, detectedOrientation, fitMode, zoom, offsetX, offsetY, bgMode, bgColor } = state.individual;

    if (!imageObj) return;

    // Determina se a moldura em uso é vertical ou horizontal
    const activeFrameType = selectedFrame === 'auto' ? detectedOrientation : selectedFrame;
    const isVertical = activeFrameType === 'vertical';

    // Dimensões nativas das molduras
    const nativeW = isVertical ? 1080 : 6240;
    const nativeH = isVertical ? 1350 : 4160;

    // Atualiza badge de moldura ativa
    const activeBadge = document.getElementById('activeFrameBadge');
    if (activeBadge) {
        activeBadge.textContent = isVertical ? 'Vertical (1080×1350)' : 'Horizontal (6240×4160)';
    }

    // Configura resolução interna do canvas proporcional para preview rápido
    const maxPreviewDim = 1200;
    let canvasW, canvasH;
    if (nativeW >= nativeH) {
        canvasW = maxPreviewDim;
        canvasH = Math.round(maxPreviewDim * (nativeH / nativeW));
    } else {
        canvasH = maxPreviewDim;
        canvasW = Math.round(maxPreviewDim * (nativeW / nativeH));
    }

    canvas.width = canvasW;
    canvas.height = canvasH;

    ctx.clearRect(0, 0, canvasW, canvasH);

    // 1. Desenha o Fundo
    if (bgMode === 'blur') {
        // Fundo desfocado com a foto ampliada
        ctx.save();
        const bScale = Math.max(canvasW / imageObj.width, canvasH / imageObj.height);
        const bw = imageObj.width * bScale;
        const bh = imageObj.height * bScale;
        const bx = (canvasW - bw) / 2;
        const by = (canvasH - bh) / 2;

        ctx.filter = 'blur(16px)';
        ctx.drawImage(imageObj, bx, by, bw, bh);
        ctx.restore();

        // Overlay escuro suave para contraste
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(0, 0, canvasW, canvasH);
    } else if (bgMode === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);
    } else if (bgMode === 'black') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvasW, canvasH);
    } else if (bgMode === 'custom') {
        ctx.fillStyle = bgColor || '#222222';
        ctx.fillRect(0, 0, canvasW, canvasH);
    }

    // 2. Calcula escala e posição da Foto
    const scaleCover = Math.max(canvasW / imageObj.width, canvasH / imageObj.height);
    const scaleContain = Math.min(canvasW / imageObj.width, canvasH / imageObj.height);
    const baseScale = fitMode === 'contain' ? scaleContain : scaleCover;
    const finalScale = baseScale * zoom;

    const pw = imageObj.width * finalScale;
    const ph = imageObj.height * finalScale;
    const px = (canvasW - pw) / 2 + offsetX * canvasW;
    const py = (canvasH - ph) / 2 + offsetY * canvasH;

    // 3. Desenha a Foto Central
    ctx.drawImage(imageObj, px, py, pw, ph);

    // 4. Sobrepõe a Moldura (PNG com transparência)
    const frameImg = isVertical ? state.frames.vertical : state.frames.horizontal;
    if (frameImg && frameImg.complete) {
        ctx.drawImage(frameImg, 0, 0, canvasW, canvasH);
    }
}

// Envia ao servidor e baixa a foto processada em resolução máxima
async function downloadSingleImage() {
    const { file, selectedFrame, fitMode, zoom, offsetX, offsetY, bgMode, bgColor, format } = state.individual;
    if (!file) {
        showToast('Aviso', 'Nenhuma foto selecionada.', 'error');
        return;
    }

    const btn = document.getElementById('btnDownloadSingle');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        Processando em Alta Resolução...
    `;

    try {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('frame_type', selectedFrame);
        formData.append('fit_mode', fitMode);
        formData.append('zoom', zoom);
        formData.append('offset_x', offsetX);
        formData.append('offset_y', offsetY);
        formData.append('bg_mode', bgMode === 'custom' ? 'color' : (bgMode === 'white' || bgMode === 'black' ? 'color' : bgMode));
        formData.append('bg_color', bgMode === 'white' ? '#FFFFFF' : (bgMode === 'black' ? '#000000' : bgColor));
        formData.append('output_format', format);
        formData.append('quality', 95);
        formData.append('save_to_disk', document.getElementById('checkSaveToDisk').checked);

        const response = await fetch('/api/process-single', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Falha ao processar foto');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Pega nome sugerido do header se existir
        const disposition = response.headers.get('Content-Disposition');
        let filename = `${file.name.split('.')[0]}_moldura.${format}`;
        if (disposition && disposition.indexOf('filename=') !== -1) {
            const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showToast('Foto Salva!', 'Foto baixada com sucesso com moldura em alta resolução.', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erro', err.message || 'Erro durante o processamento', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ==========================================
// MODO EM LOTE (BATCH)
// ==========================================
function setupBatchMode() {
    const dropzone = document.getElementById('dropzoneBatch');
    const fileInput = document.getElementById('fileInputBatch');
    const btnProcess = document.getElementById('btnProcessBatch');
    const btnClear = document.getElementById('btnClearBatch');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleBatchFiles(Array.from(e.dataTransfer.files));
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleBatchFiles(Array.from(e.target.files));
        }
    });

    btnClear.addEventListener('click', () => {
        state.batch.files = [];
        updateBatchGrid();
    });

    // Opções de Ajuste do Lote
    document.querySelectorAll('.batch-fit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.batch-fit-btn').forEach(b => {
                b.classList.remove('active', 'border-indigo-500', 'bg-indigo-500/10', 'text-indigo-300');
                b.classList.add('border-slate-800', 'bg-slate-900', 'text-slate-300');
            });
            btn.classList.add('active', 'border-indigo-500', 'bg-indigo-500/10', 'text-indigo-300');
            btn.classList.remove('border-slate-800', 'bg-slate-900', 'text-slate-300');

            state.batch.fitMode = btn.dataset.batchFit;
        });
    });

    // Fundo do Lote
    document.querySelectorAll('.batch-bg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.batch-bg-btn').forEach(b => {
                b.classList.remove('active', 'border-indigo-500', 'bg-indigo-500/10', 'text-indigo-300');
                b.classList.add('border-slate-800', 'bg-slate-900', 'text-slate-300');
            });
            btn.classList.add('active', 'border-indigo-500', 'bg-indigo-500/10', 'text-indigo-300');
            btn.classList.remove('border-slate-800', 'bg-slate-900', 'text-slate-300');

            state.batch.bgMode = btn.dataset.batchBg;
        });
    });

    // Formato de Saída no Lote
    document.querySelectorAll('input[name="batchFormat"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.batch.format = e.target.value;
        });
    });

    // Botão de Processar Lote
    btnProcess.addEventListener('click', processBatch);
}

// Adiciona arquivos à lista do lote
function handleBatchFiles(newFiles) {
    const validFiles = newFiles.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
        showToast('Aviso', 'Nenhuma foto válida encontrada.', 'error');
        return;
    }

    validFiles.forEach(file => {
        // Evita duplicatas pelo nome e tamanho
        const exists = state.batch.files.some(f => f.name === file.name && f.size === file.size);
        if (!exists) {
            state.batch.files.push(file);
        }
    });

    updateBatchGrid();
    showToast('Fotos Adicionadas', `${validFiles.length} foto(s) adicionadas à fila.`, 'success');
}

// Atualiza a visualização da grade no lote
function updateBatchGrid() {
    const grid = document.getElementById('batchGrid');
    const filesCard = document.getElementById('batchFilesCard');
    const countBadge = document.getElementById('batchCountBadge');
    const btnProcess = document.getElementById('btnProcessBatch');
    const btnText = document.getElementById('batchBtnText');
    const filesCount = document.getElementById('batchFilesCount');

    const total = state.batch.files.length;
    filesCount.textContent = total;

    if (total === 0) {
        filesCard.classList.add('hidden');
        countBadge.classList.add('hidden');
        btnProcess.disabled = true;
        btnText.textContent = 'Selecione fotos para começar';
        grid.innerHTML = '';
        return;
    }

    filesCard.classList.remove('hidden');
    countBadge.textContent = total;
    countBadge.classList.remove('hidden');
    btnProcess.disabled = false;
    btnText.textContent = `Processar Todas as Fotos (${total} fotos)`;

    grid.innerHTML = '';
    state.batch.files.forEach((file, index) => {
        const card = document.createElement('div');
        card.className = 'batch-item-card bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-col gap-1.5 relative group shadow';

        const thumbUrl = URL.createObjectURL(file);

        card.innerHTML = `
            <div class="w-full aspect-square bg-slate-950 rounded-lg overflow-hidden relative">
                <img src="${thumbUrl}" class="w-full h-full object-cover">
                <button type="button" data-index="${index}" class="btn-remove-batch absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
            </div>
            <div class="px-1">
                <p class="text-[11px] font-medium text-slate-200 truncate" title="${file.name}">${file.name}</p>
                <p class="text-[10px] text-slate-500">${(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
        `;

        grid.appendChild(card);
    });

    // Eventos de remover arquivo
    document.querySelectorAll('.btn-remove-batch').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index);
            state.batch.files.splice(idx, 1);
            updateBatchGrid();
        });
    });

    lucide.createIcons();
}

// Executa o processamento do lote
async function processBatch() {
    if (state.batch.files.length === 0 || state.batch.isProcessing) return;

    state.batch.isProcessing = true;
    const btn = document.getElementById('btnProcessBatch');
    const originalText = btn.innerHTML;
    btn.disabled = true;

    const progressCard = document.getElementById('batchProgressCard');
    const progressBar = document.getElementById('batchProgressBar');
    const percentText = document.getElementById('batchPercentText');
    const statusText = document.getElementById('batchStatusText');

    progressCard.classList.remove('hidden');
    progressBar.style.width = '10%';
    percentText.textContent = '10%';
    statusText.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 text-sky-400 animate-spin"></i> Enviando e aplicando molduras nas fotos...`;
    lucide.createIcons();

    try {
        const formData = new FormData();
        state.batch.files.forEach(file => {
            formData.append('photos[]', file);
        });

        formData.append('fit_mode', state.batch.fitMode);
        formData.append('bg_mode', state.batch.bgMode);
        formData.append('bg_color', state.batch.bgMode === 'white' ? '#FFFFFF' : '#000000');
        formData.append('output_format', state.batch.format);
        formData.append('quality', 95);
        formData.append('download_zip', document.getElementById('batchCheckZip').checked);
        formData.append('save_to_disk', document.getElementById('batchCheckDisk').checked);

        // Simula avanço na barra enquanto processa
        let fakePercent = 15;
        const interval = setInterval(() => {
            if (fakePercent < 85) {
                fakePercent += 5;
                progressBar.style.width = `${fakePercent}%`;
                percentText.textContent = `${fakePercent}%`;
            }
        }, 600);

        const response = await fetch('/api/process-batch', {
            method: 'POST',
            body: formData
        });

        clearInterval(interval);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Erro ao processar lote');
        }

        progressBar.style.width = '100%';
        percentText.textContent = '100%';
        statusText.innerHTML = `<i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Concluído com sucesso!`;
        lucide.createIcons();

        // Se pediu ZIP, faz download
        if (document.getElementById('batchCheckZip').checked) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `fotos_com_moldura_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }

        showToast('Sucesso!', `${state.batch.files.length} foto(s) processadas com sucesso!`, 'success');
    } catch (err) {
        console.error(err);
        showToast('Erro no Lote', err.message, 'error');
    } finally {
        state.batch.isProcessing = false;
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ==========================================
// FUNÇÕES GLOBAIS E UTILITÁRIAS
// ==========================================
function setupGlobalButtons() {
    // Abrir pasta de saída no Windows Explorer
    document.getElementById('btnOpenFolder').addEventListener('click', async () => {
        try {
            const res = await fetch('/api/open-folder', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('Pasta Aberta', 'A pasta fotos_processadas foi aberta no Windows Explorer.', 'success');
            } else {
                showToast('Aviso', data.message || 'Não foi possível abrir a pasta automaticamente.', 'error');
            }
        } catch (e) {
            console.error(e);
        }
    });
}

// Toast de Notificação
function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    if (type === 'success') {
        toastIcon.innerHTML = `<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    } else {
        toastIcon.innerHTML = `<svg class="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    }

    toast.classList.add('toast-visible');
    setTimeout(() => {
        toast.classList.remove('toast-visible');
    }, 4000);
}
