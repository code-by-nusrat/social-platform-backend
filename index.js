import express from 'express'
import { MongoClient } from 'mongodb';
import 'dotenv/config' 
import cors from 'cors'
const app =express()
const PORT= 5000

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
const mongoClient =await connectToMongoDB()
const db =mongoClient.db("social-platform")
const createEventCollection =db.collection("create-event")

//5
//http://localhost:5000/create-event
app.post('/create-event',async(req,res)=>{
  const data =req.body
  const result =await  createEventCollection.insertOne(data)
  console.log(result)
  res.send(result)
})

//2
//http:/localhost:5000
app.get('/',(rew,res)=>{
    res.send({message:'server is running fine!'})
})
//1
app.listen(PORT,()=>{
    console.log(`server is running at ${PORT}`)
})