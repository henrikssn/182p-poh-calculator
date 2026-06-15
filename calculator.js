// POH Calculator engine for Cessna 182P POH Web App

function lerp(v1, v2, f) {
    if (v1 === null || v1 === undefined || v2 === null || v2 === undefined) {
        return null;
    }
    if (typeof v1 === 'number' && typeof v2 === 'number') {
        return v1 + f * (v2 - v1);
    }
    if (Array.isArray(v1) && Array.isArray(v2)) {
        let res = [];
        for (let i = 0; i < v1.length; i++) {
            res.push(lerp(v1[i], v2[i], f));
        }
        return res;
    }
    return null;
}

function interpolateRecursive(dims, data, query, currentKeys = []) {
    if (currentKeys.length === query.length) {
        let key = currentKeys.join(",");
        return data[key] !== undefined ? data[key] : null;
    }
    
    let depth = currentKeys.length;
    let dimCoords = dims[depth];
    let q = query[depth];
    
    if (!dimCoords || dimCoords.length === 0) {
        return null;
    }
    
    // Exact match
    if (dimCoords.includes(q)) {
        return interpolateRecursive(dims, data, query, [...currentKeys, q]);
    }
    
    // Boundary clipping
    if (q <= dimCoords[0]) {
        return interpolateRecursive(dims, data, query, [...currentKeys, dimCoords[0]]);
    }
    if (q >= dimCoords[dimCoords.length - 1]) {
        return interpolateRecursive(dims, data, query, [...currentKeys, dimCoords[dimCoords.length - 1]]);
    }
    
    // Find surrounding coordinates
    for (let i = 0; i < dimCoords.length - 1; i++) {
        let c1 = dimCoords[i];
        let c2 = dimCoords[i + 1];
        if (c1 <= q && q <= c2) {
            let val1 = interpolateRecursive(dims, data, query, [...currentKeys, c1]);
            let val2 = interpolateRecursive(dims, data, query, [...currentKeys, c2]);
            if (val1 === null || val2 === null) {
                return val1 !== null ? val1 : val2;
            }
            let fraction = (q - c1) / (c2 - c1);
            return lerp(val1, val2, fraction);
        }
    }
    return null;
}

class POHCalculator {
    constructor(pohData) {
        this.data = pohData;
    }
    
    getTakeoff(weight, alt, temp, runway = "paved", wind = 0) {
        let res = interpolateRecursive(this.data.takeoff_dims, this.data.takeoff_data, [weight, alt, temp]);
        if (res) {
            let roll = res[0];
            let total = res[1];
            
            // Apply wind correction
            if (wind > 0) {
                let factor = 1.0 - 0.10 * (wind / 9.0);
                roll *= factor;
                total *= factor;
            } else if (wind < 0) {
                let tailwind = Math.min(10.0, -wind);
                let factor = 1.0 + 0.10 * (tailwind / 2.0);
                roll *= factor;
                total *= factor;
            }
            
            // Apply runway material correction (grass adds 15% of ground roll to both roll and total)
            if (runway === "grass") {
                let correction = roll * 0.15;
                roll += correction;
                total += correction;
            }
            
            return { ground_roll: roll, total_to_50ft: total };
        }
        return null;
    }
    
    getLanding(alt, temp, runway = "paved", wind = 0) {
        // Landing is evaluated at fixed landing weight 2950 lbs
        let res = interpolateRecursive(this.data.landing_dims, this.data.landing_data, [2950, alt, temp]);
        if (res) {
            let roll = res[0];
            let total = res[1];
            
            // Apply wind correction
            if (wind > 0) {
                let factor = 1.0 - 0.10 * (wind / 9.0);
                roll *= factor;
                total *= factor;
            } else if (wind < 0) {
                let tailwind = Math.min(10.0, -wind);
                let factor = 1.0 + 0.10 * (tailwind / 2.0);
                roll *= factor;
                total *= factor;
            }
            
            // Apply runway material correction (grass adds 45% of ground roll to both roll and total)
            if (runway === "grass") {
                let correction = roll * 0.45;
                roll += correction;
                total += correction;
            }
            
            return { ground_roll: roll, total_to_50ft: total };
        }
        return null;
    }
    
    getClimb(weight, alt, temp) {
        let res = interpolateRecursive(this.data.climb_dims, this.data.climb_data, [weight, alt, temp]);
        if (res) {
            return { kias: res[0], rate_of_climb_fpm: res[1] };
        }
        return null;
    }
    
    getNormalClimb(weight, altitude, temp) {
        let kias = 90.0;
        let alt = parseFloat(altitude);
        let roc_2950 = 520.0;
        
        if (alt <= 5000.0) {
            roc_2950 = 520.0;
        } else if (alt >= 12000.0) {
            roc_2950 = 200.0;
        } else {
            let alts = [5000.0, 6000.0, 7000.0, 8000.0, 9000.0, 10000.0, 11000.0, 12000.0];
            let rocs = [520.0, 495.0, 445.0, 395.0, 350.0, 300.0, 250.0, 200.0];
            for (let i = 0; i < alts.length - 1; i++) {
                if (alts[i] <= alt && alt <= alts[i+1]) {
                    let fraction = (alt - alts[i]) / (alts[i+1] - alts[i]);
                    roc_2950 = rocs[i] + fraction * (rocs[i+1] - rocs[i]);
                    break;
                }
            }
        }
        
        let roc_w = roc_2950 - 0.6 * (parseFloat(weight) - 2950.0);
        let t_std = 15.0 - 1.98 * (alt / 1000.0);
        let temp_dev = parseFloat(temp) - t_std;
        let roc_corrected = roc_w;
        if (temp_dev > 0.0) {
            roc_corrected = roc_w / (1.0 + 0.01 * temp_dev);
        }
        
        return { kias: kias, rate_of_climb_fpm: roc_corrected };
    }
    
    _getClimbPerf(weight, alt, temp, profile) {
        if (profile === 'normal') {
            return this.getNormalClimb(weight, alt, temp);
        } else {
            return this.getClimb(weight, alt, temp);
        }
    }
    
    calculateClimbGradient(weight, alt, temp, aptElev, wind, profile = "normal") {
        if (aptElev === null || aptElev === undefined) {
            // Instantaneous
            let res = this._getClimbPerf(weight, alt, temp, profile);
            if (!res || res.rate_of_climb_fpm === null || res.rate_of_climb_fpm <= 0) {
                return null;
            }
            
            let kias = res.kias;
            let roc = res.rate_of_climb_fpm;
            let t_std = 15.0 - 1.98 * (alt / 1000.0);
            let da = alt + 120.0 * (temp - t_std);
            let tas = kias * (1.0 + 0.02 * (da / 1000.0));
            
            let effWind = 0.0;
            if (wind > 0) {
                effWind = 0.5 * wind;
            } else if (wind < 0) {
                effWind = 1.5 * wind;
            }
            
            let gs = Math.max(10.0, tas - effWind);
            let gradientPct = gs > 0 ? (roc / (gs * 1.0127)) : 0;
            let gradientFpnm = gs > 0 ? (roc * 60) / gs : 0;
            
            return {
                lapsed_temp: Math.round(temp * 100) / 100,
                kias: kias,
                roc_fpm: Math.round(roc * 10) / 10,
                tas_kt: Math.round(tas * 10) / 10,
                eff_wind_kt: Math.round(effWind * 10) / 10,
                gs_kt: Math.round(gs * 10) / 10,
                gradient_pct: Math.round(gradientPct * 100) / 100,
                gradient_fpnm: Math.round(gradientFpnm * 10) / 10,
                trip: null
            };
        } else {
            // Average & Trip
            let h = parseFloat(aptElev);
            let total_time = 0.0;
            let total_fuel = 0.0;
            let total_dist = 0.0;
            let sum_kias_dt = 0.0;
            let sum_tas_dt = 0.0;
            let sum_eff_wind_dt = 0.0;
            let step = 100.0;
            
            let lapsedTemp = temp - 1.98 * ((alt - aptElev) / 1000.0);
            
            while (h < alt) {
                let currentStep = Math.min(step, alt - h);
                let hMid = h + currentStep / 2.0;
                let tMid = temp - 1.98 * ((hMid - aptElev) / 1000.0);
                
                let res = this._getClimbPerf(weight, hMid, tMid, profile);
                if (!res || res.rate_of_climb_fpm <= 0) {
                    break;
                }
                
                let roc = res.rate_of_climb_fpm;
                let kias = res.kias;
                
                let dt = currentStep / roc;
                total_time += dt;
                
                let t_std = 15.0 - 1.98 * (hMid / 1000.0);
                let da = hMid + 120.0 * (tMid - t_std);
                let tas = kias * (1.0 + 0.02 * (da / 1000.0));
                
                let effWind = 0.0;
                if (wind > 0) {
                    effWind = 0.5 * wind;
                } else if (wind < 0) {
                    effWind = 1.5 * wind;
                }
                
                let gs = Math.max(10.0, tas - effWind);
                let dd = gs * (dt / 60.0);
                total_dist += dd;
                
                let ff = 0.0;
                if (profile === 'normal') {
                    ff = 18.2 - 0.3 * (hMid / 1000.0);
                } else {
                    ff = 22.0 - 0.4 * (hMid / 1000.0);
                }
                let df = ff * (dt / 60.0);
                total_fuel += df;
                
                sum_kias_dt += kias * dt;
                sum_tas_dt += tas * dt;
                sum_eff_wind_dt += effWind * dt;
                
                h += currentStep;
            }
            
            if (total_time <= 0) {
                return null;
            }
            
            let kiasAvg = sum_kias_dt / total_time;
            let tasAvg = sum_tas_dt / total_time;
            let effWindAvg = sum_eff_wind_dt / total_time;
            let rocAvg = (alt - aptElev) / total_time;
            let gsAvg = (total_dist / total_time) * 60.0;
            
            let gradientPctAvg = gsAvg > 0 ? (rocAvg / (gsAvg * 1.0127)) : 0;
            let gradientFpnmAvg = gsAvg > 0 ? (rocAvg * 60) / gsAvg : 0;
            
            return {
                lapsed_temp: Math.round(lapsedTemp * 100) / 100,
                kias: Math.round(kiasAvg * 10) / 10,
                roc_fpm: Math.round(rocAvg * 10) / 10,
                tas_kt: Math.round(tasAvg * 10) / 10,
                eff_wind_kt: Math.round(effWindAvg * 10) / 10,
                gs_kt: Math.round(gsAvg * 10) / 10,
                gradient_pct: Math.round(gradientPctAvg * 100) / 100,
                gradient_fpnm: Math.round(gradientFpnmAvg * 10) / 10,
                trip: {
                    time_min: Math.round(total_time * 10) / 10,
                    fuel_gal: Math.round(total_fuel * 10) / 10,
                    dist_nm: Math.round(total_dist * 10) / 10
                }
            };
        }
    }
    
    getCruise(altitude, temp, rpm, mp) {
        let stdTemp = 15.0 - 1.98 * (altitude / 1000.0);
        let tempDev = temp - stdTemp;
        
        // Match tempDev key
        // Keys in JS cruise_data are round(altitude), round(tempDev, 1), round(rpm), round(mp)
        // Since we interpolate, let's transform dimensions and use interpolateRecursive.
        // The cruise dims are: Altitudes, tempDevs [-20, 0, 20], RPMs, MPs
        let res = interpolateRecursive(
            [this.data.cruise_dims[0], [-20.0, 0.0, 20.0], this.data.cruise_dims[2], this.data.cruise_dims[3]],
            this.data.cruise_data,
            [altitude, tempDev, rpm, mp]
        );
        if (res) {
            return { bhp_percent: res[0], tas_kt: res[1], fuel_flow_gph: Math.round((res[2] / 6.0) * 10) / 10, fuel_flow_pph: res[2] };
        }
        return null;
    }
    
    getCgLimits(weight) {
        if (!this.data.envelope_data || this.data.envelope_data.length === 0) {
            return [null, null];
        }
        let env = this.data.envelope_data;
        if (weight <= env[0][0]) {
            return [env[0][1], env[0][2]];
        }
        if (weight >= env[env.length - 1][0]) {
            return [env[env.length - 1][1], env[env.length - 1][2]];
        }
        for (let i = 0; i < env.length - 1; i++) {
            let w1 = env[i][0];
            let w2 = env[i + 1][0];
            if (w1 <= weight && weight <= w2) {
                let f = (weight - w1) / (w2 - w1);
                let fwd = w1 === 2950 && w2 === 2950.1 ? env[i+1][1] : env[i][1] + f * (env[i + 1][1] - env[i][1]); // handle step transition
                let aft = env[i][2] + f * (env[i + 1][2] - env[i][2]);
                return [fwd, aft];
            }
        }
        return [null, null];
    }
    
    checkWeightAndBalance(emptyW, emptyCgOrMoment, isMoment, pilotFrontW, pilotFrontArm, centerPassW, centerPassArm, aftPassW, baggageAW, baggageAArm, baggageBW, baggageBArm, fuelGal, fuelBurnGal, taxiFuel = 2.7) {
        let emptyMoment = isMoment ? emptyCgOrMoment : (emptyW * emptyCgOrMoment) / 1000.0;
        
        let pFrontArm = pilotFrontArm !== undefined && pilotFrontArm !== null ? pilotFrontArm : this.data.compartments.pilot_front.nominal_arm;
        let cPassArm = centerPassArm !== undefined && centerPassArm !== null ? centerPassArm : this.data.compartments.center_pass.nominal_arm;
        let bagAArm = baggageAArm !== undefined && baggageAArm !== null ? baggageAArm : this.data.compartments.baggage_a.nominal_arm;
        let bagBArm = baggageBArm !== undefined && baggageBArm !== null ? baggageBArm : this.data.compartments.baggage_b.nominal_arm;
        
        let fuelArm = 48.0; // Standard fuel tank arm for Cessna 182P
        let fuelW = fuelGal * 6.0;
        let taxiW = taxiFuel * 6.0;
        
        // Takeoff Condition
        let w_ramp = emptyW + pilotFrontW + centerPassW + aftPassW + baggageAW + baggageBW + fuelW;
        let m_ramp = emptyMoment + (pilotFrontW * pFrontArm)/1000.0 + (centerPassW * cPassArm)/1000.0 + (aftPassW * 74.0)/1000.0 + (baggageAW * bagAArm)/1000.0 + (baggageBW * bagBArm)/1000.0 + (fuelW * fuelArm)/1000.0;
        
        let w_to = w_ramp - taxiW;
        let m_to = m_ramp - (taxiW * fuelArm)/1000.0;
        let cg_to = w_to > 0 ? (m_to * 1000.0) / w_to : 0.0;
        
        // Landing Condition
        let fuelBurnW = fuelBurnGal * 6.0;
        let w_ld = w_to - fuelBurnW;
        let m_ld = m_to - (fuelBurnW * fuelArm)/1000.0;
        let cg_ld = w_ld > 0 ? (m_ld * 1000.0) / w_ld : 0.0;
        
        let warnings = [];
        
        // Weight Limits
        let maxRampW = 3108.0; // standard ramp weight for 3100lb STC
        let maxToW = 3100.0;
        let maxLdW = 2950.0;
        
        if (w_ramp > maxRampW) warnings.push(`Ramp weight (${Math.round(w_ramp)} lbs) exceeds STC limit of ${maxRampW} lbs.`);
        if (w_to > maxToW) warnings.push(`Takeoff weight (${Math.round(w_to)} lbs) exceeds STC limit of ${maxToW} lbs.`);
        if (w_ld > maxLdW) warnings.push(`Landing weight (${Math.round(w_ld)} lbs) exceeds POH limit of ${maxLdW} lbs.`);
        
        // Baggage compartment limits
        if (baggageAW > this.data.compartments.baggage_a.max_weight) {
            warnings.push(`Baggage Area A weight (${baggageAW} lbs) exceeds limit of ${this.data.compartments.baggage_a.max_weight} lbs.`);
        }
        if (baggageBW > this.data.compartments.baggage_b.max_weight) {
            warnings.push(`Baggage Area B weight (${baggageBW} lbs) exceeds limit of ${this.data.compartments.baggage_b.max_weight} lbs.`);
        }
        
        // CG Limits check
        let [fwd_to, aft_to] = this.getCgLimits(w_to);
        let [fwd_ld, aft_ld] = this.getCgLimits(w_ld);
        
        let safe = true;
        if (w_to > maxToW || w_ld > maxLdW) {
            safe = false;
        }
        
        if (fwd_to !== null && (cg_to < fwd_to || cg_to > aft_to)) {
            safe = false;
            warnings.push(`Takeoff C.G. (${cg_to.toFixed(2)} in) is outside limits [${fwd_to.toFixed(2)}, ${aft_to.toFixed(2)}].`);
        }
        if (fwd_ld !== null && (cg_ld < fwd_ld || cg_ld > aft_ld)) {
            safe = false;
            warnings.push(`Landing C.G. (${cg_ld.toFixed(2)} in) is outside limits [${fwd_ld.toFixed(2)}, ${aft_ld.toFixed(2)}].`);
        }
        
        return {
            ramp_weight: Math.round(w_ramp * 10) / 10,
            takeoff_weight: Math.round(w_to * 10) / 10,
            takeoff_cg: Math.round(cg_to * 100) / 100,
            takeoff_moment: Math.round(m_to * 1000) / 1000,
            landing_weight: Math.round(w_ld * 10) / 10,
            landing_cg: Math.round(cg_ld * 100) / 100,
            landing_moment: Math.round(m_ld * 1000) / 1000,
            safe: safe && warnings.length === 0,
            warnings: warnings,
            limits: {
                takeoff: [fwd_to, aft_to],
                landing: [fwd_ld, aft_ld]
            }
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = POHCalculator;
}
