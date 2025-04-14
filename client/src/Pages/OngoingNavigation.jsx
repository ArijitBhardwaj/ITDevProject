// src/Pages/OngoingNavigation.jsx
import React, { useEffect, useState, useRef } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import MapView from "./MapView";

/** Basic Euclidean distance */
function distanceBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Split route into ~15m subsections */
function chunkRoute(nodeSequence, instructions) {
  if (!nodeSequence || nodeSequence.length < 2) {
    return [{ nodes: nodeSequence || [], instructions: instructions || [] }];
  }

  let chunks = [];
  let currentNodes = [nodeSequence[0]];
  let currentInstructions = [];
  let distSoFar = 0;

  for (let i = 0; i < nodeSequence.length - 1; i++) {
    const a = nodeSequence[i];
    const b = nodeSequence[i + 1];
    const segDist = distanceBetween(a, b);

    currentNodes.push(b);
    distSoFar += segDist;
    // instructions[i+1] typically means traveling from node i to i+1
    if (i + 1 < instructions.length) {
      currentInstructions.push(instructions[i + 1]);
    }

    if (distSoFar >= 15) {
      chunks.push({
        nodes: [...currentNodes],
        instructions: [...currentInstructions],
      });
      distSoFar = 0;
      currentNodes = [b];
      currentInstructions = [];
    }
  }

  // leftover
  if (currentNodes.length > 1 || chunks.length === 0) {
    let lastMsg = instructions[instructions.length - 1];
    if (lastMsg && lastMsg.startsWith("You have arrived")) {
      currentInstructions.push(lastMsg);
    }
    chunks.push({ nodes: currentNodes, instructions: currentInstructions });
  }

  return chunks;
}

export default function OngoingNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { instructions, nodeSequence, destination } = location.state || {};

  const [subsections, setSubsections] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // -- Pedestrian Dead Reckoning (Naive) --
  const [userX, setUserX] = useState(0);
  const [userY, setUserY] = useState(0);
  const [userHeading, setUserHeading] = useState(0);

  useEffect(() => {
    if (!nodeSequence || nodeSequence.length === 0) {
      // no route => back
      navigate("/navigationpage");
      return;
    }
    const splitted = chunkRoute(nodeSequence, instructions);
    setSubsections(splitted);
    setCurrentIndex(0);
  }, [nodeSequence, instructions, navigate]);

  // Setup naive PDR: device orientation & fake step intervals
  useEffect(() => {
    // If no route is loaded yet, skip
    if (!subsections || subsections.length === 0) return;

    // Start user at first node of the first chunk
    const first = subsections[0].nodes?.[0];
    if (first) {
      setUserX(first.x);
      setUserY(first.y);
    }

    function handleOrientation(e) {
      // e.alpha => 0 is pointing north in some browsers, might need offset
      setUserHeading(e.alpha || 0);
    }
    window.addEventListener("deviceorientation", handleOrientation);

    // For demonstration: simulate a step every 4s
    // Real step detection might come from DeviceMotionEvent or a pedometer plugin
    const stepInterval = setInterval(() => {
      const stepDist = 0.75; // meters per step
      const rad = (userHeading * Math.PI) / 180;
      setUserX((prev) => prev + stepDist * Math.cos(rad));
      setUserY((prev) => prev + stepDist * Math.sin(rad));
    }, 4000);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      clearInterval(stepInterval);
    };
  }, [subsections, userHeading]);

  if (!subsections || subsections.length === 0) {
    return (
      <Box sx={{ minHeight: "100vh", p: 2 }}>
        <Typography>Loading route data...</Typography>
      </Box>
    );
  }

  const sub = subsections[currentIndex];
  const isLast = currentIndex === subsections.length - 1;

  const handleFeelingLost = () => {
    navigate("/navigationpage", { state: { destination } });
  };
  const handleNext = () => {
    if (!isLast) setCurrentIndex((prev) => prev + 1);
  };
  const handleCompleted = () => {
    navigate("/navigationpage", { state: { destination } });
  };

  return (
    <Box sx={{ minHeight: "100vh", p: 2, bgcolor: "#f5f5f5" }}>
      <Typography variant="h5" align="center" gutterBottom>
        Ongoing Navigation
      </Typography>
      <Typography variant="subtitle1" align="center" gutterBottom>
        Destination: {destination || "(none)"}
      </Typography>

      {/* Show the chunk's partial path in MapView */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
        <MapView
          nodeSequence={sub.nodes}
          userX={userX}
          userY={userY}
          userHeading={userHeading}
        />
      </Box>

      {/* Buttons */}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 3 }}>
        <Button variant="outlined" color="error" onClick={handleFeelingLost}>
          Feeling Lost?
        </Button>
        {!isLast && (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        )}
        {isLast && (
          <Button variant="contained" color="success" onClick={handleCompleted}>
            Navigation Completed?
          </Button>
        )}
      </Box>

      {/* Subsection instructions */}
      <Box sx={{ maxWidth: 600, mx: "auto" }}>
        <Typography variant="h6" gutterBottom>
          Subsection {currentIndex + 1} of {subsections.length}
        </Typography>
        {sub.instructions?.length > 0 ? (
          <ol>
            {sub.instructions.map((instr, i) => (
              <li key={i}>{instr}</li>
            ))}
          </ol>
        ) : (
          <Typography>No instructions in this chunk.</Typography>
        )}
      </Box>
    </Box>
  );
}
