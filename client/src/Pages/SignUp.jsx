import { React, useState } from "react";
import { Link } from "react-router-dom";
import {createUserWithEmailAndPassword} from "firebase/auth";
import { auth } from "../firebaseConfig";
import { Box } from "@mui/material";
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
            <Box>
                <h2>Sign Up</h2>
                <form onSubmit={handleSignUp}>
                    <div>
                        <label>Email</label>
                        <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email here"
                        required
                    />
                </div>
                <div>
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password here"
                        required
                    />
                </div>
                {error && <p style={{ color: "red" }}>{error}</p>}
                <button type="submit">Sign Up</button>
            </form>
            <Link to="/signin">Already have an account? SignIn</Link>
        </Box>
    );
};

export default SignUp;