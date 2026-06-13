import os
import time
import subprocess
import sys
from pathlib import Path

# Konfigurasi file yang diawasi
WATCH_FILES = [
    Path("data/cv_data.json"),
    Path("templates/cv_template.tex.j2"),
    Path("generator.py")
]

GENERATOR_SCRIPT = "generator.py"

def get_mtimes():
    """Mengambil dictionary waktu modifikasi terakhir untuk semua file yang diawasi."""
    return {str(f): f.stat().st_mtime for f in WATCH_FILES if f.exists()}

def run_build():
    """Menjalankan generator.py."""
    print("\n" + "="*50)
    print(f"🕒 Terdeteksi perubahan pada {time.strftime('%H:%M:%S')}")
    print("🚀 Memulai proses build ulang...")
    print("="*50)
    
    try:
        # Menjalankan generator.py dan menampilkan outputnya secara real-time
        result = subprocess.run([sys.executable, GENERATOR_SCRIPT], capture_output=False)
        if result.returncode == 0:
            print("\n✅ Build Selesai!")
        else:
            print(f"\n❌ Build Gagal dengan exit code {result.returncode}")
    except Exception as e:
        print(f"\n❌ Error saat menjalankan build: {e}")
    
    print("\n" + "-"*50)
    print("👀 Menunggu perubahan berikutnya... (Tekan Ctrl+C untuk berhenti)")

def main():
    print("🔔 CV Auto-Builder Aktif")
    print(f"📂 Mengawasi: {[f.name for f in WATCH_FILES]}")
    print("-" * 50)
    
    # Inisialisasi state waktu modifikasi
    last_mtimes = get_mtimes()
    
    print("👀 Menunggu perubahan... (Tekan Ctrl+C untuk berhenti)")
    
    try:
        while True:
            time.sleep(1) # Cek setiap 1 detik
            current_mtimes = get_mtimes()
            
            # Cek apakah ada file yang berubah atau baru ditambahkan
            changed = False
            for file_path, mtime in current_mtimes.items():
                if file_path not in last_mtimes or mtime > last_mtimes[file_path]:
                    changed = True
                    break
            
            if changed:
                run_build()
                last_mtimes = current_mtimes
                
    except KeyboardInterrupt:
        print("\n👋 Auto-builder dihentikan.")
        sys.exit(0)

if __name__ == "__main__":
    main()
