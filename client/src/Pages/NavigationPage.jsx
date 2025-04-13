import React, { useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Container,
  Button,
  InputAdornment,
  Grid,
  Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import RoomPreferencesIcon from "@mui/icons-material/RoomPreferences";
import QrScannerModal from "../components/QRScannerModal";
import MapView from "./MapView"; // import the updated MapView

const NavigationPage = () => {
  const [currentLocation, setCurrentLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [isInitializingScanner, setIsInitializingScanner] = useState(false);

  const [instructions, setInstructions] = useState([]);
  const [nodeSequence, setNodeSequence] = useState([]); // path data

  // Demo rooms
  const dummyRooms = [
    "Room A101",
    "Room B203",
    "Room C301",
    "Room D410",
    "Room G338",
    "Washroom 219A",
    "Security Office",
    "Lecture Hall 4",
    "Meeting Room",
  ];
  const filteredRooms = dummyRooms.filter((room) =>
    room.toLowerCase().includes(destination.toLowerCase())
  );

  const handleStartScan = async () => {
    try {
      setIsInitializingScanner(true);
      setScanError(null);

      const permissions = await navigator.permissions.query({ name: "camera" });
      if (permissions.state === "denied") {
        throw new Error(
          "Camera access blocked. Please enable in browser settings."
        );
      }
      setShowScanner(true);
    } catch (error) {
      setScanError(error.message);
    } finally {
      setIsInitializingScanner(false);
    }
  };

  const handleScan = (data) => {
    const validCodes = ["G138", "B2", "C3", "D4"];
    if (validCodes.includes(data)) {
      setCurrentLocation(data);
      setShowScanner(false);
      setScanError(null);
    } else {
      setScanError("Invalid QR code. Please scan A1/B2/C3/D4.");
      setShowScanner(false);
    }
  };

  // POST to your Neo4j route
  const handleGetDirections = async () => {
    if (!currentLocation || !destination) {
      setScanError("Please scan your location and type a destination.");
      return;
    }
    try {
      setScanError(null);
      setInstructions([]);
      setNodeSequence([]);

      const response = await fetch(
        "http://192.168.1.67:5001/api/neo4j/calc-path",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startId: currentLocation,
            endId: destination,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      if (!data.success) {
        throw new Error("Path not found or unknown error.");
      }

      // success
      setInstructions(data.instructions || []);
      setNodeSequence(data.nodeSequence || []);
    } catch (error) {
      setScanError(error.message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #fdfbfb, #ebedee)",
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        {/* We'll place the map at the top in a Paper container */}
        <Paper
          elevation={4}
          sx={{
            borderRadius: "16px",
            mb: 3,
            overflow: "hidden",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            bgcolor: "#e0e0e0",
            color: "#777",
            fontWeight: 500,
          }}
        >
          <MapView nodeSequence={nodeSequence} />
        </Paper>

        {scanError && (
          <Typography color="error" sx={{ mb: 2 }}>
            {scanError}
          </Typography>
        )}

        {/* Current location */}
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Where are you?
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Enter current location (or scan QR)"
            value={currentLocation}
            onChange={(e) => setCurrentLocation(e.target.value)}
          />
          <Button
            variant="outlined"
            startIcon={<QrCodeScannerIcon />}
            onClick={handleStartScan}
            disabled={isInitializingScanner}
          >
            {isInitializingScanner ? "Loading..." : "SCAN QR"}
          </Button>
        </Box>

        {/* Destination */}
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Where do you want to go?
        </Typography>
        <TextField
          fullWidth
          placeholder="Enter destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {/* Example "found rooms" */}
        <Grid container spacing={2}>
          {filteredRooms.map((room, index) => (
            <Grid item xs={6} sm={4} key={index}>
              <Button
                variant="contained"
                fullWidth
                sx={{
                  bgcolor: "#4db6ac",
                  color: "#fff",
                  borderRadius: "12px",
                  boxShadow: 2,
                  textTransform: "none",
                  height: 60,
                  ":hover": { bgcolor: "#00897b" },
                }}
                startIcon={<RoomPreferencesIcon />}
                onClick={() => setDestination(room)}
              >
                {room}
              </Button>
            </Grid>
          ))}
        </Grid>

        {filteredRooms.length === 0 && destination && (
          <Typography
            variant="body1"
            align="center"
            sx={{ mt: 4 }}
            color="text.secondary"
          >
            No matching rooms found
          </Typography>
        )}

        {/* Get Directions Button */}
        <Box sx={{ textAlign: "center", mt: 3 }}>
          <Button variant="contained" onClick={handleGetDirections}>
            GET DIRECTIONS
          </Button>
        </Box>

        {/* Instructions */}
        {instructions.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Instructions:</Typography>
            <ol>
              {instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Box>
        )}

        {/* QR Modal */}
        {showScanner && (
          <Box sx={{ mt: 4 }}>
            <QrScannerModal
              onScan={handleScan}
              onClose={() => setShowScanner(false)}
            />
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default NavigationPage;
