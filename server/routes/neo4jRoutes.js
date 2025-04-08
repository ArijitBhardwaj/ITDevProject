/**
 * neo4jRoutes.js
 *
 * Provides an endpoint to compute path between two nodes using APOC's aStar.
 */

const express = require("express");
const router = express.Router();
const neo4j = require("neo4j-driver");

// Create driver with encryption off for local dev
const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "12345678"),
  {
    encrypted: "ENCRYPTION_OFF",
    trust: "TRUST_ALL_CERTIFICATES",
  }
);

/*
 We'll call:
 MATCH (start:Node {id: $startId}), (end:Node {id: $endId})
 CALL apoc.algo.aStar(
   start, 
   end, 
   "CONNECTED", 
   "distance", 
   "x", 
   "y"
 ) YIELD path, weight
 RETURN path, weight

 Important: We removed the extra "distance" argument at the end,
 because apoc.algo.aStar expects exactly 6 arguments.
*/
router.post("/calc-path", async (req, res) => {
  const { startId, endId } = req.body;
  if (!startId || !endId) {
    return res.status(400).json({ error: "startId and endId required" });
  }

  const session = driver.session();

  try {
    const query = `
      MATCH (start:Node {id: $startId}), (end:Node {id: $endId})
      CALL apoc.algo.aStar(
        start, 
        end, 
        "CONNECTED", 
        "distance", 
        "x", 
        "y"
      ) YIELD path, weight
      RETURN path, weight
    `;

    const result = await session.run(query, { startId, endId });
    if (result.records.length === 0) {
      return res.status(404).json({ error: "No path found" });
    }

    // Extract the path & total distance
    const record = result.records[0];
    const path = record.get("path");
    const totalDistance = record.get("weight");

    // path is a Path object with segments
    // Let's parse the segments to build instructions + list of traversable boxes
    const segments = path.segments.map((segment) => {
      const startNode = segment.start.properties;
      const endNode = segment.end.properties;
      const rel = segment.relationship.properties;

      return {
        from: {
          id: startNode.id,
          x: startNode.x,
          y: startNode.y,
          type: startNode.type,
        },
        to: {
          id: endNode.id,
          x: endNode.x,
          y: endNode.y,
          type: endNode.type,
        },
        distance: rel.distance,
        direction: rel.direction,
      };
    });

    // Build textual instructions
    const instructions = [];
    instructions.push(`Start at ${segments[0].from.id}`);
    segments.forEach((seg) => {
      instructions.push(
        `Walk ${seg.direction} for ${seg.distance.toFixed(1)}m toward ${
          seg.to.id
        }`
      );
    });
    instructions.push(`Arrived at ${segments[segments.length - 1].to.id}`);

    // Also gather an array of "traversable boxes" or all nodes
    const nodeSequence = [];
    nodeSequence.push({
      id: segments[0].from.id,
      x: segments[0].from.x,
      y: segments[0].from.y,
      type: segments[0].from.type,
    });
    segments.forEach((seg) => {
      nodeSequence.push({
        id: seg.to.id,
        x: seg.to.x,
        y: seg.to.y,
        type: seg.to.type,
      });
    });

    return res.json({
      success: true,
      totalDistance,
      instructions,
      nodeSequence,
    });
  } catch (err) {
    console.error("Error in calc-path:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

module.exports = router;
