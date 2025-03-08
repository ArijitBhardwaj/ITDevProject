import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { auth } from "../firebaseConfig";
import SignUp from "./SignUp";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Alert
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      const userCredential = signInWithEmailAndPassword(auth, email, password);
      console.log("User signed in: ", userCredential.user);
      setEmail("");
      setPassword("");
      setError("");
    } catch (error) {
      console.error("Error in signing In the user:", error);
      setError(error.message);
    }
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleClickShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#eeeeee",
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 500, width: "100%" }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            Sign In
          </Typography>
          <Box component="form" onSubmit={handleSignIn} sx={{ mt: 2 }}>
            <TextField
              sx={{ mt: 1, bgcolor: "#fafafa" }}
              label="Email"
              variant="outlined"
              fullWidth
              margin="normal"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormControl
              variant="outlined"
              fullWidth
              sx={{ mt: 2, bgcolor: "#fafafa" }}
            >
              <InputLabel htmlFor="outlined-adornment-password">
                Password
              </InputLabel>
              <OutlinedInput
                id="outlined-adornment-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                label="Password"
              />
            </FormControl>
            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                mt: 1,
                bgcolor: "#212121",
                ":hover": { bgcolor: "#9e9e9e" }
              }}
            >
              Sign In
            </Button>
          </Box>
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            Don't have an account? <Link to="/">Sign Up</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SignIn;
