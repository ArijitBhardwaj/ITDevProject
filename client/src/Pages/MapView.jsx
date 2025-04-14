import React, { useEffect, useState, useRef } from "react";
import { Box } from "@mui/material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import mapImage from "../assets/vcc_floor1_grid.png";

/**
 * Convert campus-coord path => 512x512 image-coord path
 */
function scaleCoordinatesForImage(nodes) {
  return nodes.map(([x, y]) => {
    // same logic from your code
    let scaledX = x * (256 / 20) + 256;
    let scaledY = y * (256 / 20) * -1 + 256;
    return [scaledX, scaledY];
  });
}

/**
 * Basic 2D Euclidean distance
 */
function distance2D(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Build an array of segments for the polyline
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
      cumulativeDist: cumulative, // total distance up to end of this segment
    });
  }
  return segments;
}

/**
 * Return x,y,angle for the arrow given "dist" along the entire polyline
 */
function getPointAtDistance(segments, dist) {
  if (segments.length === 0) {
    return { x: 0, y: 0, angle: 0 };
  }

  const totalLength = segments[segments.length - 1].cumulativeDist;
  // clamp dist to [0..totalLength] if needed
  if (dist >= totalLength) {
    // end of path
    let last = segments[segments.length - 1];
    return {
      x: last.x2,
      y: last.y2,
      angle: angleBetween(last.x1, last.y1, last.x2, last.y2),
    };
  }

  // find which segment has "dist"
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const startDist = i === 0 ? 0 : segments[i - 1].cumulativeDist;
    const endDist = seg.cumulativeDist;

    if (dist >= startDist && dist <= endDist) {
      const segFrac = (dist - startDist) / seg.length; // 0..1
      const x = seg.x1 + (seg.x2 - seg.x1) * segFrac;
      const y = seg.y1 + (seg.y2 - seg.y1) * segFrac;
      const angle = angleBetween(seg.x1, seg.y1, seg.x2, seg.y2);
      return { x, y, angle };
    }
  }

  // fallback: last point
  let last = segments[segments.length - 1];
  return {
    x: last.x2,
    y: last.y2,
    angle: angleBetween(last.x1, last.y1, last.x2, last.y2),
  };
}

/** Angle in degrees for arrow from (x1,y1) to (x2,y2) */
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

  // build the path + start or stop animation
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

    // 1) scale coords
    const coords = nodeSequence.map((n) => [n.x, n.y]);
    const scaled = scaleCoordinatesForImage(coords);
    setRenderPoints(scaled);

    // 2) build segments
    const segs = buildSegments(scaled);
    setSegments(segs);

    // 3) start indefinite arrow animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    let startTime = performance.now();
    const totalDist = segs.length ? segs[segs.length - 1].cumulativeDist : 0;
    const duration = 8000; // 8 seconds for entire path

    function animateArrow(timestamp) {
      let elapsed = timestamp - startTime;
      let t = (elapsed % duration) / duration;
      // we use modulo (%) so that it loops continuously

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

  // polyline string
  const pointsString = renderPoints.map((pt) => pt.join(",")).join(" ");

  // arrow config
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
                {/* The path line */}
                <polyline
                  points={pointsString}
                  style={{ fill: "none", stroke: "blue", strokeWidth: 2.5 }}
                />

                {/* The looping arrow marker */}
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
