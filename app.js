// Main application driver for Cessna 182P POH Calculator web app

document.addEventListener("DOMContentLoaded", () => {
    const calc = new POHCalculator(POH_DATA);
    
    // Tab switching
    const navItems = document.querySelectorAll(".nav-item");
    const tabContents = document.querySelectorAll(".tab-content");
    
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetTab = item.getAttribute("data-tab");
            
            navItems.forEach(i => i.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));
            
            item.classList.add("active");
            document.getElementById(targetTab).classList.add("active");
            
            // Re-render canvas if switching to W&B tab
            if (targetTab === "wb-tab") {
                setTimeout(updateWeightAndBalance, 100);
            }
            
            saveState();
        });
    });
    
    // TAKEOFF TAB Logic
    const toWeight = document.getElementById("to-weight");
    const toAlt = document.getElementById("to-alt");
    const toTemp = document.getElementById("to-temp");
    
    function updateTakeoff() {
        const w = parseFloat(toWeight.value);
        const alt = parseFloat(toAlt.value);
        const temp = parseFloat(toTemp.value);
        
        document.getElementById("val-to-weight").textContent = w;
        document.getElementById("val-to-alt").textContent = alt;
        document.getElementById("val-to-temp").textContent = temp;
        
        const res = calc.getTakeoff(w, alt, temp);
        if (res) {
            const roll = Math.round(res.ground_roll);
            const total = Math.round(res.total_to_50ft);
            document.getElementById("to-roll").textContent = `${roll} ft (${Math.round(roll * 0.3048)} m)`;
            document.getElementById("to-total").textContent = `${total} ft (${Math.round(total * 0.3048)} m)`;
        } else {
            document.getElementById("to-roll").textContent = "N/A";
            document.getElementById("to-total").textContent = "N/A";
        }
    }
    
    toWeight.addEventListener("input", updateTakeoff);
    toAlt.addEventListener("input", updateTakeoff);
    toTemp.addEventListener("input", updateTakeoff);
    
    // LANDING TAB Logic
    const ldAlt = document.getElementById("ld-alt");
    const ldTemp = document.getElementById("ld-temp");
    
    function updateLanding() {
        const alt = parseFloat(ldAlt.value);
        const temp = parseFloat(ldTemp.value);
        
        document.getElementById("val-ld-alt").textContent = alt;
        document.getElementById("val-ld-temp").textContent = temp;
        
        const res = calc.getLanding(alt, temp);
        if (res) {
            const roll = Math.round(res.ground_roll);
            const total = Math.round(res.total_to_50ft);
            document.getElementById("ld-roll").textContent = `${roll} ft (${Math.round(roll * 0.3048)} m)`;
            document.getElementById("ld-total").textContent = `${total} ft (${Math.round(total * 0.3048)} m)`;
        } else {
            document.getElementById("ld-roll").textContent = "N/A";
            document.getElementById("ld-total").textContent = "N/A";
        }
    }
    
    ldAlt.addEventListener("input", updateLanding);
    ldTemp.addEventListener("input", updateLanding);
    
    // CLIMB TAB Logic
    let climbProfile = "normal";
    const clWeight = document.getElementById("cl-weight");
    const clAlt = document.getElementById("cl-alt");
    const clTemp = document.getElementById("cl-temp");
    const clTripEnable = document.getElementById("cl-trip-enable");
    const clAptElev = document.getElementById("cl-aptelev");
    const clWind = document.getElementById("cl-wind");
    
    const clTripInputs = document.getElementById("cl-trip-inputs");
    const clTripResults = document.getElementById("cl-trip-results");
    
    const btnNormal = document.getElementById("climb-prof-normal");
    const btnMax = document.getElementById("climb-prof-max");
    
    btnNormal.addEventListener("click", () => {
        climbProfile = "normal";
        btnNormal.classList.add("active");
        btnMax.classList.remove("active");
        updateClimb();
    });
    
    btnMax.addEventListener("click", () => {
        climbProfile = "max_rate";
        btnMax.classList.add("active");
        btnNormal.classList.remove("active");
        updateClimb();
    });
    
    clTripEnable.addEventListener("change", () => {
        if (clTripEnable.checked) {
            clTripInputs.style.display = "block";
            clTripResults.style.display = "block";
        } else {
            clTripInputs.style.display = "none";
            clTripResults.style.display = "none";
        }
        updateClimb();
    });
    
    function updateClimb() {
        const w = parseFloat(clWeight.value);
        const alt = parseFloat(clAlt.value);
        const temp = parseFloat(clTemp.value);
        const wind = parseFloat(clWind.value);
        const tripEnabled = clTripEnable.checked;
        const aptElev = tripEnabled ? parseFloat(clAptElev.value) : null;
        
        document.getElementById("val-cl-weight").textContent = w;
        document.getElementById("val-cl-alt").textContent = alt;
        document.getElementById("val-cl-temp").textContent = temp;
        document.getElementById("val-cl-wind").textContent = wind;
        document.getElementById("val-cl-aptelev").textContent = aptElev !== null ? aptElev : 0;
        
        const res = calc.calculateClimbGradient(w, alt, temp, aptElev, wind, climbProfile);
        if (res) {
            document.getElementById("cl-kias").textContent = res.kias;
            document.getElementById("cl-roc").textContent = Math.round(res.roc_fpm);
            document.getElementById("cl-tas").textContent = Math.round(res.tas_kt);
            document.getElementById("cl-gs").textContent = Math.round(res.gs_kt);
            document.getElementById("cl-grad").textContent = `${res.gradient_pct}% (${Math.round(res.gradient_fpnm)} ft/NM)`;
            
            if (res.trip) {
                document.getElementById("trip-time").textContent = res.trip.time_min;
                document.getElementById("trip-fuel").textContent = res.trip.fuel_gal;
                document.getElementById("trip-dist").textContent = `${res.trip.dist_nm} NM`;
            }
        } else {
            document.getElementById("cl-kias").textContent = "-";
            document.getElementById("cl-roc").textContent = "-";
            document.getElementById("cl-tas").textContent = "-";
            document.getElementById("cl-gs").textContent = "-";
            document.getElementById("cl-grad").textContent = "N/A";
            
            document.getElementById("trip-time").textContent = "-";
            document.getElementById("trip-fuel").textContent = "-";
            document.getElementById("trip-dist").textContent = "-";
        }
    }
    
    clWeight.addEventListener("input", updateClimb);
    clAlt.addEventListener("input", updateClimb);
    clTemp.addEventListener("input", updateClimb);
    clAptElev.addEventListener("input", updateClimb);
    clWind.addEventListener("input", updateClimb);
    
    // CRUISE TAB Logic
    const crAlt = document.getElementById("cr-alt");
    const crTemp = document.getElementById("cr-temp");
    const crRpm = document.getElementById("cr-rpm");
    const crMp = document.getElementById("cr-mp");
    
    let savedMp = null;
    
    function updateManifoldPressures() {
        const alt = parseInt(crAlt.value);
        const availableMps = new Set();
        
        // Find all unique altitudes in cruise_data
        const dbAlts = new Set();
        for (let key in POH_DATA.cruise_data) {
            dbAlts.add(parseInt(key.split(",")[0]));
        }
        const sortedDbAlts = Array.from(dbAlts).sort((a, b) => a - b);
        
        // Find the largest database altitude <= selected alt (round down)
        let targetAlt = sortedDbAlts[0];
        for (let a of sortedDbAlts) {
            if (a <= alt) {
                targetAlt = a;
            }
        }
        
        for (let key in POH_DATA.cruise_data) {
            const parts = key.split(",");
            if (parseInt(parts[0]) === targetAlt) {
                availableMps.add(parseFloat(parts[3]));
            }
        }
        
        const sortedMps = Array.from(availableMps).sort((a, b) => b - a); // descending
        crMp.innerHTML = "";
        
        sortedMps.forEach(mp => {
            const opt = document.createElement("option");
            opt.value = mp;
            opt.textContent = mp.toFixed(1);
            if (savedMp !== null && parseFloat(savedMp) === mp) {
                opt.selected = true;
            } else if (savedMp === null && (mp === 22.0 || mp === 23.0)) {
                opt.selected = true;
            }
            crMp.appendChild(opt);
        });
        
        if (sortedMps.length > 0 && !crMp.value) {
            crMp.selectedIndex = 0;
        }
    }
    
    function updateCruise() {
        const alt = parseFloat(crAlt.value);
        const temp = parseFloat(crTemp.value);
        const rpm = parseFloat(crRpm.value);
        const mp = parseFloat(crMp.value);
        
        document.getElementById("val-cr-alt").textContent = alt;
        document.getElementById("val-cr-temp").textContent = temp;
        
        if (!mp) {
            document.getElementById("cr-bhp").textContent = "-";
            document.getElementById("cr-tas").textContent = "-";
            document.getElementById("cr-ff").textContent = "N/A";
            return;
        }
        
        const res = calc.getCruise(alt, temp, rpm, mp);
        if (res) {
            document.getElementById("cr-bhp").textContent = Math.round(res.bhp_percent);
            document.getElementById("cr-tas").textContent = Math.round(res.tas_kt);
            document.getElementById("cr-ff").textContent = `${res.fuel_flow_gph} GPH (${Math.round(res.fuel_flow_pph)} PPH)`;
        } else {
            document.getElementById("cr-bhp").textContent = "-";
            document.getElementById("cr-tas").textContent = "-";
            document.getElementById("cr-ff").textContent = "N/A";
        }
    }
    
    crAlt.addEventListener("input", () => {
        updateManifoldPressures();
        updateCruise();
    });
    crTemp.addEventListener("input", updateCruise);
    crRpm.addEventListener("change", updateCruise);
    crMp.addEventListener("change", updateCruise);
    
    // WEIGHT & BALANCE TAB Logic
    const wbEmptyW = document.getElementById("wb-empty-w");
    const wbEmptyM = document.getElementById("wb-empty-m");
    const wbFront = document.getElementById("wb-front");
    const wbRear = document.getElementById("wb-rear");
    const wbBagA = document.getElementById("wb-bag-a");
    const wbBagB = document.getElementById("wb-bag-b");
    const wbFuel = document.getElementById("wb-fuel");
    const wbFuelBurn = document.getElementById("wb-fuel-burn");
    
    function updateWeightAndBalance() {
        const emptyW = parseFloat(wbEmptyW.value) || 0;
        const emptyM = parseFloat(wbEmptyM.value) || 0;
        const front = parseFloat(wbFront.value) || 0;
        const rear = parseFloat(wbRear.value) || 0;
        const bagA = parseFloat(wbBagA.value) || 0;
        const bagB = parseFloat(wbBagB.value) || 0;
        const fuel = parseFloat(wbFuel.value) || 0;
        const fuelBurn = parseFloat(wbFuelBurn.value) || 0;
        
        document.getElementById("val-wb-front").textContent = front;
        document.getElementById("val-wb-rear").textContent = rear;
        document.getElementById("val-wb-bag-a").textContent = bagA;
        document.getElementById("val-wb-bag-b").textContent = bagB;
        document.getElementById("val-wb-fuel").textContent = fuel;
        document.getElementById("val-wb-fuel-burn").textContent = fuelBurn;
        
        const res = calc.checkWeightAndBalance(
            emptyW, emptyM, true,
            front, null,
            rear, null,
            0.0,
            bagA, null,
            bagB, null,
            fuel, fuelBurn
        );
        
        // Update values in UI
        document.getElementById("wb-ramp-w").textContent = Math.round(res.ramp_weight) + " lbs";
        document.getElementById("wb-to-w").textContent = Math.round(res.takeoff_weight) + " lbs";
        document.getElementById("wb-to-cg").textContent = res.takeoff_cg.toFixed(2) + " in";
        document.getElementById("wb-ld-w").textContent = Math.round(res.landing_weight) + " lbs";
        document.getElementById("wb-ld-cg").textContent = res.landing_cg.toFixed(2) + " in";
        
        // Status Card
        const statusCard = document.getElementById("wb-status-card");
        const statusTitle = document.getElementById("wb-status-title");
        const warningsList = document.getElementById("wb-warnings");
        
        warningsList.innerHTML = "";
        
        if (res.safe) {
            statusCard.className = "wb-summary success";
            statusTitle.textContent = "Safe and Within Limits";
        } else {
            statusCard.className = "wb-summary danger";
            statusTitle.textContent = "Exceeds C.G. or Weight Limits";
            res.warnings.forEach(w => {
                const li = document.createElement("li");
                li.textContent = "• " + w;
                warningsList.appendChild(li);
            });
        }
        
        // Plot CG Envelope Chart
        drawCgEnvelope(res.takeoff_cg, res.takeoff_weight, res.landing_cg, res.landing_weight, res.safe);
    }
    
    function drawCgEnvelope(toCg, toW, ldCg, ldW, isSafe) {
        const canvas = document.getElementById("cgCanvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        
        // Resolution setup
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        
        // Background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, w, h);
        
        // Limits of graph
        const cgMin = 31.0;
        const cgMax = 50.0;
        const wMin = 1500;
        const wMax = 3250;
        
        // Helper to convert coordinate to canvas pixels
        function getX(cg) {
            return 40 + ((cg - cgMin) / (cgMax - cgMin)) * (w - 60);
        }
        
        function getY(weight) {
            return h - 40 - ((weight - wMin) / (wMax - wMin)) * (h - 60);
        }
        
        // Draw grid lines
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1;
        ctx.fillStyle = "#94a3b8";
        ctx.font = "9px Outfit";
        ctx.textAlign = "center";
        
        // X Grid & Labels
        for (let cg = 32; cg <= 50; cg += 2) {
            const x = getX(cg);
            ctx.beginPath();
            ctx.moveTo(x, 20);
            ctx.lineTo(x, h - 35);
            ctx.stroke();
            ctx.fillText(cg, x, h - 22);
        }
        
        // Y Grid & Labels
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (let wt = 1600; wt <= 3200; wt += 200) {
            const y = getY(wt);
            ctx.beginPath();
            ctx.moveTo(35, y);
            ctx.lineTo(w - 15, y);
            ctx.stroke();
            ctx.fillText(wt, 32, y);
        }
        
        // Draw C.G. Envelope Boundary
        // Points: (33, 1800), (33, 2250), (39.5, 2950), (40.9, 3100), (46.0, 3100), (46.0, 2950.1), (48.5, 2950), (48.5, 1800)
        const envelope = [
            [33.0, 1800],
            [33.0, 2250],
            [39.5, 2950],
            [40.9, 3100],
            [46.0, 3100],
            [46.0, 2950.1],
            [48.5, 2950],
            [48.5, 1800]
        ];
        
        ctx.beginPath();
        ctx.moveTo(getX(envelope[0][0]), getY(envelope[0][1]));
        for (let i = 1; i < envelope.length; i++) {
            ctx.lineTo(getX(envelope[i][0]), getY(envelope[i][1]));
        }
        ctx.closePath();
        ctx.strokeStyle = isSafe ? "#10b981" : "#ef4444";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        
        // Fill envelope slightly
        ctx.fillStyle = isSafe ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)";
        ctx.fill();
        
        // Draw dashed line between Takeoff and Landing points
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(getX(toCg), getY(toW));
        ctx.lineTo(getX(ldCg), getY(ldW));
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]); // Reset
        
        // Draw Takeoff Point
        ctx.beginPath();
        ctx.arc(getX(toCg), getY(toW), 6, 0, 2 * Math.PI);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Draw Landing Point
        ctx.beginPath();
        ctx.arc(getX(ldCg), getY(ldW), 6, 0, 2 * Math.PI);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Legend labels (drawn in top left)
        ctx.font = "9px Outfit";
        ctx.textAlign = "left";
        
        ctx.beginPath();
        ctx.arc(50, 30, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("Takeoff C.G.", 60, 32);
        
        ctx.beginPath();
        ctx.arc(140, 30, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("Landing C.G.", 150, 32);
    }
    
    wbEmptyW.addEventListener("input", updateWeightAndBalance);
    wbEmptyM.addEventListener("input", updateWeightAndBalance);
    wbFront.addEventListener("input", updateWeightAndBalance);
    wbRear.addEventListener("input", updateWeightAndBalance);
    wbBagA.addEventListener("input", updateWeightAndBalance);
    wbBagB.addEventListener("input", updateWeightAndBalance);
    wbFuel.addEventListener("input", updateWeightAndBalance);
    wbFuelBurn.addEventListener("input", updateWeightAndBalance);
    
    // State persistence
    const PERSISTENT_INPUTS = [
        "to-weight", "to-alt", "to-temp",
        "ld-alt", "ld-temp",
        "cl-weight", "cl-alt", "cl-temp", "cl-aptelev", "cl-wind",
        "cr-alt", "cr-temp", "cr-rpm", "cr-mp",
        "wb-empty-w", "wb-empty-m", "wb-front", "wb-rear", "wb-bag-a", "wb-bag-b", "wb-fuel", "wb-fuel-burn"
    ];

    function saveState() {
        const state = {};
        PERSISTENT_INPUTS.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                state[id] = el.value;
            }
        });
        state["climbProfile"] = climbProfile;
        state["clTripEnabled"] = clTripEnable.checked;
        const activeTab = document.querySelector(".nav-item.active")?.getAttribute("data-tab");
        if (activeTab) {
            state["activeTab"] = activeTab;
        }
        localStorage.setItem("c182p_poh_config", JSON.stringify(state));
    }

    function loadState() {
        const data = localStorage.getItem("c182p_poh_config");
        if (!data) return;
        try {
            const state = JSON.parse(data);
            PERSISTENT_INPUTS.forEach(id => {
                const el = document.getElementById(id);
                if (el && state[id] !== undefined) {
                    el.value = state[id];
                }
            });
            if (state["climbProfile"] !== undefined) {
                climbProfile = state["climbProfile"];
                if (climbProfile === "normal") {
                    btnNormal.classList.add("active");
                    btnMax.classList.remove("active");
                } else {
                    btnMax.classList.add("active");
                    btnNormal.classList.remove("active");
                }
            }
            if (state["clTripEnabled"] !== undefined) {
                clTripEnable.checked = state["clTripEnabled"];
                if (clTripEnable.checked) {
                    clTripInputs.style.display = "block";
                    clTripResults.style.display = "block";
                } else {
                    clTripInputs.style.display = "none";
                    clTripResults.style.display = "none";
                }
            }
            if (state["cr-mp"] !== undefined) {
                savedMp = state["cr-mp"];
            }
            if (state["activeTab"] !== undefined) {
                const targetTab = state["activeTab"];
                const activeItem = document.querySelector(`.nav-item[data-tab="${targetTab}"]`);
                if (activeItem) {
                    navItems.forEach(i => i.classList.remove("active"));
                    tabContents.forEach(c => c.classList.remove("active"));
                    
                    activeItem.classList.add("active");
                    const tabEl = document.getElementById(targetTab);
                    if (tabEl) tabEl.classList.add("active");
                }
            }
        } catch (e) {
            console.error("Failed to restore saved configuration:", e);
        }
    }

    // Attach persistence save listeners
    PERSISTENT_INPUTS.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", saveState);
            el.addEventListener("change", saveState);
        }
    });
    btnNormal.addEventListener("click", saveState);
    btnMax.addEventListener("click", saveState);
    clTripEnable.addEventListener("change", saveState);

    // Initial runs to populate all results
    loadState();
    updateTakeoff();
    updateLanding();
    updateClimb();
    updateManifoldPressures();
    updateCruise();
    updateWeightAndBalance();
});
