import React, { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import MapView from "./MapView";

// import requestSensorPermissions
import { requestSensorPermissions } from "../utils/sensorPermissions";

function distanceBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function chunkRoute(nodeSequence, instructions) {
  if (!nodeSequence || nodeSequence.length < 2) {
    return [{ nodes: nodeSequence || [], instructions: instructions || [] }];
  }
  let chunks = [];
  let currentNodes = [nodeSequence[0]];
  let currentInstr = [];
  let distSoFar = 0;

  for (let i = 0; i < nodeSequence.length - 1; i++) {
    const a = nodeSequence[i];
    const b = nodeSequence[i + 1];
    const segDist = distanceBetween(a, b);

    currentNodes.push(b);
    distSoFar += segDist;
    if (i + 1 < instructions.length) {
      currentInstr.push(instructions[i + 1]);
    }

    if (distSoFar >= 15) {
      chunks.push({
        nodes: [...currentNodes],
        instructions: [...currentInstr],
      });
      distSoFar = 0;
      currentNodes = [b];
      currentInstr = [];
    }
  }
  // leftover
  if (currentNodes.length > 1 || chunks.length === 0) {
    let lastMsg = instructions[instructions.length - 1];
    if (lastMsg && lastMsg.startsWith("You have arrived")) {
      currentInstr.push(lastMsg);
    }
    chunks.push({ nodes: currentNodes, instructions: currentInstr });
  }
  return chunks;
}

export default function OngoingNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const { instructions, nodeSequence, destination, initialPosition } =
    location.state || {};

  const [subsections, setSubsections] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // For iOS sensor request
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

      {/* If sensor not enabled, show a button for iOS user */}
      {!sensorEnabled && (
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Button variant="outlined" onClick={handleEnableSensors}>
            Enable Sensors (iOS)
          </Button>
        </Box>
      )}

      <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
        {/* Pass initialPosition => user can see PDR if sensorEnabled is true 
            You can do (sensorEnabled ? initialPosition : null) if you want 
            to not even start PDR unless sensors are enabled. 
        */}
        <MapView
          nodeSequence={sub.nodes}
          initialPosition={sensorEnabled ? initialPosition : null}
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
