import time
import io
import logging
import socketserver
from http import server
from threading import Condition
from picamera2 import Picamera2
from picamera2.encoders import JpegEncoder
from picamera2.outputs import FileOutput

streamWidth = 800
streamHeight = round(streamWidth * 9/16)
HTML = "<html><head><title>Proto Jr. Livestream</title><style>body{margin:0;background-color:black}</style></head><body><img src='live.mjpg' width='100%'/></body></html>"

class StreamingOutput(io.BufferedIOBase):
    def __init__(self):
        self.frame = None
        self.condition = Condition()
    def write(self, buf):
        with self.condition:
            self.frame = buf
            self.condition.notify_all()

class StreamingHandler(server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/stop':
            cam.stop_recording()
        if self.path == '/live.mjpg':
            self.send_response(200)
            self.send_header('Age', 0)
            self.send_header('Cache-Control', 'no-cache, private')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=FRAME')
            self.end_headers()
            try:
                while True:
                    with output.condition:
                        output.condition.wait()
                        frame = output.frame
                    self.wfile.write(b'--FRAME\r\n')
                    self.send_header('Content-Type', 'image/jpeg')
                    self.send_header('Content-Length', len(frame))
                    self.end_headers()
                    self.wfile.write(frame)
                    self.wfile.write(b'\r\n')
                    time.sleeep(0.1)
            except Exception as e:
                print('Stopped: %s: %s', self.client_address, str(e))
        else:
            content = HTML.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)

class StreamingServer(socketserver.ThreadingMixIn, server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

cam = Picamera2()
cam.configure(cam.create_video_configuration(main={"size": (streamWidth, streamHeight)}))
output = StreamingOutput()
cam.start_recording(JpegEncoder(), FileOutput(output))

try:
    address = ('', 7000)
    server = StreamingServer(address, StreamingHandler)
    server.serve_forever()
finally:
    cam.stop_recording()
