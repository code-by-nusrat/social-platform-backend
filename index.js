import express from 'express'
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import cors from 'cors'
import { createRemoteJWKSet,jwtVerify } from 'jose';
const app = express()
// const PORT = 5000
const PORT = process.env.PORT || 5000;
//4
app.use(cors())
app.use(express.json())


//3
const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const mongoClient = await connectToMongoDB()
if (!mongoClient) {
    throw new Error("MongoDB connection failed");
}
const db = mongoClient.db("social-platform")
const createEventCollection = db.collection("create-event")
const joinEventCollection = db.collection("joined-event")
//15
// today's date (YYYY-MM-DD) in Bangladesh time
// Vercel runs in UTC, so without this, yesterday's events stay visible until 6 AM Dhaka time
const todayInDhaka = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })

//14

// const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))
// console.log('JWKS_URL:', JSON.stringify(JWKS_URL))

// const verifyToken = async (req, res, next) => {
//   const authHeader = req.headers.authorization

//   if (!authHeader?.startsWith('Bearer ')) {
//     return res.status(401).send({ message: 'Unauthorized' })
//   }

//   try {
//     const token = authHeader.split(' ')[1]
//     const { payload } = await jwtVerify(token, JWKS)
//     console.log('payload:', payload)
//     req.user = payload
//     next()
//   } catch (err) {
//     console.error('JWT error:', err.message)
//     return res.status(401).send({ message: 'Unauthorized' })
//   }
// }

//14
const JWKS_URL = `${process.env.CLIENT_URL}/api/auth/jwks`
console.log('JWKS_URL:', JSON.stringify(JWKS_URL))

const JWKS = createRemoteJWKSet(new URL(JWKS_URL))

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Unauthorized' })
  }

  try {
    const token = authHeader.split(' ')[1]
    const { payload } = await jwtVerify(token, JWKS)
    req.user = payload
    next()
  } catch (err) {
    console.error('JWT error:', err.message)
    try {
      const r = await fetch(JWKS_URL, { redirect: 'manual' })
      console.error('JWKS status:', r.status, 'location:', r.headers.get('location'))
    } catch (e) {
      console.error('JWKS fetch failed:', e.message)
    }
    return res.status(401).send({ message: 'Unauthorized' })
  }
}
//5
//http://localhost:5000/create-event
// app.post('/create-event',verifyToken, async (req, res) => {
//   const data = req.body
//   const result = await createEventCollection.insertOne(data)
//   console.log(result)
//   res.send(result)
// })
app.post('/create-event', verifyToken, async (req, res) => {
  const data = {
    ...req.body,
    creatorEmail: req.user.email
  };

  const result = await createEventCollection.insertOne(data);

  res.status(201).send(result);
});
//6
app.get('/upcoming-events', async (req, res) => {
  const today = todayInDhaka()
  const result = await createEventCollection.find({ date: { $gte: today } }).toArray()
  res.send(result)
})

//7
app.get('/upcoming-events/:id', async (req, res) => {

  const { id } = req.params
  const result = await createEventCollection.findOne({ _id: new ObjectId(id) })
  res.send(result)
})

//8
//api url--http://localhost:5000/joined-event
// app.post('/joined-event',verifyToken, async (req, res) => {
//   const { eventId, email } = req.body
//   // if(!authHeader){
//   //   return res.status(401).send({msg:"Unauthorized!"})
//   // }
//   const alreadyJoined = await joinEventCollection.findOne({ eventId, email })
//   if (alreadyJoined) {
//     return res.status(409).send({ message: 'You already joined this event' })
//   }

//   const result = await joinEventCollection.insertOne(req.body)

//   // add 1 to the event's joined count
//   await createEventCollection.updateOne(
//     { _id: new ObjectId(eventId) },
//     { $inc: { participants: 1 } }
//   )

//   res.send(result)
// })

app.post('/joined-event', verifyToken, async (req, res) => {
  const { eventId, name, title, description, type, thumbnail, location, date } = req.body;
  const email = req.user.email;

  const alreadyJoined = await joinEventCollection.findOne({ eventId, email });

  if (alreadyJoined) {
    return res.status(409).send({
      message: 'You already joined this event'
    });
  }

  const result = await joinEventCollection.insertOne({
    eventId,
    email,
    name,
    title,
    description,
    type,
    thumbnail,
    location,
    date
  });

  await createEventCollection.updateOne(
    { _id: new ObjectId(eventId) },
    { $inc: { participants: 1 } }
  );

  res.send(result);
});
//9

// app.get('/joined-event/:email',verifyToken,
//   async (req, res) => {

//     const { email } = req.params
//     const result = await joinEventCollection.find({ email: email }).toArray()
//     res.send(result)
//   })

// Get joined events of the logged-in user
app.get('/joined-event', verifyToken, async (req, res) => {
  try {
    const email = req.user.email;

    if (!email) {
      return res.status(401).send({
        message: "Email not found in JWT token",
      });
    }

    const result = await joinEventCollection
      .find({ email })
      .toArray();

    res.status(200).send(result);

  } catch (error) {
    console.error("Get joined events error:", error);

    res.status(500).send({
      message: "Failed to fetch joined events",
    });
  }
});
//10
// app.get('/recent-events', async (req, res) => {
//   const today = new Date().toLocaleDateString('en-CA')
//   const result = await createEventCollection
//     .find({ date: { $gte: today } })
//     .sort({ date: 1 })
//     .limit(6)
//     .toArray()
//   res.send(result)
// })


app.get('/recent-events', async (req, res) => {
  const today = todayInDhaka()
  const result = await createEventCollection
    .find({ date: { $gte: today } })
    .sort({ date: 1 })
    .limit(6)
    .toArray()
  res.send(result)
})

//11 - get all events created by one user
// app.get('/manage-event/:email',verifyToken, async (req, res) => {
//   const email = req.params.email

//   const result = await createEventCollection
//     .find({ creatorEmail: email })
//     .sort({ date: 1 })
//     .toArray()

//   res.send(result)
// })
app.get('/manage-event', verifyToken, async (req, res) => {
  try {
    const email = req.user.email;

    const result = await createEventCollection
      .find({ creatorEmail: email })
      .sort({ date: 1 })
      .toArray();

    res.status(200).send(result);

  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: 'Failed to fetch your events'
    });
  }
});
//12 - update an event (only the owner can)
app.put('/update-event/:id', async (req, res) => {
  const id = req.params.id
  const { email, title, description, type, thumbnail, location, date } = req.body

  const result = await createEventCollection.updateOne(
    { _id: new ObjectId(id), creatorEmail: email },   // find: this event AND this owner
    { $set: { title, description, type, thumbnail, location, date } }   // change these fields
  )

  if (result.matchedCount === 0) {
    return res.status(403).send({ message: 'You can only update your own events' })
  }
  res.send(result)
})

//13 - delete an event (only the owner can)
app.delete('/delete-event/:id', async (req, res) => {
  const id = req.params.id
  const email = req.query.email

  const result = await createEventCollection.deleteOne(
    { _id: new ObjectId(id), creatorEmail: email }   // find: this event AND this owner
  )

  if (result.deletedCount === 0) {
    return res.status(403).send({ message: 'You can only delete your own events' })
  }

  // also remove the people who joined this event
  await joinEventCollection.deleteMany({ eventId: id })

  res.send(result)
})



//2
//http:/localhost:5000
app.get('/', (rew, res) => {
  res.send({ message: 'server is running fine!' })
})
//1
app.listen(PORT, () => {
  console.log(`server is running at ${PORT}`)
})
export default app