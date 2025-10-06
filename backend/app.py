from flask import Flask, jsonify, request
from get_asteroid_data import get_asteroid_data, get_asteroid_names
from flask_cors import CORS

# Setting up initial Flask app and allowing cross origin
app = Flask(__name__)
CORS(app)

# Endpoint to get list of asteroids
@app.route('/get_asteroid_names', methods=['GET'])
def get_names():
    names = get_asteroid_names()
    return jsonify(names)

# Endpoint to get specific information for an asteroid
@app.route('/get_asteroid', methods=['GET'])
def get_asteroid():
    name = request.args.get('name')
    if not name:
        return jsonify({'error': 'missing name'}), 400
    data = get_asteroid_data(name)
    return jsonify(data)

# Used to run the flask app
app.run()