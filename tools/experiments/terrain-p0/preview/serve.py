"""P0-only static server for Quantized-Mesh preview. NOT the GeoForge resource server.

python serve.py --tiles-root D:\\work\\terrain-p0\\out --cesium <path to Cesium Build/Cesium> [--port 8765]
                [--gzip-mode auto|none]   (none = deliberately omit Content-Encoding, negative test)
Routes: /            -> preview.html
        /cesium/...  -> CesiumJS build
        /tiles/<run>/... -> tiles; .terrain gets Content-Type application/vnd.quantized-mesh
Every request is appended to requests.jsonl in the tiles root (status, headers).
"""
import argparse, json, os, posixpath, time, urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

A = None
TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
         ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".wasm": "application/wasm", ".xml": "application/xml",
         ".glb": "model/gltf-binary", ".ktx2": "image/ktx2"}

class Srv(ThreadingHTTPServer):
    request_queue_size = 256  # default 5 refuses bursts of tile requests on Windows
    daemon_threads = True

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def safe(self, root, rel):
        p = os.path.normpath(os.path.join(root, *[s for s in rel.split("/") if s not in ("", ".", "..")]))
        return p if os.path.commonpath([p, os.path.normpath(root)]) == os.path.normpath(root) else None
    def do_GET(self):
        u = urllib.parse.urlparse(self.path); path = urllib.parse.unquote(u.path)
        if path in ("/", "/preview.html"): f = os.path.join(os.path.dirname(__file__), "preview.html")
        elif path.startswith("/cesium/"): f = self.safe(A.cesium, path[8:])
        elif path.startswith("/tiles/"): f = self.safe(A.tiles_root, path[7:])
        else: f = None
        hdr = {"Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache"}
        if not f or not os.path.isfile(f):
            self.send_response(404); [self.send_header(k, v) for k, v in hdr.items()]; self.end_headers(); self.rec(path, 404, hdr, 0); return
        data = open(f, "rb").read(); ext = os.path.splitext(f)[1].lower()
        if ext == ".terrain":
            hdr["Content-Type"] = "application/vnd.quantized-mesh"
            if data[:2] == b"\x1f\x8b" and A.gzip_mode == "auto": hdr["Content-Encoding"] = "gzip"
        else:
            hdr["Content-Type"] = TYPES.get(ext, "application/octet-stream")
        hdr["Content-Length"] = str(len(data))
        self.send_response(200); [self.send_header(k, v) for k, v in hdr.items()]; self.end_headers(); self.wfile.write(data)
        self.rec(path, 200, hdr, len(data))
    def rec(self, path, st, hdr, n):
        if path.startswith("/tiles/"):
            with open(os.path.join(A.tiles_root, "requests.jsonl"), "a", encoding="utf-8") as fp:
                fp.write(json.dumps(dict(t=time.time(), path=path, status=st, headers=hdr, bytes=n)) + "\n")

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--tiles-root", required=True); ap.add_argument("--cesium", required=True)
    ap.add_argument("--port", type=int, default=8765); ap.add_argument("--gzip-mode", choices=["auto", "none"], default="auto")
    A = ap.parse_args()
    print(f"serving http://127.0.0.1:{A.port}/ gzip-mode={A.gzip_mode}", flush=True)
    Srv(("127.0.0.1", A.port), H).serve_forever()

