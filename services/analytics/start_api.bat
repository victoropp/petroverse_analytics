@echo off
echo Starting PetroVerse API with CORS enabled for all origins...
set CORS_ALLOW_ALL_ORIGINS=true
set ENVIRONMENT=development
set API_PORT=8003
set API_HOST=0.0.0.0
"C:\Users\victo\Documents\Data_Science_Projects\petroverse\venv\Scripts\python.exe" -m uvicorn main:app --port %API_PORT% --host %API_HOST% --reload