const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@finalassignm.5ubqsz5.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())


async function run() {
  try {
    // DB collection
    const apartmentCollection = client.db('gulshan').collection('apartment')
    const userCollection = client.db('gulshan').collection('users')
    const agreementCollection = client.db('gulshan').collection('agreements')

    app.post('/jwt', async (req, res) => {
      const user = req.body
      // console.log(process.env.ACCESS_TOKEN)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d'
      })
      console.log(token);
      res.send({ token })
    })

    const verifyToken = (req, res, next) => {
      // console.log('inside verify token:',req.headers )
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'not authorized access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        // console.log(error);
        if (error) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded
        next()
      })
    }

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === 'admin'
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }
    const verifyMember= async (req,res,next)=>{
      const email= req.decoded.email
      const query= {email:email}
      const user= await userCollection.findOne(query)
      const isMember= user?.role === 'member'
      if(!isMember)
      {
        return res.status(403).send({message: 'forbidden access'})
      }
      next()
    }

    app.get('/apartment', async (req, res) => {
      const query = req.query
      const page = query.page
      const pageNumber = parseInt(page)
      const perPage = 6
      const skip = pageNumber * perPage
      const result = await apartmentCollection.find().skip(skip).limit(perPage).toArray()
      const postCount = await apartmentCollection.countDocuments()
      res.send({ result, postCount })
    })
    app.get('/apartmentData', verifyToken, verifyAdmin, async (req, res) => {
      const availableQuery = { status: "available" }
      const bookedQuery = { status: "booked" }
      const usersQuery = { role: "user" }
      const memberQuery = { role: "member" }
      const available = (await apartmentCollection.find(availableQuery).toArray()).length
      const booked = (await apartmentCollection.find(bookedQuery).toArray()).length
      const user = (await userCollection.find(usersQuery).toArray()).length
      const member = (await userCollection.find(memberQuery).toArray()).length
      const total = await apartmentCollection.estimatedDocumentCount()
      console.log("user: ", user);
      console.log(member);
      res.send({ total, available, booked, user, member })
    })

    // save user in the database
    app.post('/users/:email',verifyToken, async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email: email }
      const options = { upsert: true }
      const isExist = await userCollection.findOne(query)
      console.log('User found?----->', isExist)
      if (isExist) return res.send(isExist)
      const result = await userCollection.insertOne(user)
      res.send(result)
    })
    //find admin
    app.get('/user/admin/:email',verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log("decoded data", req.decoded);
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query);
      let admin = false
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })

    //find Member
    app.get('/user/member/:email',verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log("decoded data", req.decoded);
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query);
      let member = false;
      if (user) {
        member = user?.role === 'member'
      }
      res.send({ member })
    })
    //load user
    app.get('/members',verifyToken,verifyAdmin, async (req, res) => {
      const query= {role: "member"}
      console.log("member clicked");
      const result= await userCollection.find(query).toArray()
      res.send(result)
    })
    //member remove
    app.patch('/memberRemove/:email',verifyToken,verifyAdmin, async(req,res)=>{
      const userEmail= req.params.email
      const filter= {email: userEmail}
      const document= {
        $set:{
          role: 'user'
        }
      }
      const result= await userCollection.updateOne(filter,document)
      res.send(result)
    })

    // add agreement to the database
    app.post('/agreement',verifyToken, async (req, res) => {
      const data = req.body
      const result = await agreementCollection.insertOne(data)
      res.send(result)
    })
    //get all agrements
    app.get('/agreement',verifyToken, verifyAdmin, async(req,res)=>{
      const query={status: "pending"}
      const result= await agreementCollection.find(query).toArray()
      res.send(result)
    })
    // Accept agreement
app.patch('/acceptAgreement',verifyToken,verifyAdmin, async (req, res) => {
  const serial = req.body.si;
  const userEmail = req.body.email;
  console.log("serial", serial);
  console.log("user email", userEmail);
  const filterSerial = { si: serial };
  const filterEmail = { email: userEmail };
  const updatedRequest = {
    $set: {
      status: "checked"
    }
  };
  const updatedApartment = {
    $set: {
      status: "booked"
    }
  };
  const updateUser = {
    $set: {
      role: "member"
    }
  };
  const agreementStatus = await agreementCollection.updateOne(filterSerial, updatedRequest);
  const apartmentStatus = await apartmentCollection.updateOne(filterSerial, updatedApartment);
  const userStatus = await userCollection.updateOne(filterEmail, updateUser);
  res.send({ agreementStatus, apartmentStatus, userStatus });
});

// Reject agreement
app.patch('/rejectAgreement/:si',verifyToken,verifyAdmin, async (req, res) => {
  console.log(serial);
  console.log(serial);
  const filter = { si: serial };
  const updatedDoc = {
    $set: {
      status: "checked"
    }
  };
  const result = await agreementCollection.updateOne(filter, updatedDoc);
  res.send(result);
});
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from StayVista Server..')
})

app.listen(port, () => {
  console.log(`Gulshan Tower is running on port ${port}`)
})