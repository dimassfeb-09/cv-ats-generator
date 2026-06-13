import json
import subprocess
import shutil
import os
import sys
import re
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
import jsonschema

# Constants
ROOT_DIR = Path(__file__).parent
DATA_DIR = ROOT_DIR / "data"
TEMPLATE_DIR = ROOT_DIR / "templates"
OUTPUT_DIR = ROOT_DIR / "output"

DATA_FILE = DATA_DIR / "cv_data.json"
SCHEMA_FILE = DATA_DIR / "cv_schema.json"
TEMPLATE_FILE = "cv_template.tex.j2"
OUTPUT_TEX = OUTPUT_DIR / "cv_output.tex"
OUTPUT_PDF = OUTPUT_DIR / "cv_output.pdf"

def escape_latex(obj):
    """
    Escapes characters that have special meaning in LaTeX.
    Recursively processes strings, lists, and dicts.
    """
    if isinstance(obj, dict):
        return {k: escape_latex(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [escape_latex(v) for v in obj]
    if isinstance(obj, str):
        # Escape characters that have special meaning in LaTeX
        conv = {
            '&': r'\&',
            '%': r'\%',
            '$': r'\$',
            '#': r'\#',
            '_': r'\_',
            '{': r'\{',
            '}': r'\}',
            '~': r'\textasciitilde{}',
            '^': r'\textasciicircum{}',
            '\\': r'\textbackslash{}',
        }
        # Sort keys by length in descending order to match longest patterns first (e.g., \\ before \)
        regex = re.compile('|'.join(re.escape(str(key)) for key in sorted(conv.keys(), key=lambda item: -len(item))))
        return regex.sub(lambda match: conv[match.group()], obj)
    return obj

def load_data(file_path):
    """Load CV data from JSON file."""
    try:
        if not file_path.exists():
            # Fallback to example if main data doesn't exist or is default
            example_path = DATA_DIR / "cv_data.example.json"
            if example_path.exists():
                print(f"WARN: {file_path.name} tidak ditemukan. Menggunakan example data.")
                file_path = example_path
        
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"ERROR: File {file_path} tidak ditemukan.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: Format JSON tidak valid di {file_path}: {e}")
        sys.exit(1)

def validate_data(data, schema_path):
    """Validate data against JSON schema."""
    try:
        with open(schema_path, "r", encoding="utf-8") as f:
            schema = json.load(f)
        jsonschema.validate(instance=data, schema=schema)
        print("OK: Data valid sesuai schema.")
    except jsonschema.ValidationError as e:
        print(f"ERROR: Validasi data gagal: {e.message}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR saat memvalidasi: {e}")
        sys.exit(1)

def render_template(data, template_dir, template_name, output_path):
    """Render LaTeX template with data."""
    try:
        # Jinja2 environment configured for LaTeX
        env = Environment(
            loader=FileSystemLoader(template_dir),
            block_start_string=r'\BLOCK{',
            block_end_string='}',
            variable_start_string=r'\VAR{',
            variable_end_string='}',
            comment_start_string=r'\#{',
            comment_end_string='}',
            line_statement_prefix='%%',
            line_comment_prefix='%#',
            trim_blocks=True,
            lstrip_blocks=True,
            autoescape=False,
        )
        
        def clean_url_filter(url):
            if not url:
                return ""
            # Remove protocol (http/https)
            url = re.sub(r'^https?://', '', url)
            # Remove www.
            url = re.sub(r'^www\.', '', url)
            # Remove trailing slash
            url = url.rstrip('/')
            return url
            
        env.filters['clean_url'] = clean_url_filter
        
        template = env.get_template(template_name)
        rendered_content = template.render(**data)
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(rendered_content)
        print(f"OK: Template berhasil di-render ke {output_path.name}.")
    except Exception as e:
        print(f"ERROR saat me-render template: {e}")
        sys.exit(1)

def compile_pdf(tex_path, output_dir):
    """Compile .tex file to PDF using pdflatex."""
    try:
        # Run pdflatex twice for references/links
        cmd = [
            "pdflatex",
            "-interaction=nonstopmode",
            "-output-directory", str(output_dir),
            str(tex_path)
        ]
        
        for i in range(1, 3):
            print(f"RUN: Menjalankan pdflatex (run {i}/2)...")
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"ERROR saat kompilasi LaTeX (Run {i}):")
                # Show last few lines of output for debugging
                log_lines = result.stdout.splitlines()
                for line in log_lines[-20:]:
                    print(line)
                return False
        
        print(f"OK: PDF berhasil dibuat di {output_dir}.")
        return True
    except FileNotFoundError:
        print("ERROR: 'pdflatex' tidak ditemukan. Pastikan MiKTeX atau TeX Live sudah terinstall dan ada di PATH.")
        return False
    except Exception as e:
        print(f"ERROR tak terduga saat kompilasi: {e}")
        return False

def cleanup(output_dir, base_name):
    """Remove intermediate LaTeX files."""
    extensions = [".aux", ".log", ".out", ".toc", ".synctex.gz"]
    for ext in extensions:
        file_to_del = output_dir / (base_name + ext)
        if file_to_del.exists():
            file_to_del.unlink()
    print("DONE: File sementara dibersihkan.")

def main():
    print("START: Memulai proses pembuatan CV ATS...")
    
    # 1. Load Data
    data = load_data(DATA_FILE)
    
    # 2. Validate Data
    validate_data(data, SCHEMA_FILE)
    
    # 3. Escape LaTeX special characters
    data = escape_latex(data)
    
    # 4. Render Template
    render_template(data, TEMPLATE_DIR, TEMPLATE_FILE, OUTPUT_TEX)
    
    # 5. Compile PDF
    success = compile_pdf(OUTPUT_TEX, OUTPUT_DIR)
    
    if success:
        # 6. Cleanup
        cleanup(OUTPUT_DIR, "cv_output")
        print(f"\nFINISH: Selesai! CV Anda dapat ditemukan di: {OUTPUT_PDF}")
    else:
        print("\nERROR: Gagal membuat PDF.")
        sys.exit(1)

if __name__ == "__main__":
    main()
