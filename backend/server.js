require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const router = require("./routes/auth");
const app = express();
app.use(express.json());
const port = process.env.PORT || 8000;
const LocationData = require("./locations");
const CHWMockData = require("./chw-mock-data");
const CHW = require("./models/CHW");
const UserSession = require("./models/UserSession");
const Location = require("./models/Location");
const Appointment = require("./models/Appointments");
const Maternal = require("./models/MaternalRecords");
const Malaria = require("./models/MalariaRecords");
const Nutrition = require("./models/NutritionRecords");
const Availability = require("./models/Availability");
const User = require("./models/User");

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
app.use(express.static("public"));
app.use("/api/auth", router);

// Initialize data
const initializeData = async () => {
  try {
    // Initialize location data
    const existingLocationData = await Location.findOne();
    if (!existingLocationData) {
      const locationData = new Location(LocationData);
      await locationData.save();
      console.log("Location data initialized");
    }
  } catch (error) {
    console.error("Error initializing data:", error);
  }
};

// Initialize data on startup
initializeData();

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

const getCHWsByVillage = async (district, sector, cell, village) => {
  return await CHW.find({
    district,
    sector,
    cell,
    village,
    isActive: true,
  });
};

const isTimeInRange = (currentHour, startHour, endHour) => {
  return currentHour >= startHour && currentHour < endHour;
};

const isWithinBusinessHours = (availableHours) => {
  const currentHour = new Date().getHours();
  return isTimeInRange(currentHour, availableHours.start, availableHours.end);
};

// USSD Messages
const messages = {
  en: {
    welcome:
      "CON Welcome to Patient Management System\nSelect your preferred language:",
    selectDistrict: "CON Select your district:",
    selectSector: "CON Select your sector:",
    selectCell: "CON Select your cell:",
    selectVillage: "CON Select your village:",
    selectCHW: "CON Available Community Health Workers:",
    noCHWsAvailable:
      "END Sorry, no Community Health Workers are currently available in your village. Please try again later.",
    chwNotAvailable:
      "END The selected CHW is currently not available. Available hours: {hours}",
    appointmentBooked:
      "END Appointment successfully booked!\nCHW: {chw}\nVillage: {village}\nYou will be contacted soon.",
    completion:
      "END Thank you! Your selection has been recorded.\nDistrict: {district}\nSector: {sector}\nCell: {cell}\nVillage: {village}",
    error: "END Sorry, an error occurred. Please try again.",
    invalidInput: "CON Invalid input. Please try again:",
    goBack: "0. Go Back",
    available: "Available",
    notAvailable: "Not Available",
    specialization: "Specialization",
    experience: "Experience",
  },
  rw: {
    welcome: "CON Murakaza neza kuri sisitemu y'ubuvuzi\nHitamo ururimi:",
    selectDistrict: "CON Hitamo akarere kawe:",
    selectSector: "CON Hitamo umurenge wawe:",
    selectCell: "CON Hitamo akagari kawe:",
    selectVillage: "CON Hitamo umudugudu wawe:",
    selectCHW: "CON Abashinzwe ubuzima bo mu mudugudu bahari:",
    noCHWsAvailable:
      "END Ihangane, nta bashinzwe ubuzima bahari mu mudugudu wawe. Ongera ugerageze nyuma.",
    chwNotAvailable:
      "END Ushinzwe ubuzima wahisemo ntabwo ari hafi. Amasaha akora: {hours}",
    appointmentBooked:
      "END Igihe cyo guhura cyarateguwe neza!\nUshinzwe ubuzima: {chw}\nUmudugudu: {village}\nUzavugana nawe vuba.",
    completion:
      "END Murakoze! Amakuru yanyu yarakiriwe.\nAkarere: {district}\nUmurenge: {sector}\nAkagari: {cell}\nUmudugudu: {village}",
    error: "END Ihangane, habaye ikosa. Ongera ugerageze.",
    invalidInput: "CON Ikinyuranyo cidakwiye. Ongera ugerageze:",
    goBack: "0. Subira Inyuma",
    available: "Arahari",
    notAvailable: "Ntahari",
    specialization: "Ubumenyi",
    experience: "Uburambe",
  },
};

// Main USSD handler
app.post("/", async (req, res) => {
  try {
    const { phoneNumber, text, serviceCode, networkCode } = req.body;
    let response = "";

    const session = await getOrCreateSession(phoneNumber);
    const locationData = await getLocationData();
    const inputArray = text.split("*");
    const lastInput = inputArray[inputArray.length - 1];

    console.log("Current session step:", session.currentStep);
    console.log("Last input:", lastInput);

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
            currentStep: "village",
          });

          response = msg.selectVillage;
          selectedCell.villages.forEach((village, index) => {
            const villageName = lang === "en" ? village.name : village.nameRw;
            response += `\n${index + 1}. ${villageName}`;
          });
          response += `\n${msg.goBack}`;
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
    // Handle village selection
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
            currentStep: "chw_selection",
          });

          // Get CHWs for this village
          const chws = await getCHWsByVillage(
            session.selectedDistrict,
            session.selectedSector,
            session.selectedCell,
            selectedVillage.name
          );

          if (chws.length === 0) {
            response = msg.noCHWsAvailable;
          } else {
            response = msg.selectCHW;
            chws.forEach((chw, index) => {
              const chwName = lang === "en" ? chw.name : chw.nameRw;
              const specializations =
                lang === "en"
                  ? chw.specializations.join(", ")
                  : chw.specializationsRw.join(", ");
              const experience =
                lang === "en" ? chw.experience : chw.experienceRw;
              const availability = isWithinBusinessHours(chw.availableHours)
                ? msg.available
                : msg.notAvailable;

              response += `\n${index + 1}. ${chwName}`;
              response += `\n   ${msg.specialization}: ${specializations}`;
              response += `\n   ${msg.experience}: ${experience}`;
              response += `\n   Status: ${availability}`;
              response += "\n";
            });
            response += `\n${msg.goBack}`;
          }
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
    }
    // Handle CHW selection
    else if (session.currentStep === "chw_selection") {
      const lang = session.selectedLanguage || "en";
      const msg = messages[lang];

      if (lastInput === "0") {
        // Go back to village selection
        const district = locationData.districts.find(
          (d) => d.name === session.selectedDistrict
        );
        const sector = district.sectors.find(
          (s) => s.name === session.selectedSector
        );
        const cell = sector.cells.find((c) => c.name === session.selectedCell);

        response = msg.selectVillage;
        cell.villages.forEach((village, index) => {
          const villageName = lang === "en" ? village.name : village.nameRw;
          response += `\n${index + 1}. ${villageName}`;
        });
        response += `\n${msg.goBack}`;
        await updateSession(phoneNumber, { currentStep: "village" });
      } else {
        const chwIndex = parseInt(lastInput) - 1;
        const chws = await getCHWsByVillage(
          session.selectedDistrict,
          session.selectedSector,
          session.selectedCell,
          session.selectedVillage
        );

        if (chwIndex >= 0 && chwIndex < chws.length) {
          const selectedCHW = chws[chwIndex];

          // Check if CHW is available
          if (!isWithinBusinessHours(selectedCHW.availableHours)) {
            const hours = `${selectedCHW.availableHours.start}:00 - ${selectedCHW.availableHours.end}:00`;
            response = msg.chwNotAvailable.replace("{hours}", hours);
          } else {
            // Book appointment
            const appointment = new Appointment({
              patientPhoneNumber: phoneNumber,
              chwId: selectedCHW._id,
              chwName: selectedCHW.name,
              district: session.selectedDistrict,
              sector: session.selectedSector,
              cell: session.selectedCell,
              village: session.selectedVillage,
            });
            await appointment.save();

            await updateSession(phoneNumber, {
              selectedCHW: selectedCHW.name,
              selectedCHWId: selectedCHW._id.toString(),
              appointmentBooked: true,
              currentStep: "completed",
            });

            const chwName =
              lang === "en" ? selectedCHW.name : selectedCHW.nameRw;
            response = msg.appointmentBooked
              .replace("{chw}", chwName)
              .replace("{village}", session.selectedVillage);
          }
        } else {
          response = msg.invalidInput;
          response += "\n" + msg.selectCHW;
          chws.forEach((chw, index) => {
            const chwName = lang === "en" ? chw.name : chw.nameRw;
            const specializations =
              lang === "en"
                ? chw.specializations.join(", ")
                : chw.specializationsRw.join(", ");
            const experience =
              lang === "en" ? chw.experience : chw.experienceRw;
            const availability = isWithinBusinessHours(chw.availableHours)
              ? msg.available
              : msg.notAvailable;

            response += `\n${index + 1}. ${chwName}`;
            response += `\n   ${msg.specialization}: ${specializations}`;
            response += `\n   ${msg.experience}: ${experience}`;
            response += `\n   Status: ${availability}`;
            response += "\n";
          });
          response += `\n${msg.goBack}`;
        }
      }
    }

    setTimeout(() => {
      res.send(response);
    }, 1000);
  } catch (error) {
    console.error("Error processing USSD request:", error);
    res.send("END Sorry, an error occurred. Please try again.");
  }
});

// API endpoints
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

app.get("/api/chws", async (req, res) => {
  try {
    const chws = await CHW.find().sort({ village: 1, name: 1 });
    res.json(chws);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/appointments", async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    res.json(appointments);
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
    const totalAppointments = await Appointment.countDocuments();
    const totalCHWs = await CHW.countDocuments();
    const activeCHWs = await CHW.countDocuments({ isActive: true });

    const languageStats = await UserSession.aggregate([
      { $group: { _id: "$selectedLanguage", count: { $sum: 1 } } },
    ]);

    const districtStats = await UserSession.aggregate([
      { $match: { selectedDistrict: { $exists: true } } },
      { $group: { _id: "$selectedDistrict", count: { $sum: 1 } } },
    ]);

    const appointmentStats = await Appointment.aggregate([
      { $group: { _id: "$village", count: { $sum: 1 } } },
    ]);

    res.json({
      totalSessions,
      completedSessions,
      totalAppointments,
      totalCHWs,
      activeCHWs,
      languageStats,
      districtStats,
      appointmentStats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "CHW USSD Backend API",
    version: "1.0.0",
    endpoints: {
      ussd: "POST /",
      sessions: "GET /api/sessions",
      locations: "GET /api/locations",
      chws: "GET /api/chws",
      appointments: "GET /api/appointments",
      stats: "GET /api/stats",
    },
  });
});

app.post("/api/maternal", async (req, res) => {
  try {
    const data = req.body; // Receive data sent from frontend
    console.log("data received ===============>", data);
    // Save maternal data to the database
    const maternal = new Maternal(data);
    await maternal.save();
    res.status(200).json({ message: "Maternal data received", data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/nutrition", async (req, res) => {
  try {
    const data = req.body; // Receive data sent from frontend
    console.log("data received ===============>", data);
    // Save maternal data to the database
    const nutrition = new Nutrition(data);
    await nutrition.save();
    // For now, just send it back as confirmation
    res.status(200).json({ message: "Maternal data received", data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/malaria", async (req, res) => {
  try {
    const data = req.body; // Receive data sent from frontend
    console.log("data received ===============>", data);
    // Save maternal data to the database
    const malaria = new Malaria(data);
    await malaria.save();
    // For now, just send it back as confirmation
    res.status(200).json({ message: "Maternal data received", data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backend endpoint - replace your existing one
app.post("/api/availability", async (req, res) => {
  try {
    const { availabilities } = req.body;

    if (!availabilities || !Array.isArray(availabilities)) {
      return res
        .status(400)
        .json({ message: "Invalid availability data format" });
    }

    if (availabilities.length === 0) {
      return res.status(400).json({ message: "No availability data provided" });
    }

    // Validate that all entries have required fields
    for (const availability of availabilities) {
      if (
        !availability.userId ||
        !availability.day ||
        !availability.availableFrom ||
        !availability.availableTo
      ) {
        return res
          .status(400)
          .json({ message: "Missing required fields in availability data" });
      }
    }

    const userId = availabilities[0].userId;

    // Delete existing availability for this user
    // Use the correct field name that matches your schema
    await Availability.deleteMany({ userId: userId }); // Changed from 'user' to 'userId'
    console.log(`Deleted existing availability for user: ${userId}`);

    // Option 1: Use insertMany for better performance (Recommended)
    const availabilityDocuments = availabilities.map((avail) => ({
      userId: avail.userId, // Make sure this matches your schema field name
      day: avail.day,
      availableFrom: avail.availableFrom,
      availableTo: avail.availableTo,
      createdAt: new Date(),
    }));

    const savedAvailabilities = await Availability.insertMany(
      availabilityDocuments
    );

    console.log(
      `Successfully saved ${savedAvailabilities.length} availability records for user: ${userId}`
    );

    res.status(200).json({
      message: "Availability saved successfully",
      count: savedAvailabilities.length,
      data: savedAvailabilities,
    });
  } catch (err) {
    console.error("Error saving availability:", err);

    // Handle specific MongoDB errors
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        details: err.message,
      });
    }

    if (err.name === "CastError") {
      return res.status(400).json({
        message: "Invalid user ID format",
      });
    }

    if (err.code === 11000) {
      return res.status(400).json({
        message: "Duplicate entry error. Please check your data.",
        details: err.message,
      });
    }

    res.status(500).json({ message: "Failed to save availability" });
  }
});

// Optional: Add an endpoint to get user's availability
// Updated GET endpoint to match the corrected field name
app.get("/api/availability/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Use the correct field name
    const availabilities = await Availability.find({ userId: userId }); // Changed from 'user' to 'userId'

    // Transform to match your frontend WeeklySchedule format
    const weeklySchedule = {
      monday: { day: "monday", isAvailable: false, startTime: "", endTime: "" },
      tuesday: {
        day: "tuesday",
        isAvailable: false,
        startTime: "",
        endTime: "",
      },
      wednesday: {
        day: "wednesday",
        isAvailable: false,
        startTime: "",
        endTime: "",
      },
      thursday: {
        day: "thursday",
        isAvailable: false,
        startTime: "",
        endTime: "",
      },
      friday: { day: "friday", isAvailable: false, startTime: "", endTime: "" },
      saturday: {
        day: "saturday",
        isAvailable: false,
        startTime: "",
        endTime: "",
      },
      sunday: { day: "sunday", isAvailable: false, startTime: "", endTime: "" },
    };

    // Populate with saved data
    availabilities.forEach((avail) => {
      if (weeklySchedule[avail.day]) {
        weeklySchedule[avail.day] = {
          day: avail.day,
          isAvailable: true,
          startTime: avail.availableFrom,
          endTime: avail.availableTo,
        };
      }
    });

    res.status(200).json({ schedule: weeklySchedule });
  } catch (err) {
    console.error("Error fetching availability:", err);
    res.status(500).json({ message: "Failed to fetch availability" });
  }
});

app.listen(port, () => {
  console.log(`CHW USSD Backend running on port ${port}`);
});
