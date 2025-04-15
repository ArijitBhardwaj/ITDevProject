import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Container, Typography } from "@mui/material";
import backgroundImage from "../assets/Final_HomePage_Navigo.png";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay for better contrast */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1,
        }}
      />
      <Container
        maxWidth="sm"
        sx={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          textAlign: "center",
          color: "#fff",
          px: 2,
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontFamily: "'Pacifico', cursive",
            fontWeight: 700,
            mb: 2,
            fontSize: { xs: "2.5rem", md: "3.5rem" },
            textShadow: "2px 2px 8px rgba(0,0,0,0.7)",
          }}
        >
          Welcome to NaviGo
        </Typography>
        <Typography
          variant="h6"
          sx={{
            fontFamily: "'Pacifico', cursive",
            fontWeight: 500,
            mb: 4,
            fontSize: { xs: "1.2rem", md: "1.8rem" },
            textShadow: "1px 1px 6px rgba(0,0,0,0.6)",
          }}
        >
          Your Ultimate Navigation Companion
        </Typography>
        <Button
          variant="contained"
          sx={{
            backgroundColor: "#ff9800",
            color: "#fff",
            px: 4,
            py: 1.5,
            fontSize: "1.125rem",
            fontWeight: "600",
            borderRadius: "0.5rem",
            transition: "background-color 0.3s ease-in-out, transform 0.2s",
            boxShadow: "0px 4px 12px rgba(0,0,0,0.3)",
            "&:hover": {
              backgroundColor: "#f57c00",
              transform: "scale(1.05)",
            },
          }}
          onClick={() => navigate("/navigationpage")}
        >
          GET STARTED
        </Button>
      </Container>
    </Box>
  );
};

export default HomePage;
