from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import os

app = Flask(__name__)
CORS(app)

# Load trained model
model = joblib.load("models/crop_yield_model.pkl")

# Load preprocessor
preprocessor = joblib.load("models/preprocessor.pkl")


@app.route("/")
def home():
    return "Crop Yield Prediction API is running!"

@app.route("/options", methods=["GET"])
def options():

    dataset_path = "dataset/crop_yield.csv"

    df = pd.read_csv(dataset_path)

    states = sorted(df["State"].dropna().unique().tolist())
    crops = sorted(df["Crop"].dropna().unique().tolist())
    seasons = sorted(df["Season"].dropna().unique().tolist())

    return jsonify({
        "states": states,
        "crops": crops,
        "seasons": seasons
    })

@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    input_data = pd.DataFrame([{
        "Year": data["Year"],
        "State": data["State"],
        "Crop": data["Crop"],
        "Season": data["Season"],
        "Area": data["Area"],
        "Annual_Rainfall": data["Annual_Rainfall"],
        "Fertilizer": data["Fertilizer"],
        "Pesticide": data["Pesticide"]
    }])

    # Convert input into encoded features
    input_encoded = preprocessor.transform(input_data)

    # Predict yield
    prediction = model.predict(input_encoded)

    return jsonify({
        "predicted_yield": float(prediction[0])
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)