import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import mapImage from "../assets/vcc_floor1_grid.png";

/**
 * Transform your node coordinates (x,y) into the displayed map's pixel coordinates.
 * This function is where you do "scale * -1" shifts, etc.
 *
 * Currently it maps a 20×20 campus coordinate region to 512×512 image space,
 * with (0,0) ~ center or top-left offset. Adjust as needed.
 */
function scaleCoordinatesForImage(nodes) {
  return nodes.map(([x, y]) => {
    // The same math you used in older code:
    //  - Multiply by (256/20)
    //  - Shift by +256 in X
    //  - Invert Y (so up is negative) plus 256
    let scaledX = x * (256 / 20) + 256;
    let scaledY = y * (256 / 20) * -1 + 256;
    return [scaledX, scaledY];
  });
}

/**
 * Renders a 512×512 container.
 * - The floor plan is sized with background-size: contain
 * - The path is drawn in an overlapping <svg> also 512×512
 * - We set minScale=1 so you can't zoom out smaller than "fitting" the container exactly.
 * - Only draw the polyline if nodeSequence is non-empty (so "no path" until directions are found).
 */
export default function MapView({ nodeSequence }) {
  const [renderPoints, setRenderPoints] = useState([]);

  useEffect(() => {
    if (!nodeSequence || nodeSequence.length === 0) {
      setRenderPoints([]);
      return;
    }
    // Convert {x,y} array to [ [x,y], ... ] => scaled => store as state
    const coords = nodeSequence.map((n) => [n.x, n.y]);
    const scaled = scaleCoordinatesForImage(coords);
    setRenderPoints(scaled);
  }, [nodeSequence]);

  // polyline expects "x1,y1 x2,y2 ..."
  const pointsString = renderPoints.map((pt) => pt.join(",")).join(" ");

  // 512×512 container; you can change to your image ratio if not square
  const containerSize = 512;

  return (
    <div
      style={{
        width: containerSize + "px",
        height: containerSize + "px",
        margin: "0 auto",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#e0e0e0",
      }}
    >
      <TransformWrapper
        minScale={1} // can't zoom out smaller than "fill container"
        maxScale={4} // can zoom in up to 4x
        initialScale={1} // start fully covering container
        limitToWrapperBounds={true}
        centerContent={true}
      >
        <TransformComponent>
          <Box
            sx={{
              position: "relative",
              width: containerSize,
              height: containerSize,
              backgroundImage: `url(${mapImage})`,
              backgroundSize: "contain", // preserve ratio, contain within 512×512
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
          >
            {/* If we have a path, draw it with an SVG overlay. */}
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
              </svg>
            )}
          </Box>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
