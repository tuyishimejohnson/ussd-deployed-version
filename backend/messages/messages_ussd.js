// USSD Messages
module.exports = {
  en: {
    welcome: "CON Welcome!\nSelect language:",
    selectDistrict: "CON Select your district:",
    selectSector: "CON Select your sector:",
    selectCell: "CON Select your cell:",
    selectVillage: "CON Select your village:",
    selectUser: "CON Available CHW in your village:",
    noUsersAvailable:
      "END Sorry, no CHW are currently available in your village. Please try again later.",
    userNotAvailable: "END The selected CHW is currently not available.",
    appointmentBooked:
      "END Appointment successfully booked!\nCHW: {user}\nVillage: {village}\nYou will be contacted soon.",
    completion:
      "END Thank you! Your selection has been recorded.\nDistrict: {district}\nSector: {sector}\nCell: {cell}\nVillage: {village}",
    error: "END Sorry, an error occurred. Please try again.",
    invalidInput: "CON Invalid input. Please try again:",
    goBack: "0. Go Back",
    available: "Available",
    notAvailable: "Not Available",
    role: "Specialization",
  },
  rw: {
    welcome: "CON Murakaza neza\nHitamo ururimi:",
    selectDistrict: "CON Hitamo akarere kawe:",
    selectSector: "CON Hitamo umurenge wawe:",
    selectCell: "CON Hitamo akagari kawe:",
    selectVillage: "CON Hitamo umudugudu wawe:",
    selectUser: "CON Abajyanama bahari mu mudugudu wawe:",
    noUsersAvailable:
      "END Ihangane, nta bajyanama bahari mu mudugudu wawe. Ongera ugerageze nyuma.",
    userNotAvailable: "END Umukoresha wahisemo ntabwo ari hafi.",
    appointmentBooked:
      "END Igihe cyo guhura cyarateguwe neza!\nUmujyanama: {user}\nUmudugudu: {village}\nUzavugana nawe vuba.",
    completion:
      "END Murakoze! Amakuru yanyu yakiriwe.\nAkarere: {district}\nUmurenge: {sector}\nAkagari: {cell}\nUmudugudu: {village}",
    error: "END Ihangane, habaye ikosa. Ongera ugerageze.",
    invalidInput: "CON Amakuru atari yo. Ongera ugerageze:",
    goBack: "0. Subira Inyuma",
    available: "Arahari",
    notAvailable: "Ntahari",
    role: "Icyo avura",
  },
};
