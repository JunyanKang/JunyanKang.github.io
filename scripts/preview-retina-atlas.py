"""Serve a locally built site and an external atlas data directory on loopback."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

parser = argparse.ArgumentParser()
parser.add_argument('data', type=Path)
parser.add_argument('--port', type=int, default=4387)
args = parser.parse_args()
site = Path(__file__).resolve().parents[1] / '_site'

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = unquote(urlsplit(path).path)
        root = site
        prefix = '/assets/retina-atlas/'
        if path.startswith(prefix):
            root = args.data.resolve()
            path = path[len(prefix):]
        result = (root / path.lstrip('/')).resolve()
        return str(result if result.is_relative_to(root) else root / '404.html')

ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
