/**
 * neo4jRoutes.js
 * Fixed version with proper function order and error handling
 */

const express = require("express");
const router = express.Router();
const neo4j = require("neo4j-driver");

// Connect to Neo4j
const driver = neo4j.driver(
  "neo4j+s://0bd9eb92.databases.neo4j.io",
  neo4j.auth.basic("neo4j", "si5lTkftMBNyESFG-hGczn5QThMCdNYml_E2WO9PjEk")
);

// Utility functions moved before route handler
function computeDistanceAndDirection(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return {
    distance: dist,
    direction: angleToCardinal(angleDeg),
  };
}

function angleToCardinal(angleDeg) {
  const directions = [
    [-22.5, 22.5, "east"],
    [22.5, 67.5, "northeast"],
    [67.5, 112.5, "north"],
    [112.5, 157.5, "northwest"],
    [157.5, 202.5, "west"],
    [202.5, 247.5, "southwest"],
    [247.5, 292.5, "south"],
    [292.5, 337.5, "southeast"],
  ];

  const normalized = (angleDeg + 360) % 360;
  return (
    directions.find(
      ([min, max]) => normalized >= min && normalized < max
    )?.[2] || "east"
  );
}

router.post("/calc-path", async (req, res) => {
  const { startId, endId } = req.body;
  if (!startId || !endId) {
    return res.status(400).json({ error: "startId and endId required" });
  }

  const session = driver.session();
  try {
    const query = `
      MATCH (startNode:Node {id:$startId}), (endNode:Node {id:$endId})

      WITH startNode, endNode
      MATCH (ts:Node)
      WHERE ts.id STARTS WITH 'G'
      ORDER BY point.distance(startNode.point, ts.point) ASC
      LIMIT 1
      WITH startNode, endNode, ts AS traversableStart

      MATCH (te:Node)
      WHERE te.id STARTS WITH 'G'
      ORDER BY point.distance(endNode.point, te.point) ASC
      LIMIT 1
      WITH startNode, endNode, traversableStart, te AS traversableEnd

      CALL apoc.algo.aStar(
        traversableStart,
        traversableEnd,
        "G_CONNECTED",
        "distance",
        "x",
        "y"
      ) YIELD path, weight

      RETURN startNode, endNode, traversableStart, traversableEnd, path, weight
    `;

    const result = await session.run(query, { startId, endId });

    if (result.records.length === 0) {
      return res.status(404).json({ error: "No path found." });
    }

    const record = result.records[0];
    const astarPath = record.get("path");
    const totalWeight = record.get("weight");

    const neo4jStartNode = record.get("startNode").properties;
    const neo4jEndNode = record.get("endNode").properties;
    const travStartNode = record.get("traversableStart").properties;
    const travEndNode = record.get("traversableEnd").properties;

    // Process path segments
    const pathSegments = astarPath.segments.map((seg) => {
      const s = seg.start.properties;
      const e = seg.end.properties;
      const rel = seg.relationship.properties;
      return {
        from: {
          id: s.id,
          x: parseFloat(s.x),
          y: parseFloat(s.y),
          type: s.type || "",
        },
        to: {
          id: e.id,
          x: parseFloat(e.x),
          y: parseFloat(e.y),
          type: e.type || "",
        },
        distance: parseFloat(rel.distance),
        direction: rel.direction,
      };
    });

    // Build node sequence and instructions
    const aStarNodes = [];
    const aStarInstr = [];

    if (pathSegments.length > 0) {
      aStarNodes.push(pathSegments[0].from);
      aStarInstr.push(`(A*) Start at ${pathSegments[0].from.id}`);

      pathSegments.forEach((seg, index) => {
        aStarNodes.push(seg.to);
        const dir =
          seg.direction ||
          computeDistanceAndDirection(
            seg.from.x,
            seg.from.y,
            seg.to.x,
            seg.to.y
          ).direction;

        aStarInstr.push(
          `Walk ${dir} for ${seg.distance.toFixed(1)}m toward ${seg.to.id}`
        );

        if (index === pathSegments.length - 1) {
          aStarInstr.push(`(A*) Arrived at ${seg.to.id}`);
        }
      });
    }

    // Handle start/end connections
    const [firstSteps, lastSteps] = [[], []];
    let [extraDist1, extraDist2] = [0, 0];

    if (neo4jStartNode.id !== travStartNode.id) {
      const startDist = computeDistanceAndDirection(
        parseFloat(neo4jStartNode.x),
        parseFloat(neo4jStartNode.y),
        parseFloat(travStartNode.x),
        parseFloat(travStartNode.y)
      );
      extraDist1 = startDist.distance;
      firstSteps.push(
        `Walk ${startDist.direction} for ${startDist.distance.toFixed(
          1
        )}m toward ${travStartNode.id}`
      );
    }

    if (neo4jEndNode.id !== travEndNode.id) {
      const endDist = computeDistanceAndDirection(
        parseFloat(travEndNode.x),
        parseFloat(travEndNode.y),
        parseFloat(neo4jEndNode.x),
        parseFloat(neo4jEndNode.y)
      );
      extraDist2 = endDist.distance;
      lastSteps.push(
        `Walk ${endDist.direction} for ${endDist.distance.toFixed(1)}m toward ${
          neo4jEndNode.id
        }`
      );
    }

    // Compile final output
    const finalInstructions = [
      `Start at ${neo4jStartNode.id}`,
      ...firstSteps,
      ...(pathSegments.length > 0 ? aStarInstr.slice(1) : []),
      ...lastSteps,
      `Arrived at ${neo4jEndNode.id}`,
    ];

    const finalNodeSequence = [
      {
        id: neo4jStartNode.id,
        x: parseFloat(neo4jStartNode.x),
        y: parseFloat(neo4jStartNode.y),
        type: neo4jStartNode.type || "",
      },
      ...(neo4jStartNode.id !== travStartNode.id
        ? [
            {
              id: travStartNode.id,
              x: parseFloat(travStartNode.x),
              y: parseFloat(travStartNode.y),
              type: travStartNode.type || "",
            },
          ]
        : []),
      ...aStarNodes.slice(1).map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        type: n.type || "",
      })),
      ...(neo4jEndNode.id !== travEndNode.id
        ? [
            {
              id: neo4jEndNode.id,
              x: parseFloat(neo4jEndNode.x),
              y: parseFloat(neo4jEndNode.y),
              type: neo4jEndNode.type || "",
            },
          ]
        : []),
    ];

    return res.json({
      success: true,
      totalDistance: totalWeight + extraDist1 + extraDist2,
      instructions: finalInstructions,
      nodeSequence: finalNodeSequence,
    });
  } catch (err) {
    console.error("Error in calc-path:", err);
    return res.status(500).json({
      error: err.message.startsWith("Neo4jError: ")
        ? err.message.split(": ")[1]
        : "Internal server error",
    });
  } finally {
    await session.close();
  }
});

module.exports = router;
