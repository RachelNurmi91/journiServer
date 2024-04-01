const express = require("express");
const User = require("../models/user");
const authenticate = require("../authenticate");

const tripRouter = express.Router();

// Route for Trip List
tripRouter
  .route("/")
  .get(authenticate.verifyUser, (req, res, next) => {
    User.find()
      .then((trips) => {
        // The res.json line will send the client JSON and end the find function.
        // It also automatically sets the header Content-Type to 'application/json'
        res.status(200).json(trips);
      })
      .catch((err) => next(err));
  })
  // The '/trips' route is only for viewing trips.
  // For the rest of the requests we will return status code 403 ('Forbidden')
  .post(authenticate.verifyUser, (req, res, next) => {
    res.status(403).send("POST operation not supported on /trips");
  })
  .put(authenticate.verifyUser, (req, res, next) => {
    res.status(403).send("PUT operation not supported on /trips");
  })
  .delete(authenticate.verifyUser, (req, res, next) => {
    res.status(403).send("DELETE operation not supported on /trips");
  });

// Route for the Add Trip
tripRouter
  .route("/add")
  // The '/trips/add' route is only for adding new trips.
  // All requests except POST will return status code 403 ('Forbidden')
  .get(authenticate.verifyUser, (req, res, next) => {
    res.status(403).send("GET operation not supported on /trips/add");
  })
  .post(authenticate.verifyUser, (req, res, next) => {
    const { tripName, departureDate } = req.body;
    const newTrip = { tripName, departureDate };
    if (!req.user) {
      // Only logged in users can send a 'POST' request.
      // If the request doesn't have a logged in user we will send a 401 ('Unauthorized')
      return res.status(404).json({ message: "Unauthorized: User not found" });
    } else {
      req.user.trips.push(newTrip);
      req.user
        .save()
        .then((user) => {
          // Status code 201 is "Created". Its more descriptive than just sending 200 ("OK").
          res.status(201).json(user.trips[user.trips.length - 1]);
        })
        .catch((err) => next(err));
    }
  })
  .put(authenticate.verifyUser, (req, res, next) => {
    res.status(403).send("PUT operation not supported on /trips/add");
  })
  .delete(authenticate.verifyUser, (req, res, next) => {
    res.status(403).send("DELETE operation not supported on /trips/add");
  });

// Route for Update Trip
tripRouter
  .route("/:tripId")
  .get(authenticate.verifyUser, (req, res, next) => {
    res
      .status(403)
      .send(`GET operation not supported on /trips/${req.params.tripId}`);
  })
  .post(authenticate.verifyUser, (req, res, next) => {
    res
      .status(403)
      .send(`POST operation not supported on /trips/${req.params.tripId}`);
  })
  .put(authenticate.verifyUser, (req, res, next) => {
    if (!req.user) {
      return res.status(404).json({ message: "Unauthorized: User not found" });
    } else {
      User.findOneAndUpdate(
        { "trips._id": req.params.tripId },
        {
          $set: {
            "trips.$.tripName": req.body.tripName,
            "trips.$.departureDate": req.body.departureDate,
          },
        },
        { new: true }
      )
        .then((user) => {
          const updatedTrip = user.trips.find(
            (trip) => trip._id.toString() === req.params.tripId
          );
          res.status(200).json(updatedTrip);
        })
        .catch((err) => next(err));
    }
  })
  .delete(authenticate.verifyUser, (req, res, next) => {
    if (!req.user) {
      return res.status(404).json({ message: "Unauthorized: User not found" });
    } else {
      const tripIndex = req.user.trips.findIndex(
        (trip) => trip._id.toString() === req.params.tripId
      );
      if (tripIndex === -1) {
        return res.status(404).json({ message: "Trip not found" });
      } else {
        req.user.trips.splice(tripIndex, 1);
        req.user
          .save()
          .then((user) => {
            const deletedTrip = user.trips[tripIndex];
            res.status(200).json(deletedTrip);
          })
          .catch((err) => next(err));
      }
    }
  });

//Error handling middleware

tripRouter.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("An internal server error has occurred.");
});

module.exports = tripRouter;
