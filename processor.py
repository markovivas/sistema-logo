"""
Módulo de processamento de imagens com aplicação automática e manual de molduras.
Desenvolvido para o sistema de molduras VERTICAL.png e HORIZONTAL.png.
"""

import os
from PIL import Image, ImageOps, ImageFilter
from typing import Tuple, Optional, Dict, Any

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRAME_FILES = {
    'vertical': os.path.join(BASE_DIR, 'VERTICAL.png'),
    'horizontal': os.path.join(BASE_DIR, 'HORIZONTAL.png')
}

# Cache das molduras em memória para agilidade
_FRAME_CACHE: Dict[str, Image.Image] = {}

def get_frame(frame_type: str) -> Image.Image:
    """Retorna uma cópia da moldura solicitada ('vertical' ou 'horizontal')."""
    frame_type = frame_type.lower()
    if frame_type not in FRAME_FILES:
        raise ValueError(f"Tipo de moldura desconhecido: {frame_type}")
    
    if frame_type not in _FRAME_CACHE:
        path = FRAME_FILES[frame_type]
        if not os.path.exists(path):
            raise FileNotFoundError(f"Arquivo de moldura não encontrado: {path}")
        img = Image.open(path).convert('RGBA')
        _FRAME_CACHE[frame_type] = img
        
    return _FRAME_CACHE[frame_type].copy()

def get_frame_dimensions(frame_type: str) -> Tuple[int, int]:
    """Retorna (largura, altura) da moldura."""
    f = get_frame(frame_type)
    return f.size

def detect_orientation(image: Image.Image) -> str:
    """
    Detecta se a imagem é 'vertical' ou 'horizontal'.
    Considera altura > largura como vertical.
    """
    w, h = image.size
    return 'vertical' if h > w else 'horizontal'

def parse_color(color_str: str) -> Tuple[int, int, int]:
    """Converte '#FFFFFF' ou '#FFF' ou 'white' para tupla RGB."""
    if not color_str:
        return (255, 255, 255)
    color_str = color_str.strip()
    if color_str.startswith('#'):
        hex_val = color_str.lstrip('#')
        if len(hex_val) == 3:
            hex_val = ''.join([c*2 for c in hex_val])
        if len(hex_val) == 6:
            return tuple(int(hex_val[i:i+2], 16) for i in (0, 2, 4))
    if color_str.lower() == 'black':
        return (0, 0, 0)
    if color_str.lower() == 'white':
        return (255, 255, 255)
    return (255, 255, 255)

def process_image(
    input_image: Image.Image,
    frame_type: str = 'auto',
    fit_mode: str = 'cover',
    zoom: float = 1.0,
    offset_x_pct: float = 0.0,
    offset_y_pct: float = 0.0,
    bg_mode: str = 'blur',
    bg_color: str = '#ffffff'
) -> Image.Image:
    """
    Processa a foto sobrepondo a moldura especificada ou detectada automaticamente.
    
    Parâmetros:
    - input_image: Imagem PIL de entrada.
    - frame_type: 'auto', 'vertical' ou 'horizontal'.
    - fit_mode: 'cover' (preencher quadro), 'contain' (foto inteira) ou 'manual'.
    - zoom: Fator de escala da foto (1.0 = tamanho padrão do fit_mode).
    - offset_x_pct: Deslocamento horizontal (-1.0 a 1.0 relativo ao canvas).
    - offset_y_pct: Deslocamento vertical (-1.0 a 1.0 relativo ao canvas).
    - bg_mode: 'blur' (fundo desfocado), 'color' (cor sólida), 'transparent' (transparente).
    - bg_color: Cor hexadecimal caso bg_mode == 'color'.
    
    Retorna imagem RGBA com a moldura perfeitamente aplicada.
    """
    # 1. Trata orientação EXIF se houver (para fotos de celular)
    photo = ImageOps.exif_transpose(input_image)
    if photo.mode != 'RGBA':
        photo = photo.convert('RGBA')

    # 2. Determina moldura
    if frame_type == 'auto':
        frame_type = detect_orientation(photo)
    else:
        frame_type = frame_type.lower()
        if frame_type not in ('vertical', 'horizontal'):
            frame_type = 'vertical'

    frame = get_frame(frame_type)
    canvas_w, canvas_h = frame.size
    photo_w, photo_h = photo.size

    # 3. Calcula dimensões de redimensionamento da foto
    scale_cover = max(canvas_w / photo_w, canvas_h / photo_h)
    scale_contain = min(canvas_w / photo_w, canvas_h / photo_h)

    if fit_mode == 'contain':
        base_scale = scale_contain
    elif fit_mode == 'cover':
        base_scale = scale_cover
    else: # manual / personalizado
        base_scale = scale_cover

    final_scale = base_scale * max(0.1, zoom)
    new_w = max(1, int(round(photo_w * final_scale)))
    new_h = max(1, int(round(photo_h * final_scale)))

    # Redimensiona foto com alta qualidade
    resized_photo = photo.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # 4. Calcula posição da foto no quadro
    # Centro do canvas - metade da foto + offsets
    pos_x = int(round((canvas_w - new_w) / 2.0 + offset_x_pct * canvas_w))
    pos_y = int(round((canvas_h - new_h) / 2.0 + offset_y_pct * canvas_h))

    # 5. Prepara o fundo do canvas
    if bg_mode == 'blur':
        # Fundo desfocado: escala foto para preencher o canvas todo e aplica blur
        blur_scale = max(canvas_w / photo_w, canvas_h / photo_h)
        bw = max(1, int(round(photo_w * blur_scale)))
        bh = max(1, int(round(photo_h * blur_scale)))
        bx = (canvas_w - bw) // 2
        by = (canvas_h - bh) // 2
        
        # Otimização de performance: downsample antes de blur em telas grandes
        small_w = max(1, bw // 4)
        small_h = max(1, bh // 4)
        bg_small = photo.resize((small_w, small_h), Image.Resampling.BILINEAR)
        # Desfoque gaussiano suave
        bg_blurred = bg_small.filter(ImageFilter.GaussianBlur(radius=15))
        # Escala de volta ao tamanho do canvas
        bg_layer = bg_blurred.resize((canvas_w, canvas_h), Image.Resampling.BILINEAR)
        
        # Leve escurecimento / overlay elegante para destacar a foto central
        overlay = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 75))
        bg_layer.alpha_composite(overlay)
        canvas = bg_layer
    elif bg_mode == 'transparent':
        canvas = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    else: # 'color'
        rgb = parse_color(bg_color)
        canvas = Image.new('RGBA', (canvas_w, canvas_h), (rgb[0], rgb[1], rgb[2], 255))

    # 6. Sobrepõe a foto no canvas
    # Cria uma camada transparente do tamanho do canvas para colar a foto respeitando alfa
    photo_layer = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    photo_layer.paste(resized_photo, (pos_x, pos_y))
    canvas.alpha_composite(photo_layer)

    # 7. Sobrepõe a moldura (logo / marca d'água PNG) no topo
    canvas.alpha_composite(frame)

    return canvas
