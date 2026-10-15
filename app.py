import os
import io
import zipfile
import traceback
from datetime import datetime
from flask import Flask, render_template, request, send_file, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from PIL import Image

import processor

app = Flask(__name__)
# Permitir uploads de arquivos grandes (até 1000MB para lotes pesados)
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, 'fotos_processadas')
os.makedirs(OUTPUT_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'}

def is_allowed_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/frames/<filename>')
def serve_frame(filename):
    if filename in ('VERTICAL.png', 'HORIZONTAL.png'):
        return send_from_directory(BASE_DIR, filename)
    return "Não encontrado", 404

@app.route('/api/status', methods=['GET'])
def get_status():
    try:
        v_size = processor.get_frame_dimensions('vertical')
        h_size = processor.get_frame_dimensions('horizontal')
        return jsonify({
            'success': True,
            'vertical_size': v_size,
            'horizontal_size': h_size,
            'output_dir': OUTPUT_DIR
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/open-folder', methods=['POST'])
def open_output_folder():
    try:
        if hasattr(os, 'startfile'):
            os.startfile(OUTPUT_DIR)
            return jsonify({'success': True, 'message': 'Pasta aberta com sucesso'})
        return jsonify({'success': False, 'message': 'Não suportado no sistema operacional'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/detect', methods=['POST'])
def detect_photo():
    if 'photo' not in request.files:
        return jsonify({'success': False, 'error': 'Nenhuma foto enviada'}), 400
    file = request.files['photo']
    try:
        img = Image.open(file.stream)
        from PIL import ImageOps
        img = ImageOps.exif_transpose(img)
        w, h = img.size
        orientation = 'vertical' if h > w else 'horizontal'
        return jsonify({
            'success': True,
            'width': w,
            'height': h,
            'orientation': orientation
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/process-single', methods=['POST'])
def process_single():
    if 'photo' not in request.files:
        return jsonify({'success': False, 'error': 'Nenhuma foto enviada'}), 400
    
    file = request.files['photo']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Nome de arquivo inválido'}), 400
    
    try:
        frame_type = request.form.get('frame_type', 'auto')
        fit_mode = request.form.get('fit_mode', 'cover')
        zoom = float(request.form.get('zoom', 1.0))
        offset_x_pct = float(request.form.get('offset_x', 0.0))
        offset_y_pct = float(request.form.get('offset_y', 0.0))
        bg_mode = request.form.get('bg_mode', 'blur')
        bg_color = request.form.get('bg_color', '#ffffff')
        output_format = request.form.get('output_format', 'jpg').lower()
        quality = int(request.form.get('quality', 95))
        save_to_disk = request.form.get('save_to_disk', 'false').lower() == 'true'

        input_img = Image.open(file.stream)
        
        result_img = processor.process_image(
            input_image=input_img,
            frame_type=frame_type,
            fit_mode=fit_mode,
            zoom=zoom,
            offset_x_pct=offset_x_pct,
            offset_y_pct=offset_y_pct,
            bg_mode=bg_mode,
            bg_color=bg_color
        )

        base_name, _ = os.path.splitext(secure_filename(file.filename) or "foto")
        out_ext = '.jpg' if output_format == 'jpg' else '.png'
        out_filename = f"{base_name}_moldura{out_ext}"

        # Salva em buffer de memória para retorno
        buffer = io.BytesIO()
        if output_format == 'jpg':
            rgb_img = result_img.convert('RGB')
            rgb_img.save(buffer, format='JPEG', quality=quality, optimize=True, subsampling=0)
            mimetype = 'image/jpeg'
        else:
            result_img.save(buffer, format='PNG', optimize=True)
            mimetype = 'image/png'

        buffer.seek(0)

        # Salva cópia na pasta local se solicitado
        if save_to_disk:
            disk_path = os.path.join(OUTPUT_DIR, out_filename)
            counter = 1
            while os.path.exists(disk_path):
                disk_path = os.path.join(OUTPUT_DIR, f"{base_name}_moldura_{counter}{out_ext}")
                counter += 1
            with open(disk_path, 'wb') as f:
                f.write(buffer.getvalue())

        buffer.seek(0)
        return send_file(
            buffer,
            mimetype=mimetype,
            as_attachment=True,
            download_name=out_filename
        )
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/process-batch', methods=['POST'])
def process_batch():
    files = request.files.getlist('photos[]')
    if not files or len(files) == 0:
        return jsonify({'success': False, 'error': 'Nenhuma foto enviada para o lote'}), 400

    fit_mode = request.form.get('fit_mode', 'cover')
    bg_mode = request.form.get('bg_mode', 'blur')
    bg_color = request.form.get('bg_color', '#ffffff')
    output_format = request.form.get('output_format', 'jpg').lower()
    quality = int(request.form.get('quality', 95))
    save_to_disk = request.form.get('save_to_disk', 'true').lower() == 'true'
    download_zip = request.form.get('download_zip', 'true').lower() == 'true'

    processed_count = 0
    errors = []
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for file in files:
            if not file or file.filename == '':
                continue
            if not is_allowed_file(file.filename):
                errors.append(f"{file.filename}: formato não suportado")
                continue

            try:
                input_img = Image.open(file.stream)
                result_img = processor.process_image(
                    input_image=input_img,
                    frame_type='auto',
                    fit_mode=fit_mode,
                    zoom=1.0,
                    offset_x_pct=0.0,
                    offset_y_pct=0.0,
                    bg_mode=bg_mode,
                    bg_color=bg_color
                )

                base_name, _ = os.path.splitext(secure_filename(file.filename) or f"foto_{processed_count+1}")
                out_ext = '.jpg' if output_format == 'jpg' else '.png'
                out_filename = f"{base_name}_moldura{out_ext}"

                img_buffer = io.BytesIO()
                if output_format == 'jpg':
                    rgb_img = result_img.convert('RGB')
                    rgb_img.save(img_buffer, format='JPEG', quality=quality, optimize=True, subsampling=0)
                else:
                    result_img.save(img_buffer, format='PNG', optimize=True)

                img_bytes = img_buffer.getvalue()

                # Adiciona ao ZIP
                zip_file.writestr(out_filename, img_bytes)

                # Salva no disco se marcado
                if save_to_disk:
                    disk_path = os.path.join(OUTPUT_DIR, out_filename)
                    counter = 1
                    while os.path.exists(disk_path):
                        disk_path = os.path.join(OUTPUT_DIR, f"{base_name}_moldura_{counter}{out_ext}")
                        counter += 1
                    with open(disk_path, 'wb') as df:
                        df.write(img_bytes)

                processed_count += 1
            except Exception as e:
                errors.append(f"{file.filename}: {str(e)}")

    if processed_count == 0:
        return jsonify({'success': False, 'error': 'Nenhuma foto pôde ser processada', 'details': errors}), 400

    zip_buffer.seek(0)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_name = f"fotos_com_moldura_{timestamp}.zip"

    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name=zip_name
    )

if __name__ == '__main__':
    import webbrowser
    import threading
    
    port = 5000
    print(f"\n=======================================================")
    print(f"  SISTEMA DE APLICAÇÃO DE MOLDURAS AUTOMÁTICAS")
    print(f"  Iniciando em: http://localhost:{port}")
    print(f"  Fotos salvas em: {OUTPUT_DIR}")
    print(f"=======================================================\n")
    
    # Abre o navegador automaticamente após 1 segundo
    def open_browser():
        webbrowser.open(f'http://localhost:{port}')
    
    threading.Timer(1.2, open_browser).start()
    app.run(host='0.0.0.0', port=port, debug=False)
