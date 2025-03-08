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

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

