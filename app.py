"""Crop Yield Prediction API.

Artifacts are loaded lazily and paths are resolved relative to this file so the
service works consistently from local development and hosted working dirs.
"""
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
        "https://crop-yield-prediction-ai.netlify.app,"
        "http://localhost:5500,http://127.0.0.1:5500"
    ).split(",")
    if origin.strip()
]
CORS(app, resources={r"/*": {"origins": allowed_origins}})

model = None
preprocessor = None
options_cache = None
dataset_cache = None
artifact_lock = Lock()
dataset_lock = Lock()

FEATURES = [
    "Year", "State", "Crop", "Season", "Area",
    "Annual_Rainfall", "Fertilizer", "Pesticide"
]
NUMERIC_FIELDS = ["Year", "Area", "Annual_Rainfall", "Fertilizer", "Pesticide"]
CATEGORICAL_FIELDS = ["State", "Crop", "Season"]


def load_artifacts():
    """Load trusted, version-matched joblib files once per worker."""
    global model, preprocessor
    if model is not None and preprocessor is not None:
        return
    with artifact_lock:
        if model is not None and preprocessor is not None:
            return
        if not MODEL_PATH.is_file() or not PREPROCESSOR_PATH.is_file():
            raise FileNotFoundError("Model artifacts are missing from the models/ directory.")
        # Only load model files shipped with this trusted repository.
        loaded_model = joblib.load(MODEL_PATH)
        loaded_preprocessor = joblib.load(PREPROCESSOR_PATH)
        model, preprocessor = loaded_model, loaded_preprocessor


def load_dataset():
    """Read the source dataset once per worker."""
    global dataset_cache
    if dataset_cache is not None:
        return dataset_cache
    with dataset_lock:
        if dataset_cache is None:
            if not DATASET_PATH.is_file():
                raise FileNotFoundError("The crop dataset is missing from the dataset/ directory.")
            dataset_cache = pd.read_csv(DATASET_PATH)
    return dataset_cache


def load_options():
    global options_cache
    if options_cache is None:
        frame = load_dataset()
        years = pd.to_numeric(frame["Year"], errors="coerce").dropna()
        options_cache = {
            "states": sorted(frame["State"].dropna().astype(str).unique().tolist()),
            "crops": sorted(frame["Crop"].dropna().astype(str).unique().tolist()),
            "seasons": sorted(frame["Season"].dropna().astype(str).unique().tolist()),
            "year_min": int(years.min()) if not years.empty else 2000,
            "year_max": int(years.max()) if not years.empty else 2026,
            "dataset_rows": int(len(frame)),
        }
    return options_cache


def parse_prediction_input(payload, crop_override=None):
    """Validate and normalize one row, returning (values, error_message)."""
    if not isinstance(payload, dict):
        return None, "Send prediction inputs as a JSON object."

    missing = [field for field in FEATURES if field not in payload]
    if missing:
        return None, "Missing required fields: " + ", ".join(missing)

    values = {}
    for field in NUMERIC_FIELDS:
        try:
            number = float(payload[field])
        except (TypeError, ValueError, OverflowError):
            return None, f"{field} must be a valid number."
        if not np.isfinite(number):
            return None, f"{field} must be a finite number."
        values[field] = number

    if not values["Year"].is_integer():
        return None, "Year must be a whole number."
    if values["Area"] <= 0:
        return None, "Area must be greater than zero."
    for field in ["Annual_Rainfall", "Fertilizer", "Pesticide"]:
        if values[field] < 0:
            return None, f"{field} cannot be negative."

    for field in CATEGORICAL_FIELDS:
        raw = crop_override if field == "Crop" and crop_override is not None else payload.get(field)
        if not isinstance(raw, str) or not raw.strip():
            return None, f"Please select a valid {field.lower()}."
        values[field] = raw.strip()

    return values, None


def validate_categories(values, available):
    allowed = {
        "State": available["states"],
        "Crop": available["crops"],
        "Season": available["seasons"],
    }
    for field, choices in allowed.items():
        if values[field] not in choices:
            return f"Selected {field.lower()} is not in the dataset options."
    return None


def predict_rows(rows):
    load_artifacts()
    input_frame = pd.DataFrame(rows, columns=FEATURES)
    transformed = preprocessor.transform(input_frame)
    predictions = np.asarray(model.predict(transformed), dtype=float).reshape(-1)
    if len(predictions) != len(rows) or not np.isfinite(predictions).all():
        raise ValueError("The model returned invalid prediction values.")
    return predictions


@app.get("/")
def home():
    return jsonify({
        "service": "Crop Yield Prediction API",
        "status": "ok",
        "endpoints": ["/health", "/options", "/summary", "/predict", "/compare"],
    })


@app.get("/health")
def health():
    try:
        load_artifacts()
        load_options()
        return jsonify({"status": "healthy", "model_loaded": True, "dataset_loaded": True})
    except Exception:
        logger.exception("Health check failed")
        return jsonify({"status": "unavailable", "model_loaded": False}), 503


@app.get("/options")
def options():
    try:
        return jsonify(load_options())
    except Exception:
        logger.exception("Could not load dataset options")
        return jsonify({"error": "Crop options are temporarily unavailable."}), 503


@app.get("/summary")
def summary():
    try:
        available = load_options()
        return jsonify({
            "dataset_records": available["dataset_rows"],
            "states": len(available["states"]),
            "crops": len(available["crops"]),
            "seasons": len(available["seasons"]),
            "year_min": available["year_min"],
            "year_max": available["year_max"],
        })
    except Exception:
        logger.exception("Could not build dataset summary")
        return jsonify({"error": "Dataset summary is temporarily unavailable."}), 503


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True)
    values, error = parse_prediction_input(payload)
    if error:
        return jsonify({"error": error}), 400

    try:
        available = load_options()
        year = values["Year"]
        if not available["year_min"] <= year <= available["year_max"]:
            return jsonify({
                "error": f"Year must be between {available['year_min']} and {available['year_max']}."
            }), 400
        error = validate_categories(values, available)
        if error:
            return jsonify({"error": error}), 400
        prediction = float(predict_rows([values])[0])
        return jsonify({"predicted_yield": prediction, "unit": "dataset yield units"})
    except FileNotFoundError as exc:
        logger.exception("Required project artifact missing")
        return jsonify({"error": str(exc)}), 503
    except Exception:
        logger.exception("Prediction failed")
        return jsonify({"error": "Prediction could not be completed. Please try again."}), 500


@app.post("/compare")
def compare():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Send comparison inputs as a JSON object."}), 400
    crops = payload.get("crops")
    if not isinstance(crops, list) or not 2 <= len(crops) <= 8:
        return jsonify({"error": "Select between 2 and 8 crops to compare."}), 400
    if any(not isinstance(crop, str) for crop in crops) or len(set(crops)) != len(crops):
        return jsonify({"error": "Choose 2–8 different crop names."}), 400

    base_payload = dict(payload)
    base_payload["Crop"] = crops[0]
    base_values, error = parse_prediction_input(base_payload)
    if error:
        return jsonify({"error": error}), 400

    try:
        available = load_options()
        if not available["year_min"] <= base_values["Year"] <= available["year_max"]:
            return jsonify({
                "error": f"Year must be between {available['year_min']} and {available['year_max']}."
            }), 400
        for crop in crops:
            if crop not in available["crops"]:
                return jsonify({"error": f"Crop '{crop}' is not in the dataset options."}), 400
        error = validate_categories(base_values, available)
        if error:
            return jsonify({"error": error}), 400

        rows = [{**base_values, "Crop": crop} for crop in crops]
        values = predict_rows(rows)
        results = [
            {"crop": crop, "predicted_yield": float(value)}
            for crop, value in zip(crops, values)
        ]
        results.sort(key=lambda item: item["predicted_yield"], reverse=True)
        return jsonify({"predictions": results, "unit": "dataset yield units"})
    except FileNotFoundError as exc:
        logger.exception("Required project artifact missing")
        return jsonify({"error": str(exc)}), 503
    except Exception:
        logger.exception("Crop comparison failed")
        return jsonify({"error": "Crop comparison could not be completed. Please try again."}), 500


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"error": "Request is too large."}), 413


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
