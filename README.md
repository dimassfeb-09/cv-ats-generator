# CV ATS Generator

Alat otomatis berbasis Python dan LaTeX untuk menghasilkan CV profesional berstandar ATS (Applicant Tracking System) dari data JSON.

## 🚀 Fitur Utama
- **JSON-to-PDF**: Mengubah data profil kamu di JSON langsung menjadi PDF.
- **ATS Friendly**: Desain minimalis yang mudah dibaca oleh sistem robot ATS perusahaan besar.
- **Nested Bullets**: Mendukung penulisan proyek di dalam pengalaman kerja dengan struktur menjorok yang rapi.
- **Auto-Builder**: Deteksi otomatis perubahan file untuk melakukan build ulang seketika.

## 🛠 Prasyarat
Sebelum menggunakan aplikasi ini, pastikan kamu sudah menginstall:
1. **Python 3.x**
2. **MiKTeX** atau **TeX Live** (untuk menjalankan `pdflatex`). Pastikan `pdflatex` sudah ada di PATH terminal kamu.

## 📥 Instalasi

1. **Clone Repository**
   ```bash
   git clone https://github.com/dimassfeb-09/cv-ats-generator.git
   cd cv-ats-generator
   ```

2. **Install Library Python**
   Aplikasi ini membutuhkan `Jinja2` dan `jsonschema`.
   ```bash
   pip install jinja2 jsonschema
   ```

## 📝 Cara Penggunaan

### 1. Menyiapkan Data
Edit file data profil kamu di `data/cv_data.json`. Jika file belum ada, kamu bisa menyalin dari contoh:
```bash
cp data/cv_data.example.json data/cv_data.json
```
Sesuaikan isi `personal`, `experience`, `education`, `skills`, dll.

### 2. Membangun PDF (Manual)
Jalankan perintah berikut untuk menghasilkan PDF:
```bash
python generator.py
```
Hasil akhir akan muncul di folder `output/cv_output.pdf`.

### 3. Menggunakan Auto-Builder (Rekomendasi)
Jika ingin PDF terupdate otomatis setiap kali kamu menekan tombol Save di text editor:
```bash
python watch_build.py
```

## 📂 Struktur Proyek
- `data/`: Berisi data CV (`cv_data.json`) dan skema validasi.
- `templates/`: Template desain CV dalam format LaTeX (`.tex.j2`).
- `output/`: Lokasi hasil jadi PDF dan file sementara LaTeX.
- `generator.py`: Script utama untuk merender template dan kompilasi PDF.
- `watch_build.py`: Script pemantau perubahan file.

## 📄 Lisensi
Proyek ini dibuat untuk penggunaan pribadi dan profesional. Silakan dikembangkan lebih lanjut!
