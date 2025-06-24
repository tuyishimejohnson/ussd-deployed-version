const mongoose = require("mongoose");
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

module.exports = mongoose.model("Location", LocationSchema);
