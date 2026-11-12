"""Production-ready Flask API for the Crop Yield Prediction frontend."""
from __future__ import annotations

import logging
import os
from pathlib import Path
from threading import Lock

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "crop_yield_model.pkl"
PREPROCESSOR_PATH = BASE_DIR / "models" / "preprocessor.pkl"
DATASET_PATH = BASE_DIR / "dataset" / "crop_yield.csv"

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("crop-yield-api")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "https://crop-yield-prediction-ai.netlify.app,http://localhost:5500,http://127.0.0.1:5500"
    ).split(",")
    if origin.strip()
]
CORS(app, resources={r"/*": {"origins": allowed_origins}})

model = None
preprocessor = None
options_cache = None
load_lock = Lock()
FEATURES = [
    "Year", "State", "Crop", "Season", "Area",
    "Annual_Rainfall", "Fertilizer", "Pesticide"
]
NUMERIC_FIELDS = ["Year", "Area", "Annual_Rainfall", "Fertilizer", "Pesticide"]


def load_artifacts():
    """Load trusted, version-matched model artifacts once per worker."""
    global model, preprocessor
    if model is not None and preprocessor is not None:
        return
    with load_lock:
        if model is None or preprocessor is None:
            if not MODEL_PATH.is_file() or not PREPROCESSOR_PATH.is_file():
                raise FileNotFoundError("Model artifacts are missing from the models/ directory.")
            model = joblib.load(MODEL_PATH)
            preprocessor = joblib.load(PREPROCESSOR_PATH)


def load_options():
    global options_cache
    if options_cache is None:
        if not DATASET_PATH.is_file():
            raise FileNotFoundError("The crop dataset is missing from the dataset/ directory.")
        frame = pd.read_csv(DATASET_PATH, usecols=["State", "Crop", "Season"])
        options_cache = {
            "states": sorted(frame["State"].dropna().astype(str).unique().tolist()),
            "crops": sorted(frame["Crop"].dropna().astype(str).unique().tolist()),
            "seasons": sorted(frame["Season"].dropna().astype(str).unique().tolist()),
        }
    return options_cache


@app.get("/")
def home():
    return jsonify({
        "service": "Crop Yield Prediction API",
        "status": "ok",
        "endpoints": ["/health", "/options", "/predict"]
    })


@app.get("/health")
def health():
    try:
        load_artifacts()
        load_options()
        return jsonify({"status": "healthy", "model_loaded": True, "options_loaded": True})
    except Exception:
        logger.exception("Health check failed")
        return jsonify({"status": "unavailable", "model_loaded": False}), 503


@app.get("/options")
def options():
    try:
        return jsonify(load_options())
    except Exception:
        logger.exception("Could not load dropdown options")
        return jsonify({"error": "Crop options are temporarily unavailable."}), 503


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Send prediction inputs as a JSON object."}), 400

    missing = [field for field in FEATURES if field not in payload]
    if missing:
        return jsonify({"error": "Missing required fields: " + ", ".join(missing)}), 400

    values = {}
    try:
        for field in NUMERIC_FIELDS:
            value = float(payload[field])
            if not np.isfinite(value):
                raise ValueError(f"{field} must be a finite number.")
            values[field] = value
    except (TypeError, ValueError, OverflowError) as exc:
        return jsonify({"error": str(exc) or "Numeric inputs must be valid numbers."}), 400

    if not values["Year"].is_integer() or not 1900 <= values["Year"] <= 2100:
        return jsonify({"error": "Year must be a whole number between 1900 and 2100."}), 400
    for field in ["Area"]:
        if values[field] <= 0:
            return jsonify({"error": f"{field} must be greater than zero."}), 400
    for field in ["Annual_Rainfall", "Fertilizer", "Pesticide"]:
        if values[field] < 0:
            return jsonify({"error": f"{field} cannot be negative."}), 400

    for field in ["State", "Crop", "Season"]:
        if not isinstance(payload[field], str) or not payload[field].strip():
            return jsonify({"error": f"Please select a valid {field.lower()}."}), 400
        values[field] = payload[field].strip()

    try:
        available = load_options()
        allowed_values = {
            "State": available["states"],
            "Crop": available["crops"],
            "Season": available["seasons"],
        }
        for field, choices in allowed_values.items():
            if values[field] not in choices:
                return jsonify({"error": f"Selected {field.lower()} is not in the dataset options."}), 400

        load_artifacts()
        input_frame = pd.DataFrame([{field: values[field] for field in FEATURES}], columns=FEATURES)
        transformed = preprocessor.transform(input_frame)
        prediction = float(np.asarray(model.predict(transformed)).reshape(-1)[0])
        if not np.isfinite(prediction):
            raise ValueError("The model returned a non-finite prediction.")
        return jsonify({"predicted_yield": prediction, "unit": "dataset yield units"})
    except FileNotFoundError as exc:
        logger.exception("Required project artifact missing")
        return jsonify({"error": str(exc)}), 503
    except Exception:
        logger.exception("Prediction failed")
        return jsonify({"error": "Prediction could not be completed. Please try again."}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
