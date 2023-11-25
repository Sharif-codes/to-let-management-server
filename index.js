const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000

const corsOptions= {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200,
  }
app.use(cors(corsOptions))
app.use(express.json())
const uri=process.env.URI
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  async function run() {
    try {
        // send cookie
        app.post('/jwt', async (req, res) => {
            const user = req.body
            console.log('I need a new jwt', user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
              expiresIn: '365d',
            })
            res
              .cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
              })
              .send({ success: true })
          })

          app.get('/logout', async (req, res) => {
            try {
              res
                .clearCookie('token', {
                  maxAge: 0,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true })
              console.log('Logout successful')
            } catch (err) {
              res.status(500).send(err)
            }
          })
      // Connect the client to the server	(optional starting in v4.7)
    //   await client.connect();
      // Send a ping to confirm a successful connection
    //   await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
    }
  }
  run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello from StayVista Server..')
  })
  
  app.listen(port, () => {
    console.log(`Gulshan Tower is running on port ${port}`)
  })