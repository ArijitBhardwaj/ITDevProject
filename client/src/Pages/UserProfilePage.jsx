import React from "react";
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

const UserProfilePage = () => {
  const user = {
    name: "John Doe",
    email: "john.doe@example.com",
    signInDate: "2024-04-01",
  };

  const trips = [
    { id: 1, from: "Delhi", to: "Mumbai" },
    { id: 2, from: "Chennai", to: "Bangalore" },
    { id: 3, from: "Kolkata", to: "Goa" },
  ];

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
        {user.name.charAt(0)}
      </Avatar>

      <Typography variant="h5" sx={{ mb: 1 }}>{user.name}</Typography>
      <Typography variant="body1">{user.email}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Signed in on: {new Date(user.signInDate).toLocaleString()}
      </Typography>

      <Card sx={{ width: "100%", maxWidth: 500, mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Previous Trips</Typography>
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
                    primary={`Trip from ${trip.from} to ${trip.to}`}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>

      <Card sx={{ width: "100%", maxWidth: 500, borderRadius: 3 }}>
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
    </Box>
  );
};

export default UserProfilePage;
