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
    
    // DISTANCES (TAKEOFF & LANDING) TAB Logic
    const distWeight = document.getElementById("dist-weight");
    const distAlt = document.getElementById("dist-alt");
    const distTemp = document.getElementById("dist-temp");
    const distRunway = document.getElementById("dist-runway");
    const distWind = document.getElementById("dist-wind");
    
    function updateDistances() {
        const w = parseFloat(distWeight.value);
        const alt = parseFloat(distAlt.value);
        const temp = parseFloat(distTemp.value);
        const runway = distRunway.value;
        const wind = parseFloat(distWind.value);
        
        document.getElementById("val-dist-weight").textContent = w;
        document.getElementById("val-dist-alt").textContent = alt;
        document.getElementById("val-dist-temp").textContent = temp;
        document.getElementById("val-dist-wind").textContent = Math.abs(wind);
        
        const windDirLbl = document.getElementById("lbl-dist-wind-dir");
        if (wind > 0) {
            windDirLbl.textContent = "KT headwind";
        } else if (wind < 0) {
            windDirLbl.textContent = "KT tailwind";
        } else {
            windDirLbl.textContent = "KT wind";
        }
        
        // 1. Takeoff Distance
        const toRes = calc.getTakeoff(w, alt, temp, runway, wind);
        if (toRes) {
            const roll = Math.round(toRes.ground_roll);
            const total = Math.round(toRes.total_to_50ft);
            document.getElementById("to-roll").textContent = `${roll} ft`;
            document.getElementById("to-roll-m").textContent = `${Math.round(roll * 0.3048)} m`;
            document.getElementById("to-total").textContent = `${total} ft`;
            document.getElementById("to-total-m").textContent = `${Math.round(total * 0.3048)} m`;
        } else {
            document.getElementById("to-roll").textContent = "N/A";
            document.getElementById("to-roll-m").textContent = "";
            document.getElementById("to-total").textContent = "N/A";
            document.getElementById("to-total-m").textContent = "";
        }
        
        // 2. Landing Distance
        const ldRes = calc.getLanding(alt, temp, runway, wind);
        if (ldRes) {
            const roll = Math.round(ldRes.ground_roll);
            const total = Math.round(ldRes.total_to_50ft);
            document.getElementById("ld-roll").textContent = `${roll} ft`;
            document.getElementById("ld-roll-m").textContent = `${Math.round(roll * 0.3048)} m`;
            document.getElementById("ld-total").textContent = `${total} ft`;
            document.getElementById("ld-total-m").textContent = `${Math.round(total * 0.3048)} m`;
        } else {
            document.getElementById("ld-roll").textContent = "N/A";
            document.getElementById("ld-roll-m").textContent = "";
            document.getElementById("ld-total").textContent = "N/A";
            document.getElementById("ld-total-m").textContent = "";
        }
    }
    
    distWeight.addEventListener("input", updateDistances);
    distAlt.addEventListener("input", updateDistances);
    distTemp.addEventListener("input", updateDistances);
    distRunway.addEventListener("change", updateDistances);
    distWind.addEventListener("input", updateDistances);
    
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
        const w = 2950.0;
        clWeight.value = 2950;
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
            document.getElementById("cl-grad").textContent = `${res.gradient_pct}%`;
            document.getElementById("cl-grad-fpnm").textContent = `${Math.round(res.gradient_fpnm)} ft/NM`;
            
            if (res.trip) {
                document.getElementById("trip-time").textContent = res.trip.time_min;
                document.getElementById("trip-fuel").textContent = res.trip.fuel_gal;
                document.getElementById("trip-dist").textContent = res.trip.dist_nm;
            }
        } else {
            document.getElementById("cl-kias").textContent = "-";
            document.getElementById("cl-roc").textContent = "-";
            document.getElementById("cl-tas").textContent = "-";
            document.getElementById("cl-gs").textContent = "-";
            document.getElementById("cl-grad").textContent = "N/A";
            document.getElementById("cl-grad-fpnm").textContent = "";
            
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
    const crPowerTarget = document.getElementById("cr-power-target");
    const crRpm = document.getElementById("cr-rpm");

    function getMaxMp(alt) {
        const dbAlts = [2000, 4000, 6000, 8000, 10000, 12000];
        const maxMps = {
            2000: 23.0,
            4000: 23.0,
            6000: 23.0,
            8000: 21.0,
            10000: 20.0,
            12000: 18.0
        };
        
        if (alt <= 2000) return 23.0;
        if (alt >= 12000) return 18.0;
        
        for (let i = 0; i < dbAlts.length - 1; i++) {
            let a1 = dbAlts[i];
            let a2 = dbAlts[i + 1];
            if (a1 <= alt && alt <= a2) {
                let f = (alt - a1) / (a2 - a1);
                let m1 = maxMps[a1];
                let m2 = maxMps[a2];
                return m1 + f * (m2 - m1);
            }
        }
        return 23.0;
    }

    function solveMpForPower(alt, temp, rpm, targetBhp) {
        let validMps = [];
        for (let mp = 15.0; mp <= 23.05; mp += 0.1) {
            let res = calc.getCruise(alt, temp, rpm, mp);
            if (res !== null) {
                validMps.push({ mp: mp, bhp: res.bhp_percent });
            }
        }
        
        if (validMps.length === 0) {
            return null;
        }
        
        let minMpObj = validMps[0];
        let maxMpObj = validMps[validMps.length - 1];
        
        const physicalMaxMp = getMaxMp(alt);
        let maxMpVal = Math.min(maxMpObj.mp, physicalMaxMp);
        let maxBhpRes = calc.getCruise(alt, temp, rpm, maxMpVal);
        let maxBhp = maxBhpRes ? maxBhpRes.bhp_percent : maxMpObj.bhp;
        
        if (targetBhp <= minMpObj.bhp) {
            let finalMp = Math.round(minMpObj.mp * 10) / 10;
            return { mp: finalMp, bhp: minMpObj.bhp, isFullThrottle: false };
        }
        if (targetBhp >= maxBhp) {
            let finalMp = Math.round(maxMpVal * 10) / 10;
            return { mp: finalMp, bhp: maxBhp, isFullThrottle: true };
        }
        
        let low = minMpObj.mp;
        let high = maxMpVal;
        let iterations = 0;
        while (high - low > 0.005 && iterations < 15) {
            let mid = (low + high) / 2;
            let res = calc.getCruise(alt, temp, rpm, mid);
            if (res === null) {
                high = mid;
            } else {
                if (res.bhp_percent < targetBhp) {
                    low = mid;
                } else {
                    high = mid;
                }
            }
            iterations++;
        }
        
        let solvedMp = (low + high) / 2;
        let roundedMp = Math.round(solvedMp * 10) / 10;
        let finalRes = calc.getCruise(alt, temp, rpm, roundedMp);
        
        return {
            mp: roundedMp,
            bhp: finalRes ? finalRes.bhp_percent : targetBhp,
            isFullThrottle: roundedMp >= Math.round(physicalMaxMp * 10) / 10
        };
    }
    
    function updateCruise() {
        const alt = parseFloat(crAlt.value);
        const temp = parseFloat(crTemp.value);
        const rpm = parseFloat(crRpm.value);
        const targetBhp = parseFloat(crPowerTarget.value);
        
        document.getElementById("val-cr-alt").textContent = alt;
        document.getElementById("val-cr-temp").textContent = temp;
        document.getElementById("val-cr-power-target").textContent = targetBhp;
        
        const solution = solveMpForPower(alt, temp, rpm, targetBhp);
        
        if (solution) {
            const finalMp = solution.mp;
            const finalRes = calc.getCruise(alt, temp, rpm, finalMp);
            
            if (finalRes) {
                document.getElementById("cr-bhp").textContent = Math.round(finalRes.bhp_percent);
                document.getElementById("cr-mp-val").textContent = finalMp.toFixed(1);
                
                const statusEl = document.getElementById("cr-mp-status");
                if (solution.isFullThrottle) {
                    statusEl.textContent = "in. Hg (FT)";
                } else {
                    statusEl.textContent = "in. Hg";
                }
                
                document.getElementById("cr-tas").textContent = Math.round(finalRes.tas_kt);
                document.getElementById("cr-ff").textContent = `${finalRes.fuel_flow_gph} GPH`;
                document.getElementById("cr-ff-pph").textContent = `${Math.round(finalRes.fuel_flow_pph)} PPH`;
            } else {
                setCruiseEmpty();
            }
        } else {
            setCruiseEmpty();
        }
    }
    
    function setCruiseEmpty() {
        document.getElementById("cr-bhp").textContent = "-";
        document.getElementById("cr-mp-val").textContent = "-";
        document.getElementById("cr-mp-status").textContent = "in. Hg";
        document.getElementById("cr-tas").textContent = "-";
        document.getElementById("cr-ff").textContent = "N/A";
        document.getElementById("cr-ff-pph").textContent = "";
    }
    
    crAlt.addEventListener("input", updateCruise);
    crTemp.addEventListener("input", updateCruise);
    crPowerTarget.addEventListener("input", updateCruise);
    crRpm.addEventListener("change", updateCruise);
    
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
        "dist-weight", "dist-alt", "dist-temp", "dist-runway", "dist-wind",
        "cl-alt", "cl-temp", "cl-aptelev", "cl-wind",
        "cr-alt", "cr-temp", "cr-rpm", "cr-power-target",
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
            if (state["activeTab"] !== undefined) {
                let targetTab = state["activeTab"];
                if (targetTab === "takeoff-tab" || targetTab === "landing-tab") {
                    targetTab = "dist-tab";
                }
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
    updateDistances();
    updateClimb();
    updateCruise();
    updateWeightAndBalance();
});
