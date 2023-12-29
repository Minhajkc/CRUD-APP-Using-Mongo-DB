const express = require('express');
const app = express();
const fs = require('fs');
const ejs = require('ejs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
const MongoClient = require('mongodb').MongoClient;

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'forminner';
const COLLECTION_NAME = 'signupusers';

const indexTemplatePath = path.join(__dirname, 'views', 'index.ejs');
const indexTemplate = fs.readFileSync(indexTemplatePath, 'utf-8');


let isAuthenticated = true; 
const checkAuthentication = (req, res, next) => {
    if (isAuthenticated) {
        next();
    } else {
        res.redirect('/');
    }
}



app.get('/', (req, res) => {
    const signupPath = path.join(__dirname, 'views', 'signup.ejs');
    const signupContent = fs.readFileSync(signupPath, 'utf-8');
    res.end(signupContent);
});



app.get('/login', (req, res) => {
    const loginPath = path.join(__dirname, 'views', 'login.ejs');
    const loginContent = fs.readFileSync(loginPath, 'utf-8');
    res.end(loginContent);
   
});

app.use(checkAuthentication);



app.get('/homemy?',(req,res)=>{
    res.redirect('/home')
})



app.get('/home', async (req, res) => {
    let client; 
    try {
  
        client = await MongoClient.connect(MONGODB_URI, { useUnifiedTopology: true });
        console.log('Database connected');

   
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);


        const users = await collection.find().toArray();

   
        const renderedTemplate = ejs.render(indexTemplate, { Data: users });

        res.send(renderedTemplate);
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        res.status(500).send('Internal Server Error');
    } finally {
  
        if (client) {
            client.close();
        }
    }
});


app.post('/signupp', async (req, res) => {
    try {
        const client = await MongoClient.connect('mongodb://localhost:27017', { useUnifiedTopology: true });
        console.log('Database connected');

        const db = client.db('form');
        const collection = db.collection('signup');

        const existingUser = await collection.findOne({ email: req.body.email });

        if (existingUser) {
            client.close();
             res.send(`
            <script>
                alert('User already exists. Please choose a different email.');
                window.location.href = '/';
            </script>
        `);
        } else {
            await collection.insertOne(req.body);
            client.close();
            console.log('Data inserted into MongoDB');
          res.send(`
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
                <script>
                    setTimeout(function() {
                        window.location.href = '/home';
                    }, 1000);
                </script>
                <div style="text-align: center; padding: 20px; background-color: #28a745; color: white; font-size: 24px; border-radius: 5px;">
                    Signup successful. Welcome!
                </div>
            </div>
        `);    
        }
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/form?', (req, res) => {
    res.render('form');
});


app.post('/mainlogin', async (req, res) => {
    let client;

    try {
        const { username, password } = req.body;

        client = new MongoClient(MONGODB_URI, { useNewUrlParser: true });
        await client.connect();

        const db = client.db('form');
        const user = await db.collection('signup').findOne({ username });

        console.log('User from the database:', user);

        if (user) {
            const isPasswordValid = user.password == password;

            if (isPasswordValid) {
                res.send(`
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
                    <script>
                        setTimeout(function() {
                            window.location.href = '/home';
                        }, 1000);
                    </script>
                    <div style="text-align: center; padding: 20px; background-color: #09175c; color: white; font-size: 24px; border-radius: 5px;">
                        Welcome back!
                    </div>
                </div>
            `); 
            } else {
                res.send(`
                <script>
                    alert('incorrect Password.');
                    window.location.href = '/login';
                </script>
            `);
            }
        } else {
            res.status(401).send('User not found');
        }
    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).send('Internal Server Error');
    } finally {
        if (client) {
            await client.close();
        }
    }
});


app.post('/submit', async (req, res) => {
    try {
        const formData = req.body;

        const client = await MongoClient.connect('mongodb://localhost:27017', { useUnifiedTopology: true });
        console.log('Database connected');

        const db = client.db('forminner');
        const collection = db.collection('signupusers');

        const documentId = uuidv4();
        formData.id = documentId;

        await collection.insertOne(formData);

        client.close();

        console.log('Data inserted into MongoDB');
        res.redirect('/form');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/delete/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const client = await MongoClient.connect('mongodb://localhost:27017', { useUnifiedTopology: true });
        console.log('Database connected');

        const db = client.db('forminner');
        const collection = db.collection('signupusers');

        await collection.deleteOne({ id: userId });  

        client.close();

        console.log(`Data with ID ${userId} deleted from MongoDB`);
        res.redirect('/home');
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/edit/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const client = await MongoClient.connect(MONGODB_URI, { useUnifiedTopology: true });

        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        const user = await collection.findOne({ id: userId });

        client.close();

        if (!user) {
            res.status(404).send('User not found');
            return;
        }

        res.render('update', { user });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Internal Server Error');
    }
});



app.post('/update/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        const client = await MongoClient.connect(MONGODB_URI, { useUnifiedTopology: true });

        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        const user = await collection.findOne({ id: userId });

        if (!user) {
            res.status(404).send('User not found');
            return;
        }
        console.log(req.body);
        await collection.updateOne({ id: userId }, { $set: req.body });
        

        client.close();

        res.redirect('/home');
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Internal Server Error');
    }
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
