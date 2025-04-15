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

// Create driver with encryption off for local dev
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
  // We convert angle to compass-like text: N,S,E,W, NE, NW, etc.
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180
  const dirText = angleToCardinal(angleDeg);

  return { distance: dist, direction: dirText };
}

/** Convert angle (degrees, -180..180) to a rough cardinal/intercardinal string */
function angleToCardinal(angleDeg) {
  // normalize to 0..360
  let a = (angleDeg + 360) % 360;
  // define each segment of 45 deg
  //    0=E, 45=NE, 90=N, 135=NW, 180=W, 225=SW, 270=S, 315=SE
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
 *
 * We'll call:
 *   POST /api/neo4j/calc-path
 *   with JSON {startId, endId}
 *
 * Steps:
 *   1) find closest "G" node to startId => traversableStart
 *   2) find closest "G" node to endId => traversableEnd
 *   3) run aStar from traversableStart->traversableEnd
 *   4) build final instructions:
 *       - one step from startId->traversableStart
 *       - the aStar path steps
 *       - one step from traversableEnd->endId
 *     and final nodeSequence with start + path + end
 */
router.post("/calc-path", async (req, res) => {
  const { startId, endId } = req.body;
  if (!startId || !endId) {
    return res.status(400).json({ error: "startId and endId required" });
  }

  const session = driver.session();

  try {
    // 1) find Node {id:startId}, Node {id:endId},
    //    find closest "G" node to each
    //    then run aStar between those "G" nodes
    const query = `
      MATCH (startNode:Node {id:$startId}), (endNode:Node {id:$endId})

      // find closest G node to startId
      WITH startNode, endNode
      MATCH (ts:Node)
      WHERE ts.id STARTS WITH 'G'
      WITH startNode, endNode, ts
      ORDER BY distance(
        point({x:startNode.x, y:startNode.y}),
        point({x:ts.x, y:ts.y})
      ) ASC
      LIMIT 1
      WITH startNode, endNode, ts AS traversableStart

      // find closest G node to endId
      MATCH (te:Node)
      WHERE te.id STARTS WITH 'G'
      WITH startNode, endNode, traversableStart, te
      ORDER BY distance(
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

    // from the single record
    const record = result.records[0];
    const astarPath = record.get("path");
    const totalWeight = record.get("weight");

    const neo4jStartNode = record.get("startNode").properties;
    const neo4jEndNode = record.get("endNode").properties;
    const travStartNode = record.get("traversableStart").properties;
    const travEndNode = record.get("traversableEnd").properties;

    // Build the segments from the aStar path
    // path.segments => array
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

    // 2) Build nodeSequence from travStart->travEnd path
    const nodeSequence = [];
    // First node in aStar path
    nodeSequence.push({
      id: pathSegments[0].from.id,
      x: pathSegments[0].from.x,
      y: pathSegments[0].from.y,
      type: pathSegments[0].from.type,
    });
    for (let seg of pathSegments) {
      nodeSequence.push({
        id: seg.to.id,
        x: seg.to.x,
        y: seg.to.y,
        type: seg.to.type,
      });
    }

    // 3) Build instructions for aStar portion
    const aStarInstructions = [];
    aStarInstructions.push(`(A*) Start at ${pathSegments[0].from.id}`);
    pathSegments.forEach((seg) => {
      // if seg.direction is stored in DB, we can use it:
      let useDir = seg.direction;
      let useDist = seg.distance;
      // If direction is not stored, we can compute from seg.from.x,y -> seg.to.x,y
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

    // 4) Now handle the first step: user startId => traversableStart
    // If the user startId is different from traversableStart
    let firstStepInstructions = [];
    let extraDistance1 = 0;
    if (neo4jStartNode.id !== travStartNode.id) {
      // compute direction & distance
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

    // 5) Now the last step: traversableEnd => user endId
    let lastStepInstructions = [];
    let extraDistance2 = 0;
    if (neo4jEndNode.id !== travEndNode.id) {
      // compute direction & distance
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

    // 6) Combine instructions
    // We'll do:
    //  - "Start at startId"
    //  - firstStepInstructions
    //  - aStarInstructions
    //  - lastStepInstructions
    //  - "Arrived at endId"
    const finalInstructions = [];
    finalInstructions.push(`Start at ${neo4jStartNode.id}`);
    firstStepInstructions.forEach((instr) => finalInstructions.push(instr));
    // if we actually used travStart->travEnd path
    if (pathSegments.length > 0) {
      // skip the "(A*) Start at..." from the aStar portion
      // so we don't confuse the user with multiple "start" instructions
      // just push the aStar steps except the first line
      for (let i = 1; i < aStarInstructions.length; i++) {
        finalInstructions.push(aStarInstructions[i]);
      }
    }
    lastStepInstructions.forEach((instr) => finalInstructions.push(instr));
    finalInstructions.push(`Arrived at ${neo4jEndNode.id}`);

    // 7) Build the final nodeSequence:
    //   startId => travStart => [any aStar nodes except travStart if repeated] => travEnd => endId
    const finalNodeSequence = [];
    // Always push the real start first
    finalNodeSequence.push({
      id: neo4jStartNode.id,
      x: parseFloat(neo4jStartNode.x),
      y: parseFloat(neo4jStartNode.y),
      type: neo4jStartNode.type || "",
    });

    // If different, add travStart
    if (neo4jStartNode.id !== travStartNode.id) {
      finalNodeSequence.push({
        id: travStartNode.id,
        x: parseFloat(travStartNode.x),
        y: parseFloat(travStartNode.y),
        type: travStartNode.type || "",
      });
    }

    // Insert the aStar path nodes, skipping the first if it duplicates travStart
    nodeSequence.forEach((nd, idx) => {
      // skip the first if it's the same as travStart
      if (idx === 0 && nd.id === travStartNode.id) {
        return;
      }
      finalNodeSequence.push({
        id: nd.id,
        x: parseFloat(nd.x),
        y: parseFloat(nd.y),
        type: nd.type || "",
      });
    });

    // If travEnd is different from end, we add end
    if (neo4jEndNode.id !== travEndNode.id) {
      finalNodeSequence.push({
        id: neo4jEndNode.id,
        x: parseFloat(neo4jEndNode.x),
        y: parseFloat(neo4jEndNode.y),
        type: neo4jEndNode.type || "",
      });
    }

    // 8) Summation of total distance
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
