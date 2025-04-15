import React, { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import MapView from "./MapView";
import { requestSensorPermissions } from "../utils/sensorPermissions";

/**
 * Extracts direction keywords like "north", "southeast", etc.
 */
function parseDirection(instruction) {
  if (!instruction) return "";
  const lower = instruction.toLowerCase();
  if (lower.includes("northwest")) return "northwest";
  if (lower.includes("northeast")) return "northeast";
  if (lower.includes("southwest")) return "southwest";
  if (lower.includes("southeast")) return "southeast";
  if (lower.includes("north")) return "north";
  if (lower.includes("south")) return "south";
  if (lower.includes("east")) return "east";
  if (lower.includes("west")) return "west";
  return "";
}

/**
 * Splits nodeSequence + instructions into direction-based subsections.
 * (Your existing chunking logic, unchanged.)
 */
function chunkRoute(nodeSequence, instructions) {
  if (!nodeSequence || nodeSequence.length < 2) {
    return [{ nodes: nodeSequence || [], instructions: instructions || [] }];
  }

  let chunks = [];
  let startIdx = 0;
  let currentDir = parseDirection(instructions[0]) || "";

  for (let i = 1; i < instructions.length; i++) {
    const thisDir = parseDirection(instructions[i]);
    if (thisDir !== currentDir) {
      const endIdx = i - 1;
      chunks.push({
        nodes: nodeSequence.slice(startIdx, endIdx + 2),
        instructions: instructions.slice(startIdx, endIdx + 1),
      });
      currentDir = thisDir;
      startIdx = i;
    }
  }

  // Last chunk
  const endIdx = instructions.length - 1;
  chunks.push({
    nodes: nodeSequence.slice(startIdx, endIdx + 2),
    instructions: instructions.slice(startIdx, endIdx + 1),
  });

  return chunks;
}

/**
 * Removes the last chunk if it has exactly one step (2 nodes) AND
 * that instruction indicates arrival (e.g., "You have arrived").
 * (You said you don't need that final single-step "arrived" subsection.)
 */
function removeLastArrivalChunk(chunks) {
  if (!chunks.length) return chunks;
  const last = chunks[chunks.length - 1];
  if (
    last.nodes.length === 2 && // 1 step
    last.instructions.length === 1 &&
    last.instructions[0].toLowerCase().includes("arrived")
  ) {
    chunks.pop();
  }
  return chunks;
}

/**
 * If a subsection has only 1 step => we try to borrow a node
 * from the next or previous subsection so there's at least 3 points to render on the map.
 */
function getNodesForMap(subsections, currentIndex) {
  const currentSub = subsections[currentIndex];
  if (currentSub.nodes.length >= 3) {
    // Already has multiple steps => no change needed
    return currentSub.nodes;
  }

  // Single-step => length is 2
  let merged = [...currentSub.nodes];

  // Try borrowing from the next subsection
  if (currentIndex < subsections.length - 1) {
    const nextSub = subsections[currentIndex + 1];
    if (nextSub.nodes.length >= 2) {
      // E.g., we can borrow nextSub.nodes[1]
      merged.push(nextSub.nodes[1]);
      return merged;
    }
  }

  // Otherwise, try borrowing from the previous subsection
  if (currentIndex > 0) {
    const prevSub = subsections[currentIndex - 1];
    if (prevSub.nodes.length >= 3) {
      // Borrow the second-to-last node from the previous sub
      const borrowedNode = prevSub.nodes[prevSub.nodes.length - 2];
      merged.unshift(borrowedNode);
    }
  }

  return merged;
}

export default function OngoingNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const { instructions, nodeSequence, destination } = location.state || {};

  const [subsections, setSubsections] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sensorEnabled, setSensorEnabled] = useState(false);

  useEffect(() => {
    // If no nodeSequence, redirect back to navigation page
    if (!nodeSequence || nodeSequence.length === 0) {
      navigate("/navigationpage");
      return;
    }
    // 1) chunk by direction
    let splitted = chunkRoute(nodeSequence, instructions);
    // 2) remove last "arrived" single-step chunk if needed
    splitted = removeLastArrivalChunk(splitted);
    setSubsections(splitted);
    setCurrentIndex(0);
  }, [nodeSequence, instructions, navigate]);

  if (!subsections.length) {
    // Possibly everything got removed if it was only an arrival step
    return (
      <Box sx={{ minHeight: "100vh", p: 2 }}>
        <Typography>Loading route data...</Typography>
      </Box>
    );
  }

  const sub = subsections[currentIndex];
  const isLast = currentIndex === subsections.length - 1;

  function handleFeelingLost() {
    navigate("/navigationpage", { state: { destination } });
  }

  function handleNext() {
    if (!isLast) setCurrentIndex((idx) => idx + 1);
  }

  /** NEW: handle going back to the previous subsection */
  function handlePrevious() {
    if (currentIndex > 0) setCurrentIndex((idx) => idx - 1);
  }

  function handleCompleted() {
    navigate("/navigationpage", { state: { destination } });
  }

  async function handleEnableSensors() {
    const granted = await requestSensorPermissions();
    setSensorEnabled(granted);
  }

  // The array of nodes for map rendering
  const mapNodes = getNodesForMap(subsections, currentIndex);

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
        {/* We pass mapNodes so even single-step subsections show a mini path */}
        <MapView
          nodeSequence={mapNodes}
          initialPosition={sensorEnabled ? mapNodes[0] : null}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 2, justifyContent: "center", mb: 3 }}>
        <Button variant="outlined" color="error" onClick={handleFeelingLost}>
          Feeling Lost?
        </Button>

        {/* NEW: Show "Previous" button if there's a subsection before the current */}
        {currentIndex > 0 && (
          <Button variant="contained" onClick={handlePrevious}>
            Previous
          </Button>
        )}

        {/* Show "Next" if not on the last subsection */}
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
