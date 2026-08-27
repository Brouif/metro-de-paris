#!/usr/bin/env python3
"""Serve app/ for development, with caching turned off.

python3 -m http.server sends Last-Modified, so browsers hold on to app.css and
index.html and quietly show a stale build after an edit. This sends no-store
instead, which is what you want while working on the thing.

    python3 tools/serve.py [port]
"""

import functools
import http.server
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app")


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # Without this, text files go out as bare "text/html" and browsers fall back
    # to windows-1252, which turns every accent into mojibake.
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map)
    extensions_map.update({
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
    })

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s\n" % (fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Serving {os.path.relpath(ROOT)} at http://127.0.0.1:{port}/ (no cache)")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
