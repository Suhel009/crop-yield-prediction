// ==========================================
// 1. Load States, Crops and Seasons
// ==========================================

async function loadOptions() {

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/options"
        );

        if (!response.ok) {
            throw new Error("Unable to load options");
        }

        const data = await response.json();


        // -------------------------
        // State Dropdown
        // -------------------------

        const stateSelect =
            document.getElementById("state");

        stateSelect.innerHTML =
            '<option value="">Select State</option>';

        data.states.forEach(function (state) {

            const option =
                document.createElement("option");

            option.value = state;
            option.textContent = state;

            stateSelect.appendChild(option);

        });


        // -------------------------
        // Crop Dropdown
        // -------------------------

        const cropSelect =
            document.getElementById("crop");

        cropSelect.innerHTML =
            '<option value="">Select Crop</option>';

        data.crops.forEach(function (crop) {

            const option =
                document.createElement("option");

            option.value = crop;
            option.textContent = crop;

            cropSelect.appendChild(option);

        });


        // -------------------------
        // Season Dropdown
        // -------------------------

        const seasonSelect =
            document.getElementById("season");

        seasonSelect.innerHTML =
            '<option value="">Select Season</option>';

        data.seasons.forEach(function (season) {

            const option =
                document.createElement("option");

            option.value = season;
            option.textContent = season;

            seasonSelect.appendChild(option);

        });

    }

    catch (error) {

        console.error(
            "Error loading options:",
            error
        );

    }

}


// ==========================================
// 2. Prediction Form
// ==========================================

document
    .getElementById("predictionForm")
    .addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // -------------------------
            // Get Result Box
            // -------------------------

            const result =
                document.getElementById("result");


            // -------------------------
            // Get User Inputs
            // -------------------------

            const year =
                Number(
                    document.getElementById("year").value
                );

            const state =
                document.getElementById("state").value;

            const crop =
                document.getElementById("crop").value;

            const season =
                document.getElementById("season").value;

            const area =
                Number(
                    document.getElementById("area").value
                );

            const rainfall =
                Number(
                    document.getElementById("rainfall").value
                );

            const fertilizer =
                Number(
                    document.getElementById("fertilizer").value
                );

            const pesticide =
                Number(
                    document.getElementById("pesticide").value
                );


            // -------------------------
            // Validation
            // -------------------------

            if (year < 2000 || year > 2026) {

                result.innerHTML =
                    "❌ Year must be between 2000 and 2026.";

                return;
            }


            if (!state) {

                result.innerHTML =
                    "❌ Please select a state.";

                return;
            }


            if (!crop) {

                result.innerHTML =
                    "❌ Please select a crop.";

                return;
            }


            if (!season) {

                result.innerHTML =
                    "❌ Please select a season.";

                return;
            }


            if (area <= 0) {

                result.innerHTML =
                    "❌ Area must be greater than 0.";

                return;
            }


            if (rainfall < 0) {

                result.innerHTML =
                    "❌ Rainfall cannot be negative.";

                return;
            }


            if (fertilizer < 0) {

                result.innerHTML =
                    "❌ Fertilizer cannot be negative.";

                return;
            }


            if (pesticide < 0) {

                result.innerHTML =
                    "❌ Pesticide cannot be negative.";

                return;
            }


            // -------------------------
            // Prepare Data
            // -------------------------

            const data = {

                Year: year,

                State: state,

                Crop: crop,

                Season: season,

                Area: area,

                Annual_Rainfall: rainfall,

                Fertilizer: fertilizer,

                Pesticide: pesticide

            };


            // -------------------------
            // Show Loading
            // -------------------------

            result.innerHTML =
                "⏳ Predicting...";


            // -------------------------
            // Send Data to Flask
            // -------------------------

            try {

                const response =
                    await fetch(
                        "http://127.0.0.1:5000/predict",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(data)
                        }
                    );


                // -------------------------
                // Check Server Response
                // -------------------------

                if (!response.ok) {

                    throw new Error(
                        "Server returned an error"
                    );

                }


                // -------------------------
                // Get Prediction
                // -------------------------

                const resultData =
                    await response.json();


                // -------------------------
                // Show Prediction
                // -------------------------

                result.innerHTML = `

                    <div class="result-title">
                        🌾 Prediction Result
                    </div>

                    <div class="yield-value">
                        ${resultData.predicted_yield.toFixed(2)}
                    </div>

                    <div class="result-label">
                        Predicted Crop Yield
                    </div>

                `;

            }


            // -------------------------
            // Error Handling
            // -------------------------

            catch (error) {

                result.innerHTML =
                    "❌ Unable to connect to prediction server.";

                console.error(
                    "Prediction Error:",
                    error
                );

            }

        }
    );


// ==========================================
// 3. Load Dropdown Options on Page Load
// ==========================================

loadOptions();