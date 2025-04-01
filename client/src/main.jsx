// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import { ThemeProvider, createTheme } from '@mui/material/styles';
// import { BrowserRouter } from 'react-router-dom'
// import './index.css'
// import App from './App.jsx'

// const theme = createTheme();

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <BrowserRouter>
//       <ThemeProvider theme={theme}>
//         <App />
//       </ThemeProvider>
//     </BrowserRouter>
//   </StrictMode>,
// )



// import React from "react";
// import ReactDOM from "react-dom/client";
// import { BrowserRouter } from "react-router-dom";
// import App from "./App";

// ReactDOM.createRoot(document.getElementById("root")).render(
//   <BrowserRouter>
//     <App />
//   </BrowserRouter>
// );

// main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './Pages/HomePage';
import UserProfilePage from './Pages/UserProfilePage';
import NavigationPage from './Pages/NavigationPage';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/navigate" element={<NavigationPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
