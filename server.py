import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.parse

class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = '/index.html'
        try:
            file_path = os.path.join(os.getcwd(), self.path[1:])
            if os.path.isfile(file_path):
                self.send_response(200)
                if file_path.endswith('.html'):
                    self.send_header('Content-type', 'text/html')
                elif file_path.endswith('.css'):
                    self.send_header('Content-type', 'text/css')
                elif file_path.endswith('.js'):
                    self.send_header('Content-type', 'application/javascript')
                elif file_path.endswith('.json'):
                    self.send_header('Content-type', 'application/json')
                elif file_path.endswith('.svg'):
                    self.send_header('Content-type', 'image/svg+xml')
                else:
                    self.send_header('Content-type', 'text/plain')
                self.end_headers()
                with open(file_path, 'rb') as file:
                    self.wfile.write(file.read())
            else:
                self.send_error(404, "File not found")
        except Exception as e:
            self.send_error(500, str(e))

    def do_POST(self):
        if self.path == '/register':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            print("Received registration data:", data)

            # Load existing data
            try:
                with open('data.json', 'r') as f:
                    db = json.load(f)
                print("Loaded DB:", db)
            except FileNotFoundError:
                db = {"messages": [], "users": []}
                print("Created new DB")

            # Add new user
            new_user = {
                "id": len(db["users"]) + 1,
                "username": data["username"],
                "password": data["password"],
                "role": "user",
                "email": data["email"],
                "address": data["address"],
                "dateOfBirth": data["dob"],
                "qualification": data["qualification"]
            }
            db["users"].append(new_user)
            print("Added user:", new_user)

            # Save back
            try:
                with open('data.json', 'w') as f:
                    json.dump(db, f, indent=2)
                print("Saved DB")
            except Exception as e:
                print("Error saving:", e)
                self.send_error(500, "Error saving data")

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Registration successful"}).encode('utf-8'))
        else:
            self.send_error(404, "Endpoint not found")

if __name__ == '__main__':
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, RequestHandler)
    print("Server running on port 8000...")
    httpd.serve_forever()