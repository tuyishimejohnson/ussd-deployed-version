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
const messages = require("./messages/messages_ussd");

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

// Get all users from MongoDB
const getUsersByLocation = async (district, sector, cell, village) => {
  // Find users matching the selected location and who are active
  const users = await User.find({
    district: district,
    sector: sector,
    cell: cell,
    village: village,
  });

  // For each user, fetch their availability records
  const usersWithAvailability = await Promise.all(
    users.map(async (user) => {
      const availabilities = await Availability.find({ userId: user._id });
      // Build an object with days as keys and hours as values
      const availabilityByDay = {};
      availabilities.forEach((avail) => {
        availabilityByDay[
          avail.day.toLowerCase()
        ] = `${avail.availableFrom} - ${avail.availableTo}`;
      });
      return {
        ...user.toObject(),
        availabilities: availabilityByDay,
      };
    })
  );

  console.log(
    "==================++++++++++++++ availability for users",
    usersWithAvailability
  );
  return usersWithAvailability;
};
// const isTimeInRange = (currentHour, startHour, endHour) => {
//   return currentHour >= startHour && currentHour < endHour;
// };

// const isWithinBusinessHours = (availabilities) => {
//   const currentDate = new Date();
//   const currentHour = currentDate.getHours();
//   const currentDay = currentDate
//     .toLocaleString("en-us", { weekday: "long" })
//     .toLowerCase();

//   const todayAvailability = availabilities.find(
//     (avail) => avail.day.toLowerCase() === currentDay
//   );

//   if (!todayAvailability) return false;

//   const [startHour, startMinute] = todayAvailability.availableFrom
//     .split(":")
//     .map(Number);
//   const [endHour, endMinute] = todayAvailability.availableTo
//     .split(":")
//     .map(Number);

//   return isTimeInRange(currentHour, startHour, endHour);
// };

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
    console.log(
      "Patient name from session:===============================>",
      session.userName
    );

    // Language selection
    if (text === "") {
      response = messages.en.welcome;
      response += "\n1. English";
      response += "\n2. Kinyarwanda";
      await updateSession(phoneNumber, { currentStep: "language" });
    } else if (
      session.currentStep === "language" &&
      (lastInput === "1" || lastInput === "2")
    ) {
      // After language selection, prompt for user's name
      const lang = lastInput === "1" ? "en" : "rw";
      await updateSession(phoneNumber, {
        selectedLanguage: lang,
        currentStep: "name",
      });
      response =
        lang === "en"
          ? "CON Please enter your full name:"
          : "CON Andika izina ryawe ryuzuye:";
    }
    // Handle name input
    else if (session.currentStep === "name") {
      const lang = session.selectedLanguage || "en";
      const msg = messages[lang];
      const name = lastInput && lastInput.trim();
      if (!name) {
        response =
          lang === "en"
            ? "CON Invalid name. Please enter your full name:"
            : "CON Izina ntirikwiye. Andika izina ryawe ryuzuye:";
      } else {
        await updateSession(phoneNumber, {
          userName: name,
          currentStep: "district",
        });

        // Save patient name in Appointment schema for future appointments
        // (the actual appointment is created later, but we store the name in the session here)

        console.log(`Patient name saved: ${name} for phone: ${phoneNumber}`);

        response =
          (lang === "en" ? `CON Hello ${name}! ` : `CON Muraho ${name}! `) +
          msg.selectDistrict;

        response = msg.selectDistrict;
        locationData.districts.forEach((district, index) => {
          const districtName = lang === "en" ? district.name : district.nameRw;
          response += `\n${index + 1}. ${districtName}`;
        });
        response += `\n${msg.goBack}`;
      }
    }
    // Handle language selection
    else if (session.currentStep === "language") {
      if (lastInput === "1") {
        await updateSession(phoneNumber, {
          selectedLanguage: "en",
          currentStep: "name",
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
          console.log(
            `Selected location - User Name: ${session.userName}, District: ${session.selectedDistrict}, Sector: ${session.selectedSector}, Cell: ${session.selectedCell}, Village: ${selectedVillage.name}`
          );

          await updateSession(phoneNumber, {
            selectedVillage: selectedVillage.name,
            currentStep: "user_selection",
          });

          console.log(`Transitioning to user_selection with location:`, {
            district: session.selectedDistrict,
            sector: session.selectedSector,
            cell: session.selectedCell,
            village: selectedVillage.name,
          });
          // Get users for this village
          const users = await getUsersByLocation(
            session.selectedDistrict,
            session.selectedSector,
            session.selectedCell,
            selectedVillage.name
          );

          console.log(
            `Users retrieved:`,
            users.map((u) => ({
              name: u.name,
              specialization: u.specialization,
            }))
          );
          if (users.length === 0) {
            console.log(`No users found for location:`, {
              district: session.selectedDistrict,
              sector: session.selectedSector,
              cell: session.selectedCell,
              village: selectedVillage.name,
            });
            response = msg.noUsersAvailable;
          } else {
            // Include the user's name in the response for confirmation
            response = `${msg.selectUser}\n${msg.enteredName || "Name"}: ${
              session.userName
            }`;
            users.forEach((user, index) => {
              const userName =
                lang === "en" ? user.name : user.nameRw || user.name;

              response += `\n${index + 1}. ${userName}`;
              response += `\n   ${msg.role}: ${user.specialization}`;
              // Format availability hours as a string, e.g., "Mon: 08:00-17:00, Thu: 08:00-17:00"
              const availabilityStr = Object.entries(user.availabilities)
                .map(([day, hours]) => {
                  // Capitalize first letter of day
                  const dayLabel =
                    day.charAt(0).toUpperCase() + day.slice(1, 3);
                  return `${dayLabel}: ${hours}`;
                })
                .join(", ");
              response += `\n   Status: ${availabilityStr || "N/A"}`;
              response += `\n   Village: ${selectedVillage.name}`;
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

    // Handle user selection
    else if (session.currentStep === "user_selection") {
      const lang = session.selectedLanguage || "en";
      const msg = messages[lang];

      if (lastInput === "0") {
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
        const userIndex = parseInt(lastInput) - 1;
        const users = await getUsersByLocation(
          session.selectedDistrict,
          session.selectedSector,
          session.selectedCell,
          session.selectedVillage
        );

        if (userIndex >= 0 && userIndex < users.length) {
          const selectedUser = users[userIndex];

          // Check if user is available
          if (!selectedUser.availabilities) {
            response = msg.userNotAvailable;
          } else {
            // Book appointment
            const appointment = new Appointment({
              patientPhoneNumber: phoneNumber,
              userId: selectedUser._id,
              userName: selectedUser.name,
              patientName: session.userName, // <-- Send the name here
              district: session.selectedDistrict,
              sector: session.selectedSector,
              cell: session.selectedCell,
              village: session.selectedVillage,
              createdAt: new Date(),
            });
            await appointment.save();

            await updateSession(phoneNumber, {
              selectedUser: selectedUser.name,
              selectedUserId: selectedUser._id.toString(),
              appointmentBooked: true,
              currentStep: "completed",
            });

            const userName =
              lang === "en"
                ? selectedUser.name
                : selectedUser.nameRw || selectedUser.name;
            // Include the user's name in the confirmation message
            response = msg.appointmentBooked
              .replace("{user}", userName)
              .replace("{village}", session.selectedVillage)
              .replace("{name}", session.userName || "");
          }
        } else {
          response = msg.invalidInput;
          response += "\n" + msg.selectUser;
          users.forEach((user, index) => {
            const userName =
              lang === "en" ? user.name : user.nameRw || user.name;

            response += `\n${index + 1}. ${userName}`;
            response += `\n   ${msg.role}: ${user.role || "N/A"}`;
            response += `\n   Status: ${user.availabilities}`;
            response += `\n   Village: ${session.selectedVillage}`;
            response += "\n";
          });
          response += `\n${msg.goBack}`;
        }
      }
    }

    setTimeout(() => {
      // Also send the name in the response for debugging or confirmation if needed
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

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().sort({ name: 1 });
    res.json(users);
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

app.get("/api/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.status(200).json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Appointment.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.status(200).json({ message: "Appointment deleted", id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/appointments/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const appointments = await Appointment.find({ userId }).sort({
      createdAt: -1,
    });
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
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

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
      totalUsers,
      activeUsers,
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
    message: "USSD Backend API",
    version: "1.0.0",
    endpoints: {
      ussd: "POST /",
      sessions: "GET /api/sessions",
      locations: "GET /api/locations",
      users: "GET /api/users",
      appointments: "GET /api/appointments",
      userAppointments: "GET /api/appointments/user/:userId",
      stats: "GET /api/stats",
    },
  });
});

// For fetching maternal data
app.get("/api/maternal", async (req, res) => {
  try {
    const maternalData = await Maternal.find();
    res.status(200).json(maternalData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add GET endpoint to fetch all nutrition data
app.get("/api/nutrition", async (req, res) => {
  try {
    const nutritionData = await Nutrition.find();
    res.status(200).json(nutritionData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add GET endpoint to fetch all malaria data
app.get("/api/malaria", async (req, res) => {
  try {
    const malariaData = await Malaria.find().populate("recordedBy", "name");
    res.status(200).json(malariaData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/malaria/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const malaria = await Malaria.findById(id).populate("recordedBy", "name");
    if (!malaria) {
      return res.status(404).json({ message: "Malaria record not found" });
    }
    res.status(200).json(malaria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/maternal/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const maternal = await Maternal.findById(id);
    if (!maternal) {
      return res.status(404).json({ message: "Maternal record not found" });
    }
    res.status(200).json(maternal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/nutrition/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const nutrition = await Nutrition.findById(id);
    if (!nutrition) {
      return res.status(404).json({ message: "Nutrition record not found" });
    }
    res.status(200).json(nutrition);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/maternal", async (req, res) => {
  try {
    const data = req.body;
    console.log("data received ===============>", data);
    const maternal = new Maternal(data);
    await maternal.save();
    res.status(200).json({ message: "Maternal data received", data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/nutrition", async (req, res) => {
  try {
    const data = req.body;
    console.log("data received ===============>", data);
    const nutrition = new Nutrition(data);
    await nutrition.save();
    res.status(200).json({ message: "Nutrition data received", data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/malaria", async (req, res) => {
  try {
    const data = req.body;
    console.log("data received ===============>", data);
    const malaria = new Malaria(data);
    await malaria.save();
    res.status(200).json({ message: "Malaria data received", data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/malaria/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Malaria.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Malaria record not found" });
    }
    res.status(200).json({ message: "Malaria record deleted", id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/maternal/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Maternal.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Maternal record not found" });
    }
    res.status(200).json({ message: "Maternal record deleted", id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/nutrition/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Nutrition.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Nutrition record not found" });
    }
    res.status(200).json({ message: "Nutrition record deleted", id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

    await Availability.deleteMany({ userId: userId });
    console.log(`Deleted existing availability for user: ${userId}`);

    const availabilityDocuments = availabilities.map((avail) => ({
      userId: avail.userId,
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

app.get("/api/availability/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const availabilities = await Availability.find({ userId: userId });

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
  console.log(`USSD Backend running on port ${port}`);
});
