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
  const authHeader = req?.headers?.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "unauthorize" });
  }
  const token = authHeader.split(" ")[1];
  console.log(token);
  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    console.error("Token validation failed:", error);
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
      const result = await carsCollection.insertOne({ ...body });
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
      const cars = await carsCollection.find().toArray();
      res.status(200).json({
        status: true,
        message: "all cars fetched successfully",
        cars,
      });
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
      const query = {
        _id: new ObjectId(id),
      };
      const result = await carsCollection.deleteOne(query);
      res
        .status(200)
        .json({ message: "delete car successfully", data: result });
    });

    // booking api
    app.post("/booking", verifyToken, async (req, res) => {
      const { bookingData } = req.body;
      const result = await carBookingCollection.insertOne(bookingData);
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
