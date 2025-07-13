import http.server
import socketserver
import os
import json
import webbrowser
import threading

PORT = 8080
Handler = http.server.SimpleHTTPRequestHandler

EXCLUDE_FILES = ['base.js', 'utils.js']

print("Generating widgets.json...")
try:
    all_js_files = [f for f in os.listdir('widgets') if f.endswith('.js')]
    
    widget_files = [
        name[:-3] for name in all_js_files if name not in EXCLUDE_FILES
    ]
    
    with open('widgets.json', 'w') as f:
        json.dump(sorted(widget_files), f)
    
    print(f"widgets.json generated successfully with: {sorted(widget_files)}")

except FileNotFoundError:
    print("WARNING: The 'widgets' directory was not found. Could not generate widgets.json.")
except Exception as e:
    print(f"An error occurred while generating widgets.json: {e}")


def open_browser():
    """Opens a new tab in the web browser pointing to the local server."""
    webbrowser.open_new_tab(f'http://localhost:{PORT}')

if __name__ == "__main__":
    threading.Timer(1.2, open_browser).start()
    
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f'Server running at http://localhost:{PORT}')
        httpd.serve_forever()