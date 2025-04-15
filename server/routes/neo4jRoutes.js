/**
 * neo4jRoutes.js
 *
 * Provides an endpoint to compute path between two nodes using APOC's aStar,
 * restricting the path to "G" nodes in the middle.
 * Then we prepend one step from startId->traversableStart
 * and append one step from traversableEnd->endId, if needed.
 */

const express = require("express");
const router = express.Router();
const neo4j = require("neo4j-driver");

// Connect to your Aura or local Neo4j instance
const driver = neo4j.driver(
  "neo4j+s://0bd9eb92.databases.neo4j.io",
  neo4j.auth.basic("neo4j", "si5lTkftMBNyESFG-hGczn5QThMCdNYml_E2WO9PjEk")
);

/**
 * Utility to compute distance & direction for a single “leg”
 */
function computeDistanceAndDirection(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const dirText = angleToCardinal(angleDeg);
  return { distance: dist, direction: dirText };
}

/**
 * Convert an angle to a simple cardinal/intercardinal text
 * (e.g. -10 => east, 100 => northeast, etc.)
 */
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
 * Body: { startId, endId }
 */
router.post("/calc-path", async (req, res) => {
  const { startId, endId } = req.body;
  if (!startId || !endId) {
    return res.status(400).json({ error: "startId and endId required" });
  }

  const session = driver.session();
  try {
    // 1) Find closest “G” node to startId, and closest “G” node to endId
    // 2) Run aStar *only through G nodes*
    // 3) Build final instructions & nodeSequence

    const query = `
      MATCH (startNode:Node {id:$startId}), (endNode:Node {id:$endId})

      // find closest G node to startId
      WITH startNode, endNode
      MATCH (ts:Node)
      WHERE ts.id STARTS WITH 'G'
      ORDER BY point.distance(
        point({x:startNode.x, y:startNode.y}),
        point({x:ts.x, y:ts.y})
      ) ASC
      LIMIT 1
      WITH startNode, endNode, ts AS traversableStart

      // find closest G node to endId
      MATCH (te:Node)
      WHERE te.id STARTS WITH 'G'
      ORDER BY point.distance(
        point({x:endNode.x, y:endNode.y}),
        point({x:te.x, y:te.y})
      ) ASC
      LIMIT 1
      WITH startNode, endNode, traversableStart, te AS traversableEnd

      // 2) Run aStar restricted to G.* nodes
      CALL apoc.algo.aStar(
        traversableStart,
        traversableEnd,
        "CONNECTED",
        "distance",
        "x",
        "y",
        { nodeFilter: 'n.id =~ "G.*"' }
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
    const pathSegments = astarPath.segments.map((seg) => {
      const s = seg.start.properties;
      const e = seg.end.properties;
      const rel = seg.relationship.properties;
      return {
        from: {
          id: s.id,
          x: s.x,
          y: s.y,
          type: s.type,
        },
        to: {
          id: e.id,
          x: e.x,
          y: e.y,
          type: e.type,
        },
        distance: rel.distance,
        direction: rel.direction,
      };
    });

    // aStar node list
    const aStarNodes = [];
    if (pathSegments.length > 0) {
      aStarNodes.push({
        id: pathSegments[0].from.id,
        x: pathSegments[0].from.x,
        y: pathSegments[0].from.y,
        type: pathSegments[0].from.type,
      });
      for (let seg of pathSegments) {
        aStarNodes.push({
          id: seg.to.id,
          x: seg.to.x,
          y: seg.to.y,
          type: seg.to.type,
        });
      }
    }

    // Build aStar instructions
    const aStarInstr = [];
    if (pathSegments.length > 0) {
      aStarInstr.push(`(A*) Start at ${pathSegments[0].from.id}`);
      pathSegments.forEach((seg) => {
        let dir = seg.direction;
        let dist = seg.distance;
        if (!dir) {
          const c = computeDistanceAndDirection(
            seg.from.x,
            seg.from.y,
            seg.to.x,
            seg.to.y
          );
          dir = c.direction;
          dist = c.distance;
        }
        aStarInstr.push(
          `Walk ${dir} for ${dist.toFixed(1)}m toward ${seg.to.id}`
        );
      });
      aStarInstr.push(
        `(A*) Arrived at ${pathSegments[pathSegments.length - 1].to.id}`
      );
    }

    // Step from real startId => travStart
    let firstSteps = [];
    let extraDist1 = 0;
    if (neo4jStartNode.id !== travStartNode.id) {
      const c = computeDistanceAndDirection(
        parseFloat(neo4jStartNode.x),
        parseFloat(neo4jStartNode.y),
        parseFloat(travStartNode.x),
        parseFloat(travStartNode.y)
      );
      extraDist1 = c.distance;
      firstSteps.push(
        `Walk ${c.direction} for ${c.distance.toFixed(1)}m toward ${
          travStartNode.id
        }`
      );
    }

    // Step from travEnd => real endId
    let lastSteps = [];
    let extraDist2 = 0;
    if (neo4jEndNode.id !== travEndNode.id) {
      const c2 = computeDistanceAndDirection(
        parseFloat(travEndNode.x),
        parseFloat(travEndNode.y),
        parseFloat(neo4jEndNode.x),
        parseFloat(neo4jEndNode.y)
      );
      extraDist2 = c2.distance;
      lastSteps.push(
        `Walk ${c2.direction} for ${c2.distance.toFixed(1)}m toward ${
          neo4jEndNode.id
        }`
      );
    }

    // Combine instructions
    const finalInstructions = [];
    finalInstructions.push(`Start at ${neo4jStartNode.id}`);
    firstSteps.forEach((i) => finalInstructions.push(i));
    // If we have aStar segments, skip the first line "(A*) Start at..."
    if (pathSegments.length > 0) {
      for (let i = 1; i < aStarInstr.length; i++) {
        finalInstructions.push(aStarInstr[i]);
      }
    }
    lastSteps.forEach((i) => finalInstructions.push(i));
    finalInstructions.push(`Arrived at ${neo4jEndNode.id}`);

    // Build final nodeSequence:
    //  [startId, if needed travStart, then aStar nodes skipping duplicates, travEnd, endId]
    const finalNodeSequence = [];
    // real start
    finalNodeSequence.push({
      id: neo4jStartNode.id,
      x: parseFloat(neo4jStartNode.x),
      y: parseFloat(neo4jStartNode.y),
      type: neo4jStartNode.type || "",
    });
    if (neo4jStartNode.id !== travStartNode.id) {
      finalNodeSequence.push({
        id: travStartNode.id,
        x: parseFloat(travStartNode.x),
        y: parseFloat(travStartNode.y),
        type: travStartNode.type || "",
      });
    }
    if (aStarNodes.length > 0) {
      // skip the first if it's exactly travStart
      aStarNodes.forEach((nd, idx) => {
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
    }
    if (neo4jEndNode.id !== travEndNode.id) {
      finalNodeSequence.push({
        id: neo4jEndNode.id,
        x: parseFloat(neo4jEndNode.x),
        y: parseFloat(neo4jEndNode.y),
        type: neo4jEndNode.type || "",
      });
    }

    // Sum total distance
    const totalDistance = totalWeight + extraDist1 + extraDist2;

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
