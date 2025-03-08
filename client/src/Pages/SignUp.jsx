import { React, useState } from "react";
import { Link } from "react-router-dom";
import {createUserWithEmailAndPassword} from "firebase/auth";
import { auth } from "../firebaseConfig";
import { Box, Card, CardContent, TextField, Typography, Button } from "@mui/material";
import SignIn from "./SignIn";

const SignUp = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    // const navigate = useNavigate("");


    const handleSignUp = async (e) => {
        e.preventDefault();
    
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );
          console.log("User Created:", userCredential.user);
          setEmail("");
          setPassword("");
          setError(null);
        } catch (err) {
          console.error("Error in signing up:", err);
          setError(err.message);
        }
      };

        return(
            <Box sx={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "#eeeeee",
              p: 2,
            }}>
              <Card sx={{ maxWidth: 400, width: "100%" }}>
                <CardContent>
                  <Typography variant="h5" align="center" gutterBottom> Sign Up</Typography>

                  {error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {error}
                    </Alert>
                  )}
                  <Box component="form" onSubmit={handleSignUp} sx={{mt: 2}}>
                    <TextField
                    sx={{mt: 1, bgcolor:"#fafafa"}}
                    label= "Email"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}>
                    </TextField>

                    <TextField
                    sx={{mt: 1, bgcolor:"#fafafa"}}
                    label= "Password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    >
                    </TextField>

                    <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    sx={{mt: 1, bgcolor:"#212121" }}>Sign Up</Button>

                  </Box>
                    
                    <Typography variant="body2" align="center" sx= {{mt: 2}}>Already have an account?{""}
                    <Link to="/signin"> Sign In</Link>
                    </Typography>
                </CardContent>
              </Card>
            </Box>
    );
};

export default SignUp;