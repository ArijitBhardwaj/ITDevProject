// src/Pages/OngoingNavigation.jsx

import React, { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import MapView from "./MapView";

/**
 * Utility: compute Euclidean distance between consecutive nodes
 */
function distanceBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * chunkRoute() — Splits the nodeSequence & instructions into ~15m subsections
 */
function chunkRoute(nodeSequence, instructions) {
  if (!nodeSequence || nodeSequence.length < 2) {
    return [
      {
        nodes: nodeSequence || [],
        instructions: instructions || [],
      },
    ];
  }

  let chunks = [];
  let currentNodes = [nodeSequence[0]];
  let currentInstructions = [];

  let distSoFar = 0;

  // We'll assume instructions[0] is "Start at ____"
  // Then instructions[i+1] typically describes traveling i->i+1
  // Adjust if your instructions differ.
  for (let i = 0; i < nodeSequence.length - 1; i++) {
    const a = nodeSequence[i];
    const b = nodeSequence[i + 1];
    const segmentDist = distanceBetween(a, b);

    currentNodes.push(b);
    distSoFar += segmentDist;

    // Add instructions[i+1] if it exists
    if (i + 1 < instructions.length) {
      currentInstructions.push(instructions[i + 1]);
    }

    // If we reached ~15m, close off this chunk
    if (distSoFar >= 15) {
      chunks.push({
        nodes: [...currentNodes],
        instructions: [...currentInstructions],
      });
      distSoFar = 0;
      // start a new chunk from b
      currentNodes = [b];
      currentInstructions = [];
    }
  }

  // final chunk leftover
  if (currentNodes.length > 1 || chunks.length === 0) {
    // We also might want to add the final "You have arrived" line if it wasn't included
    // If instructions end with "You have arrived...", add it
    let lastMsg = instructions[instructions.length - 1];
    if (lastMsg && lastMsg.startsWith("You have arrived")) {
      currentInstructions.push(lastMsg);
    }
    chunks.push({
      nodes: currentNodes,
      instructions: currentInstructions,
    });
  }

  return chunks;
}

export default function OngoingNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  // We assume location.state was passed from NavigationPage
  const { instructions, nodeSequence, destination } = location.state || {};

  const [subsections, setSubsections] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!nodeSequence || nodeSequence.length === 0) {
      // no route data => go back
      navigate("/navigationpage");
      return;
    }
    const splitted = chunkRoute(nodeSequence, instructions);
    setSubsections(splitted);
    setCurrentIndex(0);
  }, [nodeSequence, instructions, navigate]);

  if (!subsections || subsections.length === 0) {
    return (
      <Box sx={{ minHeight: "100vh", p: 2 }}>
        <Typography>Loading route data...</Typography>
      </Box>
    );
  }

  const sub = subsections[currentIndex];
  const isLast = currentIndex === subsections.length - 1;

  // "Feeling Lost?" => go to NavigationPage with the old destination
  const handleFeelingLost = () => {
    // We pass the old 'destination' so that NavPage can prefill it
    navigate("/navigationpage", {
      state: { destination },
    });
  };

  // Next chunk
  const handleNext = () => {
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // If done
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
        <MapView nodeSequence={sub.nodes} />
      </Box>

      {/* Buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 2,
          mb: 3,
        }}
      >
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
        {sub.instructions && sub.instructions.length > 0 ? (
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
