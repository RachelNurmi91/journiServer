const express = require("express");
const authenticate = require("../authenticate");
const User = require("../models/user");
const cors = require("./cors");

const activityRouter = express.Router();

// ---- ROUTE FOR OBTAINING A TRIP'S ACTIVITY LIST ---- //
activityRouter
  .route("/")
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
  .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
    // Activities are trip based, not user based.
    // The request body must contain a specified tripId.

    User.findById(req.user._id)
      .then((user) => {
        if (!user)
          return res
            .status(404)
            .json({ message: "Unauthorized: User not found" });

        // Search the trips for an id that matches our request.

        const trip = req.user.trips.id(req.body.tripId);

        if (!trip)
          return res
            .status(404)
            .json({ message: "Unauthorized: Trip not found" });

        res.status(200).json(trip.activities);
      })
      .catch((err) => next(err));
  })
  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.status(403).send("POST operation not supported on /activities");
  })
  .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.status(403).send("PUT operation not supported on /activities");
  })
  .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.status(403).send("DELETE operation not supported on /activities");
  });

// ---- ROUTE FOR ADDING AN ACTIVITY TO A TRIP ---- //
activityRouter
  .route("/add")
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
  .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
    res.status(403).send("GET operation not supported on /activities/add");
  })
  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    // To add a activity the request body must contain a the id of the trip it will be added to.
    const { name, startDate, tripId, startTime, location, addOns } = req.body;

    const newActivity = {
      name,
      startDate,
      startTime,
      location,
      addOns: {
        comments: addOns.comments,
        ticketNo: addOns.ticketNo,
        ticketUploads: addOns.ticketUploads,
      },
    };

    User.findById(req.user._id).then((user) => {
      if (!user)
        return res
          .status(404)
          .json({ message: "Unauthorized: User not found" });

      const trip = user.trips.id(tripId);
      if (!trip)
        return res.status(404).json({ message: "Error: Trip not found" });

      trip.activities.push(newActivity);

      user
        .save()
        .then((user) => {
          const newActivity = user.trips.id(tripId).activities.slice(-1);
          res.status(200).json({
            message: "Success: Activity saved successfully",
            newActivity,
          });
        })
        .catch((err) => next(err));
    });
  })
  .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.status(403).send("PUT operation not supported on /activities/add");
  })
  .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.status(403).send("DELETE operation not supported on /activities/add");
  });

// ---- ROUTE FOR AN INDIVIDUAL ACTIVITY ---- //
activityRouter
  .route("/:activityId")
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))

  // At this point the activityId will be in the url of the req.
  // Since we are focused on the individual activity we do not need the tripId sent over in the req body.

  .get(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res
      .status(403)
      .send(
        `GET operation not supported on /activities/${req.params.activityId}`
      );
  })
  .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    const { name, location, startDate, startTime, addOns } = req.body;
    User.findOneAndUpdate(
      { "trips.activities._id": req.params.activityId },
      {
        $set: {
          "trips.$[i].activities.$[x].name": name,
          "trips.$[i].activities.$[x].location": location,
          "trips.$[i].activities.$[x].startDate": startDate,
          "trips.$[i].activities.$[x].startTime": startTime,
          "trips.$[i].activities.$[x].addOns": addOns,
        },
      },
      {
        arrayFilters: [
          { "i.activities._id": req.params.activityId },
          { "x._id": req.params.activityId },
        ],
        new: true,
      }
    )
      .then((activity) => {
        if (!activity)
          return res.status(404).json({ message: "Error: Activity not found" });
        activity
          .save()
          .then((user) => {
            let updatedActivity;

            user.trips.forEach((trip) => {
              trip.activities.forEach((activity) => {
                if (activity._id.toString() === req.params.activityId) {
                  updatedActivity = activity;
                  return;
                }
              });
            });

            res.status(200).json({
              message: "Success: Activity update saved successfully",
              updatedCruise: updatedActivity,
            });
          })
          .catch((err) => next(err));
      })
      .catch((err) => next(err));
  })
  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res
      .status(403)
      .send(`POST operation not supported on /activities/${req.params._id}`);
  })
  .delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    if (!req.user) {
      return res.status(404).json({ message: "Unauthorized: User not found" });
    } else {
      const { activityId } = req.params;

      let activityIndex;
      let tripIndex;

      req.user.trips.forEach((trip, userTripsIndex) => {
        trip.activities.forEach((activity, index) => {
          if (activity._id.toString() === activityId.toString()) {
            tripIndex = userTripsIndex;
            activityIndex = index;
            return;
          }
        });
      });

      if (activityIndex === -1) {
        return res.status(404).json({ message: "Activity not found" });
      } else {
        req.user.trips[tripIndex].activities.splice(activityIndex, 1);
        req.user.save((err, user) => {
          if (err) {
            return next(err);
          }
          const deleteActivity =
            user.trips[tripIndex].activities[activityIndex];
          res.status(200).json(deleteActivity);
        });
      }
    }
  });

//Error handling middleware

activityRouter.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("An internal server error has occurred.");
});

module.exports = activityRouter;
