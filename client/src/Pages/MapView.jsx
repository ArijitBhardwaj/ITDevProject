import React, { useEffect, useState, useRef } from "react";
import { Box } from "@mui/material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import mapImage from "../assets/vcc_floor1_grid.png";

/**
 * Convert your campus coords -> 512x512 for the path
 */
function scaleCoordinatesForImage(nodes) {
  return nodes.map(([x, y]) => {
    let scaledX = x * (256 / 20) + 256;
    let scaledY = y * (256 / 20) * -1 + 256;
    return [scaledX, scaledY];
  });
}

/**
 * Euclidian distance
 */
function distance2D(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Build segments for the arrow animation
 */
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

/**
 * For a distance along the path, return x,y, angle
 */
function getPointAtDistance(segments, dist) {
  if (!segments.length) return { x: 0, y: 0, angle: 0 };

  const totalLen = segments[segments.length - 1].cumulativeDist;
  if (dist >= totalLen) {
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
      const frac = (dist - startDist) / seg.length;
      const x = seg.x1 + (seg.x2 - seg.x1) * frac;
      const y = seg.y1 + (seg.y2 - seg.y1) * frac;
      const angle = angleBetween(seg.x1, seg.y1, seg.x2, seg.y2);
      return { x, y, angle };
    }
  }
  // fallback
  let last = segments[segments.length - 1];
  return {
    x: last.x2,
    y: last.y2,
    angle: angleBetween(last.x1, last.y1, last.x2, last.y2),
  };
}

/** angle in degrees for arrow from (x1,y1)->(x2,y2) */
function angleBetween(x1, y1, x2, y2) {
  const rad = Math.atan2(y2 - y1, x2 - x1);
  return (rad * 180) / Math.PI;
}

export default function MapView({ nodeSequence }) {
  const [renderPoints, setRenderPoints] = useState([]);
  const [segments, setSegments] = useState([]);
  const [arrowPos, setArrowPos] = useState({ x: 0, y: 0, angle: 0 });
  const animationRef = useRef(null);

  useEffect(() => {
    if (!nodeSequence || nodeSequence.length === 0) {
      // Clear data if there's no path
      setRenderPoints([]);
      setSegments([]);
      setArrowPos({ x: 0, y: 0, angle: 0 });
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // 1) scale coords to 512x512
    const coords = nodeSequence.map((n) => [n.x, n.y]);
    const scaled = scaleCoordinatesForImage(coords);
    setRenderPoints(scaled);

    // 2) build segments for arrow
    const segs = buildSegments(scaled);
    setSegments(segs);

    // 3) infinite arrow animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    let startTime = performance.now();
    const totalDist = segs.length ? segs[segs.length - 1].cumulativeDist : 0;
    const duration = 8000; // 8s loop

    function animateArrow(timestamp) {
      let elapsed = timestamp - startTime;
      // loop with modulo
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
  // keep your fixed container for desktop
  const containerSize = 512;

  return (
    <div
      style={{
        width: containerSize + "px",
        height: containerSize + "px",
        margin: "0 auto",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#ccc",
      }}
    >
      {/* TRANSFORM WRAPPER CHANGES */}
      <TransformWrapper
        // allow more flexible panning on mobile
        centerContent={false}
        limitToWrapperBounds={false}
        minScale={0.5} // user can zoom out a bit
        maxScale={4}
        initialScale={1}
      >
        <TransformComponent>
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
            {/* Render the path + arrow if we have points */}
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
          </Box>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
