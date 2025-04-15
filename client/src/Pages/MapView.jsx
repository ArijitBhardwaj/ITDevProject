import React, { useEffect, useState, useRef } from "react";
import { Box, Card, Popover, Typography, GlobalStyles } from "@mui/material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import mapImage from "../assets/vcc_floor1_grid.png";
import markerImage from "../assets/marker.png";
import roomNodes from "../utils/rooms.json";
import { VCC_CALIBRATION } from "../utils/sensorUtils";

/**
 * Scales an array of [x,y] waypoints to fit the 512x512 map
 */
function scaleCoordinatesForImage(nodes) {
  return nodes.map(([x, y]) => {
    let scaledX = x * (256 / 20) + 256;
    let scaledY = y * (256 / 20) * -1 + 256;
    return [scaledX, scaledY];
  });
}

/**
 * Calculates Euclidean distance between two 2D points
 */
function distance2D(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Builds segment objects for each consecutive pair of points
 * Each segment includes a cumulative distance and also stores "phi",
 * which is the angle between this segment vector and the "map north" vector.
 */
function buildSegments(points) {
  let segments = [];
  let cumulative = 0;

  // "Map North" vector example (from your conversation)
  // You can adjust these coordinates if your map north changes
  const mapNorthVector = {
    x: 5.79 - 5.46,
    y: 6.38 - 7.54,
  };

  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const length = distance2D(x1, y1, x2, y2);
    cumulative += length;

    // Path vector is from this point to the next
    const pathVector = { x: x2 - x1, y: y2 - y1 };

    // Dot/det to find angle between mapNorthVector & pathVector
    const dot =
      mapNorthVector.x * pathVector.x + mapNorthVector.y * pathVector.y;
    const det =
      mapNorthVector.x * pathVector.y - mapNorthVector.y * pathVector.x;
    // Phi in degrees
    const phi = (Math.atan2(det, dot) * 180) / Math.PI;

    segments.push({
      x1,
      y1,
      x2,
      y2,
      length,
      cumulativeDist: cumulative,
      phi,
    });
  }
  return segments;
}

/**
 * Returns the point (and angle) at a given distance along the segments
 * (Used for the red arrow path animation)
 */
function getPointAtDistance(segments, dist) {
  if (!segments.length) return { x: 0, y: 0, angle: 0 };

  const total = segments[segments.length - 1].cumulativeDist;
  if (dist >= total) {
    const last = segments[segments.length - 1];
    // Angle: direction from x1,y1 -> x2,y2
    const angle =
      Math.atan2(last.y2 - last.y1, last.x2 - last.x1) * (180 / Math.PI);
    return {
      x: last.x2,
      y: last.y2,
      angle,
    };
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const startDist = i === 0 ? 0 : segments[i - 1].cumulativeDist;
    if (dist >= startDist && dist <= seg.cumulativeDist) {
      const frac = (dist - startDist) / seg.length;
      const x = seg.x1 + (seg.x2 - seg.x1) * frac;
      const y = seg.y1 + (seg.y2 - seg.y1) * frac;
      const angle =
        Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1) * (180 / Math.PI);
      return { x, y, angle };
    }
  }

  return segments[segments.length - 1];
}

export default function MapView({ nodeSequence, initialPosition }) {
  // ========== States for path rendering and user orientation ==========
  const [renderPoints, setRenderPoints] = useState([]);
  const [segments, setSegments] = useState([]);
  const [arrowPos, setArrowPos] = useState({ x: 0, y: 0, angle: 0 });
  const animationRef = useRef(null);

  // Compass & user marker states
  const [userHeading, setUserHeading] = useState(0); // heading from device's compass
  const [requiredTurn, setRequiredTurn] = useState({
    degrees: 0,
    direction: "",
  });

  // Convert `initialPosition` into scaled coordinates once
  const userMarker = initialPosition
    ? {
        x: initialPosition.x * (256 / 20) + 256,
        y: initialPosition.y * (256 / 20) * -1 + 256,
      }
    : { x: 0, y: 0 };

  // ================== POPUP STATES FOR ROOM NODES (unchanged) ==================
  const [nodeTagPoints, setNodeTagPoints] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [popoverNodeTarget, setPopoverNodeTarget] = useState(null);

  const openPopover = Boolean(anchorEl);
  const idPopover = openPopover ? "simple-popover" : undefined;

  const handleClick = (node) => (event) => {
    setAnchorEl(event.currentTarget);
    setPopoverNodeTarget(node);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Scale node tags once. We keep your same approach from previous code:
  let scaledFlag = false;
  function scaleNodeTagsForImage(nodes) {
    if (!scaledFlag) {
      let temp = nodes;
      temp.map((node) => {
        if (parseFloat(node.coordinates.x) > 40) return node;
        node.coordinates.x = parseFloat(node.coordinates.x) * (256 / 20) + 256;

        if (parseFloat(node.coordinates.y) > 40) return node;
        node.coordinates.y =
          parseFloat(node.coordinates.y) * (256 / 20) * -1 + 256;
        return node;
      });
      if (temp.length > 0) scaledFlag = true;
      return temp;
    } else {
      return nodes;
    }
  }

  // We load roomNodes once into nodeTagPoints
  useEffect(() => {
    if (nodeTagPoints.length > 0) return;
    const scaledNodeTags = scaleNodeTagsForImage(roomNodes);
    setNodeTagPoints(scaledNodeTags);
  }, [nodeTagPoints, roomNodes]);

  // ================== Compass Handling (Alpha - Phi + Gamma) ==================
  useEffect(() => {
    // We'll attach listener to 'deviceorientationabsolute' for iOS 13+ plus fallback
    const handleOrientation = (event) => {
      if (typeof event.alpha === "number") {
        // 'alpha' is device's compass reading in degrees (0-360)
        const alpha = event.alpha;

        // If we have at least one segment, use the first segment's 'phi'
        // Then apply the formula: TurnAngle = Alpha - Phi + Gamma
        if (segments.length > 0) {
          const phi = segments[0].phi; // angle to map north
          // We keep "Gamma" as a calibration from VCC_CALIBRATION
          const gamma = VCC_CALIBRATION.mapRotation; // e.g. 32°, or you can tweak

          // Apply the formula and keep it in [0..360)
          let turnAngle = (alpha - phi + gamma + 360) % 360;

          // For the display in the "Turn X° Left/Right" banner:
          let displayAngle;
          let direction;
          if (turnAngle <= 180) {
            displayAngle = turnAngle;
            direction = "Right";
          } else {
            displayAngle = 360 - turnAngle;
            direction = "Left";
          }

          setRequiredTurn({
            degrees: Math.round(displayAngle),
            direction: direction,
          });

          // We'll also store raw alpha in userHeading, if you want the arrow to rotate by the phone heading
          setUserHeading(turnAngle); // If you want the user marker arrow to point where we *should* turn
          // Or setUserHeading(alpha) if you want it to point to phone's actual compass
        }
      }
    };

    window.addEventListener(
      "deviceorientationabsolute",
      handleOrientation,
      true
    );
    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      window.removeEventListener(
        "deviceorientationabsolute",
        handleOrientation,
        true
      );
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [segments]);

  // ================== Build path segments & animate the arrow along the path ==================
  useEffect(() => {
    if (!nodeSequence?.length) {
      // If no path, reset
      setRenderPoints([]);
      setSegments([]);
      setArrowPos({ x: 0, y: 0, angle: 0 });
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    // Scale the nodeSequence
    const scaled = scaleCoordinatesForImage(
      nodeSequence.map((n) => [n.x, n.y])
    );
    setRenderPoints(scaled);

    // Build segments with phi
    const segs = buildSegments(scaled);
    setSegments(segs);

    // Animate the arrow
    let startTime = performance.now();
    const totalDist = segs[segs.length - 1]?.cumulativeDist || 0;
    const duration = 8000; // 8 seconds for a full loop

    const animate = (timestamp) => {
      const elapsed = timestamp - startTime;
      const t = (elapsed % duration) / duration;
      const { x, y, angle } = getPointAtDistance(segs, t * totalDist);
      setArrowPos({ x, y, angle });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [nodeSequence]);

  // ================== Build polyline string for the path ==================
  const pointsString = renderPoints.map((p) => p.join(",")).join(" ");
  const arrowSize = 16;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        margin: "0 auto",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#ccc",
        position: "relative",
      }}
    >
      {/* Prevent text highlighting */}
      <GlobalStyles
        styles={{
          body: {
            "-webkit-user-select": "none",
            "-moz-user-select": "none",
            "-ms-user-select": "none",
            "user-select": "none",
          },
        }}
      />

      {/* Turn Instructions Banner (center-top) */}
      {requiredTurn.degrees > 0 && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.9)",
            padding: "8px 16px",
            borderRadius: 20,
            zIndex: 1000,
            fontSize: "1rem",
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Turn {requiredTurn.degrees}° {requiredTurn.direction}
          </Typography>
        </div>
      )}

      {/* Zoom/Pan Wrapper */}
      <TransformWrapper
        minScale={0.8}
        maxScale={4}
        initialScale={0.95}
        initialPositionX={256}
        initialPositionY={256}
        limitToWrapperBounds
        doubleClick={{ disabled: true }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom Controls */}
            <div
              style={{
                position: "absolute",
                right: 10,
                bottom: 10,
                zIndex: 1000,
                display: "flex",
                gap: "8px",
              }}
            >
              <button
                onClick={() => zoomIn()}
                style={{
                  padding: "8px",
                  background: "#fff",
                  border: "2px solid #1976d2",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  fontSize: "1.2rem",
                  color: "#1976d2",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              >
                +
              </button>
              <button
                onClick={() => zoomOut()}
                style={{
                  padding: "8px",
                  background: "#fff",
                  border: "2px solid #1976d2",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  fontSize: "1.2rem",
                  color: "#1976d2",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              >
                -
              </button>
              <button
                onClick={() => {
                  resetTransform();
                }}
                style={{
                  padding: "8px",
                  background: "#fff",
                  border: "2px solid #1976d2",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  fontSize: "1.2rem",
                  color: "#1976d2",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              >
                ⟲
              </button>
            </div>

            <TransformComponent
              wrapperStyle={{
                width: "100%",
                height: "100%",
              }}
              contentStyle={{ transition: "transform 0.15s ease-out" }}
            >
              <Box
                sx={{
                  width: 512,
                  height: 512,
                  backgroundImage: `url(${mapImage})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  imageRendering: "crisp-edges",
                  position: "relative",
                }}
              >
                {/* The main path polyline + moving arrow (red) */}
                {renderPoints.length > 0 && (
                  <svg
                    width={512}
                    height={512}
                    style={{ position: "absolute", top: 0, left: 0 }}
                  >
                    <polyline
                      points={pointsString}
                      fill="none"
                      stroke="blue"
                      strokeWidth={2.5}
                    />
                    <g
                      transform={`translate(${arrowPos.x},${arrowPos.y}) rotate(${arrowPos.angle})`}
                    >
                      <polygon
                        points="0,0 16,8 0,16"
                        fill="red"
                        stroke="white"
                        strokeWidth={1}
                        transform={`translate(-${arrowSize / 2},-${
                          arrowSize / 2
                        })`}
                      />
                    </g>
                  </svg>
                )}

                {/* Popover for clickable room nodes */}
                <Popover
                  id={idPopover}
                  open={openPopover}
                  anchorEl={anchorEl}
                  onClose={handleClose}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left",
                  }}
                >
                  <Card sx={{ padding: "5px", width: "200px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-around",
                      }}
                    >
                      <Typography>
                        {popoverNodeTarget
                          ? popoverNodeTarget.name.charAt(0).toUpperCase() +
                            popoverNodeTarget.name.slice(1)
                          : ""}
                      </Typography>
                      <Typography>
                        {popoverNodeTarget ? popoverNodeTarget.number : ""}
                      </Typography>
                    </div>
                    <Typography sx={{ textAlign: "center" }}>
                      {popoverNodeTarget ? popoverNodeTarget.description : ""}
                    </Typography>
                  </Card>
                </Popover>

                {/* Clickable tags for nodes (only if no path) */}
                {nodeTagPoints.length > 0 && renderPoints.length <= 0 && (
                  <svg
                    key={"nodeTagsSVG"}
                    xmlns="http://www.w3.org/2000/svg"
                    className="clickableNodes"
                    width={512}
                    height={512}
                  >
                    {nodeTagPoints.map((node, index) => (
                      <image
                        key={node.id || index}
                        href={markerImage}
                        x={node.coordinates.x - 6}
                        y={node.coordinates.y - 12}
                        width={12}
                        height={12}
                        style={{ opacity: "0.75" }}
                        onClick={(e) => handleClick(node)(e)}
                      />
                    ))}
                  </svg>
                )}

                {/* The green user marker (circle + line) showing orientation */}
                {initialPosition && (
                  <svg
                    width={512}
                    height={512}
                    style={{ position: "absolute", top: 0, left: 0 }}
                  >
                    <g transform={`translate(${userMarker.x},${userMarker.y})`}>
                      <circle r="10" fill="limegreen" opacity={0.8} />
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="-25"
                        stroke="darkgreen"
                        strokeWidth={4}
                        // Rotate by our computed heading (turnAngle) to show direction
                        transform={`rotate(${userHeading})`}
                      />
                    </g>
                  </svg>
                )}
              </Box>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
