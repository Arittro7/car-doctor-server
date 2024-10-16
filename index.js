const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
})); 
app.use(express.json());
app.use(cookieParser());


// custom middlewares
const logger = async(req, res, next) => {
  console.log('Called CMidware', req.hostname, req.originalUrl)
  next()
}

const verifyToken =  async(req, res, next) => {
  const token = req.cookies?.token;
  if(!token) {
    return res.status(401).send({ message: 'Unauthorized access' })
  }
  
  next()
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wv413.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');
    const bookingCollection = client.db('carDoctor').collection('bookings');
    const productCollection = client.db('carDoctor').collection('products');
    const teamCollection = client.db('carDoctor').collection('teams');

    // Auth related API
    app.post('/jwt', logger,  async (req, res) => {
      const user = req.body;
      console.log(user);
      const token  = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '1h' });
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: false,
        // sameSite: 'none'
      })
      .send({success: true})

    })
    //   const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '1h' })
    //   res
    //     .cookie('token', token, {
    //       httpOnly: true,
    //       secure: true,
    //       sameSite: 'none'
    //     })
    //     .send({ success: true })
    // })

    // Services related API
    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get('/products', async (req, res) => {
      const cursor = productCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get('/teams', async (req, res) => {
      const cursor = teamCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // get specific service by id
    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }

      const options = {
        projection: { title: 1, price: 1, img: 1 }
      };

      const result = await serviceCollection.findOne(query, options);
      res.send(result)
    })
    // Booking related                        🚩
    // Post booking data
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result)
    })

    // get booking data
    app.get('/bookings', async (req, res) => {
    // app.get('/bookings', logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log('bookingToken', req.cookies.token)
      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })

    // Update booking data
    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
      console.log(updatedBooking);
      const updateDoc = {
        $set: {
          status: updatedBooking.status
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    })


    // Delete Booking data
    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Doctor server is running')
})

app.listen(port, () => {
  console.log(`CAR Doctor server is running on port: ${port}`);
})

