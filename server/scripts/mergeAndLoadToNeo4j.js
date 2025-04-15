/**
 * mergeAndLoadToNeo4j.js
 *
 * 1. Loads JSON files from /maps
 * 2. Merges them into a single array of nodes (with type, coordinates, etc.)
 * 3. Connects nodes that are within a threshold distance
 * 4. Writes them into Neo4j (one node for each coordinate, relationships for edges).
 */

const fs = require("fs");
const path = require("path");
const neo4j = require("neo4j-driver");

// 1) Load JSON Files
const traversable = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../maps/traversable.json"), "utf-8")
);
const landmarks = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../maps/landmark.json"), "utf-8")
);
const stairs = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../maps/stairs.json"), "utf-8")
);
const elevator = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../maps/elevator.json"), "utf-8")
);
const washroom = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../maps/washroom.json"), "utf-8")
);
const room = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../maps/room.json"), "utf-8")
);
const uniWashroom = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../maps/universal_washroom.json"),
    "utf-8"
  )
);
const reference = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../maps/reference.json"), "utf-8")
);

// 2) Combine into single array
let allNodes = [];

// Helper to push data with a default 'type'
function pushData(arr, defaultType) {
  arr.forEach((item) => {
    allNodes.push({
      id: item.id,
      type: item.type || defaultType, // fallback if not provided
      coordinates: item.coordinates,
    });
  });
}

// Pushing data with relevant types
pushData(traversable, "traversable");
pushData(landmarks, "landmark");
pushData(stairs, "stairs");
pushData(elevator, "elevator");
pushData(washroom, "washroom");
pushData(room, "room");
pushData(uniWashroom, "universal_washroom");
pushData(reference, "reference");

console.log("Total nodes loaded:", allNodes.length);

// 3) Define threshold for adjacency
const THRESHOLD = 1.3; // adjust based on your grid spacing

// 4) Function to compute Euclidean distance
function euclideanDist(a, b) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

// 5) Function to compute rough cardinal direction from dx, dy
function getDirection(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  if (angle >= -22.5 && angle < 22.5) return "east";
  if (angle >= 22.5 && angle < 67.5) return "northeast";
  if (angle >= 67.5 && angle < 112.5) return "north";
  if (angle >= 112.5 && angle < 157.5) return "northwest";
  if (angle >= 157.5 || angle < -157.5) return "west";
  if (angle >= -157.5 && angle < -112.5) return "southwest";
  if (angle >= -112.5 && angle < -67.5) return "south";
  if (angle >= -67.5 && angle < -22.5) return "southeast";
  return "east"; // fallback
}

// 6) Connect to Neo4j (turn encryption off for dev)
const driver = neo4j.driver(
  "neo4j+s://0bd9eb92.databases.neo4j.io", // from Aura
  neo4j.auth.basic("neo4j", "si5lTkftMBNyESFG-hGczn5QThMCdNYml_E2WO9PjEk")
  // For Aura, encryption is on by default, so you do NOT need extra config
);

(async function main() {
  const session = driver.session();

  try {
    // Clean up old data (be careful in production!)
    await session.run(`MATCH (n) DETACH DELETE n`);
    console.log("Deleted old data, now creating new nodes...");

    // 7) Create allNodes as Neo4j nodes
    for (const node of allNodes) {
      await session.run(
        `
        CREATE (n:Node {
          id: $id,
          type: $type,
          x: $x,
          y: $y
        })
        `,
        {
          id: node.id,
          type: node.type,
          x: node.coordinates.x,
          y: node.coordinates.y,
        }
      );
    }

    console.log("All nodes created. Now creating relationships...");

    // 8) Create adjacency relationships
    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i + 1; j < allNodes.length; j++) {
        const A = allNodes[i];
        const B = allNodes[j];

        const dist = euclideanDist(A.coordinates, B.coordinates);
        if (dist <= THRESHOLD) {
          const dirAB = getDirection(A.coordinates, B.coordinates);
          const dirBA = getDirection(B.coordinates, A.coordinates);

          await session.run(
            `
            MATCH (a:Node {id: $idA}), (b:Node {id: $idB})
            CREATE (a)-[:CONNECTED {
              distance: $dist,
              direction: $dirAB
            }]->(b),
                   (b)-[:CONNECTED {
              distance: $dist,
              direction: $dirBA
            }]->(a)
            `,
            {
              idA: A.id,
              idB: B.id,
              dist,
              dirAB,
              dirBA,
            }
          );
        }
      }
    }

    console.log("Relationships created successfully!");
  } catch (err) {
    console.error("Error merging/loading data to Neo4j:", err);
  } finally {
    await session.close();
    await driver.close();
  }
})();
