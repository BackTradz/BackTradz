# backend/utils/email_sender.py
import os, smtplib, ssl
from email.message import EmailMessage


def _env(k, default=""):
    v = os.getenv(k)
    return (v or "").strip() if v is not None else default

def _cfg():
    host   = _env("SMTP_HOST")           # DOIT venir de l'env
    port_s = _env("SMTP_PORT", "587")
    user   = _env("SMTP_USER") or _env("SMTP_USERNAME")
    pwd    = _env("SMTP_PASS") or _env("SMTP_PASSWORD")
    from_  = _env("SMTP_FROM") or user
    secure = _env("SMTP_SECURE", "STARTTLS").upper()
    debug  = _env("SMTP_DEBUG", "0") in ("1", "true", "TRUE")

    # 🔒 Pas de fallback silencieux sur Namecheap.
    # Si l'env n'est pas renseignée, on ne devine RIEN.
    # MAIS: si l'utilisateur a mis l'identifiant Brevo, on “corrige” l’host si absent.
    if not host and user.endswith("@smtp-brevo.com"):
        host, secure = "smtp-relay.brevo.com", "STARTTLS"

    # (Optionnel) si l’utilisateur a mis un host Brevo mais secure vide, on force STARTTLS
    if host.endswith("smtp-relay.brevo.com") and not secure:
        secure = "STARTTLS"

    return {
        "host": host,
        "port": int(port_s) if port_s else 587,
        "user": user,
        "pwd":  pwd,
        "from": from_,
        "secure": secure,   # STARTTLS | SSL | PLAIN
        "timeout": int(_env("SMTP_TIMEOUT", "20")),
        "debug": debug,
    }

def _ready(c):
    return all([c["host"], c["user"], c["pwd"], c["from"]])
def _send_once(c, mode, port, msg):
    if c["debug"]:
        print(f"[email_sender] Trying {mode} on {c['host']}:{port} ...")
    if mode == "SSL":
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(c["host"], port, timeout=c["timeout"], context=context) as s:
            s.set_debuglevel(c["debug"])
            s.login(c["user"], c["pwd"]); s.send_message(msg)
    else:
        with smtplib.SMTP(c["host"], port, timeout=c["timeout"]) as s:
            s.set_debuglevel(c["debug"])
            if mode == "STARTTLS":
                context = ssl.create_default_context()
                s.starttls(context=context)
            s.login(c["user"], c["pwd"]); s.send_message(msg)

def send_email_html(to_email: str, subject: str, html_body: str, text_fallback: str = "") -> bool:
    c = _cfg()
    if not _ready(c):
        missing = [k for k in ["SMTP_HOST","SMTP_USER","SMTP_PASS","SMTP_FROM"] if not os.getenv(k)]
        print(f"[email_sender] SMTP non configuré. Manque: {', '.join(missing)}")
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"]    = f"{c['brand']} <{c['from']}>"
    msg["To"]      = to_email
    if text_fallback: msg.set_content(text_fallback)
    msg.add_alternative(html_body, subtype="html")

    # Plans de connexion à tester
    plans = []
    if c["secure"] == "AUTO":
        plans = [("SSL", 465), ("STARTTLS", 587), ("STARTTLS", 25), ("PLAIN", 25)]
    else:
        # Si l'utilisateur donne un port -> on le respecte, sinon on met le défaut du mode
        default_port = 465 if c["secure"] == "SSL" else (587 if c["secure"] == "STARTTLS" else 25)
        port = int(c["port"] or default_port)
        plans = [(c["secure"], port)]

    last_err = None
    for mode, port in plans:
        try:
            _send_once(c, mode, int(port), msg)
            return True
        except Exception as e:
            last_err = e
            print("[email_sender] Erreur envoi:", repr(e))
            continue
    if last_err:
        print("[email_sender] Tous les essais ont échoué.")
    return False

