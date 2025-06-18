require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const port = 8000;

// Connect to MongoDB
const databaseUrl = process.env.DATABASE_URL;
mongoose.connect(databaseUrl);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Initialize middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // Serve static files

// Create Schema
const UserSessionSchema = new mongoose.Schema({
  phoneNumber: String,
  currentStep: { type: String, default: "language" },
  selectedLanguage: String,
  selectedDistrict: String,
  selectedSector: String,
  selectedCell: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const LocationSchema = new mongoose.Schema({
  districts: [
    {
      name: String,
      nameRw: String,
      sectors: [
        {
          name: String,
          nameRw: String,
          cells: [
            {
              name: String,
              nameRw: String,
              villages: [
                {
                  name: String,
                  nameRw: String,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

const LocationData = require("./locations");
const UserSession = mongoose.model("UserSession", UserSessionSchema);
const Location = mongoose.model("Location", LocationSchema);

// Initialize location data and add them on mongoDB
const initializeLocationData = async () => {
  try {
    const existingData = await Location.findOne();
    if (!existingData) {
      //await Location.deleteMany({});
      const locationData = new Location(LocationData);
      await locationData.save();
      console.log("Location data initialized");
    }
  } catch (error) {
    console.error("Error initializing location data:", error);
  }
};

// Initialize location data on startup
initializeLocationData();

// Helper functions
const getOrCreateSession = async (phoneNumber) => {
  let session = await UserSession.findOne({ phoneNumber });
  if (!session) {
    session = new UserSession({ phoneNumber });
    await session.save();
  }
  return session;
};

const updateSession = async (phoneNumber, updates) => {
  await UserSession.findOneAndUpdate(
    { phoneNumber },
    { ...updates, updatedAt: new Date() },
    { new: true }
  );
};

const getLocationData = async () => {
  return await Location.findOne();
};

// USSD Text Messages
const messages = {
  en: {
    welcome:
      "CON Welcome to Patient Management System\nSelect your preferred language:",
    selectDistrict: "CON Select your district:",
    selectSector: "CON Select your sector:",
    selectCell: "CON Select your cell:",
    completion:
      "END Thank you! Your selection has been recorded.\nDistrict: {district}\nSector: {sector}\nCell: {cell}",
    error: "END Sorry, an error occurred. Please try again.",
    invalidInput: "CON Invalid input. Please try again:",
    goBack: "0. Go Back",
  },
  rw: {
    welcome: "CON Murakaza neza kuri sisitemu y'ubuvuzi\nHitamo ururimi:",
    selectDistrict: "CON Hitamo akarere kawe:",
    selectSector: "CON Hitamo umurenge wawe:",
    selectCell: "CON Hitamo akagari kawe:",
    completion:
      "END Murakoze! Amakuru yanyu yarakiriwe.\nAkarere: {district}\nUmurenge: {sector}\nAkagari: {cell}",
    error: "END Ihangane, habaye ikosa. Ongera ugerageze.",
    invalidInput: "CON Ikinyuranyo kidakwiye. Ongera ugerageze:",
    goBack: "0. Subira Inyuma",
  },
};

// Main USSD handler
app.post("/", async (req, res) => {
  try {
    const { phoneNumber, text, serviceCode, networkCode } = req.body;
    let response = "";

    const session = await getOrCreateSession(phoneNumber);
    const locationData = await getLocationData();
    console.log("=======================>", locationData);
    const inputArray = text.split("*");
    const lastInput = inputArray[inputArray.length - 1];

    // Language selection
    if (text === "") {
      response = messages.en.welcome;
      response += "\n1. English";
      response += "\n2. Kinyarwanda";
      await updateSession(phoneNumber, { currentStep: "language" });
    }
    // Handle language selection
    else if (session.currentStep === "language") {
      if (lastInput === "1") {
        await updateSession(phoneNumber, {
          selectedLanguage: "en",
          currentStep: "district",
        });
        response = messages.en.selectDistrict;
        locationData.districts.forEach((district, index) => {
          response += `\n${index + 1}. ${district.name}`;
        });
        response += `\n${messages.en.goBack}`;
      } else if (lastInput === "2") {
        await updateSession(phoneNumber, {
          selectedLanguage: "rw",
          currentStep: "district",
        });
        response = messages.rw.selectDistrict;
        locationData.districts.forEach((district, index) => {
          response += `\n${index + 1}. ${district.nameRw}`;
        });
        response += `\n${messages.rw.goBack}`;
      } else {
        response = messages.en.invalidInput;
        response += "\n1. English";
        response += "\n2. Kinyarwanda";
      }
    }
    // Handle district selection
    else if (session.currentStep === "district") {
      const lang = session.selectedLanguage || "en";
      const msg = messages[lang];

      if (lastInput === "0") {
        // Go back to language selection
        response = messages.en.welcome;
        response += "\n1. English";
        response += "\n2. Kinyarwanda";
        await updateSession(phoneNumber, { currentStep: "language" });
      } else {
        const districtIndex = parseInt(lastInput) - 1;
        if (
          districtIndex >= 0 &&
          districtIndex < locationData.districts.length
        ) {
          const selectedDistrict = locationData.districts[districtIndex];
          await updateSession(phoneNumber, {
            selectedDistrict: selectedDistrict.name,
            currentStep: "sector",
          });

          response = msg.selectSector;
          selectedDistrict.sectors.forEach((sector, index) => {
            const sectorName = lang === "en" ? sector.name : sector.nameRw;
            response += `\n${index + 1}. ${sectorName}`;
          });
          response += `\n${msg.goBack}`;
        } else {
          response = msg.invalidInput;
          response += "\n" + msg.selectDistrict;
          locationData.districts.forEach((district, index) => {
            const districtName =
              lang === "en" ? district.name : district.nameRw;
            response += `\n${index + 1}. ${districtName}`;
          });
          response += `\n${msg.goBack}`;
        }
      }
    }
    // Handle sector selection
    else if (session.currentStep === "sector") {
      const lang = session.selectedLanguage || "en";
      const msg = messages[lang];
      const district = locationData.districts.find(
        (d) => d.name === session.selectedDistrict
      );

      if (lastInput === "0") {
        // Go back to district selection
        response = msg.selectDistrict;
        locationData.districts.forEach((district, index) => {
          const districtName = lang === "en" ? district.name : district.nameRw;
          response += `\n${index + 1}. ${districtName}`;
        });
        response += `\n${msg.goBack}`;
        await updateSession(phoneNumber, { currentStep: "district" });
      } else {
        const sectorIndex = parseInt(lastInput) - 1;
        if (sectorIndex >= 0 && sectorIndex < district.sectors.length) {
          const selectedSector = district.sectors[sectorIndex];
          await updateSession(phoneNumber, {
            selectedSector: selectedSector.name,
            currentStep: "cell",
          });

          response = msg.selectCell;
          selectedSector.cells.forEach((cell, index) => {
            const cellName = lang === "en" ? cell.name : cell.nameRw;
            response += `\n${index + 1}. ${cellName}`;
          });
          response += `\n${msg.goBack}`;
        } else {
          response = msg.invalidInput;
          response += "\n" + msg.selectSector;
          district.sectors.forEach((sector, index) => {
            const sectorName = lang === "en" ? sector.name : sector.nameRw;
            response += `\n${index + 1}. ${sectorName}`;
          });
          response += `\n${msg.goBack}`;
        }
      }
    }
    // Handle cell selection
    else if (session.currentStep === "cell") {
      const lang = session.selectedLanguage || "en";
      const msg = messages[lang];
      const district = locationData.districts.find(
        (d) => d.name === session.selectedDistrict
      );
      const sector = district.sectors.find(
        (s) => s.name === session.selectedSector
      );

      if (lastInput === "0") {
        // Go back to sector selection
        response = msg.selectSector;
        district.sectors.forEach((sector, index) => {
          const sectorName = lang === "en" ? sector.name : sector.nameRw;
          response += `\n${index + 1}. ${sectorName}`;
        });
        response += `\n${msg.goBack}`;
        await updateSession(phoneNumber, { currentStep: "sector" });
      } else {
        const cellIndex = parseInt(lastInput) - 1;
        if (cellIndex >= 0 && cellIndex < sector.cells.length) {
          const selectedCell = sector.cells[cellIndex];
          await updateSession(phoneNumber, {
            selectedCell: selectedCell.name,
            currentStep: "completed",
          });

          response = msg.completion
            .replace("{district}", session.selectedDistrict)
            .replace("{sector}", session.selectedSector)
            .replace("{cell}", selectedCell.name);
        } else {
          response = msg.invalidInput;
          response += "\n" + msg.selectCell;
          sector.cells.forEach((cell, index) => {
            const cellName = lang === "en" ? cell.name : cell.nameRw;
            response += `\n${index + 1}. ${cellName}`;
          });
          response += `\n${msg.goBack}`;
        }
      }
    }

    // Handle village selection considering the data in locations.js
    else if (session.currentStep === "village") {
      const lang = session.selectedLanguage || "en";
      const msg = messages[lang];
      const district = locationData.districts.find(
        (d) => d.name === session.selectedDistrict
      );
      const sector = district.sectors.find(
        (s) => s.name === session.selectedSector
      );
      const cell = sector.cells.find((c) => c.name === session.selectedCell);

      if (lastInput === "0") {
        // Go back to cell selection
        response = msg.selectCell;
        sector.cells.forEach((cell, index) => {
          const cellName = lang === "en" ? cell.name : cell.nameRw;
          response += `\n${index + 1}. ${cellName}`;
        });
        response += `\n${msg.goBack}`;
        await updateSession(phoneNumber, { currentStep: "cell" });
      } else {
        const villageIndex = parseInt(lastInput) - 1;
        if (villageIndex >= 0 && villageIndex < cell.villages.length) {
          const selectedVillage = cell.villages[villageIndex];
          await updateSession(phoneNumber, {
            selectedVillage: selectedVillage.name,
            currentStep: "completed",
          });

          response = msg.completion
            .replace("{district}", session.selectedDistrict)
            .replace("{sector}", session.selectedSector)
            .replace("{cell}", session.selectedCell)
            .replace("{village}", selectedVillage.name);
        } else {
          response = msg.invalidInput;
          response += "\n" + msg.selectVillage;
          cell.villages.forEach((village, index) => {
            const villageName = lang === "en" ? village.name : village.nameRw;
            response += `\n${index + 1}. ${villageName}`;
          });
          response += `\n${msg.goBack}`;
        }
      }

      setTimeout(() => {
        res.send(response);
      }, 1000);
    }

    setTimeout(() => {
      res.send(response);
    }, 1000);
  } catch (error) {
    console.error("Error processing USSD request:", error);
    res.send("END Sorry, an error occurred. Please try again.");
  }
});

// API endpoints for the web interface
app.get("/api/sessions", async (req, res) => {
  try {
    const sessions = await UserSession.find().sort({ updatedAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/locations", async (req, res) => {
  try {
    const locations = await Location.findOne();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const totalSessions = await UserSession.countDocuments();
    const completedSessions = await UserSession.countDocuments({
      currentStep: "completed",
    });
    const languageStats = await UserSession.aggregate([
      { $group: { _id: "$selectedLanguage", count: { $sum: 1 } } },
    ]);
    const districtStats = await UserSession.aggregate([
      { $match: { selectedDistrict: { $exists: true } } },
      { $group: { _id: "$selectedDistrict", count: { $sum: 1 } } },
    ]);

    res.json({
      totalSessions,
      completedSessions,
      languageStats,
      districtStats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`USSD endpoint: http://localhost:${port}/`);
  console.log(`Web UI: http://localhost:${port}/`);
});
