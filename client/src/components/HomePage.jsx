import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

const backgroundImage = require("./assets/background_image.jpg");

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="flex-grow"></div>
      <div className="button-container">
        <button className="get-started-button" onClick={() => navigate("/get-started")}>
          Get Started
        </button>
      </div>
    </div>
  );
};

export default HomePage;
