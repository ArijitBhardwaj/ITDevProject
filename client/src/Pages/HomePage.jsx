import React from "react";
import { useNavigate } from "react-router-dom";
import backgroundImage from "../assets/background_image.jpeg"; // Ensure image is in assets folder

const HomePage = () => {
  const navigate = useNavigate();

  // Styles as JavaScript objects
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "100vh",
    backgroundSize: "cover",
    backgroundPosition: "center",
    padding: "1.5rem",
    backgroundImage: `url(${backgroundImage})`,
  };

  const buttonContainerStyle = {
    display: "flex",
    justifyContent: "center",
    paddingBottom: "2.5rem",
  };

  const buttonStyle = {
    backgroundColor: "#d1d5db", // Gray-300
    color: "black",
    padding: "1rem 2.5rem",
    fontSize: "1.125rem", // text-lg
    fontWeight: "600",
    borderRadius: "0.5rem",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    transition: "background-color 0.3s ease-in-out",
    border: "none",
    cursor: "pointer",
  };

  const buttonHoverStyle = {
    backgroundColor: "#9ca3af", // Gray-400
  };

  return (
    <div style={containerStyle}>
      <div style={{ flexGrow: 1 }}></div>
      <div style={buttonContainerStyle}>
        <button
          style={buttonStyle}
          onMouseEnter={(e) =>
            (e.target.style.backgroundColor = buttonHoverStyle.backgroundColor)
          }
          onMouseLeave={(e) =>
            (e.target.style.backgroundColor = buttonStyle.backgroundColor)
          }
          onClick={() => navigate("/get-started")}
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default HomePage;
