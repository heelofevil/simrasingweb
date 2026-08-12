import os
import sys

# reload marker: 2026-08-12-faq-v1
_HOME = "/home/a1302688"
_PUBLIC = f"{_HOME}/domains/a1302688.xsph.ru/public_html"
_ENV_FILE = f"{_HOME}/domains/a1302688.xsph.ru/.env"
_VENV_ROOT = f"{_HOME}/python"

for sub in ("lib/python3.10/site-packages", "lib64/python3.10/site-packages"):
    pkg_dir = os.path.join(_VENV_ROOT, sub)
    if os.path.isdir(pkg_dir) and pkg_dir not in sys.path:
        sys.path.insert(0, pkg_dir)

if _PUBLIC not in sys.path:
    sys.path.insert(0, _PUBLIC)

from dotenv import load_dotenv

load_dotenv(_ENV_FILE)

from wsgi import app as application

_original_wsgi = application.wsgi_app


def _fixed_wsgi(environ, start_response):
    path = environ.get("PATH_INFO") or ""
    script = environ.get("SCRIPT_NAME") or ""
    for prefix in ("/site.wsgi", "/app.wsgi", script):
        if prefix and prefix != "/" and path.startswith(prefix):
            path = path[len(prefix) :] or "/"
            break
    environ["SCRIPT_NAME"] = ""
    environ["PATH_INFO"] = path
    return _original_wsgi(environ, start_response)


application.wsgi_app = _fixed_wsgi

if __name__ == "__main__":
    application.run()
