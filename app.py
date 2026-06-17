import os
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Import generator functions
from generator import (
    generate_cv_from_data,
    load_data,
    DATA_FILE,
    OUTPUT_PDF
)

ROOT_DIR = Path(__file__).parent
FRONTEND_DIR = ROOT_DIR / "frontend"

app = FastAPI(title="CV ATS Generator API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/data")
async def get_cv_data():
    """Retrieve CV JSON data."""
    try:
        data = load_data(DATA_FILE)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal memuat data CV: {str(e)}"
        )

@app.get("/api/template")
async def get_cv_template():
    """Retrieve the example CV template JSON file."""
    try:
        example_path = ROOT_DIR / "data" / "cv_data.example.json"
        if example_path.exists():
            return FileResponse(
                path=example_path,
                media_type="application/json",
                headers={"Content-Disposition": "attachment; filename=\"cv_template.json\""}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File template tidak ditemukan di server."
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal mengunduh template: {str(e)}"
        )

@app.post("/api/validate")
async def validate_cv_data(request: Request):
    """Validate CV JSON data against JSON Schema."""
    try:
        data = await request.json()
    except json.JSONDecodeError:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"valid": False, "error": "Format JSON tidak valid."}
        )

    try:
        import jsonschema
        from generator import validate_data, SCHEMA_FILE
        validate_data(data, SCHEMA_FILE)
        return {"valid": True}
    except jsonschema.ValidationError as e:
        return {"valid": False, "error": e.message}
    except Exception as e:
        return {"valid": False, "error": f"Kesalahan internal validasi: {str(e)}"}

@app.post("/api/save")
async def save_cv_data(request: Request):
    """Save CV JSON data to DATA_FILE."""
    try:
        data = await request.json()
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format request JSON tidak valid."
        )

    try:
        from generator import validate_data, SCHEMA_FILE
        validate_data(data, SCHEMA_FILE)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Data tidak valid sesuai skema: {str(e)}"
        )

    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return {"status": "success", "message": "Data CV berhasil disimpan!"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal menyimpan data CV: {str(e)}"
        )

@app.post("/api/generate")
async def generate_pdf(request: Request):
    """Generate PDF CV from JSON data."""
    try:
        data = await request.json()
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format request JSON tidak valid."
        )

    try:
        # Generate the PDF
        pdf_path = generate_cv_from_data(data)
        
        # Verify file exists
        if not pdf_path.exists():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="PDF berhasil dikompilasi namun file output tidak ditemukan."
            )
            
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline; filename=\"cv_output.pdf\""}
        )
    except ValueError as e:
        # Schema validation error
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": str(e)}
        )
    except Exception as e:
        # Latex compile error or other general errors
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": str(e)}
        )

# Ensure frontend directory exists
FRONTEND_DIR.mkdir(parents=True, exist_ok=True)

# Mount frontend static files. It serves index.html at root "/"
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Memulai server CV ATS Generator di http://127.0.0.1:8000")
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
