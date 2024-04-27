from flask import Flask, request, jsonify, Response

from datetime import datetime

import uuid


class TreeNode:
    def __init__(self, data, uid=None):
        self.data = data
        self.children = []
        self.parent = None
        self.uid = uid or uuid.uuid4().hex

    def add_child(self, data):
        child = TreeNode(data)
        child.parent = self
        self.children.append(child)
        return child

    def delete_child(self, child):
        self.children.remove(child)

    def update_child(self, new_data):
        self.data = new_data

    def find_node(self, path):
        if not path or (len(path) == 1 and path[0] == self.uid):
            return self
        for child in self.children:
            if child.uid == path[0]:
                return child.find_node(path[1:])
        return None

    def find_path(self):
        path_list = []
        current_node = self
        while current_node:
            path_list.append(current_node.uid)
            current_node = current_node.parent

        path_list.reverse()
        s = ""
        for item in path_list:
            s += f"/{item}"
        return s

    def get_children(self):
        if len(self.children) != 0:
            return [child.find_path() for child in self.children]
        return None

    def serialized_data(self):
        return {
            'url': self.find_path(),
            'text': self.data,
            'children': self.get_children()
        }


app = Flask(__name__)

updated_items = {}
last_update_time = datetime.utcnow()
root_node = TreeNode("Root", uid="outline")

@app.route('/updatedItems/', methods = ['GET'])
def get_items():
    global updated_items, last_update_time
    since_param = request.args.get('since')
    if not since_param:
        return jsonify({"error": "Missing 'since' query parameter"}), 400

    try:
        since_object = datetime.strptime(since_param, "%Y-%m-%dT%H:%M:%S.%fZ")
    except ValueError:
        return jsonify({"error": "Invalid datetime format"}), 400

    if since_object < last_update_time:
        return jsonify(updated_items), 200
    
    else:
        return jsonify({}), 200

@app.route('/')
def index():
    with open('ui.html', 'r') as file:
        return Response(file.read(), mimetype='text/html')

@app.route('/style.css')
def style():
    with open('style.css', 'r') as file:
        return Response(file.read(), mimetype='text/css')

@app.route('/main.js')
def main_js():
    with open('main.js', 'r') as file:
        return Response(file.read(), mimetype='application/javascript')

@app.route('/favicon.ico')
def favicon():
    with open('favicon.ico', 'rb') as file:
        return Response(file.read(), mimetype='image/x-icon')


@app.route('/outline/', methods=['GET', 'POST', 'PUT'])
@app.route('/outline/<path:ids>/', methods=['GET', 'POST', 'PUT', 'DELETE'])
def outline_handler(ids=None):
    global last_update_time
    elements = ids.split('/') if ids else [root_node.uid]

    current_node = root_node.find_node(elements)

    if current_node is None:
        return "Node not found", 404

    if request.method == 'GET':
        return jsonify(current_node.serialized_data()), 200

    elif request.method == 'POST':
        
        data = request.get_json()
        text = data.get('text')
        new_child = current_node.add_child(text)
        response_data = new_child.serialized_data()
        updated_items[response_data['url']] = "POST"
        last_update_time = datetime.utcnow()
        return jsonify(response_data), 201

    elif request.method == 'PUT':
        data = request.get_json()
        text = data.get('text')
        current_node.update_child(text)
        response_data = current_node.serialized_data()
        updated_items[response_data['url']] = "PUT" 
        last_update_time = datetime.utcnow()

        return jsonify(response_data), 201

    elif request.method == 'DELETE':
        data =  current_node.serialized_data()
        updated_items[data['url']] = "DELETE"
        current_node.parent.delete_child(current_node)
        last_update_time = datetime.utcnow()
        return '', 204


