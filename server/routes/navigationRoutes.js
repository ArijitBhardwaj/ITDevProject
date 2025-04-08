const express = require("express");
const router = express.Router();
const map = require("../testMap.json");

// Pathfinding algorithm implementation
class PathFinder {
  constructor(map) {
    this.nodes = new Map();
    this.buildGraph(map);
  }

  buildGraph(map) {
    // Create nodes
    map.nodes.forEach((node) => {
      this.nodes.set(node.id, {
        ...node,
        neighbors: new Map(),
      });
    });

    // Add edges
    map.edges.forEach((edge) => {
      this.nodes.get(edge.from).neighbors.set(edge.to, {
        distance: edge.distance,
        direction: edge.direction,
      });
      // Add reverse edge for bidirectional paths
      this.nodes.get(edge.to).neighbors.set(edge.from, {
        distance: edge.distance,
        direction: this.reverseDirection(edge.direction),
      });
    });
  }

  reverseDirection(dir) {
    const directions = {
      north: "south",
      south: "north",
      east: "west",
      west: "east",
      northeast: "southwest",
      southwest: "northeast",
      northwest: "southeast",
      southeast: "northwest",
    };
    return directions[dir] || dir;
  }

  aStar(startId, endId) {
    const openSet = new Set([startId]);
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    // Initialize scores
    this.nodes.forEach((node, id) => {
      gScore.set(id, Infinity);
      fScore.set(id, Infinity);
    });
    gScore.set(startId, 0);
    fScore.set(startId, this.heuristic(startId, endId));

    while (openSet.size > 0) {
      const current = this.getLowestFScore(openSet, fScore);
      if (current === endId) return this.reconstructPath(cameFrom, current);

      openSet.delete(current);

      for (const [neighbor, edge] of this.nodes.get(current).neighbors) {
        const tentativeGScore = gScore.get(current) + edge.distance;
        if (tentativeGScore < gScore.get(neighbor)) {
          cameFrom.set(neighbor, { from: current, edge });
          gScore.set(neighbor, tentativeGScore);
          fScore.set(
            neighbor,
            tentativeGScore + this.heuristic(neighbor, endId)
          );
          if (!openSet.has(neighbor)) openSet.add(neighbor);
        }
      }
    }
    throw new Error("No path found");
  }

  heuristic(aId, bId) {
    // Euclidean distance
    const a = this.nodes.get(aId).coordinates;
    const b = this.nodes.get(bId).coordinates;
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  }

  getLowestFScore(openSet, fScore) {
    return Array.from(openSet).reduce((minId, id) =>
      fScore.get(id) < fScore.get(minId) ? id : minId
    );
  }

  reconstructPath(cameFrom, current) {
    const path = [];
    while (cameFrom.has(current)) {
      const entry = cameFrom.get(current);
      path.unshift({
        from: entry.from,
        to: current,
        direction: entry.edge.direction,
        distance: entry.edge.distance,
      });
      current = entry.from;
    }
    return path;
  }
}

// Initialize pathfinder
const pathFinder = new PathFinder(map);

router.post("/calculate-path", (req, res) => {
  const { start, end } = req.body;
  try {
    const path = pathFinder.aStar(start, end);
    const instructions = generateInstructions(path);
    res.json({ success: true, instructions });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

function generateInstructions(path) {
  if (path.length === 0) return [];

  const instructions = [];
  let current = path[0];

  instructions.push(`Start at ${current.from}`);

  path.forEach((step) => {
    instructions.push(
      `Walk ${step.direction} for ${step.distance} meters toward ${step.to}`
    );
  });

  instructions.push(`You have arrived at ${path[path.length - 1].to}`);
  return instructions;
}

module.exports = router;
