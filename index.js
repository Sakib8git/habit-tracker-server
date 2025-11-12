const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceKey.json");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Habit tracker is Running");
});
// !--sdk- firebase-------------------------

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
//Note: middle ware---------
//! middleware-------
const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res
      .status(401)
      .send({ message: "Unauthorized access: No token provided" });
  }

  const token = authorization.split(" ")[1]; // ✅ assumes "Bearer <token>"

  if (!token) {
    return res
      .status(401)
      .send({ message: "Unauthorized access: Token missing" });
  }

  try {
    await admin.auth().verifyIdToken(token);

    next();
  } catch (error) {
    // console.error("Token verification failed:", error);
    res.status(401).send({ message: "Unauthorized access: Invalid token" });
  }
};

// !----------------------------
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.kyh1mx2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// console.log(process.env.DB_USERNAME);
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
    const db = client.db("habit-track-db");
    const habitsCollection = db.collection("habits");
    //! all data find
    app.get("/habits", async (req, res) => {
      const result = await habitsCollection.find().toArray();

      res.send(result);
    });

    //! --------------------------------------
    //! Home fetures data find
    app.get("/fetured", async (req, res) => {
      try {
        const result = await habitsCollection
          .find()
          .sort({ createdAt: -1 }) // ✅ sort first
          .limit(6) // ✅ then limit
          .toArray(); // ✅ finally convert to array

        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to fetch featured habits" });
      }
    });
    //! --------------------------------------
    //! My habit post
    app.post("/habits", async (req, res) => {
      try {
        const data = req.body;

        // Optional: add server-side timestamps if needed
        data.createdAt = data.createdAt || new Date().toISOString();
        data.updatedAt = new Date().toISOString();
        data.currentStreak = data.currentStreak || 0;
        data.completionHistory = data.completionHistory || [];

        const result = await habitsCollection.insertOne(data);

        res.status(201).send(result);
      } catch (error) {
        console.error("❌ Failed to insert habit:", error);
        res.status(500).send({ error: "Failed to add habit" });
      }
    });
    //! --------------------------------------
    //! My habit page
    app.get("/my-habits", async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.status(400).send({ error: "Email is required" });
        }

        const result = await habitsCollection
          .find({ "user.email": email })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("❌ Failed to fetch habits:", error);
        res.status(500).send({ error: "Failed to load habits" });
      }
    });
    //! --------------------------------------
    //! habit details
    const { ObjectId } = require("mongodb");

    app.get("/habits/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid habit ID" });
        }

        const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });
        if (!habit) return res.status(404).send({ error: "Habit not found" });

        res.send(habit);
      } catch (error) {
        console.error("❌ Failed to fetch habit:", error);
        res.status(500).send({ error: "Failed to load habit" });
      }
    });
    //! --------------------------------------
    //! habit Mark today

    app.patch("/habits/:id/complete", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid habit ID" });
        }

        const habit = await habitsCollection.findOne({ _id: new ObjectId(id) });
        if (!habit) {
          return res.status(404).send({ error: "Habit not found" });
        }

        const today = new Date().toISOString().split("T")[0];
        const alreadyMarked = habit.completionHistory?.some((d) =>
          d.startsWith(today)
        );

        if (alreadyMarked) {
          return res.status(400).send({
            error: "Already marked today",
            message: "⛔ Already marked today",
          });
        }

        const updateResult = await habitsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $push: { completionHistory: new Date().toISOString() },
            $inc: { currentStreak: 1 },
            $set: { updatedAt: new Date().toISOString() },
          }
        );

        res.send({ success: true });
      } catch (error) {
        console.error("❌ Failed to mark habit complete:", error);
        res.status(500).send({ error: "Failed to update habit" });
      }
    });
    //! --------------------------------------
    //! habit update in my habit pg
    app.patch("/habits/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid habit ID" });
        }

        const updateFields = {
          title: updatedData.title,
          description: updatedData.description,
          category: updatedData.category,
          imageURL: updatedData.imageURL || "", // optional re-upload
          updatedAt: new Date().toISOString(),
        };

        const result = await habitsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields }
        );

        res.send({ success: true });
      } catch (error) {
        console.error("❌ Failed to update habit:", error);
        res.status(500).send({ error: "Failed to update habit" });
      }
    });

    //! --------------------------------------
    //! habit deletr in my habit pg
    app.delete("/habits/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid habit ID" });
        }

        const result = await habitsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ error: "Habit not found" });
        }

        res.send({ success: true });
      } catch (error) {
        console.error("❌ Failed to delete habit:", error);
        res.status(500).send({ error: "Failed to delete habit" });
      }
    });

    //! --------------------------------------
    // !search---------------------------
    // category banailam
    function getQueryFromSearchAndCategory(search = "", category = "") {
      return {
        isPublic: true,
        ...(category && category !== "All" && { category }),
        ...(search && {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        }),
      };
    }

    // search dilam
    app.get("/public-habits", async (req, res) => {
      const { search = "", category = "" } = req.query;
      const query = getQueryFromSearchAndCategory(search, category);

      try {
        const habits = await db.collection("habits").find(query).toArray();
        res.send(habits);
      } catch (err) {
        console.error("❌ Failed to fetch public habits:", err);
        res.status(500).send({ error: "Internal server error" });
      }
    });

    //! --------------------------------------
    //! ++++++++opore kaj++++++++++++++++++
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
