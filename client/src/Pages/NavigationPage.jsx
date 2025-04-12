import React, { useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Container,
  Button,
  InputAdornment,
  Grid,
  MenuItem,
  Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import RoomPreferencesIcon from "@mui/icons-material/RoomPreferences";
// import Map from "./Map.jsx"; // enable once map is fixed
import QrScannerModal from "../components/QRScannerModal";

const NavigationPage = () => {
  const [currentLocation, setCurrentLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [locationDropdown, setLocationDropdown] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [isInitializingScanner, setIsInitializingScanner] = useState(false);

  const dummyRooms = [
    "Room A101", "Room B203", "Room C301", "Room D410",
    "Room G338", "Washroom 219A", "Security Office",
    "Lecture Hall 4", "Meeting Room"
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
        throw new Error("Camera access blocked. Please enable it in your browser settings.");
      }

      setShowScanner(true);
    } catch (error) {
      setScanError(error.message);
    } finally {
      setIsInitializingScanner(false);
    }
  };

  const handleScan = (data) => {
    const validCodes = ["A1", "B2", "C3", "D4"];
    if (validCodes.includes(data)) {
      setCurrentLocation(data);
      setShowScanner(false);
      setScanError(null);
    } else {
      setScanError("Invalid QR code. Please scan A1 / B2 / C3 / D4.");
      setShowScanner(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(to bottom, #fdfbfb, #ebedee)", p: 2 }}>
      <Container maxWidth="sm">
        <Paper
          elevation={4}
          sx={{
            height: 260,
            borderRadius: "16px",
            mb: 3,
            overflow: "hidden",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            bgcolor: "#e0e0e0",
            color: "#777",
            fontWeight: 500
          }}
        >
          🗺️ Map will load here once image issues are fixed
        </Paper>

        {/* Where are you? */}
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Where are you?</Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Enter current location"
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

        {/* Where do you want to go? */}
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Where do you want to go?</Typography>
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
            )
          }}
        />

        {/* Dropdown (optional) */}
        <TextField
          select
          label="Select nearby location"
          value={locationDropdown}
          onChange={(e) => setLocationDropdown(e.target.value)}
          fullWidth
          sx={{ bgcolor: "#fff", borderRadius: 2, mb: 3 }}
        >
          <MenuItem value="Entrance">Entrance</MenuItem>
          <MenuItem value="Library">Library</MenuItem>
          <MenuItem value="Lab">Lab</MenuItem>
          <MenuItem value="Lecture Hall">Lecture Hall</MenuItem>
        </TextField>

        {/* Result Buttons */}
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
                  ":hover": { bgcolor: "#00897b" }
                }}
                startIcon={<RoomPreferencesIcon />}
              >
                {room}
              </Button>
            </Grid>
          ))}
        </Grid>

        {filteredRooms.length === 0 && (
          <Typography variant="body1" align="center" sx={{ mt: 4 }} color="text.secondary">
            No matching rooms found 🫠
          </Typography>
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
