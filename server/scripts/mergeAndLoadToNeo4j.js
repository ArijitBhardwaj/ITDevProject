/**
 * mergeAndLoadToNeo4j.js
 *
 * 1. Loads JSON files from /maps
 * 2. Merges them into a single array of nodes
 * 3. Connects nodes with relationships:
 *    - CONNECTED: All nearby nodes
 *    - G_CONNECTED: Only between G nodes
 * 4. Writes to Neo4j
 */

const fs = require("fs");
const path = require("path");
const neo4j = require("neo4j-driver");

// 1) Load JSON Files
const loadJSON = (filename) =>
  JSON.parse(
    fs.readFileSync(path.join(__dirname, `../maps/${filename}`), "utf-8")
  );

const dataSources = {
  traversable: "traversable.json",
  landmark: "landmark.json",
  stairs: "stairs.json",
  elevator: "elevator.json",
  washroom: "washroom.json",
  room: "room.json",
  universal_washroom: "universal_washroom.json",
  reference: "reference.json",
};

let allNodes = [];

// 2) Combine data with type normalization
Object.entries(dataSources).forEach(([type, file]) => {
  loadJSON(file).forEach((item) => {
    allNodes.push({
      id: item.id,
      type: item.type || type,
      coordinates: item.coordinates,
    });
  });
});

console.log(`Loaded ${allNodes.length} nodes`);

// 3) Connection parameters
const THRESHOLD = 1.5; // meters
const DRIVER_CONFIG = {
  uri: "neo4j+s://0bd9eb92.databases.neo4j.io",
  auth: neo4j.auth.basic(
    "neo4j",
    "si5lTkftMBNyESFG-hGczn5QThMCdNYml_E2WO9PjEk"
  ),
};

// 4) Geometric calculations
const euclideanDist = (a, b) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

const getDirection = (a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

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

  return (
    directions.find(([min, max]) => angle >= min && angle < max)?.[2] || "east"
  );
};

// 5) Database operations
async function main() {
  const driver = neo4j.driver(DRIVER_CONFIG.uri, DRIVER_CONFIG.auth);
  const session = driver.session();

  try {
    // Clear existing data
    await session.run("MATCH (n) DETACH DELETE n");
    console.log("Database cleared");

    // Create all nodes
    const createNode = async (node) => {
      await session.run(
        `
        CREATE (n:Node {
          id: $id,
          type: $type,
          x: $x,
          y: $y,
          point: point({x: $x, y: $y})
        })`,
        {
          id: node.id,
          type: node.type,
          x: node.coordinates.x,
          y: node.coordinates.y,
        }
      );
    };

    console.log("Creating nodes...");
    for (const node of allNodes) {
      await createNode(node);
    }

    // Create relationships
    console.log("Creating relationships...");
    for (let i = 0; i < allNodes.length; i++) {
      const A = allNodes[i];

      for (let j = i + 1; j < allNodes.length; j++) {
        const B = allNodes[j];
        const dist = euclideanDist(A.coordinates, B.coordinates);

        if (dist <= THRESHOLD) {
          const dirAB = getDirection(A.coordinates, B.coordinates);
          const dirBA = getDirection(B.coordinates, A.coordinates);
          const isGConnection = A.id.startsWith("G") && B.id.startsWith("G");

          await session.run(
            `
            MATCH (a:Node {id: $idA}), (b:Node {id: $idB})
            MERGE (a)-[:CONNECTED {
              distance: $dist,
              direction: $dirAB
            }]->(b)
            MERGE (b)-[:CONNECTED {
              distance: $dist,
              direction: $dirBA
            }]->(a)
            ${
              isGConnection
                ? `
            MERGE (a)-[:G_CONNECTED {
              distance: $dist,
              direction: $dirAB
            }]->(b)
            MERGE (b)-[:G_CONNECTED {
              distance: $dist,
              direction: $dirBA
            }]->(a)
            `
                : ""
            }
            `,
            {
              idA: A.id,
              idB: B.id,
              dist: dist.toFixed(2),
              dirAB,
              dirBA,
            }
          );
        }
      }
    }

    console.log("Data load complete!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await session.close();
    await driver.close();
  }
}

// Execute
main();
