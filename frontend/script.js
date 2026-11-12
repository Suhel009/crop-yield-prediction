// ==========================================
// CROP YIELD PREDICTION
// Frontend JavaScript
// ==========================================


// ==========================================
// API URL
// ==========================================

const API_BASE_URL = (window.CROP_YIELD_API_URL || "https://crop-yield-prediction-api-cizc.onrender.com").replace(/\/$/, "");


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

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(`${API_BASE_URL}/options`, {
            signal: controller.signal,
            headers: { "Accept": "application/json" }
        });
        clearTimeout(timeout);

        if (!response.ok) {

            throw new Error(
                "Unable to load options"
            );
        }

        const data =
            await response.json();

        // Keep the input year range aligned with the actual training dataset.
        const yearInput = document.getElementById("year");
        if (Number.isInteger(data.year_min) && Number.isInteger(data.year_max)) {
            yearInput.min = String(data.year_min);
            yearInput.max = String(data.year_max);
            yearInput.value = String(data.year_max);
        }
        const compareSelect = document.getElementById("compareCrops");
        compareSelect.innerHTML = "";
        data.crops.forEach((crop) => {
            const option = document.createElement("option");
            option.value = crop;
            option.textContent = crop;
            compareSelect.appendChild(option);
        });

        const stateCount = document.getElementById("datasetStates");
        const cropCount = document.getElementById("datasetCrops");
        const recordCount = document.getElementById("datasetRecords");
        const yearRange = document.getElementById("datasetYears");
        const seasonCount = data.seasons.length;
        if (recordCount) recordCount.textContent = Number(data.dataset_rows).toLocaleString();
        if (cropCount) cropCount.textContent = data.crops.length.toLocaleString();
        if (stateCount) stateCount.textContent = data.states.length.toLocaleString();
        if (yearRange) yearRange.textContent = `${data.year_min}–${data.year_max}`;
        const seasonsMetric = document.getElementById("datasetSeasons");
        if (seasonsMetric) seasonsMetric.textContent = seasonCount.toLocaleString();


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
        data.Year < Number(document.getElementById("year").min) ||
        data.Year > Number(document.getElementById("year").max)
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

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 25000);
            const response = await fetch(`${API_BASE_URL}/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            clearTimeout(timeout);


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

            if (!Number.isFinite(prediction)) {
                throw new Error("The server returned an invalid prediction.");
            }

            savePredictionHistory(data, prediction);

            if (!Number.isFinite(prediction)) {
                throw new Error("The server returned an invalid prediction.");
            }


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


            const safeMessage = error.name === "AbortError"
                ? "The prediction service took too long to respond. Please retry."
                : error.message;
            result.innerHTML = `
                <div class="error-message" role="alert">
                    <strong>Prediction unavailable</strong>
                    <p>${safeMessage}</p>
                    <p>Check the API service connection and try again.</p>
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

/* Accessible API status indicator for the dashboard. */
async function checkApiHealth() {
    const badge = document.getElementById("apiStatus");
    if (!badge) return;
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            headers: { "Accept": "application/json" },
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) throw new Error("API unavailable");
        badge.textContent = "Prediction API online";
        badge.classList.add("is-online");
        badge.classList.remove("is-offline");
    } catch (_) {
        badge.textContent = "API connection unavailable";
        badge.classList.add("is-offline");
        badge.classList.remove("is-online");
    }
}
checkApiHealth();


// ==========================================
// DATASET SUMMARY + API STATUS
// ==========================================
async function refreshApiStatus() {
    const badge = document.getElementById("apiStatus");
    if (!badge) return;
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            headers: { "Accept": "application/json" },
            signal: AbortSignal.timeout(12000)
        });
        if (!response.ok) throw new Error("API unavailable");
        badge.textContent = "Prediction API online";
        badge.classList.add("is-online");
        badge.classList.remove("is-offline");
    } catch (_) {
        badge.textContent = "Prediction API unavailable";
        badge.classList.add("is-offline");
        badge.classList.remove("is-online");
    }
}

// ==========================================
// PREDICTION HISTORY (DEVICE-LOCAL)
// ==========================================
const HISTORY_KEY = "cropYieldPredictionHistoryV1";
function getPredictionHistory() {
    try {
        const entries = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        return Array.isArray(entries) ? entries.slice(0, 8) : [];
    } catch (_) {
        return [];
    }
}
function renderPredictionHistory() {
    const container = document.getElementById("predictionHistory");
    if (!container) return;
    const entries = getPredictionHistory();
    if (!entries.length) {
        container.innerHTML = '<p class="history-empty">Your recent predictions will appear here on this device.</p>';
        return;
    }
    container.innerHTML = "";
    entries.forEach((entry) => {
        const item = document.createElement("article");
        item.className = "history-item";
        const details = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = entry.crop;
        const meta = document.createElement("small");
        meta.textContent = `${entry.state} · ${entry.season} · ${entry.year}`;
        details.append(title, meta);
        const value = document.createElement("b");
        value.textContent = Number(entry.yield).toFixed(2);
        item.append(details, value);
        container.appendChild(item);
    });
}
function savePredictionHistory(inputs, prediction) {
    const entries = getPredictionHistory();
    entries.unshift({
        crop: inputs.Crop, state: inputs.State, season: inputs.Season,
        year: inputs.Year, yield: prediction, createdAt: new Date().toISOString()
    });
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 8))); } catch (_) {}
    renderPredictionHistory();
}
document.getElementById("clearHistoryBtn")?.addEventListener("click", () => {
    try { localStorage.removeItem(HISTORY_KEY); } catch (_) {}
    renderPredictionHistory();
});

// ==========================================
// MULTI-CROP COMPARISON
// ==========================================
document.getElementById("compareBtn")?.addEventListener("click", async () => {
    const compareBtn = document.getElementById("compareBtn");
    const selectedCrops = Array.from(document.getElementById("compareCrops").selectedOptions).map(option => option.value);
    if (selectedCrops.length < 2 || selectedCrops.length > 8) {
        result.innerHTML = '<div class="error-message" role="alert">Select between 2 and 8 crops to compare.</div>';
        return;
    }
    const inputs = {
        Year: Number(document.getElementById("year").value),
        State: document.getElementById("state").value,
        Crop: selectedCrops[0],
        Season: document.getElementById("season").value,
        Area: Number(document.getElementById("area").value),
        Annual_Rainfall: Number(document.getElementById("rainfall").value),
        Fertilizer: Number(document.getElementById("fertilizer").value),
        Pesticide: Number(document.getElementById("pesticide").value),
        crops: selectedCrops
    };
    const validation = validateInput(inputs);
    if (validation) {
        result.innerHTML = `<div class="error-message" role="alert">${validation}</div>`;
        return;
    }
    compareBtn.disabled = true;
    compareBtn.textContent = "Comparing crops…";
    result.innerHTML = '<div class="result-info"><p>Running the same model against each selected crop…</p></div>';
    try {
        const response = await fetch(`${API_BASE_URL}/compare`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(inputs),
            signal: AbortSignal.timeout(30000)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Crop comparison failed.");
        result.innerHTML = "";
        const heading = document.createElement("h3");
        heading.textContent = "Crop yield comparison";
        result.appendChild(heading);
        const note = document.createElement("p");
        note.className = "comparison-note";
        note.textContent = "Ranked estimates for the same state, season, year and farm inputs.";
        result.appendChild(note);
        payload.predictions.forEach((item, index) => {
            const row = document.createElement("div");
            row.className = "comparison-row";
            const name = document.createElement("span");
            name.textContent = `${index + 1}. ${item.crop}`;
            const score = document.createElement("strong");
            score.textContent = Number(item.predicted_yield).toFixed(2);
            row.append(name, score);
            result.appendChild(row);
        });
        const winner = payload.predictions[0];
        const winnerNote = document.createElement("div");
        winnerNote.className = "result-info comparison-winner";
        winnerNote.textContent = `Highest model estimate in this comparison: ${winner.crop} (${Number(winner.predicted_yield).toFixed(2)}). This is a model estimate, not a farming guarantee.`;
        result.appendChild(winnerNote);
    } catch (error) {
        result.innerHTML = "";
        const message = document.createElement("div");
        message.className = "error-message";
        message.setAttribute("role", "alert");
        message.textContent = error.name === "TimeoutError" ? "Crop comparison timed out. Please retry." : error.message;
        result.appendChild(message);
    } finally {
        compareBtn.disabled = false;
        compareBtn.textContent = "Compare Selected Crops";
    }
});

renderPredictionHistory();
refreshApiStatus();
