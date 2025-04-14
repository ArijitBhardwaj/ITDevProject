import React, { useEffect, useState, useRef } from "react";
import { Box, GlobalStyles } from "@mui/material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import mapImage from "../assets/vcc_floor1_grid.png";
import { PedestrianDeadReckoning } from "../utils/sensorUtils";

// Coordinate scaling functions
function scaleCoordinatesForImage(nodes) {
  return nodes.map(([x, y]) => {
    let scaledX = x * (256 / 20) + 256;
    let scaledY = y * (256 / 20) * -1 + 256;
    return [scaledX, scaledY];
  });
}

function distance2D(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function buildSegments(points) {
  let segments = [];
  let cumulative = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const length = distance2D(x1, y1, x2, y2);
    cumulative += length;
    segments.push({ x1, y1, x2, y2, length, cumulativeDist: cumulative });
  }
  return segments;
}

function getPointAtDistance(segments, dist) {
  if (!segments.length) return { x: 0, y: 0, angle: 0 };
  const total = segments[segments.length - 1].cumulativeDist;
  if (dist >= total) {
    const last = segments[segments.length - 1];
    return {
      x: last.x2,
      y: last.y2,
      angle: angleBetween(last.x1, last.y1, last.x2, last.y2),
    };
  }
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const startDist = i === 0 ? 0 : segments[i - 1].cumulativeDist;
    if (dist >= startDist && dist <= seg.cumulativeDist) {
      const frac = (dist - startDist) / seg.length;
      return {
        x: seg.x1 + (seg.x2 - seg.x1) * frac,
        y: seg.y1 + (seg.y2 - seg.y1) * frac,
        angle: angleBetween(seg.x1, seg.y1, seg.x2, seg.y2),
      };
    }
  }
  return segments[segments.length - 1];
}

function angleBetween(x1, y1, x2, y2) {
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
}

export default function MapView({ nodeSequence, initialPosition }) {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({
    width: 512,
    height: 512,
  });
  const [renderPoints, setRenderPoints] = useState([]);
  const [segments, setSegments] = useState([]);
  const [arrowPos, setArrowPos] = useState({ x: 0, y: 0, angle: 0 });
  const [userMarker, setUserMarker] = useState({ x: 0, y: 0 });
  const [userAngle, setUserAngle] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const animationRef = useRef(null);
  const pdrRef = useRef(null);

  // Responsive container sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width,
          height: Math.min(width, window.innerHeight * 0.8),
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Path animation
  useEffect(() => {
    if (!nodeSequence?.length) {
      setRenderPoints([]);
      setSegments([]);
      setArrowPos({ x: 0, y: 0, angle: 0 });
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const scaled = scaleCoordinatesForImage(
      nodeSequence.map((n) => [n.x, n.y])
    );
    setRenderPoints(scaled);
    const segs = buildSegments(scaled);
    setSegments(segs);

    let startTime = performance.now();
    const totalDist = segs[segs.length - 1]?.cumulativeDist || 0;
    const duration = 8000;

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

  // PDR tracking
  useEffect(() => {
    if (!initialPosition) return;

    pdrRef.current = new PedestrianDeadReckoning(initialPosition);
    pdrRef.current.startTracking();

    const interval = setInterval(() => {
      if (pdrRef.current) {
        const scaledX = pdrRef.current.position.x * (256 / 20) + 256;
        const scaledY = pdrRef.current.position.y * (256 / 20) * -1 + 256;
        setUserMarker({ x: scaledX, y: scaledY });
        setUserAngle(pdrRef.current.heading);
        setStepCount(pdrRef.current.stepCount);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      pdrRef.current?.stopTracking();
    };
  }, [initialPosition]);

  const pointsString = renderPoints.map((p) => p.join(",")).join(" ");
  const arrowSize = 16;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        maxWidth: "512px",
        height: "80vh",
        margin: "0 auto",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#ccc",
        position: "relative",
      }}
    >
      <GlobalStyles
        styles={{
          body: {
            "-webkit-user-select": "none",
            "-moz-user-select": "none",
            "-ms-user-select": "none",
            "user-select": "none",
            "touch-action": "none",
          },
        }}
      />

      {initialPosition && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: "rgba(255,255,255,0.9)",
            padding: 8,
            borderRadius: 4,
            zIndex: 1000,
            fontSize: "0.9rem",
          }}
        >
          <div>Steps: {stepCount}</div>
          <div>Heading: {userAngle.toFixed(1)}°</div>
          <div>
            Position: ({userMarker.x.toFixed(1)}, {userMarker.y.toFixed(1)})
          </div>
        </div>
      )}

      <TransformWrapper
        minScale={0.8}
        maxScale={4}
        initialScale={0.95}
        initialPositionX={256}
        initialPositionY={256}
        limitToWrapperBounds
        doubleClick={{ disabled: true }}
        pinch={{ step: 50 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
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
                onClick={() => resetTransform()}
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
                width: containerSize.width,
                height: containerSize.height,
                touchAction: "none",
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
                }}
              >
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
                        transform={`rotate(${userAngle})`}
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
