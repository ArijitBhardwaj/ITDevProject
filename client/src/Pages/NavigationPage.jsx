import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Typography,
  Container,
  Button,
  InputAdornment,
  Grid,
  Paper,
  IconButton,
  Avatar,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import RoomPreferencesIcon from "@mui/icons-material/RoomPreferences";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useNavigate, useLocation } from "react-router-dom";
import UserProfilePage from "./UserProfilePage";
import QrScannerModal from "../components/QRScannerModal";
import MapView from "./MapView";
import { auth } from "../firebaseConfig";
import { ROOM_COORDINATES } from "../utils/sensorUtils";

export default function NavigationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [isInitializingScanner, setIsInitializingScanner] = useState(false);
  const [instructions, setInstructions] = useState([]);
  const [nodeSequence, setNodeSequence] = useState([]);
  const [initialPosition, setInitialPosition] = useState(null);

  useEffect(() => {
    if (location.state?.destination) {
      setDestination(location.state.destination);
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUserEmail(user.email);
      }
    });

    return () => unsubscribe();
  }, [location]);

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
      const perms = await navigator.permissions.query({ name: "camera" });
      if (perms.state === "denied") {
        throw new Error("Camera is blocked. Check settings.");
      }
      setShowScanner(true);
    } catch (error) {
      setScanError(error.message);
    } finally {
      setIsInitializingScanner(false);
    }
  };

  const handleScan = (data) => {
    setCurrentLocation(data);
    setShowScanner(false);
    setScanError(null);
  };

  const handleGetDirections = async () => {
    if (!currentLocation || !destination) {
      setScanError("Please provide current location & destination.");
      return;
    }
    try {
      setScanError(null);
      setInstructions([]);
      setNodeSequence([]);
      const startCoords = ROOM_COORDINATES[currentLocation];
      if (!startCoords) {
        throw new Error(`Unknown or unmapped location: ${currentLocation}`);
      }
      setInitialPosition(startCoords);

      const res = await fetch("https://itdevprojectbackend.onrender.com/api/neo4j/calc-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startId: currentLocation, endId: destination }),
      });

      const data = await res.json();
      if (data.error || !data.success) {
        throw new Error(data.error || "Path not found or unknown error.");
      }

      setInstructions(data.instructions || []);
      setNodeSequence(data.nodeSequence || []);
    } catch (error) {
      setScanError(error.message);
    }
  };

  const handleStartNavigation = () => {
    navigate("/ongoingnav", {
      state: {
        instructions,
        nodeSequence,
        destination,
        initialPosition,
      },
    });
  };

  const goToProfile = () => {
    navigate("/userProfilePage");
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "#f8f8f8", p: 2 }}>
      {/* Top Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          px: 2,
        }}
      >
        <Typography variant="h6" color="primary">
          Navigation Mode 🧭
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2">{currentUserEmail}</Typography>
          <IconButton onClick={goToProfile}>
            <Avatar>
              <AccountCircleIcon />
            </Avatar>
          </IconButton>
        </Box>
      </Box>

      <Container maxWidth="sm">
        <Paper
          elevation={2}
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

        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Where are you?
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Enter or scan location"
            value={currentLocation}
            onChange={(e) => setCurrentLocation(e.target.value)}
          />
          <Button
            variant="outlined"
            startIcon={<QrCodeScannerIcon />}
            onClick={handleStartScan}
            disabled={isInitializingScanner}
          >
            {isInitializingScanner ? "Loading..." : "Scan QR"}
          </Button>
        </Box>

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

        <Grid container spacing={2}>
          {filteredRooms.map((room) => (
            <Grid item xs={6} sm={4} key={room}>
              <Button
                variant="contained"
                fullWidth
                sx={{
                  bgcolor: "#4db6ac",
                  color: "#fff",
                  borderRadius: "12px",
                  boxShadow: 2,
                  height: 60,
                  textTransform: "none",
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

        <Box sx={{ textAlign: "center", mt: 3 }}>
          <Button variant="contained" onClick={handleGetDirections}>
            Get Directions
          </Button>
        </Box>

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

        {nodeSequence.length > 0 && (
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Button variant="outlined" onClick={handleStartNavigation}>
              Start Navigation
            </Button>
          </Box>
        )}

        {showScanner && (
          <Box sx={{ mt: 4 }}>
            <QrScannerModal onScan={handleScan} onClose={() => setShowScanner(false)} />
          </Box>
        )}
      </Container>
    </Box>
  );
}
