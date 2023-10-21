const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const cors = require("cors");
const secretKey = process.env.SECRET_KEY || "mn1f4mfulKNrMZ0aAqbrw";

// Create a Nodemailer transporter
var transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "fc0afbc7d2cc66",
      pass: "64de9bca2d1c22"
    }
  });

const app = express();
app.use(cors());
const port = 3000;

mongoose.connect(
  "mongodb+srv://sadamdon1234:1YktFZRZ1cX0PRj4@cluster0.nhacelr.mongodb.net/?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);
mongoose.connection.on("error", (error) =>
  console.error("MongoDB connection error:", error)
);

// Define user schema and model
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  phonenumber: String,
});

const User = mongoose.model("User", userSchema);

app.use(express.json());

function isValidEmail(email) {
  // Regular expression for basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: "Internal Server Error" });
});

const generateToken = (user) => {
  const token = jwt.sign(user, secretKey, { expiresIn: "15m" });
  return token;
};

const authenticateUser = (username, password) => {
  const user = { id: 1, username: username, password: password };
  return generateToken(user);
};

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  console.log("Received token:", token);

  if (!token) return res.sendStatus(401);

  jwt.verify(token.split(" ")[1], secretKey, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token has expired" });
      }
      console.error(err);
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

// Usage in a protected route
app.get("/protected-route", authenticateToken, (req, res) => {
  // Access req.user to get the authenticated user's data
  res.json({ message: "Welcome to the protected route" });
});

// Registration route
app.post("/register", async (req, res) => {
  const { username, email, password, phonenumber } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    username,
    email,
    password: hashedPassword,
    phonenumber,
  });

  try {
    // Check if user with the same username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Username or email already exists" });
    }

    await newUser.save();

    // Generate a token upon successful registration
    const token = jwt.sign(
      { phonenumber: newUser.phonenumber, username: newUser.username },
      secretKey,
      { expiresIn: "1h" }
    );
    // Send confirmation email
    const mailOptions = {
      from: "sadamhussain.independent@gmail.com", // Your email address
      to: newUser.email, // User's email address
      subject: "Confirmation Email",
      text: "Thank you for registering! Please click the link to verify your email.",
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error, info, mailOptions);
        return res
          .status(500)
          .json({ error: "Error sending confirmation email" });
      }
      return res.status(200).json({
        message: "User registered successfully. Confirmation email sent.",
        token,
      });
    });
  } catch (error) {
    return res.status(500).json({ error: "Error registering user" });
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const validPassword = await bcrypt.compare(password, user.password);

  if (validPassword) {
    const token = authenticateUser(username, password);
    if (token) {
      res
        .status(200)
        .json({ success: true, token, Message: "successfully login" });
    } else {
      res.status(401).json({ success: false, error: "Invalid credentials" });
    }
  } else {
    return res.status(401).json({ error: "Invalid username or password" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
