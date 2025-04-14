import React, { useEffect, useState, useRef } from "react";
import { Box, GlobalStyles } from "@mui/material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import mapImage from "../assets/vcc_floor1_grid.png";

function scaleCoordinatesForImage(nodes) {
  return nodes.map(([x, y]) => {
    let scaledX = x * (256 / 20) + 256;
    let scaledY = y * (256 / 20) * -1 + 256;
    return [scaledX, scaledY];
  });
}

function distance2D(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function buildSegments(points) {
  let segments = [];
  let cumulative = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const length = distance2D(x1, y1, x2, y2);
    cumulative += length;

    segments.push({
      x1,
      y1,
      x2,
      y2,
      length,
      cumulativeDist: cumulative,
    });
  }
  return segments;
}

function getPointAtDistance(segments, dist) {
  if (segments.length === 0) return { x: 0, y: 0, angle: 0 };
  const totalLength = segments[segments.length - 1].cumulativeDist;

  if (dist >= totalLength) {
    let last = segments[segments.length - 1];
    return {
      x: last.x2,
      y: last.y2,
      angle: angleBetween(last.x1, last.y1, last.x2, last.y2),
    };
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const startDist = i === 0 ? 0 : segments[i - 1].cumulativeDist;
    const endDist = seg.cumulativeDist;

    if (dist >= startDist && dist <= endDist) {
      const segFrac = (dist - startDist) / seg.length;
      const x = seg.x1 + (seg.x2 - seg.x1) * segFrac;
      const y = seg.y1 + (seg.y2 - seg.y1) * segFrac;
      const angle = angleBetween(seg.x1, seg.y1, seg.x2, seg.y2);
      return { x, y, angle };
    }
  }

  let last = segments[segments.length - 1];
  return {
    x: last.x2,
    y: last.y2,
    angle: angleBetween(last.x1, last.y1, last.x2, last.y2),
  };
}

function angleBetween(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const rad = Math.atan2(dy, dx);
  return (rad * 180) / Math.PI;
}

export default function MapView({ nodeSequence }) {
  const [renderPoints, setRenderPoints] = useState([]);
  const [segments, setSegments] = useState([]);
  const [arrowPos, setArrowPos] = useState({ x: 0, y: 0, angle: 0 });
  const animationRef = useRef(null);
  const containerSize = 512;

  const handleTouchStart = (e) => {
    if (e.touches.length > 1) e.preventDefault();
  };

  useEffect(() => {
    if (!nodeSequence || nodeSequence.length === 0) {
      setRenderPoints([]);
      setSegments([]);
      setArrowPos({ x: 0, y: 0, angle: 0 });
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const coords = nodeSequence.map((n) => [n.x, n.y]);
    const scaled = scaleCoordinatesForImage(coords);
    setRenderPoints(scaled);

    const segs = buildSegments(scaled);
    setSegments(segs);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [nodeSequence]);

  const pointsString = renderPoints.map((pt) => pt.join(",")).join(" ");
  const arrowSize = 16;

  return (
    <div>
      <GlobalStyles
        styles={{
          body: {
            "-webkit-user-select": "none",
            "-moz-user-select": "none",
            "-ms-user-select": "none",
            "user-select": "none",
          },
          button: {
            "touch-action": "manipulation",
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
        }}
        onTouchStart={handleTouchStart}
      >
        <TransformWrapper
          minScale={1}
          maxScale={4}
          initialScale={1}
          initialPositionX={containerSize / 2}
          initialPositionY={containerSize / 2}
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
                  width: "100%",
                  height: "100%",
                  touchAction: "manipulation",
                }}
                contentStyle={{
                  transition: "transform 0.15s ease-out",
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    width: containerSize,
                    height: containerSize,
                    backgroundImage: `url(${mapImage})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    imageRendering: "crisp-edges",
                  }}
                >
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
                        style={{
                          fill: "none",
                          stroke: "blue",
                          strokeWidth: 2.5,
                        }}
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
                </Box>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
}
