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
// import Map from "./Map.jsx"; // Commented out to avoid image load error
import QrScannerModal from "../components/QRScannerModal";

const NavigationPage = () => {
  const [search, setSearch] = useState("");
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
    room.toLowerCase().includes(search.toLowerCase())
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
      setSearch(`Room ${data}`);
      setShowScanner(false);
      setScanError(null);
    } else {
      setScanError("Invalid QR code. Please scan A1 / B2 / C3 / D4.");
      setShowScanner(false);
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
        {/* Map Section */}
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
          {/* <Map /> */}
          🗺️ Map will load here once image issues are fixed
        </Paper>

        {/* Search + Button */}
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search room"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ bgcolor: "#fff", borderRadius: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            sx={{
              bgcolor: "#0288d1",
              px: 3,
              ":hover": { bgcolor: "#0277bd" },
            }}
          >
            Search
          </Button>
        </Box>

        {/* Location Dropdown + QR */}
        <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
          <TextField
            select
            label="Select Location"
            value={locationDropdown}
            onChange={(e) => setLocationDropdown(e.target.value)}
            fullWidth
            sx={{ bgcolor: "#fff", borderRadius: 2 }}
          >
            <MenuItem value="Entrance">Entrance</MenuItem>
            <MenuItem value="Library">Library</MenuItem>
            <MenuItem value="Lab">Lab</MenuItem>
            <MenuItem value="Lecture Hall">Lecture Hall</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            startIcon={<QrCodeScannerIcon />}
            onClick={handleStartScan}
            disabled={isInitializingScanner}
          >
            {isInitializingScanner ? "Loading..." : "Scan QR"}
          </Button>
        </Box>

        {/* Room Buttons */}
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
                  ":hover": {
                    bgcolor: "#00897b"
                  }
                }}
                startIcon={<RoomPreferencesIcon />}
              >
                {room}
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* No match */}
        {filteredRooms.length === 0 && (
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            sx={{ mt: 4 }}
          >
            No matching rooms found 🫠
          </Typography>
        )}

        {/* QR Scanner Modal */}
        {showScanner && (
            <Box sx={{mt: 4}}>
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
