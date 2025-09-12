# backend/utils/email_sender.py
import os, smtplib, ssl
from email.message import EmailMessage

def _cfg():
    return {
        "host": os.getenv("SMTP_HOST"),
        "port": os.getenv("SMTP_PORT"),  # str | None (on laisse choisir AUTO)
        "user": os.getenv("SMTP_USER"),
        "pwd":  os.getenv("SMTP_PASS"),
        "from": os.getenv("SMTP_FROM") or os.getenv("SMTP_USER"),
        "brand":os.getenv("BRAND_NAME", "BackTradz"),
        "secure": (os.getenv("SMTP_SECURE") or "STARTTLS").upper(),  # STARTTLS | SSL | PLAIN | AUTO
        "timeout": int(os.getenv("SMTP_TIMEOUT", "20")),
        "debug": int(os.getenv("SMTP_DEBUG", "0")),
    }

def _ready(c): return all([c["host"], c["user"], c["pwd"], c["from"]])

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

