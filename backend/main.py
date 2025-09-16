#=v1
"""
File: main.py (racine)
Role: Point d'entrée FastAPI. Monte les routes, CORS, static, scheduler, et personnalise l'OpenAPI.
Depends:
  - backend.routes.* (multiples routers: admin, backtest, csv, etc.)
  - backend.auth (endpoints /api/auth)
  - scripts/top_strategie_generator.generate_top_strategies (APScheduler)
Side-effects:
  - Monte le dossier /static pour le frontend.
  - Lance des jobs planifiés (APScheduler + repeat_every).
Security:
  - CORS actuellement en "*": à restreindre en prod.
  - OpenAPI forcé avec sécurité "X-API-Key" (cohérence à vérifier avec /auth).
Notes:
  - Je n'ai rien modifié en logique, uniquement des commentaires.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "scripts"))

# backend/main.py (tout en haut)
try:
    from dotenv import load_dotenv
    load_dotenv()  # charge .env depuis la racine du projet
except Exception:
    pass

from top_strategie_generator import generate_top_strategies

from fastapi import FastAPI
from fastapi.openapi.models import APIKey, APIKeyIn, SecuritySchemeType
from fastapi.openapi.utils import get_openapi
from fastapi import Request
#from fastapi.responses import HTMLResponse
from apscheduler.schedulers.background import BackgroundScheduler
from backend.routes import user_routes  # ou le nom du fichier .py

from backend import auth  # ← déjà fait chez toi normalement

from backend.routes.a_savoir_routes import router as a_savoir_router

#from backend.utils.templates import templates  # NOTE: utilisé côté rendu templates si besoin

from backend.routes.official_data_routes import router as official_data_router
from backend.routes.user_routes import router as user_router
from backend.routes.run_backtest_route import router as run_backtest_router
from backend.routes.strategy_params_route import router as strategy_params_router
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.analyse_routes import router as download_xlsx
from backend.routes.csv_library_routes import router as csv_library_router
#from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.routes.csv_library_routes import router as csv_router
from backend.routes.admin_routes import router as admin_router
from backend.routes.user_dashboard_routes import router as user_dashboard_router
from backend.routes import frontend_routes
from backend.routes import pricing_routes
from backend.routes.paypal_routes import router as paypal_router
from backend.routes.crypto_routes import router as crypto_router

from fastapi_utils.tasks import repeat_every
from backend.utils.subscription_utils import renew_all_subscriptions  # adapte au bon chemin
from backend.core.config import FRONTEND_URL
from backend.routes import user_profile_routes
from starlette.middleware.sessions import SessionMiddleware
from backend.routes import stripe_routes
from backend.routes import top_strategy_routes
from backend.routes import auth_reset_routes
from backend.routes import support_routes
from backend.routes import backtest_xlsx_routes  # ⬅️ import
from backend.routes.admin_stat_routes import stats_router  # ⬅️ nouveau

from backend.routes.meta_routes import router as meta_router



app = FastAPI()

# Middleware de session (utilisé par auth/OAuth et/ou vues template)
# NOTE: secret "STRATIFY_SECRET" en clair ici → prévoir .env + rotation
app.add_middleware(SessionMiddleware, secret_key="STRATIFY_SECRET")


# CORS: actuellement très permissif (toutes origines, méthodes, headers).
# --- CORS (prod): autorise explicitement tes domaines front ---
def _allowed_origins():
    # Lis d'abord CORS_ORIGINS (séparé par virgules), sinon FRONTEND_URL
    raw = os.getenv("CORS_ORIGINS") or os.getenv("FRONTEND_URL") or ""
    origins = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]

    # Ajoute automatiquement les variantes avec/sans www pour backtradz.com
    if any("backtradz.com" in o for o in origins):
        for v in ("https://backtradz.com", "https://www.backtradz.com"):
            if v not in origins:
                origins.append(v)

    # Garde le confort dev
    origins += ["http://localhost:5173", "http://127.0.0.1:5173"]
    # dédoublonne
    return list(dict.fromkeys(origins))



app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.backtradz.com",
        "https://backtradz.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Montage des routers (certains en prefix /api)
# NOTE: l'ordre peut influencer la résolution des routes statiques vs API si conflits de chemins.
app.include_router(csv_router)
app.include_router(csv_library_router)
#app.include_router(frontend_routes.router)
app.include_router(pricing_routes.router)
app.include_router(user_profile_routes.router)
app.include_router(top_strategy_routes.router)
app.include_router(a_savoir_router)
app.include_router(stripe_routes.router)
app.include_router(paypal_router)
app.include_router(crypto_router)
app.include_router(meta_router)

app.include_router(auth_reset_routes.router, prefix="/api/auth")
app.include_router(auth.router, prefix="/api")
app.include_router(support_routes.router, prefix="/api")
app.include_router(user_dashboard_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(download_xlsx, prefix="/api")
app.include_router(strategy_params_router, prefix="/api")
app.include_router(run_backtest_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(official_data_router, prefix="/api")
app.include_router(backtest_xlsx_routes.router, prefix="/api")  # ⬅️ mount

from fastapi.responses import JSONResponse, RedirectResponse

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

@app.get("/health", include_in_schema=False)
def health():
    return {"ok": True}


@app.get("/", include_in_schema=False)
def root_redirect():
    return RedirectResponse(url=FRONTEND_URL, status_code=307)


@app.get("/debug/routes")
def debug_routes():
    """
    Endpoint utilitaire: liste les paths montés dans l'app.
    Utile pour vérifier que toutes les routes sont bien chargées.
    """
    return [route.path for route in app.routes]

@app.on_event("startup")
@repeat_every(seconds=86400)  # ⏱️ 1 fois toutes les 24h
def run_subscription_renewal() -> None:
    """
    Tâche planifiée (via fastapi_utils.repeat_every) exécutée toutes les 24h.
    But: renouveler les abonnements et créditer automatiquement les comptes.
    """
    print("⏳ Vérification des abonnements...")
    renew_all_subscriptions()

# 🔒 Custom doc avec champ X-API-Key
def custom_openapi():
    """
    Personnalise le schéma OpenAPI pour ajouter un security scheme `X-API-Key`.
    NOTE:
      - Applique "security" à tous les endpoints du schéma généré.
      - Vérifie que cela correspond bien à ta stratégie d'auth globale (X-API-Key vs cookies).
    """
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="Stratify API",
        version="1.0.0",
        description="API privée de backtest avec gestion de crédits",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "APIKeyHeader": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key"
        }
    }
    # Force la sécurité pour chaque path/méthode
    for path in openapi_schema["paths"].values():
        for method in path.values():
            method["security"] = [{"APIKeyHeader": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

# Remplace le générateur OpenAPI par la version custom
app.openapi = custom_openapi

# Scheduler "APScheduler" séparé (en plus de repeat_every)
# Ici: exécute generate_top_strategies 1 fois par jour.
scheduler = BackgroundScheduler()
scheduler.add_job(generate_top_strategies, 'interval', days=1)
scheduler.start()

# Debug: pour lister les routes à l'init si besoin
# for route in app.routes:
#     print("📦 ROUTE MONTÉE:", route.path)
