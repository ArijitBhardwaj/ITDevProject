import React, { useEffect, useState, useRef } from "react";
import { Box } from "@mui/material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import mapImage from "../assets/vcc_floor1_grid.png";

/** Convert campus coords -> [0..512] space for the path lines. */
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

/** Build array of segments for arrow animation. */
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

/** Return x,y,angle if traveling dist along the polyline. */
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

/** Angle in degrees from (x1,y1) to (x2,y2). */
function angleBetween(x1, y1, x2, y2) {
  const rad = Math.atan2(y2 - y1, x2 - x1);
  return (rad * 180) / Math.PI;
}

/**
 * A fully responsive "square" container that fits phone width,
 * with a 1:1 aspect ratio (via paddingTop hack).
 * No snapping left. Freed up panning/zoom for phone.
 */
export default function MapView({ nodeSequence }) {
  const [renderPoints, setRenderPoints] = useState([]);
  const [segments, setSegments] = useState([]);
  const [arrowPos, setArrowPos] = useState({ x: 0, y: 0, angle: 0 });
  const animationRef = useRef(null);

  useEffect(() => {
    if (!nodeSequence || nodeSequence.length === 0) {
      // Clear data if no path
      setRenderPoints([]);
      setSegments([]);
      setArrowPos({ x: 0, y: 0, angle: 0 });
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // 1) scale node coords
    const coords = nodeSequence.map((n) => [n.x, n.y]);
    const scaled = scaleCoordinatesForImage(coords);
    setRenderPoints(scaled);

    // 2) build segments for arrow anim
    const segs = buildSegments(scaled);
    setSegments(segs);

    // 3) infinite arrow loop
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    const startTime = performance.now();
    const totalDist = segs.length ? segs[segs.length - 1].cumulativeDist : 0;
    const duration = 8000; // 8s for full loop

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

  // Prepare polyline string
  const pointsString = renderPoints.map((pt) => pt.join(",")).join(" ");
  const arrowSize = 16;

  return (
    // 1) Outer container: max 512 wide, centered
    <div style={{ width: "100%", maxWidth: "512px", margin: "0 auto" }}>
      {/* 2) Aspect ratio trick: 1:1 square by paddingTop: "100%" */}
      <div style={{ width: "100%", paddingTop: "100%", position: "relative" }}>
        {/* 3) The absolute container that holds everything */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            overflow: "hidden",
            borderRadius: "8px",
            backgroundColor: "#ccc",
          }}
        >
          {/* Freed up transform constraints => no snap. */}
          <TransformWrapper
            centerContent={false}
            limitToWrapperBounds={false}
            minScale={0.5}
            maxScale={4}
            initialScale={1}
          >
            <TransformComponent>
              {/* 
                  This div is 512x512 in the 'virtual' coordinate space,
                  but will scale/fit into the parent's aspect ratio container. 
               */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  position: "relative",
                  backgroundImage: `url(${mapImage})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
              >
                {renderPoints.length > 0 && (
                  // 4) The path overlay in an <svg>
                  <svg
                    width="100%"
                    height="100%"
                    // We'll use viewBox so the 512×512 lines are scaled to fill the container
                    viewBox="0 0 512 512"
                    preserveAspectRatio="xMidYMid meet"
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
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>
      </div>
    </div>
  );
}
