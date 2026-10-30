import express from 'express'
import { MongoClient } from 'mongodb';
import 'dotenv/config' 

const app =express()
const PORT= 5000

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
connectToMongoDB()

//2
//http:/localhost:5000
app.get('/',(rew,res)=>{
    res.send({message:'server is running fine!'})
})
//1
app.listen(PORT,()=>{
    console.log(`server is running at ${PORT}`)
})