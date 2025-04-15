import React, { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel,
  Grid,
} from "@mui/material";
import { LightMode, DarkMode, Map } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

const UserProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        const q = query(
          collection(db, "trips"),
          where("userId", "==", firebaseUser.uid)
        );
        const querySnapshot = await getDocs(q);

        const tripData = [];
        querySnapshot.forEach((doc) => {
          tripData.push({ id: doc.id, ...doc.data() });
        });
        setTrips(tripData);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await auth.signOut();
    navigate("/signin");
  };

  const handleStartTrip = () => {
    navigate("/navigationpage");
  };

  if (!user) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          background: "linear-gradient(to bottom right, #e3f2fd, #ffffff)",
          p: 4,
        }}
      >
        <Typography variant="h4" sx={{ mb: 2 }}>
          Please log in to view your profile ✨
        </Typography>
        <Button
          variant="contained"
          sx={{ bgcolor: "#0288d1", ":hover": { bgcolor: "#0277bd" } }}
          onClick={() => navigate("/signin")}
        >
          Go to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f0f4f8",
        p: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Avatar
        sx={{
          width: 100,
          height: 100,
          bgcolor: "#00796b",
          fontSize: 36,
          mb: 2,
        }}
      >
        {user.email?.charAt(0).toUpperCase()}
      </Avatar>

      <Typography variant="h5" sx={{ mb: 1 }}>
        {user.displayName || "User"}
      </Typography>
      <Typography variant="body1">{user.email}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Signed in on:{" "}
        {new Date(user.metadata.creationTime).toLocaleDateString()}
      </Typography>

      <Button
        variant="outlined"
        color="error"
        onClick={handleSignOut}
        sx={{ mb: 3 }}
      >
        Sign Out
      </Button>

      <Card sx={{ width: "100%", maxWidth: 500, mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Previous Trips
          </Typography>
          {trips.length > 0 ? (
            <List>
              {trips.map((trip) => (
                <React.Fragment key={trip.id}>
                  <ListItem
                    secondaryAction={
                      <Button variant="outlined" size="small">
                        Take Again
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={`From ${trip.startPoint} to ${trip.endPoint}`}
                      secondary={`Started: ${trip.tripStartTime} | Completed: ${
                        trip.completed ? "Yes" : "No"
                      }`}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2" sx={{ mt: 2 }}>
              No previous trips found.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card sx={{ width: "100%", maxWidth: 500, borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Preferences
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Switch />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LightMode fontSize="small" />
                    <Typography>Light / Dark Mode</Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Switch />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Map fontSize="small" />
                    <Typography>Map Theme</Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* New: Start a Trip Button */}
      <Button
        variant="contained"
        onClick={handleStartTrip}
        sx={{
          bgcolor: "#ff9800",
          color: "#fff",
          px: 4,
          py: 1.5,
          fontSize: "1.125rem",
          fontWeight: "600",
          borderRadius: "0.5rem",
          transition: "background-color 0.3s ease-in-out",
          ":hover": { bgcolor: "#f57c00" },
        }}
      >
        Start a Trip
      </Button>
    </Box>
  );
};

export default UserProfilePage;

