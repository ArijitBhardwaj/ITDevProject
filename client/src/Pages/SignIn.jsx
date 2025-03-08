import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { auth } from "../firebaseConfig";
import SignUp from "./SignUp";
import { Link } from "react-router-dom";
import { Box } from "@mui/material";

const SignIn = () => {
    const[email, setEmail] = useState("");
    const[password, setPassword] = useState("");
    const[error, setError] = useState("");

    const handleSignIn = async (e) => {

        e.preventDefault();

        try{
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

    return(
        <Box>
                <h2>Welcome back, Please Sign In here</h2>
                <form onSubmit={handleSignIn}>
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
                <button type="submit">Sign In</button>
            </form>
            <Link to="/">Don't have an account? SignUp</Link>
        </Box>
    )
}

export default SignIn;