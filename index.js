require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

const cors = require("cors");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.p5scedd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    const db = client.db("jobboardbdDB");
    const usersCollection = db.collection("users");
    const jobsCollection = db.collection("jobs");
    const conversationsCollection = db.collection("conversations");

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users-by-email/:email", async (req, res) => {
      const email = req.params.email;

      const result = await usersCollection.findOne({ email });

      if (result?.email) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });

    app.get("/users/:id", async (req, res) => {
      const userId = req.params.id;
      const result = await usersCollection.findOne({ _id: ObjectId(userId) });

      if (result?.email) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });

    app.patch("/apply/:jobId", async (req, res) => {
      const jobId = req.params.jobId;
      const filter = { _id: ObjectId(jobId) };
      const updateDoc = {
        $push: {
          applicants: {
            ...req.body,
          },
        },
      };

      const result = await jobsCollection.updateOne(filter, updateDoc);

      if (result.acknowledged) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });

    app.patch("/query", async (req, res) => {
      const userId = req.body.userId;
      const jobId = req.body.jobId;
      const email = req.body.email;
      const question = req.body.question;

      const filter = { _id: ObjectId(jobId) };
      const updateDoc = {
        $push: {
          queries: {
            id: ObjectId(userId),
            email,
            question: question,
            reply: [],
          },
        },
      };

      const result = await jobsCollection.updateOne(filter, updateDoc);

      if (result?.acknowledged) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });

    app.patch("/reply", async (req, res) => {
      const userId = req.body.userId;
      const reply = req.body.reply;
      console.log(reply);
      console.log(userId);

      const filter = { "queries.id": ObjectId(userId) };

      const updateDoc = {
        $push: {
          "queries.$[user].reply": reply,
        },
      };
      const arrayFilter = {
        arrayFilters: [{ "user.id": ObjectId(userId) }],
      };

      const result = await jobsCollection.updateOne(filter, updateDoc, arrayFilter);
      if (result.acknowledged) {
        return res.send({ status: true, data: result });
      }

      res.send({ status: false });
    });

    app.get("/my-jobs/:id", async (req, res) => {
      const employerId = req.params.id;
      const cursor = jobsCollection.find({ employerId });
      const result = await cursor.toArray();
      res.send({ status: true, data: result });
    });

    app.get("/applied-jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { applicants: { $elemMatch: { email: email } } };
      const cursor = jobsCollection.find(query); //.project({ applicants: 0 })
      const result = await cursor.toArray();
      res.send({ status: true, data: result });
    });

    app.get("/jobs", async (req, res) => {
      const cursor = jobsCollection.find({});
      const result = await cursor.toArray();
      res.send({ status: true, data: result });
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobsCollection.findOne({ _id: ObjectId(id) });
      res.send({ status: true, data: result });
    });

    app.delete("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobsCollection.deleteOne({ _id: ObjectId(id) });
      res.send({ status: true, data: result });
    });

    app.post("/jobs", async (req, res) => {
      const job = req.body;
      const result = await jobsCollection.insertOne(job);
      res.send({ status: true, data: result });
    });

    /*#####################
    ###### Chat APIs ######
    #######################*/

    //Creating new conversation between tow users
    app.post("/conversations", async (req, res) => {
      const conversation = {
        members: [req.body.senderId, req.body.receiverId],
      };
      try {
        const result = await conversationsCollection.insertOne(conversation);
        res.status(200).json(result);
      } catch (err) {
        res.status(500).json(err);
      }
    });

    //Get conversation includes two userId
    app.get("/conversations/find/:senderId/:receiverId", async (req, res) => {
      const senderId = req.params.senderId;
      const receiverId = req.params.receiverId;
      try {
        const result = await conversationsCollection.findOne({
          members: { $all: [senderId, receiverId] },
        });
        res.status(200).json(result);
      } catch (err) {
        res.status(500).json(err);
      }
    });
  } finally {
  }
};

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send({
    status: true,
    data: {
      message: "Welcome to job board bd server",
      author: {
        name: "Muhammad Touhiduzzaman",
        email: "touhid4bd@gmail.com",
        url: "https://github.com/TouhidZaman",
      },
    },
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

