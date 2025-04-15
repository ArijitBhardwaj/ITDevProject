import React, { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import MapView from "./MapView";
import { requestSensorPermissions } from "../utils/sensorPermissions";

function distanceBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

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

function chunkRoute(nodeSequence, instructions) {
  if (!nodeSequence || nodeSequence.length < 2) {
    return [{ nodes: nodeSequence || [], instructions: instructions || [] }];
  }

  let chunks = [];
  let currentDir = parseDirection(instructions[0]) || "";
  let startIdx = 0;

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

  const endIdx = instructions.length - 1;
  chunks.push({
    nodes: nodeSequence.slice(startIdx, endIdx + 2),
    instructions: instructions.slice(startIdx, endIdx + 1),
  });

  return chunks;
}

export default function OngoingNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const { instructions, nodeSequence, destination, initialPosition } =
    location.state || {};

  const [subsections, setSubsections] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sensorEnabled, setSensorEnabled] = useState(false);

  useEffect(() => {
    if (!nodeSequence || nodeSequence.length === 0) {
      navigate("/navigationpage");
      return;
    }
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
