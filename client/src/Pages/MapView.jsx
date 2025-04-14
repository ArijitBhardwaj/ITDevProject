// src/Pages/MapView.jsx
import React, { useEffect, useState, useRef } from "react";
import { Box, GlobalStyles } from "@mui/material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import mapImage from "../assets/vcc_floor1_grid.png";

/** Convert campus coords -> 512x512 image coords */
function scaleCoordinatesForImage(nodes) {
  return nodes.map(([x, y]) => {
    let scaledX = x * (256 / 20) + 256;
    let scaledY = y * (256 / 20) * -1 + 256;
    return [scaledX, scaledY];
  });
}

/** Basic distance */
function distance2D(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Build arrow path segments */
function buildSegments(points) {
  let segs = [];
  let cumulative = 0;
  for (let i = 0; i < points.length - 1; i++) {
    let [x1, y1] = points[i];
    let [x2, y2] = points[i + 1];
    let length = distance2D(x1, y1, x2, y2);
    cumulative += length;
    segs.push({ x1, y1, x2, y2, length, cumulativeDist: cumulative });
  }
  return segs;
}

/** Return (x,y,angle) at dist along polyline */
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

/** angle in degrees from (x1,y1)->(x2,y2) */
function angleBetween(x1, y1, x2, y2) {
  const rad = Math.atan2(y2 - y1, x2 - x1);
  return (rad * 180) / Math.PI;
}

/**
 * Props:
 *   nodeSequence - array of {x,y} for the path
 *   userX, userY, userHeading - real-time user location/orientation
 */
export default function MapView({ nodeSequence, userX, userY, userHeading }) {
  const [renderPoints, setRenderPoints] = useState([]);
  const [segments, setSegments] = useState([]);
  const [arrowPos, setArrowPos] = useState({ x: 0, y: 0, angle: 0 });
  const animationRef = useRef(null);

  const containerSize = 512;

  // Convert the user location to scaled coords
  const [userMarkerPos, setUserMarkerPos] = useState({ x: 0, y: 0 });

  /**
   * Build path arrow
   */
  useEffect(() => {
    if (!nodeSequence || nodeSequence.length === 0) {
      // Clear everything
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

    // 2) build path segments
    const segs = buildSegments(scaled);
    setSegments(segs);

    // 3) arrow anim
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    let startTime = performance.now();
    let totalDist = segs.length ? segs[segs.length - 1].cumulativeDist : 0;
    let duration = 8000; // loop in 8s

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

  /**
   * Convert userX,userY => scaled coords each render
   */
  useEffect(() => {
    if (userX === undefined || userY === undefined) return;
    // same scale formula:
    let sx = userX * (256 / 20) + 256;
    let sy = userY * (256 / 20) * -1 + 256;
    setUserMarkerPos({ x: sx, y: sy });
  }, [userX, userY]);

  const pointsString = renderPoints.map((pt) => pt.join(",")).join(" ");
  const arrowSize = 16;

  const handleTouchStart = (e) => {
    // optional to prevent pinch safari issues
    if (e.touches.length > 1) e.preventDefault();
  };

  return (
    <div>
      <GlobalStyles
        styles={{
          body: {
            "-webkit-user-select": "none",
            "user-select": "none",
          },
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "512px",
          // for height: let's keep 80vh or so:
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
          doubleClick={{ disabled: true }}
        >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ transition: "transform 0.15s ease-out" }}
          >
            {/* The background map is 512x512, but scaled as user zooms */}
            <Box
              sx={{
                width: containerSize,
                height: containerSize,
                position: "relative",
                backgroundImage: `url(${mapImage})`,
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            >
              {/* If path exists, draw it + arrow */}
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
                  {/* arrow animation */}
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

              {/* Real-time user location marker */}
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
                    translate(${userMarkerPos.x}, ${userMarkerPos.y})
                    rotate(${userHeading || 0})
                    translate(-8, -8)
                  `}
                >
                  {/* A small arrow or circle for the user */}
                  <circle r="8" fill="green" opacity="0.7" />
                  <rect
                    width="4"
                    height="12"
                    fill="black"
                    x={2}
                    y={-4}
                    transform="rotate(90,4,6)"
                  />
                </g>
              </svg>
            </Box>
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
}
