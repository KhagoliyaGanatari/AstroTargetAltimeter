// @ts-nocheck
// Dependencies: astronomy-engine, plotly.js, react-plotly.js, tesseract.js, luxon, tz-lookup, react-date-range, date-fns
// Install via:
// npm install astronomy-engine plotly.js react-plotly.js tesseract.js luxon tz-lookup react-date-range date-fns

import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import Tesseract from "tesseract.js";
import * as Astronomy from "astronomy-engine";
import { DateTime } from "luxon";
import tzlookup from "tz-lookup";
import { DateRangePicker } from "react-date-range";
import {
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  differenceInMinutes,
  differenceInDays,
  setHours,
  setMinutes,
  setSeconds,
} from "date-fns";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

import styled from "styled-components";

const StyledGenerateButton = styled.button`
  border: none;
  outline: none;
  background-color: #6c5ce7;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  border-radius: 8px;
  transition: all ease 0.2s;
  box-shadow: 0px 5px 0px 0px #a29bfe, 0 0 15px rgba(108, 92, 231, 0.3);
  cursor: pointer;

  &:hover {
    background-color: #7d6dff;
    box-shadow: 0px 5px 0px 0px #a29bfe, 0 0 25px rgba(108, 92, 231, 0.5), 0 0 50px rgba(108, 92, 231, 0.2);
  }

  &:active {
    transform: translateY(5px);
    box-shadow: 0px 0px 0px 0px #a29bfe;
  }
`;

//Use my current location button css

const StyledLocationButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 220px;
  height: 52px;
  cursor: pointer;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.5px;
  border-radius: 14px;
  border: 2px solid rgba(0, 210, 255, 0.3);
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  transition: all 0.3s ease;
  box-shadow: 0 0 15px rgba(0, 210, 255, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  &::before {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle,
      rgba(0, 210, 255, 0.15) 0%,
      transparent 70%
    );
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  &:hover {
    border-color: rgba(0, 210, 255, 0.6);
    box-shadow: 0 0 25px rgba(0, 210, 255, 0.3),
      0 0 60px rgba(0, 210, 255, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
    background: linear-gradient(135deg, #141136, #3a3580, #2d2a50);
  }

  &:hover::before {
    opacity: 1;
  }

  &:active {
    transform: translateY(1px) scale(0.97);
    box-shadow: 0 0 10px rgba(0, 210, 255, 0.2);
    transition: all 0.1s ease;
  }

  .pin-icon {
    font-size: 20px;
    animation: bounce 2s ease-in-out infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
`;

export default function SkyObservationApp() {
  // ✅ Always starts at tomorrow 6 PM to day-after 6 AM
  const getNightRange = () => {
    const tomorrow = addDays(new Date(), 1);
    const startDate = setHours(setMinutes(setSeconds(tomorrow, 0), 0), 18); // 6 PM tomorrow
    const endDate = setHours(
      setMinutes(setSeconds(addDays(tomorrow, 1), 0), 0),
      6
    ); // 6 AM day after
    return {
      startDate,
      endDate,
      key: "selection",
    };
  };

  // Last night: yesterday 6 PM → today 6 AM
  const getLastNightRange = () => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const startDate = setHours(setMinutes(setSeconds(yesterday, 0), 0), 18);
    const endDate = setHours(setMinutes(setSeconds(today, 0), 0), 6);
    return {
      startDate,
      endDate,
      key: "selection",
    };
  };

  // --- State hooks ---
  const canvasRef = React.useRef(null);

  // Load persisted values from localStorage
  const loadSaved = (key: string, fallback: string) => {
    try { return localStorage.getItem(`ata_${key}`) || fallback; } catch { return fallback; }
  };

  const [ra, setRa] = useState(() => loadSaved("ra", ""));
  const [dec, setDec] = useState(() => loadSaved("dec", ""));
  const [latitude, setLatitude] = useState(() => loadSaved("lat", ""));
  const [longitude, setLongitude] = useState(() => loadSaved("lon", ""));

  // Define the preset options
  type PresetOption = "lastNight" | "nextNight" | "next7" | "next15" | "custom";

  // Default preset
  const [preset, setPreset] = useState<PresetOption>(() => loadSaved("preset", "nextNight") as PresetOption);

  // Set initial range based on default preset
  const [range, setRange] = useState(() => [getNightRange()]);

  const [showPicker, setShowPicker] = useState(false);
  const [customRangeTouched, setCustomRangeTouched] = useState(false);

  const [customHorizon, setCustomHorizon] = useState(() => loadSaved("horizon", "30"));
  const [loading, setLoading] = useState(false);
  const [plotData, setPlotData] = useState<{ data: any[]; layout: any }>({
    data: [],
    layout: {},
  });

  // Per-field inline error states
  const [fieldErrors, setFieldErrors] = useState<{
    ra: string;
    dec: string;
    lat: string;
    lon: string;
    general: string;
  }>({ ra: "", dec: "", lat: "", lon: "", general: "" });

  // Persist inputs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("ata_ra", ra);
      localStorage.setItem("ata_dec", dec);
      localStorage.setItem("ata_lat", latitude);
      localStorage.setItem("ata_lon", longitude);
      localStorage.setItem("ata_preset", preset);
      localStorage.setItem("ata_horizon", customHorizon);
    } catch { }
  }, [ra, dec, latitude, longitude, preset, customHorizon]);

  // HUD info state — displayed below chart instead of as chart annotation
  const [chartInfo, setChartInfo] = useState<{
    moonPct: string;
    visibilityHours: string;
    duskLocal: string;
    dawnLocal: string;
    tzAbbrev: string;
    tzFull: string;
  } | null>(null);

  // Target name — set when random target is picked or can be manually noted
  const [targetName, setTargetName] = useState<string>("");

  // Famous astronomical targets for random selection
  const FAMOUS_TARGETS = [
    { name: "Orion Nebula (M42)", ra: "053516", dec: "-052328" },
    { name: "Andromeda Galaxy (M31)", ra: "004244", dec: "+411609" },
    { name: "Pleiades (M45)", ra: "034700", dec: "+240700" },
    { name: "Crab Nebula (M1)", ra: "053432", dec: "+220052" },
    { name: "Whirlpool Galaxy (M51)", ra: "132952", dec: "+471154" },
    { name: "Ring Nebula (M57)", ra: "185335", dec: "+330146" },
    { name: "Lagoon Nebula (M8)", ra: "180336", dec: "-241823" },
    { name: "Eagle Nebula (M16)", ra: "181849", dec: "-135800" },
    { name: "Betelgeuse (α Ori)", ra: "055510", dec: "+072425" },
    { name: "Sirius (α CMa)", ra: "064509", dec: "-164258" },
    { name: "Vega (α Lyr)", ra: "183656", dec: "+384701" },
    { name: "Polaris (α UMi)", ra: "023132", dec: "+892150" },
  ];

  const handleRandomTarget = () => {
    const target = FAMOUS_TARGETS[Math.floor(Math.random() * FAMOUS_TARGETS.length)];
    setRa(target.ra);
    setDec(target.dec);
    setTargetName(target.name);
    setFieldErrors({ ra: "", dec: "", lat: "", lon: "", general: "" });
  };

  // Theme state with system auto-detection
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const listener = (e: MediaQueryListEvent) =>
      setTheme(e.matches ? "dark" : "light");
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  // Ref for the plot container — used for responsive sizing
  const plotContainerRef = React.useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // --- Helpers ---
  const pad2 = (n: number) => (n < 10 ? "0" + n : "" + n);
  const parseRA = (s: string) =>
    parseInt(s.slice(0, 2)) +
    parseInt(s.slice(2, 4)) / 60 +
    parseInt(s.slice(4, 6)) / 3600;
  const parseDec = (s: string) => {
    const sign = s[0] === "-" ? -1 : 1;
    return (
      sign *
      (parseInt(s.slice(1, 3)) +
        parseInt(s.slice(3, 5)) / 60 +
        parseInt(s.slice(5, 7)) / 3600)
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setLoading(true);
    const file = e.target.files?.[0];
    if (!file) {
      setLoading(false);
      return;
    }
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(file, "eng");
      const r = text.match(/RA\s*[:=]?\s*(\d{2})(\d{2})(\d{2})/i);
      const d = text.match(/DEC\s*[:=]?\s*([+\-]?\d{2})(\d{2})(\d{2})/i);
      if (r && d) {
        setRa(r[1] + r[2] + r[3]);
        const sign = d[1].startsWith("-") ? "-" : "+";
        setDec(sign + pad2(parseInt(d[1].replace(/[+\-]/, ""))) + d[2] + d[3]);
      } else {
        setError("Invalid RA/DEC in image.");
      }
    } catch {
      setError("OCR failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setFieldErrors(prev => ({ ...prev, general: "" }));
    if (!navigator.geolocation) {
      setFieldErrors(prev => ({ ...prev, general: "Geolocation not supported by your browser." }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(5));
        setLongitude(pos.coords.longitude.toFixed(5));
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setFieldErrors(prev => ({ ...prev, general: "Location permission denied. Please allow location access in your browser settings." }));
        } else {
          setFieldErrors(prev => ({ ...prev, general: "Unable to retrieve location." }));
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Update range when preset changes:
  useEffect(() => {
    const now = new Date();

    if (preset === "lastNight") {
      setRange([getLastNightRange()]);
      setCustomRangeTouched(false);
      setShowPicker(false);
    } else if (preset === "nextNight") {
      setRange([getNightRange(now)]); // sets start: tomorrow 18:00, end: day after tomorrow 06:00
      setCustomRangeTouched(false);
      setShowPicker(false);
    } else if (preset === "next7") {
      setRange([
        {
          startDate: now,
          endDate: addDays(now, 6),
          key: "selection",
        },
      ]);
      setCustomRangeTouched(false);
      setShowPicker(false);
    } else if (preset === "next15") {
      setRange([
        {
          startDate: now,
          endDate: addDays(now, 14),
          key: "selection",
        },
      ]);
      setCustomRangeTouched(false);
      setShowPicker(false);
    } else if (preset === "custom") {
      setCustomRangeTouched(true);
      setShowPicker(true);
    }
  }, [preset]);

  // Called when user selects dates in the calendar
  const handleRangeChange = (ranges: any) => {
    setRange([ranges.selection]);
  };

  // --- Main plotting function ---
  const renderChart = () => {
    // Clear all field errors
    const errors = { ra: "", dec: "", lat: "", lon: "", general: "" };
    let hasError = false;

    try {

      // --- Comprehensive per-field validation ---

      // RA validation
      const raTrimmed = ra.trim();
      if (!raTrimmed) {
        errors.ra = "RA is required.";
        hasError = true;
      } else if (!/^\d{6}$/.test(raTrimmed)) {
        errors.ra = "RA must be exactly 6 digits (HHMMSS).";
        hasError = true;
      } else {
        const hh = parseInt(raTrimmed.slice(0, 2));
        const mm = parseInt(raTrimmed.slice(2, 4));
        const ss = parseInt(raTrimmed.slice(4, 6));
        if (hh > 23) { errors.ra = `Hours must be 00-23 (got ${hh}).`; hasError = true; }
        else if (mm > 59) { errors.ra = `Minutes must be 00-59 (got ${mm}).`; hasError = true; }
        else if (ss > 59) { errors.ra = `Seconds must be 00-59 (got ${ss}).`; hasError = true; }
      }

      // DEC validation
      let correctedDec = dec.trim();
      if (!correctedDec) {
        errors.dec = "DEC is required.";
        hasError = true;
      } else {
        if (!correctedDec.startsWith("+") && !correctedDec.startsWith("-")) {
          correctedDec = "+" + correctedDec;
        }
        if (!/^[+\-]\d{6}$/.test(correctedDec)) {
          errors.dec = "DEC must be ±DDMMSS (6 digits with sign).";
          hasError = true;
        } else {
          const dd = parseInt(correctedDec.slice(1, 3));
          const mm = parseInt(correctedDec.slice(3, 5));
          const ss = parseInt(correctedDec.slice(5, 7));
          if (dd > 90) { errors.dec = `Degrees must be 00-90 (got ${dd}).`; hasError = true; }
          else if (dd === 90 && (mm > 0 || ss > 0)) { errors.dec = "DEC cannot exceed ±90°00'00\"."; hasError = true; }
          else if (mm > 59) { errors.dec = `Minutes must be 00-59 (got ${mm}).`; hasError = true; }
          else if (ss > 59) { errors.dec = `Seconds must be 00-59 (got ${ss}).`; hasError = true; }
        }
      }

      // Latitude validation
      const latTrimmed = latitude.trim();
      if (!latTrimmed) {
        errors.lat = "Latitude is required.";
        hasError = true;
      } else {
        const latVal = parseFloat(latTrimmed);
        if (isNaN(latVal)) { errors.lat = "Must be a number."; hasError = true; }
        else if (latVal < -90 || latVal > 90) { errors.lat = "Must be between -90 and 90."; hasError = true; }
      }

      // Longitude validation
      const lonTrimmed = longitude.trim();
      if (!lonTrimmed) {
        errors.lon = "Longitude is required.";
        hasError = true;
      } else {
        const lonVal = parseFloat(lonTrimmed);
        if (isNaN(lonVal)) { errors.lon = "Must be a number."; hasError = true; }
        else if (lonVal < -180 || lonVal > 180) { errors.lon = "Must be between -180 and 180."; hasError = true; }
      }

      // If any field has errors, update state and stop
      if (hasError) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors(errors); // clear all errors

      const raH = parseRA(ra);

      const decD = parseDec(correctedDec);

      const latN = parseFloat(latitude),
        lonN = parseFloat(longitude);
      const obs = new Astronomy.Observer(latN, lonN, 0);

      // Timezone & date-range bounds
      const tz = tzlookup(latN, lonN);
      // Get timezone abbreviation (e.g., CST, EST) from the IANA timezone
      const tzAbbrev = DateTime.now().setZone(tz).toFormat("ZZZZ");
      const startDateObj = range[0].startDate;
      const endDateObj = range[0].endDate;

      // Compute how many days in the range
      const diffDays = differenceInDays(endDateObj, startDateObj) + 1;

      // If range > 30 days, switch to daily-max mode:
      if (diffDays > 30) {
        // In daily mode, we'll sample each day every 15 minutes
        const stepMin = 15;
        const intervalMs = stepMin * 60 * 1000;

        const dailyDates: Date[] = [];
        const dailyMaxAlt: number[] = [];
        const dailyHover: string[] = [];

        // For each day in [startDateObj .. endDateObj], compute max altitude
        for (let d = 0; d < diffDays; d++) {
          const dayStart = addDays(startDateObj, d);
          const dayEnd = endOfDay(dayStart);

          let maxAlt: number | null = null;
          let maxTime: Date | null = null;

          // Sample every 15 minutes from dayStart → dayEnd
          for (
            let t = dayStart.getTime();
            t <= dayEnd.getTime();
            t += intervalMs
          ) {
            const jsDate = new Date(t);
            const tA = Astronomy.MakeTime(jsDate);
            const tgt = Astronomy.Horizon(tA, obs, raH, decD, "normal");
            const altVal = tgt.altitude;
            if (maxAlt === null || altVal > maxAlt) {
              maxAlt = altVal;
              maxTime = jsDate;
            }
          }

          if (maxAlt !== null && maxTime !== null) {
            // Store midday of that day as x-value
            const midday = addDays(startOfDay(dayStart), 0.5); // midday
            dailyDates.push(midday);
            dailyMaxAlt.push(maxAlt);
            const localDT = DateTime.fromJSDate(maxTime).setZone(tz);
            dailyHover.push(
              `Date: ${DateTime.fromJSDate(dayStart)
                .setZone(tz)
                .toFormat("yyyy-LL-dd")}<br>Max Alt: ${maxAlt.toFixed(
                  2
                )}° at ${localDT.toFormat("HH:mm")}`
            );
          }
        }

        // Plot daily-max trace
        setPlotData({
          data: [
            {
              x: dailyDates,
              y: dailyMaxAlt,
              mode: "markers+lines",
              name: "Daily Max Altitude",
              hoverinfo: "text",
              hovertext: dailyHover,
              line: { shape: "spline", width: 3, color: "#00d2ff" },
              marker: {
                size: 8,
                color: "#00d2ff",
                line: { color: "rgba(0, 210, 255, 0.4)", width: 3 },
                symbol: "circle",
              },
              fill: "tozeroy",
              fillcolor: "rgba(0, 210, 255, 0.08)",
            },
          ],
          layout: {
            title: {
              text: `Daily Max Altitude<br><sub>${DateTime.fromJSDate(startDateObj)
                .setZone(tz)
                .toISODate()} → ${DateTime.fromJSDate(endDateObj)
                  .setZone(tz)
                  .toISODate()}</sub>`,
              font: { family: "Inter, system-ui, sans-serif", size: 18 },
            },
            xaxis: {
              title: { text: "Date", font: { family: "Inter, system-ui, sans-serif", size: 13 } },
              type: "date",
              tickformat: "%b %d",
              gridcolor: "rgba(128,128,128,0.15)",
              griddash: "dot",
              linecolor: "rgba(128,128,128,0.3)",
              tickfont: { family: "Inter, system-ui, sans-serif", size: 11 },
            },
            yaxis: {
              title: { text: "Max Altitude (°)", font: { family: "Inter, system-ui, sans-serif", size: 13 } },
              gridcolor: "rgba(128,128,128,0.15)",
              griddash: "dot",
              linecolor: "rgba(128,128,128,0.3)",
              zeroline: true,
              zerolinecolor: "rgba(128,128,128,0.3)",
              tickfont: { family: "Inter, system-ui, sans-serif", size: 11 },
            },
            hovermode: "x unified",
            hoverlabel: {
              bgcolor: "rgba(20,20,40,0.9)",
              bordercolor: "rgba(0,210,255,0.5)",
              font: { family: "Inter, system-ui, sans-serif", size: 12, color: "#e0e0e0" },
            },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            height: 600,
            margin: { t: 70, r: 30, b: 60, l: 60 },
          },
        });
        return;
      }

      // --- Otherwise, for diffDays ≤ 30, do full 5-min sampling over entire range ---
      // Compute total minutes in the selected window
      const totalMins = differenceInMinutes(endDateObj, startDateObj);
      let stepMin = 5;
      // If too many points (>10k), increase stepMin
      if (totalMins / stepMin > 10000) {
        stepMin = Math.ceil(totalMins / 10000);
      }
      const intervalMs = stepMin * 60 * 1000;

      // Build an array of allTimes from startDateObj → endDateObj, stepping by intervalMs
      const allTimes: Date[] = [];
      for (
        let t = startDateObj.getTime();
        t <= endDateObj.getTime();
        t += intervalMs
      ) {
        allTimes.push(new Date(t));
      }

      // Arrays to collect altitudes
      const targetAlt: Array<number | null> = [];
      const moonAlt: Array<number | null> = [];
      const sunAlt: number[] = [];
      const hoverText: string[] = [];
      let minSep = Infinity;
      let peakIdx = 0;

      allTimes.forEach((jsDate, i) => {
        const t = Astronomy.MakeTime(jsDate);
        // Target
        const tgt = Astronomy.Horizon(t, obs, raH, decD, "normal");
        const altT = tgt.altitude >= 0 ? tgt.altitude : null;
        targetAlt.push(altT);

        // Moon
        const mEq = Astronomy.Equator(Astronomy.Body.Moon, t, obs, true, true);
        const mH = Astronomy.Horizon(t, obs, mEq.ra, mEq.dec, "normal");
        moonAlt.push(mH.altitude >= 0 ? mH.altitude : null);

        // Sun
        const sEq = Astronomy.Equator(Astronomy.Body.Sun, t, obs, true, true);
        const sH = Astronomy.Horizon(t, obs, sEq.ra, sEq.dec, "normal");
        sunAlt.push(sH.altitude);

        // Angular separation (target ↔ moon)
        const ra1 = (raH * Math.PI) / 12,
          dec1 = (decD * Math.PI) / 180;
        const ra2 = (mEq.ra * Math.PI) / 12,
          dec2 = (mEq.dec * Math.PI) / 180;
        const cs =
          Math.sin(dec1) * Math.sin(dec2) +
          Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2);
        const sep = (Math.acos(Math.min(Math.max(cs, -1), 1)) * 180) / Math.PI;
        if (sep < minSep) minSep = sep;

        // Track peak index on entire range
        if (altT !== null && altT > (targetAlt[peakIdx] ?? -Infinity)) {
          peakIdx = i;
        }

        // Hover text
        const localDT = DateTime.fromJSDate(jsDate).setZone(tz);
        hoverText.push(
          altT !== null
            ? `Time: ${localDT.toFormat(
              "yyyy-LL-dd HH:mm"
            )}<br>Alt: ${altT.toFixed(2)}°<br>Sep: ${sep.toFixed(2)}°`
            : ""
        );
      });

      // Interpolate Astronomical Dusk / Dawn:
      const threshold = -18;
      let astroDuskDate: Date | null = null;
      let astroDawnDate: Date | null = null;
      for (let i = 1; i < sunAlt.length; i++) {
        if (sunAlt[i - 1] > threshold && sunAlt[i] <= threshold) {
          const t0 = allTimes[i - 1].getTime();
          const t1 = allTimes[i].getTime();
          const ratio = (sunAlt[i - 1] - threshold) / (sunAlt[i - 1] - sunAlt[i]);
          astroDuskDate = new Date(t0 + ratio * (t1 - t0));
          break;
        }
      }
      for (let i = 1; i < sunAlt.length; i++) {
        if (sunAlt[i - 1] <= threshold && sunAlt[i] > threshold) {
          const t0 = allTimes[i - 1].getTime();
          const t1 = allTimes[i].getTime();
          const ratio = (threshold - sunAlt[i - 1]) / (sunAlt[i] - sunAlt[i - 1]);
          astroDawnDate = new Date(t0 + ratio * (t1 - t0));
          break;
        }
      }
      const duskLocal = astroDuskDate
        ? DateTime.fromJSDate(astroDuskDate)
          .setZone(tz)
          .toFormat("yyyy-LL-dd HH:mm")
        : "N/A";
      const dawnLocal = astroDawnDate
        ? DateTime.fromJSDate(astroDawnDate)
          .setZone(tz)
          .toFormat("yyyy-LL-dd HH:mm")
        : "N/A";

      // Compute visibility hours over entire span
      const hz = Number(customHorizon);
      const visCount = targetAlt.filter((a) => a !== null && a >= hz).length;
      const visibilityHours = (visCount * stepMin) / 60;

      // Peak marker
      const peakTime = allTimes[peakIdx];
      const peakAlt = targetAlt[peakIdx]!;

      // Moon phase at mid‐range
      const midIndex = Math.floor(allTimes.length / 2);
      const midJS = allTimes[midIndex];
      const moonPct =
        Astronomy.Illumination(Astronomy.Body.Moon, Astronomy.MakeTime(midJS))
          .phase_fraction * 100;

      // Store HUD info for display below chart
      setChartInfo({
        moonPct: moonPct.toFixed(1),
        visibilityHours: visibilityHours.toFixed(2),
        duskLocal,
        dawnLocal,
        tzAbbrev,
        tzFull: tz,
      });

      // Build Plotly traces/layout with vertical lines
      setPlotData({
        data: [
          {
            x: allTimes,
            y: targetAlt,
            mode: "lines",
            name: "Target Altitude",
            hoverinfo: "text",
            hovertext: hoverText,
            line: { color: "#00d2ff", width: 2.5, shape: "spline" },
            fill: "tozeroy",
            fillcolor: "rgba(0, 210, 255, 0.07)",
          },
          {
            x: allTimes,
            y: moonAlt,
            mode: "lines",
            name: "🌙 Moon Altitude",
            line: { dash: "dash", color: "#f5a623", width: 2 },
          },
          {
            x: [allTimes[0], allTimes[allTimes.length - 1]],
            y: [0, 0],
            mode: "lines",
            name: "Horizon 0°",
            line: { dash: "dash", color: "rgba(150,150,150,0.5)", width: 1.5 },
            showlegend: false,
          },
          {
            x: [allTimes[0], allTimes[allTimes.length - 1]],
            y: [hz, hz],
            mode: "lines",
            name: `Horizon ${hz}°`,
            line: { dash: "dot", color: "#ff6b6b", width: 2 },
          },
          {
            x: [peakTime],
            y: [peakAlt],
            mode: "markers",
            name: "★ Peak Altitude",
            marker: {
              symbol: "star",
              size: 16,
              color: "#ffd700",
              line: { color: "rgba(255, 215, 0, 0.4)", width: 3 },
            },
          },
          // "Now" marker — shown when current time falls within the chart range
          ...(() => {
            const nowDate = new Date();
            if (nowDate >= allTimes[0] && nowDate <= allTimes[allTimes.length - 1]) {
              const tNow = Astronomy.MakeTime(nowDate);
              const tgtNow = Astronomy.Horizon(tNow, obs, raH, decD, "normal");
              const nowAlt = tgtNow.altitude;
              const localNow = DateTime.fromJSDate(nowDate).setZone(tz);
              return [{
                x: [nowDate],
                y: [nowAlt >= 0 ? nowAlt : 0],
                mode: "markers+text" as const,
                name: "📍 Now",
                marker: {
                  symbol: "diamond",
                  size: 14,
                  color: "#00ff88",
                  line: { color: "rgba(0, 255, 136, 0.5)", width: 3 },
                },
                text: [`Now: ${nowAlt.toFixed(1)}°`],
                textposition: "top center" as const,
                textfont: { family: "Inter, system-ui, sans-serif", size: 12, color: "#00ff88" },
                hoverinfo: "text" as const,
                hovertext: [`Now: ${localNow.toFormat("HH:mm")}\nAlt: ${nowAlt.toFixed(2)}°`],
              }];
            }
            return [];
          })(),
        ],
        layout: {
          shapes: [
            astroDuskDate && {
              type: "line",
              x0: astroDuskDate,
              x1: astroDuskDate,
              yref: "paper",
              y0: 0,
              y1: 1,
              line: { color: "rgba(232, 168, 56, 0.5)", dash: "dot", width: 1.5 },
            },
            astroDawnDate && {
              type: "line",
              x0: astroDawnDate,
              x1: astroDawnDate,
              yref: "paper",
              y0: 0,
              y1: 1,
              line: { color: "rgba(94, 175, 255, 0.5)", dash: "dot", width: 1.5 },
            },
          ].filter(Boolean),
          annotations: [
            {
              x: peakTime,
              y: peakAlt,
              text: `<b>Peak: ${peakAlt.toFixed(2)}°</b>`,
              showarrow: true,
              arrowhead: 2,
              arrowsize: 1.2,
              arrowcolor: "#ffd700",
              ax: 0,
              ay: -45,
              font: { family: "Inter, system-ui, sans-serif", size: 13, color: "#ffd700" },
              bgcolor: "rgba(20,20,40,0.75)",
              bordercolor: "rgba(255,215,0,0.4)",
              borderwidth: 1,
              borderpad: 5,
            },

          ],
          xaxis: {
            title: { text: `Local Time [${tzAbbrev}]`, font: { family: "Inter, system-ui, sans-serif", size: 14, color: "#00d2ff" } },
            type: "date",
            tickformat: diffDays > 1 ? "%b %d %H:%M" : "%H:%M",
            dtick: diffDays > 7 ? 86400000 : undefined, // daily ticks for long ranges
            gridcolor: "rgba(128,128,128,0.15)",
            griddash: "dot",
            tickfont: { family: "Inter, system-ui, sans-serif", size: 12, color: "#a0cfdf" },
            showline: false,
          },
          yaxis: {
            title: { text: "Altitude (°)", font: { family: "Inter, system-ui, sans-serif", size: 14, color: "#00d2ff" } },
            gridcolor: "rgba(128,128,128,0.15)",
            griddash: "dot",
            zeroline: true,
            zerolinecolor: "rgba(255,255,255,0.2)",
            zerolinewidth: 2,
            tickfont: { family: "Inter, system-ui, sans-serif", size: 12, color: "#a0cfdf" },
            ticksuffix: "°",
            showline: false,
          },
          hovermode: "x unified",
          hoverlabel: {
            bgcolor: "rgba(20,20,40,0.9)",
            bordercolor: "rgba(0,210,255,0.5)",
            font: { family: "Inter, system-ui, sans-serif", size: 12, color: "#e0e0e0" },
          },
          legend: {
            font: { family: "Inter, system-ui, sans-serif", size: 12 },
            bgcolor: "rgba(0,0,0,0)",
            borderwidth: 0,
            orientation: "h",
            x: 0.5,
            xanchor: "center",
            y: -0.15,
          },
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          autosize: true,
          margin: { t: 40, r: 20, b: 70, l: 60 },
        },
      });
    } catch (e: any) {
      console.error("renderChart error:", e);
      setFieldErrors(prev => ({ ...prev, general: "Error: " + (e?.message || String(e)) }));
    }
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Stars for both modes
    const stars = [];
    const numStars = 200;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.2,
        alpha: Math.random(),
        delta: 0.001 + Math.random() * 0.005,
      });
    }

    // Shooting stars (only used in dark mode)
    let shootingStars = [];

    function createShootingStar() {
      const length = 0.02 + Math.random() * 0.03; // length of shooting star (fraction of canvas)
      return {
        x: Math.random() * 0.4, // start somewhere in left 40%
        y: Math.random() * 0.5, // start in top half
        speedX: 0.003 + Math.random() * 0.002, // slower speedX
        speedY: 0.001 + Math.random() * 0.001, // slower speedY
        length,
        life: 0,
        maxLife: 300 + Math.floor(Math.random() * 150), // longer lifetime (~300-450 frames)
        alpha: 1,
        trail: [],
        active: true,
      };
    }

    function drawStars() {
      stars.forEach((star) => {
        star.alpha += star.delta;
        if (star.alpha <= 0) {
          star.alpha = 0;
          star.delta = -star.delta;
        } else if (star.alpha >= 1) {
          star.alpha = 1;
          star.delta = -star.delta;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, 2 * Math.PI);
        ctx.fillStyle =
          theme === "dark"
            ? `rgba(255, 255, 255, ${star.alpha})`
            : `rgba(0, 0, 0, ${star.alpha})`;
        ctx.shadowColor =
          theme === "dark" ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 4;
        ctx.fill();
      });
    }

    // Start cloud generator
    let cloudSpawnInterval = setInterval(() => {
      if (theme === "light" && cloudXArray.length < maxClouds) {
        const lastCloudX =
          cloudXArray.length > 0 ? cloudXArray[cloudXArray.length - 1].x : -200;
        cloudXArray.push({
          x: width + Math.random() * 100, // spawn just off-screen to the right
          // random gap before this cloud
          yOffset: 0.003 + Math.random() * 0.004, // small wave
          sizeFactor: 0.8 + Math.random() * 0.6, // varied sizes
        });
      }
    }, 2000); // spawn every 2 seconds

    const cloudSpeed = 0.3; // or any speed you like
    const cloudXArray = [];
    const maxClouds = 17;
    for (let i = 0; i < maxClouds; i++) {
      cloudXArray.push({
        x: Math.random() * width,
        yOffset: 0.003 + Math.random() * 0.004,
        sizeFactor: 0.8 + Math.random() * 0.6,
      });
    }

    // --- Your drawClouds function ---
    function drawClouds() {
      if (theme !== "light") return;

      for (let cloud of cloudXArray) {
        cloud.x += cloudSpeed;

        if (cloud.x > width + 200) {
          cloud.x = -200 - Math.random() * 400;
          cloud.yOffset = 0.003 + Math.random() * 0.004;
          cloud.sizeFactor = 0.8 + Math.random() * 0.6;
        }

        const baseY = height * 0.3 + Math.sin(cloud.x * cloud.yOffset) * 10;
        const cloudWidth = 180 * cloud.sizeFactor;
        const cloudHeight = 60 * cloud.sizeFactor;

        const gradient = ctx.createLinearGradient(
          cloud.x,
          baseY,
          cloud.x + cloudWidth,
          baseY + cloudHeight
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)"); // brighter white, more opaque
        gradient.addColorStop(1, "rgba(240, 240, 240, 0.5)"); // lighter gray, still opaque

        ctx.fillStyle = gradient;
        ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
        ctx.shadowBlur = 60;

        ctx.beginPath();
        ctx.ellipse(
          cloud.x + cloudWidth * 0.3,
          baseY + cloudHeight * 0.5,
          cloudWidth * 0.3,
          cloudHeight * 0.5,
          0,
          0,
          2 * Math.PI
        );
        ctx.ellipse(
          cloud.x + cloudWidth * 0.6,
          baseY + cloudHeight * 0.4,
          cloudWidth * 0.35,
          cloudHeight * 0.6,
          0,
          0,
          2 * Math.PI
        );
        ctx.ellipse(
          cloud.x + cloudWidth * 0.8,
          baseY + cloudHeight * 0.55,
          cloudWidth * 0.25,
          cloudHeight * 0.45,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    }

    function drawShootingStars() {
      // Only draw shooting stars in dark mode
      if (theme !== "dark") return;

      // Occasionally add a new shooting star (about 0.005 chance per frame), max 3 at a time
      if (Math.random() < 0.005 && shootingStars.length < 3) {
        shootingStars.push(createShootingStar());
      }

      shootingStars.forEach((star, i) => {
        if (!star.active) return;

        // Add current position to trail
        star.trail.push({ x: star.x, y: star.y });
        if (star.trail.length > 10) star.trail.shift(); // limit trail length

        star.x += star.speedX;
        star.y += star.speedY;

        star.life++;
        star.alpha = 1 - (star.life / star.maxLife) ** 2;

        if (star.alpha <= 0 || star.x > 1 || star.y > 1) {
          shootingStars.splice(i, 1);
          return;
        }

        const startX = star.x * width;
        const startY = star.y * height;
        const endX = (star.x - star.speedX * star.length) * width;
        const endY = (star.y - star.speedY * star.length) * height;

        ctx.strokeStyle = `rgba(255, 255, 255, ${star.alpha.toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = "white";
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        // Trail effect: draw multiple segments behind the star
        for (let i = 0; i < star.length; i++) {
          const trailXStart = (star.x - star.speedX * i) * width;
          const trailYStart = (star.y - star.speedY * i) * height;
          const trailXEnd = (star.x - star.speedX * (i + 1)) * width;
          const trailYEnd = (star.y - star.speedY * (i + 1)) * height;

          const alpha = star.alpha * (1 - i / star.length);

          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
          ctx.lineWidth = 2;
          ctx.shadowColor = "white";
          ctx.shadowBlur = 10;

          ctx.beginPath();
          ctx.moveTo(trailXStart, trailYStart);
          ctx.lineTo(trailXEnd, trailYEnd);
          ctx.stroke();
        }

        // Draw the bright star head at current position
        ctx.beginPath();
        ctx.arc(
          star.x * width,
          star.y * height,
          star.length * 7,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha.toFixed(2)})`;
        ctx.shadowColor = "white";
        ctx.shadowBlur = 10;
        ctx.fill();
      });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      if (theme === "dark") {
        // Dark mode gradient background — keep as is
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#0a0a0a");
        gradient.addColorStop(0.5, "#121212");
        gradient.addColorStop(1, "#1e1e2f");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        drawStars(); // draw stars only in dark mode
        drawShootingStars(); // draw shooting stars only in dark mode
      } else {
        // Light mode background with subtle color for clouds
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#cce7ff"); // very light blue at top
        gradient.addColorStop(1, "#f0f8ff"); // alice blue at bottom
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        drawClouds(); // draw clouds only in light mode
      }

      animationFrameId = requestAnimationFrame(draw);
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }

    resize();
    window.addEventListener("resize", resize);

    let animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
      clearInterval(cloudSpawnInterval); // 👈 important: clears cloud spawning interval
    };
  }, [theme]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "8px",
        boxSizing: "border-box",
        fontFamily: "Inter, system-ui, sans-serif",
        transition: "all 0.3s",
        color: theme === "dark" ? "#fff" : "#000",
      }}
    >
      {/* Background canvas for animated stars/clouds */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: -1,
          pointerEvents: "none",
          userSelect: "none",
        }}
      />

      {/* 🔘 Theme Toggle Top-Right */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "4px", paddingRight: "8px", flexShrink: 0 }}>
        <button
          onClick={toggleTheme}
          className={`relative inline-flex items-center justify-center w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${theme === "dark" ? "bg-cyan-600" : "bg-yellow-400"
            }`}
          title="Toggle Theme"
        >
          <span
            className={`absolute left-1 top-1 w-6 h-6 rounded-full text-sm flex items-center justify-center transition-transform duration-300 ${theme === "dark"
              ? "translate-x-6 bg-white text-yellow-500"
              : "translate-x-0 bg-white text-indigo-700"
              }`}
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </span>
        </button>
      </div>

      {/* Main Content: Left Panel + Right Panel */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: "12px", overflow: "hidden" }}>
        {/* LEFT PANEL: Options - scrollable only */}
        <div style={{
          width: "280px",
          minWidth: "280px",
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: "8px",
          flexShrink: 0,
        }}>

          <h1 className="text-xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            🔭 Astro Target Altimeter
          </h1>

          {/* Location + Random Target */}
          <div className="mb-3" style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
            <StyledGenerateButton onClick={handleUseCurrentLocation} style={{ fontSize: "0.75rem", padding: "6px 12px" }}>
              📍 My Location
            </StyledGenerateButton>
            <StyledGenerateButton onClick={handleRandomTarget} style={{ fontSize: "0.75rem", padding: "6px 12px" }}>
              🎲 Random Target
            </StyledGenerateButton>
          </div>
          {targetName && (
            <p className="text-center text-xs mb-2" style={{ opacity: 0.7 }}>
              Selected: <strong>{targetName}</strong>
            </p>
          )}

          {/* Inputs with inline errors */}
          {[
            ["RA (HHMMSS)", ra, setRa, "e.g. 053542", "ra"],
            ["DEC (±DDMMSS)", dec, setDec, "e.g. +223358", "dec"],
            ["Latitude", latitude, setLatitude, "e.g. 50.45", "lat"],
            ["Longitude", longitude, setLongitude, "e.g. -104.62", "lon"],
          ].map(([label, value, setter, placeholder, errKey]) => {
            const err = (fieldErrors as any)[errKey] || "";
            return (
              <div className="mb-2" key={label}>
                <label className="block text-xs mb-1" style={{ opacity: 0.8 }}>{label}:</label>
                <input
                  type="text"
                  value={value}
                  placeholder={placeholder}
                  onChange={(e) => { setter(e.target.value); if (err) setFieldErrors(prev => ({ ...prev, [errKey]: "" })); }}
                  style={err ? { borderColor: "#ef4444" } : {}}
                  className={`w-full px-3 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-cyan-400
          ${theme === "dark"
                      ? "bg-gray-800 border-cyan-600 text-white placeholder-gray-500"
                      : "bg-gray-100 border-gray-400 text-black placeholder-gray-400"
                    }
        `}
                />
                {err && <p className="text-red-400 text-xs mt-0.5">⚠ {err}</p>}
              </div>
            );
          })}

          {/* Date Preset */}
          <div className="mb-2">
            <label className="block text-xs mb-1" style={{ opacity: 0.8 }}>Select Time Range:</label>
            <select
              className={`w-full px-3 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-cyan-400
      ${theme === "dark"
                  ? "bg-gray-800 border-indigo-500 text-white"
                  : "bg-gray-100 border-gray-400 text-black"
                }
    `}
              value={preset}
              onChange={(e) => setPreset(e.target.value as any)}
            >
              <option value="lastNight">Last Night</option>
              <option value="nextNight">Next Night</option>
              <option value="next7">Next 7 Nights</option>
              <option value="next15">Next 15 Nights</option>
              <option value="custom">Custom Night</option>
            </select>
          </div>

          {/* Custom Date Picker */}
          {preset === "custom" && (
            <div className="mb-3 bg-gray-800 p-2 rounded-md">
              <button
                className="mb-2 text-cyan-400 hover:text-cyan-300 underline text-sm"
                onClick={() => setShowPicker(!showPicker)}
              >
                {DateTime.fromJSDate(range[0].startDate).toISODate()} –{" "}
                {DateTime.fromJSDate(range[0].endDate).toISODate()}
              </button>
              {showPicker && (
                <>
                  {/* Backdrop to close picker when clicking outside */}
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      width: "100vw",
                      height: "100vh",
                      zIndex: 40,
                    }}
                    onClick={() => setShowPicker(false)}
                  />
                  {/* Calendar overlay */}
                  <div
                    style={{
                      position: "fixed",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      zIndex: 50,
                      background: "#1f2937",
                      borderRadius: "12px",
                      padding: "16px",
                      boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 30px rgba(0,210,255,0.15)",
                      border: "1px solid rgba(0,210,255,0.2)",
                      maxHeight: "90vh",
                      overflow: "auto",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ color: "#06b6d4", fontWeight: 600, fontSize: "14px" }}>Select Date Range</span>
                      <button
                        onClick={() => setShowPicker(false)}
                        style={{
                          background: "none",
                          border: "1px solid rgba(255,255,255,0.2)",
                          color: "#fff",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        ✕ Close
                      </button>
                    </div>
                    <DateRangePicker
                      ranges={range}
                      onChange={handleRangeChange}
                      moveRangeOnFirstSelection={false}
                      editableDateInputs={true}
                      months={2}
                      direction="vertical"
                      rangeColors={["#06b6d4"]}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Custom Horizon */}
          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ opacity: 0.8 }}>Custom Horizon (°):</label>
            <input
              type="text"
              value={customHorizon}
              onChange={(e) => setCustomHorizon(e.target.value)}
              className={`w-full px-3 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-cyan-400
    ${theme === "dark"
                  ? "bg-gray-800 border-cyan-600 text-white"
                  : "bg-gray-100 border-gray-400 text-black"
                }
  `}
            />
          </div>

          {/* Generate Chart + Clear All */}
          <div className="mb-3" style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
            <StyledGenerateButton onClick={renderChart}>
              Generate Chart 🚀
            </StyledGenerateButton>
            <button
              onClick={() => {
                setRa(""); setDec(""); setLatitude(""); setLongitude("");
                setCustomHorizon("30"); setPreset("nextNight");
                setPlotData({ data: [], layout: {} }); setChartInfo(null); setTargetName("");
                setFieldErrors({ ra: "", dec: "", lat: "", lon: "", general: "" });
                try {
                  Object.keys(localStorage).filter(k => k.startsWith("ata_")).forEach(k => localStorage.removeItem(k));
                } catch { }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                ${theme === "dark"
                  ? "bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white"
                  : "bg-gray-200 text-gray-600 hover:bg-red-500 hover:text-white"
                }`}
              title="Clear all fields and reset"
            >
              Clear 🗑
            </button>
          </div>

          {/* Moon Phase Widget */}
          {(() => {
            const moonPhaseRef = React.useRef<HTMLCanvasElement>(null);
            const now = Astronomy.MakeTime(new Date());
            const phaseAngle = Astronomy.MoonPhase(now); // 0-360
            const illum = Astronomy.Illumination(Astronomy.Body.Moon, now);
            const phaseFraction = illum.phase_fraction;
            const phasePct = (phaseFraction * 100).toFixed(1);

            // Phase name
            let phaseName = "";
            if (phaseAngle < 5 || phaseAngle >= 355) phaseName = "New Moon";
            else if (phaseAngle < 85) phaseName = "Waxing Crescent";
            else if (phaseAngle < 95) phaseName = "First Quarter";
            else if (phaseAngle < 175) phaseName = "Waxing Gibbous";
            else if (phaseAngle < 185) phaseName = "Full Moon";
            else if (phaseAngle < 265) phaseName = "Waning Gibbous";
            else if (phaseAngle < 275) phaseName = "Last Quarter";
            else phaseName = "Waning Crescent";

            React.useEffect(() => {
              const canvas = moonPhaseRef.current;
              if (!canvas) return;
              const ctx = canvas.getContext("2d");
              if (!ctx) return;

              const size = 100;
              canvas.width = size;
              canvas.height = size;
              const cx = size / 2;
              const cy = size / 2;
              const r = 40;

              ctx.clearRect(0, 0, size, size);

              // Outer glow
              ctx.beginPath();
              ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI);
              ctx.fillStyle = theme === "dark"
                ? "rgba(200,200,180,0.06)"
                : "rgba(0,0,0,0.04)";
              ctx.fill();

              // Dark moon base
              ctx.beginPath();
              ctx.arc(cx, cy, r, 0, 2 * Math.PI);
              const darkGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
              darkGrad.addColorStop(0, theme === "dark" ? "#333" : "#bbb");
              darkGrad.addColorStop(1, theme === "dark" ? "#1a1a1a" : "#999");
              ctx.fillStyle = darkGrad;
              ctx.fill();

              // Lit moon gradient
              const litGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
              litGrad.addColorStop(0, "#fff");
              litGrad.addColorStop(0.3, "#f0ede0");
              litGrad.addColorStop(0.7, "#d8d4c4");
              litGrad.addColorStop(1, "#c0bba8");

              const angle = phaseAngle;
              const cosA = Math.cos((angle * Math.PI) / 180);
              const absCos = Math.abs(cosA);

              // Scanline rendering for accurate phase
              for (let dy = -r; dy <= r; dy += 0.5) {
                const xEdge = Math.sqrt(r * r - dy * dy);
                const xTerm = absCos * xEdge;

                let leftX: number, rightX: number;

                if (angle <= 180) {
                  // Waxing: right side lit
                  if (cosA >= 0) {
                    // Crescent: lit from terminator to right edge
                    leftX = xTerm;
                    rightX = xEdge;
                  } else {
                    // Gibbous: lit from -terminator to right edge
                    leftX = -xTerm;
                    rightX = xEdge;
                  }
                } else {
                  // Waning: left side lit
                  if (cosA <= 0) {
                    // Gibbous: lit from left edge to terminator
                    leftX = -xEdge;
                    rightX = xTerm;
                  } else {
                    // Crescent: lit from left edge to -terminator
                    leftX = -xEdge;
                    rightX = -xTerm;
                  }
                }

                const w = rightX - leftX;
                if (w > 0) {
                  ctx.fillStyle = litGrad;
                  ctx.fillRect(cx + leftX, cy + dy, w, 0.8);
                }
              }

              // Crater details for realism
              const craters = [
                { x: 0.15, y: -0.2, s: 0.12, a: 0.15 },
                { x: -0.25, y: 0.1, s: 0.18, a: 0.12 },
                { x: 0.3, y: 0.25, s: 0.1, a: 0.1 },
                { x: -0.1, y: -0.35, s: 0.08, a: 0.13 },
                { x: 0.05, y: 0.35, s: 0.14, a: 0.1 },
              ];
              craters.forEach((c) => {
                ctx.beginPath();
                ctx.arc(cx + c.x * r, cy + c.y * r, c.s * r, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(100,100,90,${c.a})`;
                ctx.fill();
              });

              // Rim highlight
              ctx.beginPath();
              ctx.arc(cx, cy, r, 0, 2 * Math.PI);
              ctx.strokeStyle = theme === "dark"
                ? "rgba(200,200,180,0.2)"
                : "rgba(0,0,0,0.1)";
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }, [phaseAngle, theme]);

            return (
              <div className="mb-3 flex flex-col items-center">
                <canvas
                  ref={moonPhaseRef}
                  width={100}
                  height={100}
                  style={{ imageRendering: "auto" }}
                />
                <p className={`text-xs font-semibold mt-1 ${theme === "dark" ? "text-cyan-300" : "text-indigo-600"}`}>
                  {phaseName}
                </p>
                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  {phasePct}% illuminated (now)
                </p>
              </div>
            );
          })()}

          {/* Errors & Loading */}
          {fieldErrors.general && <p className="text-red-400 text-xs">⚠ {fieldErrors.general}</p>}
          {loading && (
            <p className="text-gray-400 text-xs">Processing image…</p>
          )}
        </div>

        {/* RIGHT PANEL: Plot + HUD Info */}
        <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Target name banner above chart */}
          {targetName && plotData.data.length > 0 && (
            <div style={{
              textAlign: "center",
              padding: "4px 0",
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: "1rem",
                fontWeight: 700,
                background: "linear-gradient(90deg, #22d3ee, #818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "0.5px",
              }}>
                🎯 {targetName}
              </span>
            </div>
          )}
          {/* Chart area - takes all remaining space */}
          <div
            ref={plotContainerRef}
            style={{ flex: 1, minHeight: 0, position: "relative" }}
          >
            {plotData.data.length > 0 ? (
              <Plot
                data={plotData.data}
                layout={{
                  ...plotData.layout,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  font: {
                    color: theme === "dark" ? "#e0e0e0" : "#2d2d2d",
                    family: "Inter, system-ui, sans-serif",
                  },
                  xaxis: {
                    ...plotData.layout.xaxis,
                    color: theme === "dark" ? "#a0cfdf" : "#555",
                    gridcolor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                  },
                  yaxis: {
                    ...plotData.layout.yaxis,
                    color: theme === "dark" ? "#a0cfdf" : "#555",
                    gridcolor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                  },
                  hoverlabel: {
                    ...plotData.layout.hoverlabel,
                    bgcolor: theme === "dark" ? "rgba(20,20,40,0.92)" : "rgba(255,255,255,0.95)",
                    bordercolor: theme === "dark" ? "rgba(0,210,255,0.5)" : "rgba(100,100,100,0.3)",
                    font: {
                      family: "Inter, system-ui, sans-serif",
                      size: 12,
                      color: theme === "dark" ? "#e0e0e0" : "#333",
                    },
                  },
                  annotations: (plotData.layout.annotations || []).map((ann: any) => ({
                    ...ann,
                    font: {
                      ...(ann.font || {}),
                      color: ann.font?.color || (theme === "dark" ? "#e0e0e0" : "#333"),
                    },
                    bgcolor: ann.bgcolor || (theme === "dark" ? "rgba(15,15,35,0.8)" : "rgba(255,255,255,0.9)"),
                    bordercolor: ann.bordercolor || (theme === "dark" ? "rgba(0,210,255,0.3)" : "rgba(100,100,100,0.3)"),
                  })),
                  legend: {
                    ...plotData.layout.legend,
                    font: {
                      family: "Inter, system-ui, sans-serif",
                      size: 12,
                      color: theme === "dark" ? "#c0c0c0" : "#444",
                    },
                  },
                  autosize: true,
                }}
                config={{
                  displayModeBar: true,
                  modeBarButtonsToRemove: ["lasso2d", "select2d"],
                  displaylogo: false,
                  responsive: true,
                }}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">
                No chart generated yet.
              </div>
            )}
          </div>

          {/* HUD Info Bar - below chart */}
          {chartInfo && (
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                flexWrap: "wrap",
                gap: "16px",
                justifyContent: "center",
                alignItems: "center",
                padding: "8px 16px",
                background: theme === "dark" ? "rgba(15,15,35,0.7)" : "rgba(255,255,255,0.8)",
                borderRadius: "8px",
                border: `1px solid ${theme === "dark" ? "rgba(0,210,255,0.2)" : "rgba(100,100,100,0.2)"}`,
                marginTop: "4px",
                fontSize: "12px",
                fontFamily: "Inter, system-ui, sans-serif",
                color: theme === "dark" ? "#c0e0ef" : "#333",
              }}
            >
              <span>🌙 <strong>Moon (at obs.):</strong> {chartInfo.moonPct}%</span>
              <span>⏱ <strong>Visibility:</strong> {chartInfo.visibilityHours}h</span>
              <span>🌅 <strong>Dusk:</strong> {chartInfo.duskLocal}</span>
              <span>🌄 <strong>Dawn:</strong> {chartInfo.dawnLocal}</span>
              <span>🌍 <strong>TZ:</strong> {chartInfo.tzAbbrev} ({chartInfo.tzFull})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
