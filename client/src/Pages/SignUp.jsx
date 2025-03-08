import { useState } from "react";
import { Link } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User Created:", userCredential.user);
      setEmail("");
      setPassword("");
      setError("");
    } catch (err) {
      console.error("Error in signing up:", err);
      setError(err.message);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#eeeeee",
        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url("https://as1.ftcdn.net/v2/jpg/01/43/67/38/1000_F_143673890_LYWPkrlhHBjqg3fUHRGn4Iw7szis4SCF.jpg")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        p: 2
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: "100%",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" align="center" gutterBottom sx={{ color: "#008080" }}>
            SIGN UP
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSignUp} sx={{ mt: 2 }}>
            <FormControl variant="outlined" fullWidth sx={{ mt: 2, bgcolor: "#fafafa" }}>
              <InputLabel htmlFor="outlined-adornment-email">Email</InputLabel>
              <OutlinedInput
                id="outlined-adornment-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                label="Email"
              />
            </FormControl>
            <FormControl variant="outlined" fullWidth sx={{ mt: 2, bgcolor: "#fafafa" }}>
              <InputLabel htmlFor="outlined-adornment-password">Password</InputLabel>
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
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                label="Password"
              />
            </FormControl>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                mt: 3,
                bgcolor: "#008080",
                ":hover": { bgcolor: "#006666" }
              }}
            >
              Sign Up
            </Button>
          </Box>
          
          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            Already have an account? <Link to="/signin"> Sign In</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SignUp;


// import { useState } from "react";
// import { Link } from "react-router-dom";
// import { createUserWithEmailAndPassword } from "firebase/auth";
// import { auth } from "../firebaseConfig";
// import {
//   Box,
//   Card,
//   CardContent,
//   Typography,
//   Button,
//   Alert,
//   FormControl,
//   InputLabel,
//   OutlinedInput,
//   InputAdornment,
//   IconButton
// } from "@mui/material";
// import { Visibility, VisibilityOff } from "@mui/icons-material";

// const SignUp = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [showPassword, setShowPassword] = useState(false);

//   const handleSignUp = async (e) => {
//     e.preventDefault();
//     try {
//       const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//       console.log("User Created:", userCredential.user);
//       setEmail("");
//       setPassword("");
//       setError(null);
//     } catch (err) {
//       console.error("Error in signing up:", err);
//       setError(err.message);
//     }
//   };

//   const handleClickShowPassword = () => {
//     setShowPassword((prev) => !prev);
//   };

//   const handleMouseDownPassword = (event) => {
//     event.preventDefault();
//   };

//   return (
//     <Box
//       sx={{
//         minHeight: "100vh",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         bgcolor: "#eeeeee",
//         backgroundImage: 'url("https://as1.ftcdn.net/v2/jpg/01/43/67/38/1000_F_143673890_LYWPkrlhHBjqg3fUHRGn4Iw7szis4SCF.jpg")',
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//         backgroundRepeat: "no-repeat",
//         p: 2
//       }}
//     >
//       <Card sx={{ maxWidth: 500, width: "100%" }}>
//         <CardContent>
//           <Typography variant="h5" align="center" gutterBottom>
//             Sign Up
//           </Typography>
//           {error && (
//             <Alert severity="error" sx={{ mt: 1 }}>
//               {error}
//             </Alert>
//           )}
//           <Box component="form" onSubmit={handleSignUp} sx={{ mt: 2 }}>
//             <FormControl
//               variant="outlined"
//               fullWidth
//               sx={{ mt: 1, bgcolor: "#fafafa" }}
//             >
//               <InputLabel htmlFor="outlined-adornment-email">Email</InputLabel>
//               <OutlinedInput
//                 id="outlined-adornment-email"
//                 type="email"
//                 required
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 label="Email"
//               />
//             </FormControl>
//             <FormControl
//               variant="outlined"
//               fullWidth
//               sx={{ mt: 2, bgcolor: "#fafafa" }}
//             >
//               <InputLabel htmlFor="outlined-adornment-password">Password</InputLabel>
//               <OutlinedInput
//                 id="outlined-adornment-password"
//                 type={showPassword ? "text" : "password"}
//                 required
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 endAdornment={
//                   <InputAdornment position="end">
//                     <IconButton
//                       onClick={handleClickShowPassword}
//                       onMouseDown={handleMouseDownPassword}
//                       edge="end"
//                     >
//                       {showPassword ? <VisibilityOff /> : <Visibility />}
//                     </IconButton>
//                   </InputAdornment>
//                 }
//                 label="Password"
//               />
//             </FormControl>
//             <Button
//               type="submit"
//               variant="contained"
//               fullWidth
//               sx={{
//                 mt: 2,
//                 bgcolor: "#212121",
//                 ":hover": { bgcolor: "#9e9e9e" }
//               }}
//             >
//               Sign Up
//             </Button>
//           </Box>
//           <Typography variant="body2" align="center" sx={{ mt: 2 }}>
//             Already have an account?
//             <Link to="/signin"> Sign In</Link>
//           </Typography>
//         </CardContent>
//       </Card>
//     </Box>
//   );
// };

// export default SignUp;
