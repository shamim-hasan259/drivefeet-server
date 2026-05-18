const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    const db = client.db("car-rental");
    const carsCollection = db.collection("cars");

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

    app.get("/cars/:carId", async (req, res) => {
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
