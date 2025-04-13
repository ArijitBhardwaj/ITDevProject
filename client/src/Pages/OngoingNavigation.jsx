import React, { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import MapView from "./MapView";

/**
 * Utility: compute Euclidian distance between two consecutive nodes in the nodeSequence
 */
function distanceBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * chunkRoute()
 * Splits the entire path into "subsections" of ~15m each
 * Also splits instructions accordingly.
 * 
 * We'll do a simple approach:
 * - We'll iterate nodeSequence from start->end,
 *   summing distances until we exceed 15m,
 *   that becomes a chunk.
 * 
 * For instructions: we'll group them in the same chunk.
 * The last chunk can be smaller than 15 if needed.
 */
function chunkRoute(nodeSequence, instructions) {
  if (!nodeSequence || nodeSequence.length < 2) {
    return [
      {
        nodes: nodeSequence,
        instructions: instructions,
      },
    ];
  }

  let chunks = [];
  let currentNodes = [nodeSequence[0]];
  let currentInstructions = [];

  let distSoFar = 0;
  let instrIndex = 0;

  // We'll track instructions step by step as we add nodes
  // Because each "step" in instructions typically correlates to going from node i->i+1
  // 
  // instructions might be e.g.:
  //   [ "Start at G120", "Walk east 1.2m...", "Arrived at G125" ]
  // but we'll approximate them chunk wise.

  for (let i = 0; i < nodeSequence.length - 1; i++) {
    const a = nodeSequence[i];
    const b = nodeSequence[i + 1];
    let segmentDist = distanceBetween(a, b);

    // Add next node
    currentNodes.push(b);

    distSoFar += segmentDist;

    // We'll also push instructions[i] into currentInstructions
    if (i < instructions.length) {
      currentInstructions.push(instructions[i + 1]); 
      // +1 because instructions[0] is usually "Start at ____"
      // adjust as needed
    }

    if (distSoFar >= 15) {
      // finalize chunk
      chunks.push({
        nodes: [...currentNodes],
        instructions: [...currentInstructions],
      });
      // reset
      currentNodes = [b];
      currentInstructions = [];
      distSoFar = 0;
    }
  }

  // push the final chunk if there's leftover
  if (currentNodes.length > 1 || chunks.length === 0) {
    // Also push the last instruction if it isn't added
    // The final line might be "You have arrived at ____"
    if (instructions[instructions.length - 1]?.startsWith("You have arrived")) {
      currentInstructions.push(instructions[instructions.length - 1]);
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
  const { instructions, nodeSequence, destination } = location.state || {};

  const [subsections, setSubsections] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!nodeSequence || nodeSequence.length === 0) {
      // If there's no route data, redirect back
      navigate("/navigationpage");
      return;
    }
    // chunk the route
    const splitted = chunkRoute(nodeSequence, instructions);
    setSubsections(splitted);
    setCurrentIndex(0);
  }, [nodeSequence, instructions, navigate]);

  if (!subsections || subsections.length === 0) {
    return (
      <Box>
        <Typography>Loading route data...</Typography>
      </Box>
    );
  }

  // The current subsection
  const sub = subsections[currentIndex];
  const isLast = currentIndex === subsections.length - 1;

  const handleFeelingLost = () => {
    // Return to navigation page fresh
    navigate("/navigationpage", { replace: true });
  };

  const handleNext = () => {
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleCompleted = () => {
    // final
    navigate("/navigationpage", { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: 2,
        bgcolor: "#f5f5f5",
      }}
    >
      <Typography variant="h5" align="center" gutterBottom>
        Ongoing Navigation
      </Typography>
      <Typography variant="subtitle1" align="center" gutterBottom>
        Destination: {destination}
      </Typography>

      {/* Subsection's map: we pass sub.nodes as nodeSequence */}
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

      {/* Instructions for this subsection */}
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
          <Typography>No specific instructions for this chunk.</Typography>
        )}
      </Box>
    </Box>
  );
}
