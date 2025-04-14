import React, { useEffect, useState, useRef } from "react";
import { Box } from "@mui/material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import mapImage from "../assets/vcc_floor1_grid.png";

/** Convert campus coords -> 512x512 for path. */
function scaleCoordinatesForImage(nodes) {
  return nodes.map(([x, y]) => {
    let scaledX = x * (256 / 20) + 256;
    let scaledY = y * (256 / 20) * -1 + 256;
    return [scaledX, scaledY];
  });
}

/** Basic 2D distance. */
function distance2D(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Build array of line segments for arrow animation. */
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

/** Return { x, y, angle } given dist along the entire polyline. */
function getPointAtDistance(segments, dist) {
  if (!segments.length) return { x: 0, y: 0, angle: 0 };
  const totalLen = segments[segments.length - 1].cumulativeDist;

  if (dist >= totalLen) {
    // end of path
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
      let frac = (dist - startDist) / seg.length;
      let x = seg.x1 + (seg.x2 - seg.x1) * frac;
      let y = seg.y1 + (seg.y2 - seg.y1) * frac;
      let angle = angleBetween(seg.x1, seg.y1, seg.x2, seg.y2);
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

/** Compute angle in degrees from (x1,y1)->(x2,y2). */
function angleBetween(x1, y1, x2, y2) {
  const rad = Math.atan2(y2 - y1, x2 - x1);
  return (rad * 180) / Math.PI;
}

/**
 * MapView
 * - A fixed 512×512 container for desktop
 * - Freed-up pan/zoom for mobile
 */
export default function MapView({ nodeSequence }) {
  const [renderPoints, setRenderPoints] = useState([]);
  const [segments, setSegments] = useState([]);
  const [arrowPos, setArrowPos] = useState({ x: 0, y: 0, angle: 0 });
  const animationRef = useRef(null);

  // Build path + start/stop arrow animation
  useEffect(() => {
    if (!nodeSequence || nodeSequence.length === 0) {
      // no path => clear data + stop anim
      setRenderPoints([]);
      setSegments([]);
      setArrowPos({ x: 0, y: 0, angle: 0 });
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // 1) scale coords
    const coords = nodeSequence.map((n) => [n.x, n.y]);
    const scaled = scaleCoordinatesForImage(coords);
    setRenderPoints(scaled);

    // 2) build segments
    const segs = buildSegments(scaled);
    setSegments(segs);

    // 3) infinite arrow loop
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    let startTime = performance.now();
    const totalDist = segs.length ? segs[segs.length - 1].cumulativeDist : 0;
    const duration = 8000; // 8sec

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

  // polypoints for path
  const pointsString = renderPoints.map((pt) => pt.join(",")).join(" ");
  // arrow config
  const arrowSize = 16;
  // your container
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
      {/* Freed up the pan/zoom constraints for phone */}
      <TransformWrapper
        centerContent={true}
        limitToWrapperBounds={false}
        minScale={0.5} // user can zoom out further if phone is smaller
        maxScale={4}
        initialScale={0.8} // slightly zoomed out initially
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
            {/* If path is set, draw the line + arrow */}
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
