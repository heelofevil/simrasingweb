import os
import sys

activate_this = "/home/a1302688/python/bin/activate_this.py"
with open(activate_this) as f:
    exec(f.read(), {"__file__": activate_this})

from dotenv import load_dotenv

load_dotenv("/home/a1302688/domains/a1302688.xsph.ru/.env")

sys.path.insert(0, "/home/a1302688/domains/a1302688.xsph.ru/public_html")

from wsgi import app as _flask_app


def _fix_wsgi_paths(app):
    def middleware(environ, start_response):
        path = environ.get("PATH_INFO") or ""
        script = environ.get("SCRIPT_NAME") or ""
        for prefix in ("/site.wsgi", script):
            if prefix and prefix != "/" and path.startswith(prefix):
                path = path[len(prefix) :] or "/"
                break
        environ["SCRIPT_NAME"] = ""
        environ["PATH_INFO"] = path
        return app(environ, start_response)

    return middleware


application = _fix_wsgi_paths(_flask_app)

if __name__ == "__main__":
    application.run()
