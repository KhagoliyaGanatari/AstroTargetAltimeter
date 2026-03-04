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
  transition: all ease 0.1s;
  box-shadow: 0px 5px 0px 0px #a29bfe;
  cursor: pointer;

  &:hover {
    background-color: #7d6dff;
  }

  &:active {
    transform: translateY(5px);
    box-shadow: 0px 0px 0px 0px #a29bfe;
  }
`;

//Use my current location button css

const StyledLocationButton = styled.button`
  width: 165px;
  height: 62px;
  cursor: pointer;
  color: #fff;
  font-size: 17px;
  border-radius: 1rem;
  border: none;
  position: relative;
  background: #100720;
  transition: 0.1s;

  &::after {
    content: "";
    width: 100%;
    height: 100%;
    background-image: radial-gradient(
      circle farthest-corner at 10% 20%,
      rgba(255, 94, 247, 1) 17.8%,
      rgba(2, 245, 255, 1) 100.2%
    );
    filter: blur(15px);
    z-index: -1;
    position: absolute;
    left: 0;
    top: 0;
    border-radius: 1rem;
  }

  &:active {
    transform: scale(0.9) rotate(3deg);
    background: radial-gradient(
      circle farthest-corner at 10% 20%,
      rgba(255, 94, 247, 1) 17.8%,
      rgba(2, 245, 255, 1) 100.2%
    );
    transition: 0.5s;
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

  // --- State hooks ---
  const canvasRef = React.useRef(null);
  const [ra, setRa] = useState("");
  const [dec, setDec] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // Define the preset options
  type PresetOption = "nextNight" | "next7" | "next15" | "custom";

  // Default preset
  const [preset, setPreset] = useState<PresetOption>("nextNight");

  // Set initial range based on default preset
  const [range, setRange] = useState(() => [getNightRange()]);

  const [showPicker, setShowPicker] = useState(false);
  const [customRangeTouched, setCustomRangeTouched] = useState(false);

  const [customHorizon, setCustomHorizon] = useState("30");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [plotData, setPlotData] = useState<{ data: any[]; layout: any }>({
    data: [],
    layout: {},
  });

  // Theme state with system auto-detection
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "dark";
  });

  useEffect(() => {
    const listener = (e: MediaQueryListEvent) =>
      setTheme(e.matches ? "dark" : "light");
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

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
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(5));
        setLongitude(pos.coords.longitude.toFixed(5));
      },
      () => setError("Unable to retrieve location."),
      { enableHighAccuracy: true }
    );
  };

  // Update range when preset changes:
  useEffect(() => {
    const now = new Date();

    if (preset === "nextNight") {
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
    setError("");

    // Dec sign correction
    let correctedDec = dec.trim();
    if (!correctedDec.startsWith("+") && !correctedDec.startsWith("-")) {
      correctedDec = "+" + correctedDec;
    }

    if (!/^\d{6}$/.test(ra)) {
      setError("RA must be HHMMSS.");
      return;
    }
    if (!/^[+\-]\d{6}$/.test(correctedDec)) {
      setError("DEC must be ±DDMMSS.");
      return;
    }
    if (!latitude || !longitude) {
      setError("Latitude & Longitude required.");
      return;
    }

    const raH = parseRA(ra);

    const decD = parseDec(correctedDec);

    const latN = parseFloat(latitude),
      lonN = parseFloat(longitude);
    const obs = new Astronomy.Observer(latN, lonN, 0);

    // Timezone & date-range bounds
    const tz = tzlookup(latN, lonN);
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
            line: { shape: "spline" },
          },
        ],
        layout: {
          title: `Daily Max Altitude from ${DateTime.fromJSDate(startDateObj)
            .setZone(tz)
            .toISODate()} to ${DateTime.fromJSDate(endDateObj)
            .setZone(tz)
            .toISODate()}`,
          xaxis: {
            title: "Date",
            type: "date",
            tickformat: "%Y-%m-%d",
          },
          yaxis: { title: "Max Altitude (°)" },
          hovermode: "x unified",
          template: "plotly_white",
          height: 600,
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
        },
        {
          x: allTimes,
          y: moonAlt,
          mode: "lines",
          name: "Moon Altitude",
          line: { dash: "dash" },
        },
        {
          x: [allTimes[0], allTimes[allTimes.length - 1]],
          y: [0, 0],
          mode: "lines",
          name: "Horizon 0°",
          line: { dash: "dash" },
        },
        {
          x: [allTimes[0], allTimes[allTimes.length - 1]],
          y: [hz, hz],
          mode: "lines",
          name: `Horizon ${hz}°`,
          line: { dash: "dot" },
        },
        {
          x: [peakTime],
          y: [peakAlt],
          mode: "markers",
          name: "★ Peak Altitude",
          marker: { symbol: "star", size: 12 },
        },
      ],
      layout: {
        title: `Target vs Moon: ${DateTime.fromJSDate(startDateObj)
          .setZone(tz)
          .toFormat("yyyy-LL-dd HH:mm")} → ${DateTime.fromJSDate(endDateObj)
          .setZone(tz)
          .toFormat("yyyy-LL-dd HH:mm")}`,
        shapes: [
          astroDuskDate && {
            type: "line",
            x0: astroDuskDate,
            x1: astroDuskDate,
            yref: "paper",
            y0: 0,
            y1: 1,
            line: { color: "orange", dash: "dot", width: 2 },
          },
          astroDawnDate && {
            type: "line",
            x0: astroDawnDate,
            x1: astroDawnDate,
            yref: "paper",
            y0: 0,
            y1: 1,
            line: { color: "steelblue", dash: "dash", width: 2 },
          },
        ],
        annotations: [
          {
            x: peakTime,
            y: peakAlt,
            text: `Max Alt: ${peakAlt.toFixed(2)}°`,
            showarrow: true,
            arrowhead: 1,
            ax: 0,
            ay: -40,
          },
          {
            xref: "paper",
            yref: "paper",
            x: 0.02,
            y: 0.98,
            text:
              `Moon Phase: ${moonPct.toFixed(1)}%<br>` +
              `Visibility: ${visibilityHours.toFixed(2)} h<br>` +
              `Astro Dusk: ${duskLocal}<br>` +
              `Astro Dawn: ${dawnLocal}`,
            showarrow: false,
            font: { size: 12 },
            bgcolor: "rgba(255,255,255,0.8)",
            bordercolor: "#888",
            borderwidth: 1,
            xanchor: "left",
            yanchor: "top",
          },
        ],
        xaxis: {
          title: `Local Time [${tz}]`,
          type: "date",
          tickformat: "%Y-%m-%d %H:%M",
        },
        yaxis: { title: "Altitude (°)" },
        hovermode: "x unified",
        template: "plotly_white",
        height: 600,
      },
    });
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
      className={`h-screen w-screen font-sans p-2 overflow-hidden transition-all duration-300 ${
        theme === "dark"
          ? "bg-transparent text-white"
          : "bg-transparent text-black"
      }`}
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
      <div className="flex justify-end items-center mb-2 pr-2">
        <button
          onClick={toggleTheme}
          className={`relative inline-flex items-center justify-center w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${
            theme === "dark" ? "bg-cyan-600" : "bg-yellow-400"
          }`}
          title="Toggle Theme"
        >
          <span
            className={`absolute left-1 top-1 w-6 h-6 rounded-full text-sm flex items-center justify-center transition-transform duration-300 ${
              theme === "dark"
                ? "translate-x-6 bg-white text-yellow-500"
                : "translate-x-0 bg-white text-indigo-700"
            }`}
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </span>
        </button>
      </div>

      {/* Grid Layout: Left = Input Panel, Right = Plot */}
      <div className="h-full w-full grid grid-cols-[300px_1fr] gap-4">
        {/* LEFT PANEL: Options */}
        <div className="overflow-y-auto pr-2">
          <h1 className="text-2xl font-bold mb-4 text-cyan-400">🔭 Options</h1>

          {/* OCR Upload */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">
              Upload Screenshot with RA/DEC:
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="file:bg-cyan-600 file:text-white file:rounded-md file:px-3 file:py-1 file:border-0 file:cursor-pointer hover:file:bg-cyan-500"
            />
          </div>

          {/* Location */}
          <div className="mb-4">
            <StyledLocationButton onClick={handleUseCurrentLocation}>
              Use My Location
            </StyledLocationButton>
          </div>

          {/* Inputs */}
          {[
            ["RA (HHMMSS)", ra, setRa],
            ["DEC (±DDMMSS)", dec, setDec],
            ["Latitude", latitude, setLatitude],
            ["Longitude", longitude, setLongitude],
          ].map(([label, value, setter]) => (
            <div className="mb-3" key={label}>
              <label className="block text-sm mb-1">{label}:</label>
              <input
                type="text"
                value={value}
                onChange={(e) => setter(e.target.value)}
                className={`w-full px-3 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-cyan-400
        ${
          theme === "dark"
            ? "bg-gray-800 border-cyan-600 text-white"
            : "bg-gray-100 border-gray-400 text-black"
        }
      `}
              />
            </div>
          ))}

          {/* Date Preset */}
          <div className="mb-3">
            <label className="block text-sm mb-1">Select Time Range:</label>
            <select
              className={`w-full px-3 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-cyan-400
      ${
        theme === "dark"
          ? "bg-gray-800 border-indigo-500 text-white"
          : "bg-gray-100 border-gray-400 text-black"
      }
    `}
              value={preset}
              onChange={(e) => setPreset(e.target.value as any)}
            >
              <option value="last24">Next Night</option>
              <option value="next7">Next 7 Nights</option>
              <option value="next365">Next 15 Nights</option>
              <option value="custom">Custom Night</option>
            </select>
          </div>

          {/* Custom Date Picker */}
          {preset === "custom" && (
            <div className="mb-4 bg-gray-800 p-2 rounded-md">
              <button
                className="mb-2 text-cyan-400 hover:text-cyan-300 underline text-sm"
                onClick={() => setShowPicker(!showPicker)}
              >
                {DateTime.fromJSDate(range[0].startDate).toISODate()} –{" "}
                {DateTime.fromJSDate(range[0].endDate).toISODate()}
              </button>
              {showPicker && (
                <div className="relative z-20">
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
              )}
            </div>
          )}

          {/* Custom Horizon */}
          <div className="mb-4">
            <label className="block text-sm mb-1">Custom Horizon (°):</label>
            <input
              type="text"
              value={customHorizon}
              onChange={(e) => setCustomHorizon(e.target.value)}
              className={`w-full px-3 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-cyan-400
    ${
      theme === "dark"
        ? "bg-gray-800 border-cyan-600 text-white"
        : "bg-gray-100 border-gray-400 text-black"
    }
  `}
            />
          </div>

          {/* Generate Chart */}
          <div className="mb-4 text-center">
            <StyledGenerateButton onClick={renderChart}>
              Generate Chart 🚀
            </StyledGenerateButton>
          </div>

          {/* Errors & Loading */}
          {error && <p className="text-red-500 text-xs">{error}</p>}
          {loading && (
            <p className="text-gray-400 text-xs">Processing image…</p>
          )}
        </div>

        {/* RIGHT PANEL: Plot */}
        <div className="overflow-hidden">
          {plotData.data.length > 0 ? (
            <Plot
              data={plotData.data}
              layout={{
                ...plotData.layout,
                template: theme === "dark" ? "plotly_dark" : "plotly_white",
              }}
              useResizeHandler
              style={{ width: "100%", height: "100%" }}
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">
              No chart generated yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
