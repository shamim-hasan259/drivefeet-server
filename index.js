const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const dotenv = require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.BETTER_AUTH_URL}/api/auth/jwks`)
);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log(authHeader);
  if (!authHeader) {
    return res.status(401).json({
      message: "Unauthorized access",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "No token provided",
    });
  }

  // console.log("TOKEN:", token);

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    console.log(req.user);
    next();
  } catch (error) {
    console.error("Token validation failed:", error);

    return res.status(401).json({
      message: "Invalid token",
    });
  }
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    const db = client.db("car-rental");
    const carsCollection = db.collection("cars");
    const carBookingCollection = db.collection("carBooking");

    app.post("/cars", verifyToken, async (req, res) => {
      const body = req.body;
      const email = req.user.email;
      const newCar = {
        ...body,
        userEmail: email,
      };
      const result = await carsCollection.insertOne(newCar);
      console.log(result);
      res.status(201).json({
        status: true,
        message: "car created successfully",
        data: result,
      });
    });
    app.get("/available", async (req, res) => {
      const cars = await carsCollection.find().limit(6).toArray();
      res.status(200).json({
        status: true,
        message: "feature cars fetched successfully",
        cars,
      });
    });
    app.get("/cars", async (req, res) => {
      try {
        const search = req.query.search || "";
        const category = req.query.category || "";
        let query = {};
        // search by car name
        if (search) {
          query.carName = {
            $regex: search,
            $options: "i",
          };
        }
        // filter by car type
        if (category) {
          query.carType = category;
        }

        const cars = await carsCollection.find(query).toArray();

        res.status(200).json({
          status: true,
          message: "cars fetched successfully",
          cars,
        });
      } catch (error) {
        console.log(error);

        res.status(500).json({
          status: false,
          message: "something went wrong",
        });
      }
    });
    app.get("/my-added-cars", verifyToken, async (req, res) => {
      const result = await carsCollection
        .find({ userEmail: req.user.email })
        .toArray();
      res
        .status(200)
        .json({ status: true, message: "fetched all added car", data: result });
    });
    app.get("/cars/:carId", verifyToken, async (req, res) => {
      const { carId } = req.params;
      const query = {
        _id: new ObjectId(carId),
      };
      const car = await carsCollection.findOne(query);
      res.status(200).json({
        status: true,
        message: "single car fetched successfully",
        car,
      });
    });

    app.patch("/cars/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const body = req.body;
      const query = {
        _id: new ObjectId(id),
      };
      const updatedCar = {
        $set: {
          ...body,
        },
      };
      const result = await carsCollection.updateOne(query, updatedCar);
      res.status(200).json({
        message: "update car successfully",
        status: true,
        data: result,
      });
    });

    app.delete("/cars/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      console.log(id);
      const query = {
        _id: new ObjectId(id),
      };
      const result = await carsCollection.deleteOne(query);
      console.log(result);
      res
        .status(200)
        .json({ message: "delete car successfully", data: result });
    });

    // booking api
    app.post("/booking", verifyToken, async (req, res) => {
      const { bookingData } = req.body;
      const { _id, ...data } = bookingData;
      const result = await carBookingCollection.insertOne(data);
      console.log(result);
      res
        .status(201)
        .json({ message: "booking successfully", status: true, data: result });
    });

    app.get("/booking", verifyToken, async (req, res) => {
      const booking = await carBookingCollection.find().toArray();
      res
        .status(200)
        .json({ message: "booking fetched successfully", data: booking });
    });
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.listen(process.env.PORT, () => {
  console.log(`server is running on PORT ${process.env.PORT}`);
});
