// Mock Community Health Workers data
// TODO: Replace this mock data with real CHW data from the web interface
module.exports = [
  // Gashinge Village CHWs
  {
    name: "Jean Baptiste Uwimana",
    nameRw: "Jean Baptiste Uwimana",
    phoneNumber: "+250788123456",
    district: "Bugesera",
    sector: "Nyamata",
    cell: "Kigabiro",
    village: "Gashinge",
    specializations: ["Maternal Health", "Child Vaccination"],
    specializationsRw: ["Ubuzima bw'ababyeyi", "Inkingo z'abana"],
    availableHours: {
      start: 8, // 8 AM
      end: 17, // 5 PM
    },
    isActive: true,
    experience: "5 years",
    experienceRw: "Imyaka 5",
  },

  // Nyabikenke Village CHWs
  {
    name: "Paul Nkurunziza",
    nameRw: "Paul Nkurunziza",
    phoneNumber: "+250788345678",
    district: "Bugesera",
    sector: "Nyamata",
    cell: "Kigabiro",
    village: "Nyabikenke",
    specializations: ["First Aid", "Tuberculosis Care"],
    specializationsRw: ["Ubufasha bwa mbere", "Kuvura Igituntu"],
    availableHours: {
      start: 7, // 7 AM
      end: 15, // 3 PM
    },
    isActive: true,
    experience: "7 years",
    experienceRw: "Imyaka 7",
  },
  {
    name: "Agnes Nyiramana",
    nameRw: "Agnes Nyiramana",
    phoneNumber: "+250788456789",
    district: "Bugesera",
    sector: "Nyamata",
    cell: "Kigabiro",
    village: "Nyabikenke",
    specializations: ["Family Planning", "HIV Care"],
    specializationsRw: ["Kubana ubushobozi", "Kwitabira VIH"],
    availableHours: {
      start: 10, // 10 AM
      end: 18, // 6 PM
    },
    isActive: false, // Currently unavailable
    experience: "4 years",
    experienceRw: "Imyaka 4",
  },

  // Rugando Village CHWs
  {
    name: "Emmanuel Habimana",
    nameRw: "Emmanuel Habimana",
    phoneNumber: "+250788567890",
    district: "Bugesera",
    sector: "Nyamata",
    cell: "Kigabiro",
    village: "Rugando",
    specializations: ["Hypertension", "Diabetes Care"],
    specializationsRw: ["Umuvuduko ukabije", "Kuvura Diyabete"],
    availableHours: {
      start: 8, // 8 AM
      end: 16, // 4 PM
    },
    isActive: true,
    experience: "6 years",
    experienceRw: "Imyaka 6",
  },
  {
    name: "David Nsengimana",
    nameRw: "David Nsengimana",
    phoneNumber: "+250788789012",
    district: "Bugesera",
    sector: "Nyamata",
    cell: "Kigabiro",
    village: "Kigabiro",
    specializations: ["Emergency Response", "Wound Care"],
    specializationsRw: ["Gufasha mu byihutirwa", "Kuvura ibikomere"],
    availableHours: {
      start: 6, // 6 AM
      end: 14, // 2 PM
    },
    isActive: true,
    experience: "10 years",
    experienceRw: "Imyaka 10",
  },

  // Nyamiyaga Village CHWs
  {
    name: "Christine Mukankusi",
    nameRw: "Christine Mukankusi",
    phoneNumber: "+250788890123",
    district: "Bugesera",
    sector: "Nyamata",
    cell: "Kigabiro",
    village: "Nyamiyaga",
    specializations: ["Prenatal Care", "Postnatal Care"],
    specializationsRw: ["Kwitabira inda", "Kwitabira nyuma yo kubyara"],
    availableHours: {
      start: 8, // 8 AM
      end: 16, // 4 PM
    },
    isActive: true,
    experience: "5 years",
    experienceRw: "Imyaka 5",
  },

  // Ziko Village CHWs
  {
    name: "Francis Bizimana",
    nameRw: "Francis Bizimana",
    phoneNumber: "+250788901234",
    district: "Bugesera",
    sector: "Nyamata",
    cell: "Ziko",
    village: "Ziko",
    specializations: ["Chronic Disease Management", "Health Education"],
    specializationsRw: ["Kuvura indwara zidakombye", "Kwigisha ubuzima"],
    availableHours: {
      start: 7, // 7 AM
      end: 15, // 3 PM
    },
    isActive: true,
    experience: "9 years",
    experienceRw: "Imyaka 9",
  },

  // Add more CHWs for other villages as needed...
  // This is a sample - you can extend this for all villages in your location data
];
