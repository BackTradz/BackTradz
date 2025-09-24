# backend/utils/email_templates.py
"""
Email Templates – BackTradz
---------------------------
Objectif:
- Centraliser TOUT le HTML/TXT des e-mails (vérification, reset, reçus, etc.)
- Assurer un style cohérent (header, footer, couleurs, CTA) sans dépendance externe
- Ne PAS introduire de régression: on conserve les signatures utilisées ailleurs
  - verification_subject() / verification_html(url) / verification_text(url)
  - reset_subject()        / reset_html(url)        / reset_text(url)

Paramétrage via .env:
- BRAND_NAME        (ex: "BackTradz")
- FRONTEND_URL      (ex: "https://backtradz.app")
- BRAND_LOGO_URL    (URL absolue d’un logo PNG/SVG. Si absent → fallback texte stylé)
- BRAND_SUPPORT_URL (facultatif, lien "Support")
- BRAND_UNSUB_URL   (facultatif, lien "Se désabonner")

Notes d’emailing:
- Tout est inline CSS pour compat maximale clients mails
- Pas de fonts custom (fallback system-ui)
- Largeur max 560px
"""

import os
from app.core.config import FRONTEND_URL

# -- Configuration marque -----------------------------------------------------

BRAND_NAME        = os.getenv("BRAND_NAME", "BackTradz")
BRAND_LOGO_URL    = os.getenv("BRAND_LOGO_URL", "").strip()  # Optionnel
BRAND_SUPPORT_URL = os.getenv("BRAND_SUPPORT_URL", "").strip()
BRAND_UNSUB_URL   = os.getenv("BRAND_UNSUB_URL", "").strip()

# -- Palette (full bleu, pas de vert) ----------------------------------------
# Arrière-plan global + carte + bordures + texte + accent
CLR_BG      = "#0b1220"   # fond page
CLR_CARD    = "#121a2b"   # fond carte
CLR_BORDER  = "#22304a"   # bordure douce
CLR_TEXT    = "#e6f0ff"   # texte principal
CLR_MUTED   = "rgba(230,240,255,.7)"  # texte secondaire
CLR_LINK    = "#7fb3ff"   # liens
# Dégradé CTA (bleus uniquement)
GRAD_FROM   = "#3aa2ff"
GRAD_TO     = "#5cc4ff"
# Badge / accent léger (si besoin)
CLR_PILL_BG = "rgba(127,179,255,.12)"
CLR_PILL_TX = "#bcd8ff"

# -- Primitives réutilisables -------------------------------------------------
def _brand_logo_html() -> str:
    """
    Retourne le bloc logo:
    - Si BRAND_LOGO_URL est défini → <img>
    - Sinon → fallback texte avec stylisation "Back tradz" en bleu (sans vert).
    """
    if BRAND_LOGO_URL:
        # Hauteur raisonnable pour email (dark background → pas besoin de max-width)
        return f'<img src="{BRAND_LOGO_URL}" alt="{BRAND_NAME}" height="48" style="display:block" />'
    # Fallback typographique (comme le header du site)
    return (
        '<div style="font-size:26px;font-weight:800;letter-spacing:.3px;'
        'filter: drop-shadow(0 0 10px rgba(127,179,255,.25));">'
        '<span style="color:#cfe4ff">Back</span> '
        '<span style="color:#5cc4ff">tradz</span>'
        "</div>"
    )

def _btn_html(label: str, url: str) -> str:
    """
    Bouton CTA compatible Outlook.
    - Clients modernes : <a> avec gradient
    - Outlook (moteur Word) : VML <v:roundrect> + bgcolor de fallback
    """
    solid = GRAD_TO  # couleur pleine de secours pour Outlook/VML

    return f"""
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
        href="{url}"
        arcsize="10%" stroke="f" fillcolor="{solid}"
        style="height:44px;v-text-anchor:middle;width:280px;">
      <w:anchorlock/>
      <center style="color:#0b1220;font-family:Segoe UI,Arial,sans-serif;
                     font-size:16px;font-weight:700;">
        {label}
      </center>
    </v:roundrect>
    <![endif]-->

    <!--[if !mso]><!-- -->
    <a href="{url}" target="_blank" style="text-decoration:none;display:inline-block;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td bgcolor="{solid}"
              style="background:{solid};
                     background:linear-gradient(90deg,{GRAD_FROM},{GRAD_TO});
                     color:#0b1220;font-weight:700;border-radius:12px;
                     padding:12px 22px;">
            {label}
          </td>
        </tr>
      </table>
    </a>
    <!--<![endif]-->
    """


def _footer_html() -> str:
    """Footer standard (copyright + liens optionnels)."""
    links = []
    if BRAND_SUPPORT_URL:
        links.append(f'<a style="color:{CLR_LINK};text-decoration:none" href="{BRAND_SUPPORT_URL}">Support</a>')
    if BRAND_UNSUB_URL:
        links.append(f'<a style="color:{CLR_LINK};text-decoration:none" href="{BRAND_UNSUB_URL}">Se désabonner</a>')
    links_html = f' · {" · ".join(links)}' if links else ""
    return (
        f'<div style="font-size:12px;opacity:.6;margin-top:16px">'
        f'© {BRAND_NAME} – Plateforme de backtest & data premium{links_html}'
        "</div>"
    )

def _container_html(inner: str) -> str:
    """
    Enveloppe email complète (fond + table responsive + carte).
    `inner` = contenu de la carte (titre, texte, bouton, etc.)
    """
    return f"""<!doctype html>
<html>
  <body style="margin:0;padding:0;background:{CLR_BG};color:{CLR_TEXT};
               font-family:Segoe UI,Roboto,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0"
                 style="background:{CLR_CARD};border-radius:16px;border:1px solid {CLR_BORDER};padding:32px;">
            {inner}
          </table>
          {_footer_html()}
        </td>
      </tr>
    </table>
  </body>
</html>"""

def _header_block(title: str, intro_html: str = "") -> str:
    """
    Bloc header commun (logo + titre + intro).
    `intro_html` peut contenir du texte/HTML supplémentaire sous le titre.
    """
    return (
        "<tr><td align='center' style='padding-bottom:12px;'>"
        f"{_brand_logo_html()}</td></tr>"
        f"<tr><td align='center' style='font-size:22px;font-weight:700;padding:4px 0 12px'>{title}</td></tr>"
        f"<tr><td style='font-size:15px;line-height:1.6;color:{CLR_MUTED};text-align:center;"
        f"padding:0 16px 20px'>{intro_html}</td></tr>"
    )

def _link_fallback_row(url: str) -> str:
    """Ligne d’assistance avec lien brut si le bouton ne marche pas."""
    return (
        "<tr><td style='font-size:12px;opacity:.7;text-align:center'>"
        "Si le bouton ne fonctionne pas, ouvre ce lien :<br/>"
        f'<a href="{url}" style="color:{CLR_LINK}">{url}</a>'
        "</td></tr>"
    )

# ============================================================================
# 1) VÉRIFICATION E-MAIL
# ============================================================================
def verification_subject() -> str:
    return f"Confirme ton e-mail – {BRAND_NAME}"

def verification_html(verify_url: str) -> str:
    inner = (
        _header_block(
            "Vérifie ton e-mail",
            "Clique sur le bouton ci-dessous pour confirmer ton adresse et "
            "<b>débloquer 2 crédits offerts</b>."
        )
        + f"<tr><td align='center' style='padding-bottom:24px'>{_btn_html('Valider mon e-mail', verify_url)}</td></tr>"
        + _link_fallback_row(verify_url)
    )
    return _container_html(inner)

def verification_text(verify_url: str) -> str:
    return f"Confirme ton e-mail pour débloquer 2 crédits: {verify_url}"

# ============================================================================
# 2) RESET MOT DE PASSE
# ============================================================================
def reset_subject() -> str:
    return f"Réinitialise ton mot de passe – {BRAND_NAME}"

def reset_html(reset_url: str) -> str:
    inner = (
        _header_block(
            "Réinitialise ton mot de passe",
            "Clique sur le bouton ci-dessous pour définir un nouveau mot de passe.<br/>"
            "<b>Ce lien expire dans 2 heures.</b>"
        )
        + f"<tr><td align='center' style='padding-bottom:24px'>{_btn_html('Définir un nouveau mot de passe', reset_url)}</td></tr>"
        + _link_fallback_row(reset_url)
    )
    return _container_html(inner)

def reset_text(reset_url: str) -> str:
    return f"Réinitialise ton mot de passe ici (valide 2h) : {reset_url}"

# ============================================================================
# 3) EXEMPLES FUTURS (fiches d’achat, alerte, etc.) – squelette prêt
# ============================================================================
def generic_notice_subject(title: str) -> str:
    return f"{title} – {BRAND_NAME}"

def generic_notice_html(title: str, body_html: str, cta_label: str | None = None, cta_url: str | None = None) -> str:
    btn = f"<tr><td align='center' style='padding-bottom:24px'>{_btn_html(cta_label, cta_url)}</td></tr>" if cta_label and cta_url else ""
    fallback = _link_fallback_row(cta_url) if cta_url else ""
    inner = _header_block(title, body_html) + btn + fallback
    return _container_html(inner)

def generic_notice_text(text: str, url: str | None = None) -> str:
    return f"{text}\n{url or ''}".strip()

def subscription_failed_subject() -> str:
    return f"Problème de renouvellement – {BRAND_NAME}"

# Ajoute un paramètre optionnel pour passer une URL de paiement directe
def subscription_failed_html(pay_url: str | None = None) -> str:
    url = pay_url or f"{FRONTEND_URL}/billing"
    inner = (
        _header_block(
            "Renouvellement d’abonnement échoué",
            "Ton dernier paiement d’abonnement n’a pas abouti. "
            "Merci de <b>régler la facture</b> ou <b>mettre à jour ta carte</b> pour réactiver tes crédits."
        )
        + "<tr><td align='center' style='padding-bottom:16px'>"
        + _btn_html("Régler ma facture", url)
        + "</td></tr>"
    )
    return _container_html(inner)

def subscription_failed_text(pay_url: str | None = None) -> str:
    url = pay_url or f"{FRONTEND_URL}/billing"
    return f"Ton renouvellement d’abonnement a échoué. Règle ta facture ou mets à jour ton moyen de paiement ici : {url}"
