const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
  auth: {
    type: "OAuth2",
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
    clientId: process.env.OAUTH_CLIENTID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN,
  },
});

const app = express();
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
  userID: String,
  username: String,
  email: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

app.use(express.json());

function isValidEmail(email) {
  // Regular expression for basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Registration route
app.post("/register", async (req, res) => {
  const { userID, username, email, password } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    userID,
    username,
    email,
    password: hashedPassword,
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
      { userID: newUser.userID, username: newUser.username },
      "secret_key",
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
    const token = jwt.sign({ username: user.username }, "secret_key", {
      expiresIn: "1h",
    });
    return res.status(200).json({ token });
  } else {
    return res.status(401).json({ error: "Invalid username or password" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
