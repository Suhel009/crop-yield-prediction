import unittest

import numpy as np

import app as api


class IdentityPreprocessor:
    def transform(self, frame):
        return frame


class ConstantModel:
    def predict(self, frame):
        # Deterministic stand-in: different rows get ascending predictions.
        return np.arange(1, len(frame) + 1, dtype=float)


class PredictionApiTests(unittest.TestCase):
    def setUp(self):
        self.previous = {
            "model": api.model,
            "preprocessor": api.preprocessor,
            "options_cache": api.options_cache,
            "testing": api.app.config.get("TESTING", False),
        }
        api.model = ConstantModel()
        api.preprocessor = IdentityPreprocessor()
        api.options_cache = {
            "states": ["Uttar Pradesh", "Bihar"],
            "crops": ["Rice", "Wheat", "Maize"],
            "seasons": ["Kharif", "Rabi"],
            "year_min": 2000,
            "year_max": 2026,
            "dataset_rows": 17321,
        }
        api.app.config["TESTING"] = True
        self.client = api.app.test_client()

    def tearDown(self):
        api.model = self.previous["model"]
        api.preprocessor = self.previous["preprocessor"]
        api.options_cache = self.previous["options_cache"]
        api.app.config["TESTING"] = self.previous["testing"]

    def valid_payload(self):
        return {
            "Year": 2024,
            "State": "Uttar Pradesh",
            "Crop": "Rice",
            "Season": "Kharif",
            "Area": 1000,
            "Annual_Rainfall": 900,
            "Fertilizer": 50000,
            "Pesticide": 100,
        }

    def test_options_include_verified_dataset_coverage(self):
        response = self.client.get("/options")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["dataset_rows"], 17321)
        self.assertEqual(response.get_json()["year_min"], 2000)

    def test_prediction_accepts_valid_payload(self):
        response = self.client.post("/predict", json=self.valid_payload())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["predicted_yield"], 1.0)

    def test_prediction_rejects_missing_fields(self):
        response = self.client.post("/predict", json={"Year": 2024})
        self.assertEqual(response.status_code, 400)
        self.assertIn("Missing required fields", response.get_json()["error"])

    def test_prediction_rejects_negative_rainfall(self):
        payload = self.valid_payload()
        payload["Annual_Rainfall"] = -1
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("cannot be negative", response.get_json()["error"])

    def test_prediction_rejects_unknown_crop(self):
        payload = self.valid_payload()
        payload["Crop"] = "Unknown Crop"
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 400)

    def test_comparison_ranks_predictions_highest_first(self):
        payload = self.valid_payload()
        payload["crops"] = ["Rice", "Wheat", "Maize"]
        response = self.client.post("/compare", json=payload)
        self.assertEqual(response.status_code, 200)
        predictions = response.get_json()["predictions"]
        self.assertEqual([item["crop"] for item in predictions], ["Maize", "Wheat", "Rice"])

    def test_comparison_rejects_one_crop(self):
        payload = self.valid_payload()
        payload["crops"] = ["Rice"]
        response = self.client.post("/compare", json=payload)
        self.assertEqual(response.status_code, 400)

    def test_summary_returns_data_driven_counts(self):
        response = self.client.get("/summary")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["crops"], 3)
        self.assertEqual(response.get_json()["dataset_records"], 17321)

    def test_health_is_lightweight_and_reports_artifact_presence(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "healthy")


if __name__ == "__main__":
    unittest.main()
