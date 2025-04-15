/**
 * neo4jRoutes.js
 *
 * Provides an endpoint to compute path between two nodes using APOC's aStar,
 * but restricting the main path to traversable nodes (IDs starting with 'G').
 * Then we prepend one step from startId->traversableStart,
 * and append one step from traversableEnd->endId.
 */

const express = require("express");
const router = express.Router();
const neo4j = require("neo4j-driver");

// Create driver (for Aura, encryption is on by default)
const driver = neo4j.driver(
  "neo4j+s://0bd9eb92.databases.neo4j.io",
  neo4j.auth.basic("neo4j", "si5lTkftMBNyESFG-hGczn5QThMCdNYml_E2WO9PjEk")
);

/**
 * Simple helper to compute distance & direction given two nodes
 * (x1,y1) => (x2,y2)
 */
function computeDistanceAndDirection(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // naive angle-based direction
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180
  const dirText = angleToCardinal(angleDeg);

  return { distance: dist, direction: dirText };
}

/** Convert angle (degrees, -180..180) to a rough cardinal/intercardinal string */
function angleToCardinal(angleDeg) {
  let a = (angleDeg + 360) % 360;
  if (a >= 337.5 || a < 22.5) return "east";
  if (a < 67.5) return "northeast";
  if (a < 112.5) return "north";
  if (a < 157.5) return "northwest";
  if (a < 202.5) return "west";
  if (a < 247.5) return "southwest";
  if (a < 292.5) return "south";
  return "southeast";
}

/**
 * POST /api/neo4j/calc-path
 * Input: { startId, endId }
 */
router.post("/calc-path", async (req, res) => {
  const { startId, endId } = req.body;
  if (!startId || !endId) {
    return res.status(400).json({ error: "startId and endId required" });
  }

  const session = driver.session();

  try {
    /**
     * 1) find Node {id:startId}, Node {id:endId}
     * 2) find closest 'G' node to each
     * 3) run aStar from those two 'G' nodes
     */
    const query = `
      MATCH (startNode:Node {id:$startId}), (endNode:Node {id:$endId})

      // find closest G node to startId
      WITH startNode, endNode
      MATCH (ts:Node)
      WHERE ts.id STARTS WITH 'G'
      WITH startNode, endNode, ts
      ORDER BY point.distance(
        point({x:startNode.x, y:startNode.y}),
        point({x:ts.x, y:ts.y})
      ) ASC
      LIMIT 1
      WITH startNode, endNode, ts AS traversableStart

      // find closest G node to endId
      MATCH (te:Node)
      WHERE te.id STARTS WITH 'G'
      WITH startNode, endNode, traversableStart, te
      ORDER BY point.distance(
        point({x:endNode.x, y:endNode.y}),
        point({x:te.x, y:te.y})
      ) ASC
      LIMIT 1
      WITH startNode, endNode, traversableStart, te AS traversableEnd

      CALL apoc.algo.aStar(
        traversableStart, 
        traversableEnd, 
        "CONNECTED", 
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

    // Build segments from the aStar path
    const pathSegments = astarPath.segments.map((segment) => {
      const startProps = segment.start.properties;
      const endProps = segment.end.properties;
      const relProps = segment.relationship.properties;
      return {
        from: {
          id: startProps.id,
          x: startProps.x,
          y: startProps.y,
          type: startProps.type,
        },
        to: {
          id: endProps.id,
          x: endProps.x,
          y: endProps.y,
          type: endProps.type,
        },
        distance: relProps.distance,
        direction: relProps.direction, // might be stored or might be null
      };
    });

    // Build the array of traversable nodes from the aStar path
    const nodeSequence = [];
    nodeSequence.push({
      id: pathSegments[0].from.id,
      x: pathSegments[0].from.x,
      y: pathSegments[0].from.y,
      type: pathSegments[0].from.type,
    });
    pathSegments.forEach((seg) => {
      nodeSequence.push({
        id: seg.to.id,
        x: seg.to.x,
        y: seg.to.y,
        type: seg.to.type,
      });
    });

    // Build instructions for the aStar portion
    const aStarInstructions = [];
    aStarInstructions.push(`(A*) Start at ${pathSegments[0].from.id}`);
    pathSegments.forEach((seg) => {
      let useDir = seg.direction;
      let useDist = seg.distance;
      if (!useDir) {
        const c = computeDistanceAndDirection(
          seg.from.x,
          seg.from.y,
          seg.to.x,
          seg.to.y
        );
        useDir = c.direction;
        useDist = c.distance;
      }
      aStarInstructions.push(
        `Walk ${useDir} for ${useDist.toFixed(1)}m toward ${seg.to.id}`
      );
    });
    aStarInstructions.push(
      `(A*) Arrived at ${pathSegments[pathSegments.length - 1].to.id}`
    );

    // Step from startId => traversableStart
    let firstStepInstructions = [];
    let extraDistance1 = 0;
    if (neo4jStartNode.id !== travStartNode.id) {
      const c = computeDistanceAndDirection(
        parseFloat(neo4jStartNode.x),
        parseFloat(neo4jStartNode.y),
        parseFloat(travStartNode.x),
        parseFloat(travStartNode.y)
      );
      extraDistance1 = c.distance;
      firstStepInstructions.push(
        `Walk ${c.direction} for ${c.distance.toFixed(1)}m toward ${
          travStartNode.id
        }`
      );
    }

    // Step from traversableEnd => endId
    let lastStepInstructions = [];
    let extraDistance2 = 0;
    if (neo4jEndNode.id !== travEndNode.id) {
      const c2 = computeDistanceAndDirection(
        parseFloat(travEndNode.x),
        parseFloat(travEndNode.y),
        parseFloat(neo4jEndNode.x),
        parseFloat(neo4jEndNode.y)
      );
      extraDistance2 = c2.distance;
      lastStepInstructions.push(
        `Walk ${c2.direction} for ${c2.distance.toFixed(1)}m toward ${
          neo4jEndNode.id
        }`
      );
    }

    // Combine final instructions
    const finalInstructions = [];
    finalInstructions.push(`Start at ${neo4jStartNode.id}`);
    firstStepInstructions.forEach((instr) => finalInstructions.push(instr));

    // Add the aStar path if it exists
    if (pathSegments.length > 0) {
      for (let i = 1; i < aStarInstructions.length; i++) {
        finalInstructions.push(aStarInstructions[i]);
      }
    }

    lastStepInstructions.forEach((instr) => finalInstructions.push(instr));
    finalInstructions.push(`Arrived at ${neo4jEndNode.id}`);

    // Build the final nodeSequence: startId -> traversableStart -> aStar path -> traversableEnd -> endId
    const finalNodeSequence = [];
    // Add the real start
    finalNodeSequence.push({
      id: neo4jStartNode.id,
      x: parseFloat(neo4jStartNode.x),
      y: parseFloat(neo4jStartNode.y),
      type: neo4jStartNode.type || "",
    });

    // If different, add traversableStart
    if (neo4jStartNode.id !== travStartNode.id) {
      finalNodeSequence.push({
        id: travStartNode.id,
        x: parseFloat(travStartNode.x),
        y: parseFloat(travStartNode.y),
        type: travStartNode.type || "",
      });
    }

    // Insert the aStar path nodes, skipping the first if it's the same as travStart
    nodeSequence.forEach((nd, idx) => {
      if (idx === 0 && nd.id === travStartNode.id) return;
      finalNodeSequence.push({
        id: nd.id,
        x: parseFloat(nd.x),
        y: parseFloat(nd.y),
        type: nd.type || "",
      });
    });

    // If travEnd is different from endNode
    if (neo4jEndNode.id !== travEndNode.id) {
      finalNodeSequence.push({
        id: neo4jEndNode.id,
        x: parseFloat(neo4jEndNode.x),
        y: parseFloat(neo4jEndNode.y),
        type: neo4jEndNode.type || "",
      });
    }

    // Summation of total distance
    const totalDistance = totalWeight + extraDistance1 + extraDistance2;

    return res.json({
      success: true,
      totalDistance,
      instructions: finalInstructions,
      nodeSequence: finalNodeSequence,
    });
  } catch (err) {
    console.error("Error in calc-path:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

module.exports = router;
