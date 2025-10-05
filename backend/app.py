from flask import Flask, jsonify, request
from get_asteroid_data import get_asteroid_data, get_asteroid_names
from flask_cors import CORS, cross_origin

app = Flask(__name__)
CORS(app)

@app.route('/get_asteroid_names', methods=['GET'])
def get_names():
    names = get_asteroid_names()
    print(names)
    return jsonify(names)


@app.route('/get_asteroid/<name>', methods=['GET'])
def get_all_asteroids(name):
    name = request.args.get('name')
    if not name:
        return jsonify({'error: missing name'}), 400
    data = get_asteroid_data(name)
    return jsonify(data)

app.run()