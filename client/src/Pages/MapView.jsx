import React, { useEffect, useState, useRef } from "react";
import { Box } from "@mui/material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import mapImage from "../assets/vcc_floor1_grid.png";

/**
 * Convert your path node coordinates (campus coords) -> 512x512 image space
 */
function scaleCoordinatesForImage(nodes) {
  return nodes.map(([x, y]) => {
    // The same logic you had:
    //   multiply by (256/20), shift +256, invert y +256
    let scaledX = x * (256 / 20) + 256;
    let scaledY = y * (256 / 20) * -1 + 256;
    return [scaledX, scaledY];
  });
}

/**
 * Basic Euclidian distance between two [x,y] points
 */
function distance2D(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Build an array of segments for the polyline,
 * each item: { x1, y1, x2, y2, length, cumulativeDist }
 */
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
      // How far from the start of the path up to end of this segment
      cumulativeDist: cumulative,
    });
  }
  return segments;
}

/**
 * Given a distance "dist" along the path, find x,y on the polyline.
 * Also compute a small angle for arrow rotation so it points in the direction of travel.
 */
function getPointAtDistance(segments, dist) {
  if (segments.length === 0) {
    // No path => default marker at (0,0), rotation=0
    return { x: 0, y: 0, angle: 0 };
  }

  // If dist is beyond or at the end, snap to last segment end
  const totalLength = segments[segments.length - 1].cumulativeDist;
  if (dist >= totalLength) {
    let last = segments[segments.length - 1];
    return {
      x: last.x2,
      y: last.y2,
      angle: angleBetween(last.x1, last.y1, last.x2, last.y2),
    };
  }

  // Otherwise, find the segment containing "dist"
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const startDist = i === 0 ? 0 : segments[i - 1].cumulativeDist;
    const endDist = seg.cumulativeDist;

    if (dist >= startDist && dist <= endDist) {
      // We are within this segment
      const segFrac = (dist - startDist) / seg.length; // 0..1
      const x = seg.x1 + (seg.x2 - seg.x1) * segFrac;
      const y = seg.y1 + (seg.y2 - seg.y1) * segFrac;
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

/** Compute angle in degrees from (x1,y1)->(x2,y2) for arrow rotation */
function angleBetween(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  // angle in radians
  const rad = Math.atan2(dy, dx);
  // convert to degrees
  let deg = (rad * 180) / Math.PI;
  return deg;
}

export default function MapView({ nodeSequence }) {
  const [renderPoints, setRenderPoints] = useState([]);
  const [segments, setSegments] = useState([]);
  const [arrowPos, setArrowPos] = useState({ x: 0, y: 0, angle: 0 });
  const animationRef = useRef(null);

  // Build the path points
  useEffect(() => {
    if (!nodeSequence || nodeSequence.length === 0) {
      setRenderPoints([]);
      setSegments([]);
      setArrowPos({ x: 0, y: 0, angle: 0 });
      // Also stop any old animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // 1) scale node coords to image coords
    const coords = nodeSequence.map((n) => [n.x, n.y]);
    const scaled = scaleCoordinatesForImage(coords);
    setRenderPoints(scaled);

    // 2) build segments
    const segs = buildSegments(scaled);
    setSegments(segs);

    // 3) start arrow animation from 0..distance
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    let startTime = performance.now();
    let totalDist = segs.length ? segs[segs.length - 1].cumulativeDist : 0;
    let duration = 8000; // 8 seconds total. Adjust as you prefer.

    function animateArrow(timestamp) {
      let elapsed = timestamp - startTime;
      let t = elapsed / duration;
      if (t > 1) t = 1;
      let dist = t * totalDist;

      let { x, y, angle } = getPointAtDistance(segs, dist);
      setArrowPos({ x, y, angle });

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animateArrow);
      }
    }
    animationRef.current = requestAnimationFrame(animateArrow);

    // cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [nodeSequence]);

  // polyline string
  const pointsString = renderPoints.map((pt) => pt.join(",")).join(" ");

  // Marker offset so arrow's center lines up nicely
  // We'll use `transform` with `translate(-8, -8)` to center the arrow on x,y
  const arrowSize = 16;

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
      <TransformWrapper
        minScale={1}
        maxScale={4}
        initialScale={1}
        limitToWrapperBounds
        centerContent
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
            {/* If we have a path, draw it with an SVG overlay */}
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

                {/* Animated arrow marker */}
                <g
                  transform={`
                    translate(${arrowPos.x}, ${arrowPos.y})
                    rotate(${arrowPos.angle})
                    translate(${-arrowSize / 2}, ${-arrowSize / 2})
                  `}
                >
                  {/* Simple arrow shape: a small polygon, or you can use a circle */}
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
