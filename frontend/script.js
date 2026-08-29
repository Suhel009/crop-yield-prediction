// ==========================================
// CROP YIELD PREDICTION
// Frontend JavaScript
// ==========================================


// ==========================================
// API URL
// ==========================================

const API_BASE_URL =
    "https://crop-yield-prediction-api-cizc.onrender.com";


// ==========================================
// DOM ELEMENTS
// ==========================================

const form =
    document.getElementById("predictionForm");

const result =
    document.getElementById("result");

const predictBtn =
    document.getElementById("predictBtn");


// ==========================================
// LOAD STATES, CROPS AND SEASONS
// ==========================================

async function loadOptions() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/options`
            );

        if (!response.ok) {

            throw new Error(
                "Unable to load options"
            );
        }

        const data =
            await response.json();


        // ------------------------------
        // STATES
        // ------------------------------

        const stateSelect =
            document.getElementById("state");

        stateSelect.innerHTML =
            '<option value="">Select State</option>';

        data.states.forEach(
            function (state) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value = state;

                option.textContent = state;

                stateSelect.appendChild(option);
            }
        );


        // ------------------------------
        // CROPS
        // ------------------------------

        const cropSelect =
            document.getElementById("crop");

        cropSelect.innerHTML =
            '<option value="">Select Crop</option>';

        data.crops.forEach(
            function (crop) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value = crop;

                option.textContent = crop;

                cropSelect.appendChild(option);
            }
        );


        // ------------------------------
        // SEASONS
        // ------------------------------

        const seasonSelect =
            document.getElementById("season");

        seasonSelect.innerHTML =
            '<option value="">Select Season</option>';

        data.seasons.forEach(
            function (season) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value = season;

                option.textContent = season;

                seasonSelect.appendChild(option);
            }
        );


        console.log(
            "Options loaded successfully."
        );

    } catch (error) {

        console.error(
            "Error loading options:",
            error
        );

        document.getElementById(
            "state"
        ).innerHTML =
            '<option value="">Unable to load states</option>';

        document.getElementById(
            "crop"
        ).innerHTML =
            '<option value="">Unable to load crops</option>';

        document.getElementById(
            "season"
        ).innerHTML =
            '<option value="">Unable to load seasons</option>';
    }
}


// ==========================================
// SHOW DEFAULT RESULT
// ==========================================

function showDefaultResult() {

    result.innerHTML = `

        <div class="result-circle">

            <div class="plant-icon">
                🌱
            </div>

            <div class="yield-value">
                —
            </div>

            <div class="yield-unit">
                Predicted Yield
            </div>

        </div>

        <h3>
            Predicted Crop Yield
        </h3>

        <div class="result-info">

            <span>💡</span>

            <p>
                Enter the agricultural parameters
                and click Predict Yield to get the
                machine learning prediction.
            </p>

        </div>
    `;
}


// ==========================================
// VALIDATION
// ==========================================

function validateInput(data) {


    if (
        !Number.isFinite(data.Year) ||
        data.Year < 2000 ||
        data.Year > 2026
    ) {

        return "❌ Year must be between 2000 and 2026.";
    }


    if (!data.State) {

        return "❌ Please select a state.";
    }


    if (!data.Crop) {

        return "❌ Please select a crop.";
    }


    if (!data.Season) {

        return "❌ Please select a season.";
    }


    if (
        !Number.isFinite(data.Area) ||
        data.Area <= 0
    ) {

        return "❌ Area must be greater than 0.";
    }


    if (
        !Number.isFinite(data.Annual_Rainfall) ||
        data.Annual_Rainfall < 0
    ) {

        return "❌ Rainfall cannot be negative.";
    }


    if (
        !Number.isFinite(data.Fertilizer) ||
        data.Fertilizer < 0
    ) {

        return "❌ Fertilizer cannot be negative.";
    }


    if (
        !Number.isFinite(data.Pesticide) ||
        data.Pesticide < 0
    ) {

        return "❌ Pesticide cannot be negative.";
    }


    return null;
}


// ==========================================
// FORM SUBMIT
// ==========================================

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        // ----------------------------------
        // GET INPUT VALUES
        // ----------------------------------

        const data = {

            Year:
                Number(
                    document.getElementById(
                        "year"
                    ).value
                ),

            State:
                document.getElementById(
                    "state"
                ).value,

            Crop:
                document.getElementById(
                    "crop"
                ).value,

            Season:
                document.getElementById(
                    "season"
                ).value,

            Area:
                Number(
                    document.getElementById(
                        "area"
                    ).value
                ),

            Annual_Rainfall:
                Number(
                    document.getElementById(
                        "rainfall"
                    ).value
                ),

            Fertilizer:
                Number(
                    document.getElementById(
                        "fertilizer"
                    ).value
                ),

            Pesticide:
                Number(
                    document.getElementById(
                        "pesticide"
                    ).value
                )
        };


        // ----------------------------------
        // VALIDATE
        // ----------------------------------

        const validationError =
            validateInput(data);


        if (validationError) {

            result.innerHTML = `

                <div class="error-message">
                    ${validationError}
                </div>

            `;

            return;
        }


        // ----------------------------------
        // LOADING
        // ----------------------------------

        predictBtn.disabled = true;

        predictBtn.classList.add(
            "loading"
        );

        predictBtn.innerHTML = `
            <span>⏳</span>
            <span>Predicting...</span>
        `;


        result.innerHTML = `

            <div class="result-circle">

                <div class="plant-icon">
                    🌱
                </div>

                <div class="yield-value">
                    ...
                </div>

                <div class="yield-unit">
                    Processing
                </div>

            </div>

            <h3>
                Calculating Prediction
            </h3>

        `;


        // ----------------------------------
        // API REQUEST
        // ----------------------------------

        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/predict`,
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


            // --------------------------------
            // SERVER ERROR
            // --------------------------------

            if (!response.ok) {

                let errorMessage =
                    "Prediction server returned an error.";

                try {

                    const errorData =
                        await response.json();

                    if (
                        errorData.error
                    ) {

                        errorMessage =
                            errorData.error;
                    }

                } catch (_) {

                    // Ignore JSON parsing error
                }

                throw new Error(
                    errorMessage
                );
            }


            // --------------------------------
            // GET RESULT
            // --------------------------------

            const resultData =
                await response.json();


            if (
                typeof resultData.predicted_yield
                !== "number"
            ) {

                throw new Error(
                    "Invalid prediction received."
                );
            }


            const prediction =
                resultData.predicted_yield;


            // --------------------------------
            // SHOW RESULT
            // --------------------------------

            result.innerHTML = `

                <div class="result-circle">

                    <div class="plant-icon">
                        🌱
                    </div>

                    <div class="yield-value">
                        ${prediction.toFixed(2)}
                    </div>

                    <div class="yield-unit">
                        Predicted Yield
                    </div>

                </div>

                <h3>
                    Predicted Crop Yield
                </h3>

                <div class="result-info">

                    <span>💡</span>

                    <p>
                        This is the estimated crop yield
                        generated by the trained machine
                        learning model based on your
                        selected inputs.
                    </p>

                </div>

            `;


            console.log(
                "Prediction:",
                prediction
            );

        } catch (error) {

            console.error(
                "Prediction Error:",
                error
            );


            result.innerHTML = `

                <div class="error-message">

                    ❌ Unable to get prediction.

                    <br><br>

                    Please check the server
                    connection and try again.

                </div>

            `;

        } finally {


            // --------------------------------
            // RESET BUTTON
            // --------------------------------

            predictBtn.disabled = false;

            predictBtn.classList.remove(
                "loading"
            );

            predictBtn.innerHTML = `
                <span>⌁</span>
                <span>Predict Yield</span>
            `;
        }

    }
);


// ==========================================
// INITIALIZE
// ==========================================

showDefaultResult();

loadOptions();