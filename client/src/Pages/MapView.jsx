import React, { useEffect, useState, useRef } from "react";
import { Box, GlobalStyles } from "@mui/material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import mapImage from "../assets/vcc_floor1_grid.png";
import { PedestrianDeadReckoning } from "../utils/sensorUtils"; // import PDR class

// 1) scale route coords to image
function scaleCoordinatesForImage(nodes) {
  return nodes.map(([x, y]) => {
    let scaledX = x * (256 / 20) + 256;
    let scaledY = y * (256 / 20) * -1 + 256;
    return [scaledX, scaledY];
  });
}

// 2) path building
function distance2D(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function buildSegments(points) {
  let segs = [];
  let cumulative = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const length = distance2D(x1, y1, x2, y2);
    cumulative += length;
    segs.push({ x1, y1, x2, y2, length, cumulativeDist: cumulative });
  }
  return segs;
}

function getPointAtDistance(segs, dist) {
  if (!segs.length) return { x: 0, y: 0, angle: 0 };
  const total = segs[segs.length - 1].cumulativeDist;
  if (dist >= total) {
    const last = segs[segs.length - 1];
    return {
      x: last.x2,
      y: last.y2,
      angle: angleBetween(last.x1, last.y1, last.x2, last.y2),
    };
  }
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const startDist = i === 0 ? 0 : segs[i - 1].cumulativeDist;
    if (dist >= startDist && dist <= seg.cumulativeDist) {
      let frac = (dist - startDist) / seg.length;
      let x = seg.x1 + (seg.x2 - seg.x1) * frac;
      let y = seg.y1 + (seg.y2 - seg.y1) * frac;
      let angle = angleBetween(seg.x1, seg.y1, seg.x2, seg.y2);
      return { x, y, angle };
    }
  }
  const last = segs[segs.length - 1];
  return {
    x: last.x2,
    y: last.y2,
    angle: angleBetween(last.x1, last.y1, last.x2, last.y2),
  };
}

function angleBetween(x1, y1, x2, y2) {
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
}

export default function MapView({ nodeSequence, initialPosition }) {
  // route points
  const [renderPoints, setRenderPoints] = useState([]);
  const [segments, setSegments] = useState([]);
  const [arrowPos, setArrowPos] = useState({ x: 0, y: 0, angle: 0 });
  const animationRef = useRef(null);

  // PDR stuff
  const pdrRef = useRef(null);
  const [userMarker, setUserMarker] = useState({ x: 0, y: 0 });
  const [userAngle, setUserAngle] = useState(0);
  const [stepCount, setStepCount] = useState(0);

  const containerSize = 512;

  // route building + animation
  useEffect(() => {
    if (!nodeSequence || !nodeSequence.length) {
      setRenderPoints([]);
      setSegments([]);
      setArrowPos({ x: 0, y: 0, angle: 0 });
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      return;
    }

    const coords = nodeSequence.map((n) => [n.x, n.y]);
    const scaled = scaleCoordinatesForImage(coords);
    setRenderPoints(scaled);

    const segs = buildSegments(scaled);
    setSegments(segs);

    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    let startTime = performance.now();
    const totalDist = segs.length ? segs[segs.length - 1].cumulativeDist : 0;
    const duration = 8000;

    function animateArrow(timestamp) {
      let elapsed = timestamp - startTime;
      let t = (elapsed % duration) / duration;
      let dist = t * totalDist;
      let { x, y, angle } = getPointAtDistance(segs, dist);
      setArrowPos({ x, y, angle });
      animationRef.current = requestAnimationFrame(animateArrow);
    }
    animationRef.current = requestAnimationFrame(animateArrow);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [nodeSequence]);

  // Start PDR if initialPosition is given (and presumably, sensors are allowed)
  useEffect(() => {
    if (!initialPosition) return;

    pdrRef.current = new PedestrianDeadReckoning(initialPosition);
    pdrRef.current.startTracking();

    const poll = setInterval(() => {
      if (pdrRef.current) {
        const { x, y } = pdrRef.current.position;
        const heading = pdrRef.current.heading;
        const sCount = pdrRef.current.stepCount;

        // scale campus coords => image coords
        let sx = x * (256 / 20) + 256;
        let sy = y * (256 / 20) * -1 + 256;

        setUserMarker({ x: sx, y: sy });
        setUserAngle(heading);
        setStepCount(sCount);
      }
    }, 500);

    return () => {
      clearInterval(poll);
      pdrRef.current?.stopTracking();
    };
  }, [initialPosition]);

  // for phone pinch/zoom
  const handleTouchStart = (e) => {
    if (e.touches.length > 1) e.preventDefault();
  };

  const pointsString = renderPoints.map((pt) => pt.join(",")).join(" ");
  const arrowSize = 16;

  return (
    <div>
      <GlobalStyles
        styles={{
          body: {
            "-webkit-user-select": "none",
          },
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "512px",
          height: "80vh",
          margin: "0 auto",
          borderRadius: "8px",
          overflow: "hidden",
          backgroundColor: "#ccc",
          touchAction: "none",
          position: "relative",
        }}
        onTouchStart={handleTouchStart}
      >
        <TransformWrapper
          minScale={1}
          maxScale={4}
          initialScale={1}
          limitToWrapperBounds
        >
          <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
            <Box
              sx={{
                position: "relative",
                width: containerSize,
                height: containerSize,
                backgroundImage: `url(${mapImage})`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            >
              {/* The route line + red arrow */}
              {renderPoints.length > 0 && (
                <svg
                  width={containerSize}
                  height={containerSize}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                  }}
                >
                  <polyline
                    points={pointsString}
                    style={{ fill: "none", stroke: "blue", strokeWidth: 2.5 }}
                  />
                  <g
                    transform={`
                      translate(${arrowPos.x}, ${arrowPos.y})
                      rotate(${arrowPos.angle})
                      translate(${-arrowSize / 2}, ${-arrowSize / 2})
                    `}
                  >
                    <polygon
                      points="0,0 16,8 0,16"
                      fill="red"
                      stroke="white"
                      strokeWidth="1"
                    />
                  </g>
                </svg>
              )}

              {/* PDR-based user marker (green) */}
              <svg
                width={containerSize}
                height={containerSize}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  pointerEvents: "none",
                }}
              >
                <g
                  transform={`
                    translate(${userMarker.x}, ${userMarker.y})
                    rotate(${userAngle})
                    translate(-8,-8)
                  `}
                >
                  <circle r="8" fill="limegreen" opacity="0.8" />
                  {/* A small pointer triangle pointing "forward" */}
                  <polygon points="8,-2 16,8 8,18" fill="black" opacity="0.6" />
                </g>
              </svg>
            </Box>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {/* Debug row */}
      {initialPosition && (
        <div
          style={{
            textAlign: "center",
            marginTop: 8,
            fontSize: "0.9rem",
            color: "#555",
          }}
        >
          Steps: {stepCount} | Heading: {userAngle.toFixed(1)}°
        </div>
      )}
    </div>
  );
}
