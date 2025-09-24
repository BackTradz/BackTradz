"""
File: backend/routes/frontend_routes.py
Role: Sert les pages HTML du frontend (templates Jinja2).
Depends:
  - frontend/templates/ (fichiers HTML: home, login, dashboard_user, etc.)
  - backend.utils.templates (configuration Jinja2Templates)
Side-effects: Aucun, juste rendu de templates.
Security: Pages publiques, certaines supposent un user connecté côté front.
"""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path
from app.utils.templates import templates

router = APIRouter()

# Référence vers le dossier frontend/templates
BASE_DIR = Path(__file__).resolve().parents[1]
templates = Jinja2Templates(directory=str(BASE_DIR.parent / "frontend" / "templates"))

@router.get("/", response_class=HTMLResponse)
async def show_home(request: Request):
    """Page d’accueil (home.html)."""
    return templates.TemplateResponse("home.html", {"request": request})

@router.get("/login", response_class=HTMLResponse)
async def show_login(request: Request):
    """Page de login (login.html)."""
    return templates.TemplateResponse("login.html", {"request": request})

@router.get("/dashboard-user", response_class=HTMLResponse)
async def show_dashboard_user(request: Request):
    """Dashboard utilisateur (dashboard_user.html)."""
    return templates.TemplateResponse("dashboard_user.html", {"request": request})

@router.get("/admin", response_class=HTMLResponse)
async def show_admin(request: Request):
    """Dashboard admin (admin.html)."""
    return templates.TemplateResponse("admin.html", {"request": request})

@router.get("/backtest", response_class=HTMLResponse)
async def show_backtest(request: Request):
    """Page de lancement backtest (backtest.html)."""
    return templates.TemplateResponse("backtest.html", {"request": request})

@router.get("/csv-shop", response_class=HTMLResponse)
async def show_csv_shop(request: Request):
    """Boutique CSV (csv_shop.html)."""
    return templates.TemplateResponse("csv_shop.html", {"request": request})

@router.get("/register")
def register_page(request: Request):
    """Page d’inscription (register.html)."""
    return templates.TemplateResponse("register.html", {"request": request})

@router.get("/payment-success")
async def payment_success_page(request: Request):
    """Page affichée après un paiement réussi (payment_success.html)."""
    return templates.TemplateResponse("payment_success.html", {"request": request})
