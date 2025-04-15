import React, { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import MapView from "./MapView";
import { requestSensorPermissions } from "../utils/sensorPermissions";

/**
 * Utility distance function
 */
function distanceBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Extracts a cardinal/intercardinal direction from an instruction string.
 * (e.g. “Walk east for 1.0m ...” => "east")
 */
function parseDirection(instruction) {
  if (!instruction) return "";
  const lower = instruction.toLowerCase();
  // Check longer intercardinal directions first:
  if (lower.includes("northwest")) return "northwest";
  if (lower.includes("northeast")) return "northeast";
  if (lower.includes("southwest")) return "southwest";
  if (lower.includes("southeast")) return "southeast";
  // Then the main cardinal directions:
  if (lower.includes("north")) return "north";
  if (lower.includes("south")) return "south";
  if (lower.includes("east")) return "east";
  if (lower.includes("west")) return "west";
  return "";
}

/**
 * Splits the route (nodeSequence) + instructions into chunks
 * so that each chunk groups consecutive instructions that share the **same direction**.
 */
function chunkRoute(nodeSequence, instructions) {
  if (!nodeSequence || nodeSequence.length < 2) {
    return [{ nodes: nodeSequence || [], instructions: instructions || [] }];
  }

  // We'll build subsections by grouping consecutive instructions
  // with the same parseDirection() result.
  let chunks = [];

  // Start with the first instruction
  let currentNodes = [nodeSequence[0]];
  let currentInstr = [instructions[0]];
  let currentDir = parseDirection(instructions[0]) || "";

  // Loop through the remaining instructions
  for (let i = 1; i < instructions.length; i++) {
    const thisDir = parseDirection(instructions[i]);
    if (thisDir === currentDir) {
      // Same direction, so keep adding
      currentInstr.push(instructions[i]);
      currentNodes.push(nodeSequence[i]);
    } else {
      // Direction changed => finalize the current chunk
      chunks.push({
        nodes: [...currentNodes],
        instructions: [...currentInstr],
      });
      // Start a new chunk
      currentNodes = [nodeSequence[i]];
      currentInstr = [instructions[i]];
      currentDir = thisDir;
    }
  }

  // Push the final chunk
  chunks.push({ nodes: currentNodes, instructions: currentInstr });
  return chunks;
}

export default function OngoingNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  // We receive instructions, nodeSequence, destination, and initialPosition
  const { instructions, nodeSequence, destination, initialPosition } =
    location.state || {};

  const [subsections, setSubsections] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sensorEnabled, setSensorEnabled] = useState(false);

  useEffect(() => {
    // If no nodeSequence, redirect back to navigation page
    if (!nodeSequence || nodeSequence.length === 0) {
      navigate("/navigationpage");
      return;
    }
    // Split the route into direction-based chunks
    const splitted = chunkRoute(nodeSequence, instructions);
    setSubsections(splitted);
    setCurrentIndex(0);
  }, [nodeSequence, instructions, navigate]);

  if (!subsections.length) {
    return (
      <Box sx={{ minHeight: "100vh", p: 2 }}>
        <Typography>Loading route data...</Typography>
      </Box>
    );
  }

  // The current sub-route
  const sub = subsections[currentIndex];
  const isLast = currentIndex === subsections.length - 1;

  function handleFeelingLost() {
    navigate("/navigationpage", { state: { destination } });
  }

  function handleNext() {
    if (!isLast) setCurrentIndex((idx) => idx + 1);
  }

  function handleCompleted() {
    navigate("/navigationpage", { state: { destination } });
  }

  async function handleEnableSensors() {
    const granted = await requestSensorPermissions();
    setSensorEnabled(granted);
  }

  return (
    <Box sx={{ minHeight: "100vh", p: 2, bgcolor: "#f5f5f5" }}>
      <Typography variant="h5" align="center" gutterBottom>
        Ongoing Navigation
      </Typography>
      <Typography variant="subtitle1" align="center" gutterBottom>
        Destination: {destination || "(none)"}
      </Typography>

      {!sensorEnabled && (
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Button variant="outlined" onClick={handleEnableSensors}>
            Enable Compass (iOS)
          </Button>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mb: 3,
          width: "100%",
          height: "70vh",
          overflow: "hidden",
        }}
      >
        {/* For each subsection, pass sub.nodes to MapView.
            The user marker will be at sub.nodes[0] if sensor is enabled. */}
        <MapView
          nodeSequence={sub.nodes}
          initialPosition={sensorEnabled ? sub.nodes[0] : null}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 2, justifyContent: "center", mb: 3 }}>
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

      <Box sx={{ maxWidth: 600, mx: "auto" }}>
        <Typography variant="h6" gutterBottom>
          Subsection {currentIndex + 1} of {subsections.length}
        </Typography>
        {sub.instructions?.length ? (
          <ol>
            {sub.instructions.map((inst, i) => (
              <li key={i}>{inst}</li>
            ))}
          </ol>
        ) : (
          <Typography>No instructions in this chunk.</Typography>
        )}
      </Box>
    </Box>
  );
}
