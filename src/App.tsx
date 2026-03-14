// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import Plot from "react-plotly.js";
import Tesseract from "tesseract.js";
import * as Astronomy from "astronomy-engine";
import { DateTime } from "luxon";
import tzlookup from "tz-lookup";
import { DateRangePicker } from "react-date-range";
import {
  addDays,
  subDays,
  addMonths,
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

const ThemeSwitchWrapper = styled.div`
  .theme-switch {
    --toggle-size: 12px;
    --container-width: 5.625em;
    --container-height: 2.5em;
    --container-radius: 6.25em;
    --container-light-bg: #3D7EAE;
    --container-night-bg: #1D1F2C;
    --circle-container-diameter: 3.375em;
    --sun-moon-diameter: 2.125em;
    --sun-bg: #ECCA2F;
    --moon-bg: #C4C9D1;
    --spot-color: #959DB1;
    --circle-container-offset: calc((var(--circle-container-diameter) - var(--container-height)) / 2 * -1);
    --stars-color: #fff;
    --clouds-color: #F3FDFF;
    --back-clouds-color: #AACADF;
    --transition: .5s cubic-bezier(0, -0.02, 0.4, 1.25);
    --circle-transition: .3s cubic-bezier(0, -0.02, 0.35, 1.17);
  }

  .theme-switch, .theme-switch *, .theme-switch *::before, .theme-switch *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-size: var(--toggle-size);
  }

  .theme-switch__container {
    width: var(--container-width);
    height: var(--container-height);
    background-color: var(--container-light-bg);
    border-radius: var(--container-radius);
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0em -0.062em 0.062em rgba(0, 0, 0, 0.25), 0em 0.062em 0.125em rgba(255, 255, 255, 0.94);
    transition: var(--transition);
    position: relative;
  }

  .theme-switch__container::before {
    content: "";
    position: absolute;
    z-index: 1;
    inset: 0;
    box-shadow: 0em 0.05em 0.187em rgba(0, 0, 0, 0.25) inset, 0em 0.05em 0.187em rgba(0, 0, 0, 0.25) inset;
    border-radius: var(--container-radius);
  }

  .theme-switch__checkbox {
    display: none;
  }

  .theme-switch__circle-container {
    width: var(--circle-container-diameter);
    height: var(--circle-container-diameter);
    background-color: rgba(255, 255, 255, 0.1);
    position: absolute;
    left: var(--circle-container-offset);
    top: var(--circle-container-offset);
    border-radius: var(--container-radius);
    box-shadow: inset 0 0 0 3.375em rgba(255, 255, 255, 0.1), inset 0 0 0 3.375em rgba(255, 255, 255, 0.1), 0 0 0 0.625em rgba(255, 255, 255, 0.1), 0 0 0 1.25em rgba(255, 255, 255, 0.1);
    display: flex;
    transition: var(--circle-transition);
    pointer-events: none;
  }

  .theme-switch__sun-moon-container {
    pointer-events: auto;
    position: relative;
    z-index: 2;
    width: var(--sun-moon-diameter);
    height: var(--sun-moon-diameter);
    margin: auto;
    border-radius: var(--container-radius);
    background-color: var(--sun-bg);
    box-shadow: 0.062em 0.062em 0.062em 0em rgba(254, 255, 239, 0.61) inset, 0em -0.062em 0.062em 0em #a1872a inset;
    filter: drop-shadow(0.062em 0.125em 0.125em rgba(0, 0, 0, 0.25)) drop-shadow(0em 0.062em 0.125em rgba(0, 0, 0, 0.25));
    overflow: hidden;
    transition: var(--transition);
  }

  .theme-switch__moon {
    transform: translateX(100%);
    width: 100%;
    height: 100%;
    background-color: var(--moon-bg);
    border-radius: inherit;
    box-shadow: 0.062em 0.062em 0.062em 0em rgba(254, 255, 239, 0.61) inset, 0em -0.062em 0.062em 0em #969696 inset;
    transition: var(--transition);
    position: relative;
  }

  .theme-switch__spot {
    position: absolute;
    top: 0.75em;
    left: 0.312em;
    width: 0.75em;
    height: 0.75em;
    border-radius: var(--container-radius);
    background-color: var(--spot-color);
    box-shadow: 0em 0.0312em 0.062em rgba(0, 0, 0, 0.25) inset;
  }

  .theme-switch__spot:nth-of-type(2) {
    width: 0.375em;
    height: 0.375em;
    top: 0.937em;
    left: 1.375em;
  }

  .theme-switch__spot:nth-last-of-type(3) {
    width: 0.25em;
    height: 0.25em;
    top: 0.312em;
    left: 0.812em;
  }

  .theme-switch__clouds {
    width: 1.25em;
    height: 1.25em;
    background-color: var(--clouds-color);
    border-radius: var(--container-radius);
    position: absolute;
    bottom: -0.625em;
    left: 0.312em;
    box-shadow: 0.937em 0.312em var(--clouds-color), -0.312em -0.312em var(--back-clouds-color), 1.437em 0.375em var(--clouds-color), 0.5em -0.125em var(--back-clouds-color), 2.187em 0 var(--clouds-color), 1.25em -0.062em var(--back-clouds-color), 2.937em 0.312em var(--clouds-color), 2em -0.312em var(--back-clouds-color), 3.625em -0.062em var(--clouds-color), 2.625em 0em var(--back-clouds-color), 4.5em -0.312em var(--clouds-color), 3.375em -0.437em var(--back-clouds-color), 4.625em -1.75em 0 0.437em var(--clouds-color), 4em -0.625em var(--back-clouds-color), 4.125em -2.125em 0 0.437em var(--back-clouds-color);
    transition: 0.5s cubic-bezier(0, -0.02, 0.4, 1.25);
  }

  .theme-switch__stars-container {
    position: absolute;
    color: var(--stars-color);
    top: -100%;
    left: 0.312em;
    width: 2.75em;
    height: auto;
    transition: var(--transition);
  }

  .theme-switch__checkbox:checked + .theme-switch__container {
    background-color: var(--container-night-bg);
  }

  .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__circle-container {
    left: calc(100% - var(--circle-container-offset) - var(--circle-container-diameter));
  }

  .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__circle-container:hover {
    left: calc(100% - var(--circle-container-offset) - var(--circle-container-diameter) - 0.187em);
  }

  .theme-switch__circle-container:hover {
    left: calc(var(--circle-container-offset) + 0.187em);
  }

  .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__moon {
    transform: translate(0);
  }

  .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__clouds {
    bottom: -4.062em;
  }

  .theme-switch__checkbox:checked + .theme-switch__container .theme-switch__stars-container {
    top: 50%;
    transform: translateY(-50%);
  }
`;

export default function SkyObservationApp() {
  // Tonight: today 6 PM → tomorrow 6 AM
  const getTonightRange = () => {
    const today = new Date();
    const startDate = setHours(setMinutes(setSeconds(today, 0), 0), 18);
    const endDate = setHours(setMinutes(setSeconds(addDays(today, 1), 0), 0), 6);
    return { startDate, endDate, key: "selection" };
  };

  // Next night: tomorrow 6 PM → day-after 6 AM
  const getNightRange = () => {
    const tomorrow = addDays(new Date(), 1);
    const startDate = setHours(setMinutes(setSeconds(tomorrow, 0), 0), 18);
    const endDate = setHours(setMinutes(setSeconds(addDays(tomorrow, 1), 0), 0), 6);
    return { startDate, endDate, key: "selection" };
  };

  // Last night: yesterday 6 PM → today 6 AM
  const getLastNightRange = () => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const startDate = setHours(setMinutes(setSeconds(yesterday, 0), 0), 18);
    const endDate = setHours(setMinutes(setSeconds(today, 0), 0), 6);
    return { startDate, endDate, key: "selection" };
  };

  // --- State hooks ---
  const canvasRef = React.useRef(null);

  const loadSaved = (key: string, fallback: string) => {
    try { return localStorage.getItem(`ata_${key}`) || fallback; } catch { return fallback; }
  };

  const [ra, setRa] = useState(() => loadSaved("ra", ""));
  const [dec, setDec] = useState(() => loadSaved("dec", ""));
  const [latitude, setLatitude] = useState(() => loadSaved("lat", ""));
  const [longitude, setLongitude] = useState(() => loadSaved("lon", ""));

  // Coordinate format: "hms" = HHMMSS/DDMMSS, "deg" = decimal degrees
  const [coordFormat, setCoordFormat] = useState<"hms" | "deg">("hms");

  // SIMBAD search
  const [simbadQuery, setSimbadQuery] = useState("");
  const [simbadResults, setSimbadResults] = useState<any[]>([]);
  const [simbadLoading, setSimbadLoading] = useState(false);

  // Best observation time
  const [bestObsTime, setBestObsTime] = useState<{ time: string; alt: string; sep: string } | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  type PresetOption = "tonight" | "lastNight" | "nextNight" | "next7" | "next15" | "next6months" | "nextYear" | "custom";

  const [preset, setPreset] = useState<PresetOption>(() => loadSaved("preset", "tonight") as PresetOption);

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
    horizon: string;
    general: string;
  }>({ ra: "", dec: "", lat: "", lon: "", horizon: "", general: "" });

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
  ];

  const handleRandomTarget = () => {
    const target = FAMOUS_TARGETS[Math.floor(Math.random() * FAMOUS_TARGETS.length)];
    setRa(target.ra);
    setDec(target.dec);
    setTargetName(target.name);
    setCoordFormat("hms");
    setFieldErrors({ ra: "", dec: "", lat: "", lon: "", horizon: "", general: "" });
  };

  // SIMBAD name resolver
  const handleSimbadSearch = useCallback(async () => {
    const q = simbadQuery.trim();
    if (!q) return;
    setSimbadLoading(true);
    setSimbadResults([]);
    try {
      const res = await fetch(`https://simbad.u-strasbg.fr/simbad/sim-nameresolver?Ident=${encodeURIComponent(q)}&output=json`);
      const data = await res.json();
      if (data && data.length > 0) {
        setSimbadResults(data);
      } else {
        setSimbadResults([]);
        setFieldErrors(prev => ({ ...prev, general: `No results found for "${q}".` }));
      }
    } catch {
      setFieldErrors(prev => ({ ...prev, general: "SIMBAD search failed. Check your connection." }));
    } finally {
      setSimbadLoading(false);
    }
  }, [simbadQuery]);

  const handleSimbadSelect = (result: any) => {
    const raDeg = result.ra;
    const decDeg = result.dec;
    // Convert RA degrees to HHMMSS
    const raH = raDeg / 15;
    const raHH = Math.floor(raH);
    const raMM = Math.floor((raH - raHH) * 60);
    const raSS = Math.floor(((raH - raHH) * 60 - raMM) * 60);
    const raStr = String(raHH).padStart(2, '0') + String(raMM).padStart(2, '0') + String(raSS).padStart(2, '0');
    // Convert DEC degrees to ±DDMMSS
    const decSign = decDeg >= 0 ? '+' : '-';
    const absDec = Math.abs(decDeg);
    const decDD = Math.floor(absDec);
    const decMM = Math.floor((absDec - decDD) * 60);
    const decSS = Math.floor(((absDec - decDD) * 60 - decMM) * 60);
    const decStr = decSign + String(decDD).padStart(2, '0') + String(decMM).padStart(2, '0') + String(decSS).padStart(2, '0');
    setRa(raStr);
    setDec(decStr);
    setTargetName(result.name || simbadQuery);
    setCoordFormat("hms");
    setSimbadResults([]);
    setSimbadQuery("");
    setFieldErrors({ ra: "", dec: "", lat: "", lon: "", horizon: "", general: "" });
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

  // Parse RA: supports HMS (HHMMSS) or decimal degrees
  const parseRA = (s: string, format: "hms" | "deg"): number => {
    if (format === "deg") {
      return parseFloat(s) / 15; // degrees to hours
    }
    return parseInt(s.slice(0, 2)) + parseInt(s.slice(2, 4)) / 60 + parseInt(s.slice(4, 6)) / 3600;
  };

  // Parse DEC: supports DMS (±DDMMSS) or decimal degrees
  const parseDec = (s: string, format: "hms" | "deg"): number => {
    if (format === "deg") {
      return parseFloat(s);
    }
    const sign = s[0] === "-" ? -1 : 1;
    return sign * (parseInt(s.slice(1, 3)) + parseInt(s.slice(3, 5)) / 60 + parseInt(s.slice(5, 7)) / 3600);
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
    const close = () => { setCustomRangeTouched(false); setShowPicker(false); };

    if (preset === "tonight") {
      setRange([getTonightRange()]); close();
    } else if (preset === "lastNight") {
      setRange([getLastNightRange()]); close();
    } else if (preset === "nextNight") {
      setRange([getNightRange()]); close();
    } else if (preset === "next7") {
      setRange([{ startDate: now, endDate: addDays(now, 6), key: "selection" }]); close();
    } else if (preset === "next15") {
      setRange([{ startDate: now, endDate: addDays(now, 14), key: "selection" }]); close();
    } else if (preset === "next6months") {
      setRange([{ startDate: now, endDate: addMonths(now, 6), key: "selection" }]); close();
    } else if (preset === "nextYear") {
      setRange([{ startDate: now, endDate: addMonths(now, 12), key: "selection" }]); close();
    } else if (preset === "custom") {
      setCustomRangeTouched(true); setShowPicker(true);
    }
  }, [preset]);

  // Called when user selects dates in the calendar
  const handleRangeChange = (ranges: any) => {
    setRange([ranges.selection]);
  };

  // --- Main plotting function ---
  const renderChart = () => {
    // Clear all field errors
    const errors = { ra: "", dec: "", lat: "", lon: "", horizon: "", general: "" };
    let hasError = false;

    try {

      // --- Comprehensive per-field validation ---
      let correctedDec = dec.trim();

      if (coordFormat === "deg") {
        // Degree format validation
        const raTrimmed = ra.trim();
        if (!raTrimmed) { errors.ra = "RA is required."; hasError = true; }
        else {
          const raVal = parseFloat(raTrimmed);
          if (isNaN(raVal)) { errors.ra = "Must be a number (degrees)."; hasError = true; }
          else if (raVal < 0 || raVal >= 360) { errors.ra = "RA must be between 0 and 360°."; hasError = true; }
        }
        if (!correctedDec) { errors.dec = "DEC is required."; hasError = true; }
        else {
          const decVal = parseFloat(correctedDec);
          if (isNaN(decVal)) { errors.dec = "Must be a number (degrees)."; hasError = true; }
          else if (decVal < -90 || decVal > 90) { errors.dec = "DEC must be between -90 and 90°."; hasError = true; }
        }
      } else {
        // HMS/DMS format validation
        const raTrimmed = ra.trim();
        if (!raTrimmed) { errors.ra = "RA is required."; hasError = true; }
        else if (!/^\d{6}$/.test(raTrimmed)) { errors.ra = "RA must be exactly 6 digits (HHMMSS)."; hasError = true; }
        else {
          const hh = parseInt(raTrimmed.slice(0, 2));
          const mm = parseInt(raTrimmed.slice(2, 4));
          const ss = parseInt(raTrimmed.slice(4, 6));
          if (hh > 23) { errors.ra = `Hours must be 00-23 (got ${hh}).`; hasError = true; }
          else if (mm > 59) { errors.ra = `Minutes must be 00-59 (got ${mm}).`; hasError = true; }
          else if (ss > 59) { errors.ra = `Seconds must be 00-59 (got ${ss}).`; hasError = true; }
        }
        if (!correctedDec) { errors.dec = "DEC is required."; hasError = true; }
        else {
          if (!correctedDec.startsWith("+") && !correctedDec.startsWith("-")) correctedDec = "+" + correctedDec;
          if (!/^[+\-]\d{6}$/.test(correctedDec)) { errors.dec = "DEC must be ±DDMMSS (6 digits with sign)."; hasError = true; }
          else {
            const dd = parseInt(correctedDec.slice(1, 3));
            const mm = parseInt(correctedDec.slice(3, 5));
            const ss = parseInt(correctedDec.slice(5, 7));
            if (dd > 90) { errors.dec = `Degrees must be 00-90 (got ${dd}).`; hasError = true; }
            else if (dd === 90 && (mm > 0 || ss > 0)) { errors.dec = "DEC cannot exceed ±90°00'00\"."; hasError = true; }
            else if (mm > 59) { errors.dec = `Minutes must be 00-59 (got ${mm}).`; hasError = true; }
            else if (ss > 59) { errors.dec = `Seconds must be 00-59 (got ${ss}).`; hasError = true; }
          }
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

      // Custom Horizon validation
      const hzTrimmed = customHorizon.trim();
      if (!hzTrimmed) {
        errors.horizon = "Horizon is required."; hasError = true;
      } else {
        const hzVal = parseFloat(hzTrimmed);
        if (isNaN(hzVal)) { errors.horizon = "Must be a number."; hasError = true; }
        else if (hzVal < 0 || hzVal > 90) { errors.horizon = "Must be between 0° and 90°."; hasError = true; }
      }

      // If any field has errors, update state and stop
      if (hasError) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors(errors); // clear all errors

      const raH = parseRA(ra, coordFormat);
      const decD = parseDec(coordFormat === "deg" ? correctedDec : correctedDec, coordFormat);

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
              showgrid: false,
                            linecolor: "rgba(128,128,128,0.3)",
              tickfont: { family: "Inter, system-ui, sans-serif", size: 11 },
            },
            yaxis: {
              title: { text: "Max Altitude (°)", font: { family: "Inter, system-ui, sans-serif", size: 13 } },
              showgrid: false,
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
      const moonAltRaw: number[] = [];
      const sunAlt: number[] = [];
      const hoverText: string[] = [];
      const moonHoverText: string[] = [];
      const sepArr: number[] = [];
      let minSep = Infinity;
      let peakIdx = 0;
      let bestObsIdx = -1;
      let bestObsScore = -Infinity;

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
        moonAltRaw.push(mH.altitude);

        // Sun
        const sEq = Astronomy.Equator(Astronomy.Body.Sun, t, obs, true, true);
        const sH = Astronomy.Horizon(t, obs, sEq.ra, sEq.dec, "normal");
        sunAlt.push(sH.altitude);

        // Angular separation (target <-> moon)
        const ra1 = (raH * Math.PI) / 12, dec1 = (decD * Math.PI) / 180;
        const ra2 = (mEq.ra * Math.PI) / 12, dec2 = (mEq.dec * Math.PI) / 180;
        const cs = Math.sin(dec1) * Math.sin(dec2) + Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2);
        const sep = (Math.acos(Math.min(Math.max(cs, -1), 1)) * 180) / Math.PI;
        sepArr.push(sep);
        if (sep < minSep) minSep = sep;

        // Track peak index
        if (altT !== null && altT > (targetAlt[peakIdx] ?? -Infinity)) {
          peakIdx = i;
        }

        // Best observation time: maximize (altitude / 90) + (separation / 180) during night (sun < -6)
        if (altT !== null && altT > 0 && sH.altitude < -6) {
          const score = (altT / 90) + (sep / 180);
          if (score > bestObsScore) { bestObsScore = score; bestObsIdx = i; }
        }

        // Hover texts
        const localDT = DateTime.fromJSDate(jsDate).setZone(tz);
        hoverText.push(
          altT !== null
            ? `Time: ${localDT.toFormat("yyyy-LL-dd HH:mm")}<br>Alt: ${altT.toFixed(2)}°<br>Sep: ${sep.toFixed(2)}°`
            : ""
        );
        // Moon hover with 2 decimal places
        moonHoverText.push(
          mH.altitude >= 0
            ? `Time: ${localDT.toFormat("yyyy-LL-dd HH:mm")}<br>Moon Alt: ${mH.altitude.toFixed(2)}°`
            : ""
        );
      });

      // Compute best observation time
      if (bestObsIdx >= 0) {
        const bestDT = DateTime.fromJSDate(allTimes[bestObsIdx]).setZone(tz);
        setBestObsTime({
          time: bestDT.toFormat("yyyy-LL-dd HH:mm"),
          alt: (targetAlt[bestObsIdx] as number).toFixed(2),
          sep: sepArr[bestObsIdx].toFixed(2),
        });
      } else {
        setBestObsTime(null);
      }

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

      // Compute visibility hours: only when target is above custom horizon AND during astronomical night (sun < -18°)
      const hz = Number(customHorizon);
      let visCount = 0;
      for (let i = 0; i < targetAlt.length; i++) {
        if (targetAlt[i] !== null && targetAlt[i]! >= hz && sunAlt[i] <= -18) visCount++;
      }
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
            hoverinfo: "text",
            hovertext: moonHoverText,
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
            name: "Peak Altitude",
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
                name: "Now",
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
            showgrid: false,
                        tickfont: { family: "Inter, system-ui, sans-serif", size: 12, color: "#a0cfdf" },
            showline: false,
          },
          yaxis: {
            title: { text: "Altitude (°)", font: { family: "Inter, system-ui, sans-serif", size: 14, color: "#00d2ff" } },
            showgrid: false,
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

  // Shared styles
  const panelBg = theme === "dark" ? "rgba(11, 13, 23, 0.85)" : "rgba(255, 255, 255, 0.85)";
  const cardBg = theme === "dark" ? "rgba(19, 22, 41, 0.9)" : "rgba(245, 247, 255, 0.9)";
  const borderCol = theme === "dark" ? "rgba(79, 193, 233, 0.15)" : "rgba(100, 120, 160, 0.15)";
  const accentColor = theme === "dark" ? "#4FC1E9" : "#2980B9";
  const textMuted = theme === "dark" ? "#8899aa" : "#6b7280";
  const inputBg = theme === "dark" ? "rgba(19, 22, 41, 0.95)" : "#f8f9fc";
  const inputBorder = theme === "dark" ? "rgba(79, 193, 233, 0.25)" : "rgba(100, 120, 160, 0.25)";

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: isMobile ? "auto" : "hidden",
        display: "flex",
        flexDirection: "column",
        padding: isMobile ? "6px" : "8px",
        boxSizing: "border-box",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        transition: "all 0.3s",
        color: theme === "dark" ? "#e0e8f0" : "#1a1a2e",
      }}
    >
      {/* Background canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: -1, pointerEvents: "none", userSelect: "none" }} />

      {/* Theme Toggle — fixed overlay, takes no layout space */}
      <div style={{ position: "fixed", top: "10px", right: "12px", zIndex: 100 }}>
        <ThemeSwitchWrapper>
          <label className="theme-switch">
            <input
              type="checkbox"
              className="theme-switch__checkbox"
              checked={theme === "dark"}
              onChange={toggleTheme}
            />
            <div className="theme-switch__container">
              <div className="theme-switch__clouds" />
              <div className="theme-switch__stars-container">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545ZM136 36.3545C137.111 36.2995 138.055 35.8503 138.831 35.0069C139.607 34.1635 139.996 33.1642 139.996 32C139.996 33.1642 140.384 34.1635 141.16 35.0069C141.936 35.8503 142.88 36.2903 144 36.3545C143.268 36.3911 142.598 36.602 141.98 37.0053C141.372 37.3995 140.886 37.9312 140.525 38.5913C140.172 39.2513 139.996 39.9572 139.996 40.7273C139.996 39.563 139.607 38.5546 138.831 37.7112C138.055 36.8587 137.111 36.4095 136 36.3545ZM101.831 49.0069C101.055 49.8503 100.111 50.2995 99 50.3545C100.111 50.4095 101.055 50.8587 101.831 51.7112C102.607 52.5546 102.996 53.563 102.996 54.7273C102.996 53.9572 103.172 53.2513 103.525 52.5913C103.886 51.9312 104.372 51.3995 104.98 51.0053C105.598 50.602 106.268 50.3911 107 50.3545C105.88 50.2903 104.936 49.8503 104.16 49.0069C103.384 48.1635 102.996 47.1642 102.996 46C102.996 47.1642 102.607 48.1635 101.831 49.0069Z" fill="currentColor" />
                </svg>
              </div>
              <div className="theme-switch__circle-container">
                <div className="theme-switch__sun-moon-container">
                  <div className="theme-switch__moon">
                    <div className="theme-switch__spot" />
                    <div className="theme-switch__spot" />
                    <div className="theme-switch__spot" />
                  </div>
                </div>
              </div>
            </div>
          </label>
        </ThemeSwitchWrapper>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: isMobile ? "column" : "row", gap: "10px", overflow: isMobile ? "visible" : "hidden" }}>
        {/* LEFT PANEL */}
        <div style={{
          width: isMobile ? "100%" : "300px",
          minWidth: isMobile ? "100%" : "300px",
          overflowY: "auto", overflowX: "hidden",
          paddingRight: isMobile ? "0" : "6px",
          flexShrink: 0,
          maxHeight: isMobile ? "none" : "100%",
        }}>

          {/* SIMBAD Search */}
          <div style={{ marginBottom: "10px", background: cardBg, borderRadius: "10px", padding: "10px", border: `1px solid ${borderCol}` }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "4px", color: accentColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
               SIMBAD Target Search
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                value={simbadQuery}
                placeholder="e.g. M31, NGC 7000..."
                onChange={(e) => setSimbadQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSimbadSearch()}
                style={{
                  flex: 1, padding: "8px 10px", fontSize: "13px", borderRadius: "8px",
                  border: `1px solid ${inputBorder}`, background: inputBg,
                  color: theme === "dark" ? "#e0e8f0" : "#1a1a2e", outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
              <button
                onClick={handleSimbadSearch}
                disabled={simbadLoading}
                style={{
                  padding: "8px 14px", borderRadius: "8px", border: "none", cursor: "pointer",
                  background: `linear-gradient(135deg, ${accentColor}, #7C5CFC)`, color: "#fff",
                  fontSize: "12px", fontWeight: 700, transition: "opacity 0.2s",
                  opacity: simbadLoading ? 0.6 : 1,
                }}
              >
                {simbadLoading ? "..." : "Search"}
              </button>
            </div>
            {simbadResults.length > 0 && (
              <div style={{ marginTop: "6px", maxHeight: "120px", overflowY: "auto", borderRadius: "6px", border: `1px solid ${borderCol}`, background: inputBg }}>
                {simbadResults.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => handleSimbadSelect(r)}
                    style={{
                      padding: "6px 10px", cursor: "pointer", fontSize: "12px",
                      borderBottom: i < simbadResults.length - 1 ? `1px solid ${borderCol}` : "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = theme === "dark" ? "rgba(79,193,233,0.1)" : "rgba(41,128,185,0.08)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <strong>{r.name}</strong>
                    <span style={{ color: textMuted, marginLeft: "8px" }}>
                      RA: {r.ra?.toFixed(3)}° DEC: {r.dec?.toFixed(3)}°
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
            <button onClick={handleUseCurrentLocation} style={{
              flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${borderCol}`,
              background: cardBg, color: theme === "dark" ? "#e0e8f0" : "#1a1a2e",
              fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
            }}>My Location</button>
            <button onClick={handleRandomTarget} style={{
              flex: 1, padding: "8px", borderRadius: "8px", border: `1px solid ${borderCol}`,
              background: cardBg, color: theme === "dark" ? "#e0e8f0" : "#1a1a2e",
              fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
            }}>Random Target</button>
          </div>
          {targetName && (
            <p style={{ textAlign: "center", fontSize: "12px", marginBottom: "8px", color: accentColor, fontWeight: 600 }}>
              🎯 {targetName}
            </p>
          )}

          {/* Coordinate Format Toggle */}
          <div style={{ marginBottom: "8px", display: "flex", gap: "4px", background: cardBg, borderRadius: "8px", padding: "3px", border: `1px solid ${borderCol}` }}>
            {(["hms", "deg"] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => setCoordFormat(fmt)}
                style={{
                  flex: 1, padding: "5px", borderRadius: "6px", border: "none", cursor: "pointer",
                  fontSize: "11px", fontWeight: 700, transition: "all 0.2s",
                  background: coordFormat === fmt ? accentColor : "transparent",
                  color: coordFormat === fmt ? "#fff" : textMuted,
                }}
              >
                {fmt === "hms" ? "HMS / DMS" : "Degrees"}
              </button>
            ))}
          </div>

          {/* Coordinate Inputs */}
          {[
            [coordFormat === "hms" ? "RA (HHMMSS)" : "RA (degrees)", ra, setRa, coordFormat === "hms" ? "e.g. 053542" : "e.g. 83.822", "ra"],
            [coordFormat === "hms" ? "DEC (±DDMMSS)" : "DEC (degrees)", dec, setDec, coordFormat === "hms" ? "e.g. +223358" : "e.g. -5.39", "dec"],
            ["Latitude (°)", latitude, setLatitude, "e.g. 50.45", "lat"],
            ["Longitude (°)", longitude, setLongitude, "e.g. -104.62", "lon"],
          ].map(([label, value, setter, placeholder, errKey]) => {
            const err = (fieldErrors as any)[errKey] || "";
            return (
              <div key={label as string} style={{ marginBottom: "6px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "3px", color: textMuted }}>
                  {label as string}
                </label>
                <input
                  type="text"
                  value={value as string}
                  placeholder={placeholder as string}
                  onChange={(e) => { (setter as any)(e.target.value); if (err) setFieldErrors(prev => ({ ...prev, [errKey as string]: "" })); }}
                  style={{
                    width: "100%", padding: "8px 10px", fontSize: "13px", borderRadius: "8px",
                    border: `1px solid ${err ? "#ef4444" : inputBorder}`, background: inputBg,
                    color: theme === "dark" ? "#e0e8f0" : "#1a1a2e", outline: "none",
                    boxSizing: "border-box", transition: "border-color 0.2s",
                  }}
                />
                {err && <p style={{ color: "#ef4444", fontSize: "11px", marginTop: "2px" }}>⚠ {err}</p>}
              </div>
            );
          })}

          {/* Time Range Preset */}
          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "3px", color: textMuted }}>Time Range</label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as any)}
              style={{
                width: "100%", padding: "8px 10px", fontSize: "13px", borderRadius: "8px",
                border: `1px solid ${inputBorder}`, background: inputBg,
                color: theme === "dark" ? "#e0e8f0" : "#1a1a2e", outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="tonight">🌃 Tonight</option>
              <option value="lastNight">◀ Last Night</option>
              <option value="nextNight">▶ Next Night</option>
              <option value="next7">📅 Next 7 Nights</option>
              <option value="next15">📅 Next 15 Nights</option>
              <option value="next6months">📆 Next 6 Months</option>
              <option value="nextYear">📆 Next Year</option>
              <option value="custom">✏️ Custom Range</option>
            </select>
          </div>

          {/* Custom Date Picker */}
          {preset === "custom" && (
            <div style={{ marginBottom: "8px", background: cardBg, borderRadius: "8px", padding: "8px", border: `1px solid ${borderCol}` }}>
              <button
                onClick={() => setShowPicker(!showPicker)}
                style={{
                  background: "none", border: "none", color: accentColor, cursor: "pointer",
                  fontSize: "12px", fontWeight: 600, textDecoration: "underline",
                }}
              >
                {DateTime.fromJSDate(range[0].startDate).toISODate()} – {DateTime.fromJSDate(range[0].endDate).toISODate()}
              </button>
              {showPicker && (
                <>
                  <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 40 }} onClick={() => setShowPicker(false)} />
                  <div style={{
                    position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 50,
                    background: theme === "dark" ? "#131629" : "#fff", borderRadius: "12px", padding: "16px",
                    boxShadow: "0 25px 60px rgba(0,0,0,0.5)", border: `1px solid ${borderCol}`,
                    maxHeight: "90vh", overflow: "auto",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ color: accentColor, fontWeight: 600, fontSize: "14px" }}>Select Date Range</span>
                      <button onClick={() => setShowPicker(false)} style={{
                        background: "none", border: `1px solid ${borderCol}`, color: theme === "dark" ? "#e0e8f0" : "#333",
                        borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "12px",
                      }}>✕ Close</button>
                    </div>
                    <DateRangePicker ranges={range} onChange={handleRangeChange} moveRangeOnFirstSelection={false}
                      editableDateInputs={true} months={2} direction="vertical" rangeColors={[accentColor]} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Custom Horizon */}
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "3px", color: textMuted }}>Custom Horizon (°)</label>
            <input
              type="number"
              min={0}
              max={90}
              value={customHorizon}
              onChange={(e) => {
                const val = e.target.value;
                setCustomHorizon(val);
                if (val === "") {
                  setFieldErrors(prev => ({ ...prev, horizon: "Horizon is required." }));
                } else {
                  const num = Number(val);
                  if (isNaN(num)) setFieldErrors(prev => ({ ...prev, horizon: "Must be a number." }));
                  else if (num < 0 || num > 90) setFieldErrors(prev => ({ ...prev, horizon: "Must be between 0° and 90°." }));
                  else setFieldErrors(prev => ({ ...prev, horizon: "" }));
                }
              }}
              style={{
                width: "100%", padding: "8px 10px", fontSize: "13px", borderRadius: "8px",
                border: `1px solid ${fieldErrors.horizon ? "#ef4444" : inputBorder}`, background: inputBg,
                color: theme === "dark" ? "#e0e8f0" : "#1a1a2e", outline: "none",
                boxSizing: "border-box", transition: "border-color 0.2s",
              }}
            />
            {fieldErrors.horizon && <p style={{ color: "#ef4444", fontSize: "11px", marginTop: "2px" }}>⚠ {fieldErrors.horizon}</p>}
          </div>

          {/* Generate + Clear Buttons */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <button
              onClick={renderChart}
              style={{
                flex: 1, padding: "10px", borderRadius: "10px", border: "none", cursor: "pointer",
                background: `linear-gradient(135deg, ${accentColor}, #7C5CFC)`, color: "#fff",
                fontSize: "13px", fontWeight: 700, transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(79, 193, 233, 0.3)",
              }}
            >
              Generate 
            </button>
            <button
              onClick={() => {
                setRa(""); setDec(""); setLatitude(""); setLongitude("");
                setCustomHorizon("30"); setPreset("tonight");
                setPlotData({ data: [], layout: {} }); setChartInfo(null); setTargetName("");
                setBestObsTime(null); setSimbadQuery(""); setSimbadResults([]);
                setFieldErrors({ ra: "", dec: "", lat: "", lon: "", horizon: "", general: "" });
                try { Object.keys(localStorage).filter(k => k.startsWith("ata_")).forEach(k => localStorage.removeItem(k)); } catch { }
              }}
              style={{
                padding: "10px 16px", borderRadius: "10px", cursor: "pointer",
                background: theme === "dark" ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${theme === "dark" ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.25)"}`,
                color: "#ef4444", fontSize: "13px", fontWeight: 600, transition: "all 0.2s",
              }}
              title="Clear all fields and reset"
            >
              🗑
            </button>
          </div>

          {/* Moon Phase Widget */}
          {(() => {
            const moonPhaseRef = React.useRef<HTMLCanvasElement>(null);
            const now = Astronomy.MakeTime(new Date());
            const phaseAngle = Astronomy.MoonPhase(now);
            const illum = Astronomy.Illumination(Astronomy.Body.Moon, now);
            const phaseFraction = illum.phase_fraction;
            const phasePct = (phaseFraction * 100).toFixed(1);

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
              const size = 100; canvas.width = size; canvas.height = size;
              const cx = size / 2, cy = size / 2, r = 40;
              ctx.clearRect(0, 0, size, size);
              ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI);
              ctx.fillStyle = theme === "dark" ? "rgba(200,200,180,0.06)" : "rgba(0,0,0,0.04)"; ctx.fill();
              ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
              const darkGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
              darkGrad.addColorStop(0, theme === "dark" ? "#333" : "#bbb");
              darkGrad.addColorStop(1, theme === "dark" ? "#1a1a1a" : "#999");
              ctx.fillStyle = darkGrad; ctx.fill();
              const litGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
              litGrad.addColorStop(0, "#fff"); litGrad.addColorStop(0.3, "#f0ede0");
              litGrad.addColorStop(0.7, "#d8d4c4"); litGrad.addColorStop(1, "#c0bba8");
              const angle = phaseAngle; const cosA = Math.cos((angle * Math.PI) / 180); const absCos = Math.abs(cosA);
              for (let dy = -r; dy <= r; dy += 0.5) {
                const xEdge = Math.sqrt(r * r - dy * dy); const xTerm = absCos * xEdge;
                let leftX: number, rightX: number;
                if (angle <= 180) { if (cosA >= 0) { leftX = xTerm; rightX = xEdge; } else { leftX = -xTerm; rightX = xEdge; } }
                else { if (cosA <= 0) { leftX = -xEdge; rightX = xTerm; } else { leftX = -xEdge; rightX = -xTerm; } }
                const w = rightX - leftX;
                if (w > 0) { ctx.fillStyle = litGrad; ctx.fillRect(cx + leftX, cy + dy, w, 0.8); }
              }
              [{ x: 0.15, y: -0.2, s: 0.12, a: 0.15 }, { x: -0.25, y: 0.1, s: 0.18, a: 0.12 },
               { x: 0.3, y: 0.25, s: 0.1, a: 0.1 }, { x: -0.1, y: -0.35, s: 0.08, a: 0.13 },
               { x: 0.05, y: 0.35, s: 0.14, a: 0.1 }].forEach(c => {
                ctx.beginPath(); ctx.arc(cx + c.x * r, cy + c.y * r, c.s * r, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(100,100,90,${c.a})`; ctx.fill();
              });
              ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
              ctx.strokeStyle = theme === "dark" ? "rgba(200,200,180,0.2)" : "rgba(0,0,0,0.1)";
              ctx.lineWidth = 1.5; ctx.stroke();
            }, [phaseAngle, theme]);

            return (
              <div style={{ marginBottom: "10px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <canvas ref={moonPhaseRef} width={100} height={100} style={{ imageRendering: "auto" }} />
                <p style={{ fontSize: "12px", fontWeight: 600, marginTop: "4px", color: accentColor }}>{phaseName}</p>
                <p style={{ fontSize: "11px", color: textMuted }}>{phasePct}% illuminated</p>
              </div>
            );
          })()}

          {/* Credits */}
          <div style={{
            position: "fixed", bottom: "10px", left: 0,
            width: isMobile ? "100%" : "300px",
            textAlign: "center", fontSize: "11px", lineHeight: "1.6", zIndex: 10,
          }}>
            <p style={{ color: textMuted, marginBottom: "1px", fontSize: "10px", letterSpacing: "1px"  }}>Developed by</p>
            <a href="https://github.com/Mahir0759e" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: accentColor, textDecoration: "none", display: "block" }}>Mahir Trivedi</a>
            <p style={{ color: textMuted, fontSize: "10px", margin: "2px 0 1px" }}>Co-Developed by</p>
            <a href="https://github.com/SahilPurabiya" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: accentColor, textDecoration: "none", display: "block" }}>Sahil Purabiya</a>
          </div>


          {/* Errors & Loading */}
          {fieldErrors.general && <p style={{ color: "#ef4444", fontSize: "11px", marginBottom: "6px" }}>⚠ {fieldErrors.general}</p>}
          {loading && <p style={{ color: textMuted, fontSize: "11px" }}>Processing image…</p>}
        </div>

        {/* RIGHT PANEL: Plot + HUD Info */}
        <div style={{ flex: 1, minHeight: isMobile ? "400px" : 0, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", paddingTop: isMobile ? "0" : "44px" }}>
          {/* Target name banner */}
          {targetName && plotData.data.length > 0 && (
            <div style={{ textAlign: "center", padding: "4px 0", flexShrink: 0 }}>
              <span style={{
                fontSize: isMobile ? "0.9rem" : "1rem", fontWeight: 700,
                color: theme === "dark" ? "#4FC1E9" : "#2980B9", letterSpacing: "0.5px",
              }}>
                🎯 {targetName}
              </span>
            </div>
          )}
          {/* Chart area */}
          <div ref={plotContainerRef} style={{ flex: 1, minHeight: isMobile ? "350px" : 0, position: "relative" }}>
            {plotData.data.length > 0 ? (
              <Plot
                data={plotData.data}
                layout={{
                  ...plotData.layout,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  font: { color: theme === "dark" ? "#e0e8f0" : "#2d2d2d", family: "'Inter', system-ui, sans-serif" },
                  xaxis: { ...plotData.layout.xaxis, showgrid: false, color: theme === "dark" ? "#8899aa" : "#555" },
                  yaxis: { ...plotData.layout.yaxis, showgrid: false, color: theme === "dark" ? "#8899aa" : "#555" },
                  hoverlabel: {
                    ...plotData.layout.hoverlabel,
                    bgcolor: theme === "dark" ? "rgba(11,13,23,0.95)" : "rgba(255,255,255,0.95)",
                    bordercolor: theme === "dark" ? "rgba(79,193,233,0.4)" : "rgba(100,100,100,0.3)",
                    font: { family: "'Inter', system-ui, sans-serif", size: 12, color: theme === "dark" ? "#e0e8f0" : "#333" },
                  },
                  annotations: (plotData.layout.annotations || []).map((ann: any) => ({
                    ...ann,
                    font: { ...(ann.font || {}), color: ann.font?.color || (theme === "dark" ? "#e0e8f0" : "#333") },
                    bgcolor: ann.bgcolor || (theme === "dark" ? "rgba(11,13,23,0.85)" : "rgba(255,255,255,0.9)"),
                    bordercolor: ann.bordercolor || (theme === "dark" ? "rgba(79,193,233,0.3)" : "rgba(100,100,100,0.3)"),
                  })),
                  legend: { ...plotData.layout.legend, font: { family: "'Inter', system-ui, sans-serif", size: 12, color: theme === "dark" ? "#8899aa" : "#444" } },
                  autosize: true,
                }}
                config={{
                  displayModeBar: true,
                  modeBarButtonsToRemove: ["lasso2d", "select2d"],
                  displaylogo: false,
                  responsive: true,
                  toImageButtonOptions: { format: "png", filename: `ATA_RA${ra.trim()}_DEC${dec.trim()}` },
                }}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", height: "100%",
                color: textMuted, fontSize: "14px", fontStyle: "italic",
              }}>
                <span>Enter coordinates and generate a chart ✨</span>
              </div>
            )}
          </div>

          {/* HUD Info Bar - card style */}
          {chartInfo && (
            <div style={{
              flexShrink: 0, display: "flex", flexWrap: "wrap", gap: "8px",
              justifyContent: "center", alignItems: "stretch",
              padding: "8px", marginTop: "4px",
            }}>
              {[
                { icon: "🌙", label: "Moon", value: `${chartInfo.moonPct}%` },
                { icon: "⏱", label: "Visibility", value: `${chartInfo.visibilityHours}h` },
                { icon: "🌅", label: "Dusk", value: chartInfo.duskLocal.split(" ").pop() || chartInfo.duskLocal },
                { icon: "🌄", label: "Dawn", value: chartInfo.dawnLocal.split(" ").pop() || chartInfo.dawnLocal },
                { icon: "🌍", label: "TZ", value: chartInfo.tzAbbrev },
              ].map((item, i) => (
                <div key={i} style={{
                  background: cardBg, borderRadius: "8px", padding: "6px 12px",
                  border: `1px solid ${borderCol}`, textAlign: "center", minWidth: "70px",
                  backdropFilter: "blur(10px)",
                }}>
                  <div style={{ fontSize: "14px", marginBottom: "2px" }}>{item.icon}</div>
                  <div style={{ fontSize: "10px", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>{item.label}</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: theme === "dark" ? "#e0e8f0" : "#1a1a2e" }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
