const dotenv = require('dotenv');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const cors = require('cors');
const mongoose = require('mongoose');
const GameData = require('./models/gameData');
// const RoundData = require('./models/roundData');
// const userRoutes = require('./routes/action');
const userRoutes = require('./routes/action');
const bodyParser = require('body-parser');

const io = require('socket.io')(server, {
    cors: {
        origin: "*",
    }
});

dotenv.config();
let port = process.env.PORT || 5000;
app.use(bodyParser.json());

app.use(cors());
app.use('/', userRoutes);
app.get("/", (req, res) => res.send('HEllo from  new express'));
app.all("*", (req, res) => res.send("This doesn't exist!"));

mongoose.connect(process.env.MONGO_DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Database connected');
}).catch(err => console.log(err));




let counter = 15,  interval, round_id;




//Create GameData In DB on first time server start
async function checkIfCollectionExists() {
    let collectionExit = await GameData.findOne({ gameID: "sicbo" });

    if (collectionExit === null) {

        const Data = new GameData({
            gameID: "sicbo",
        });

        Data.save().then(() => {
            StartRound();

        }).catch(err => console.log(err))
    } else {

        StartRound();
    }
}
checkIfCollectionExists();

// Emiting the current server time every second




// ---------------------------------------------------------------------------------socket





gameSocket = null;

gameSocket = io.on('connection', function (socket) {
    console.log('socket connected: ' + socket.id);

    console.log('a user is connected');



    socket.on('disconnect', function () {
        console.log('socket disconnected: ' + socket.id);
    });
})


// ---------------------------------------------------------------------------------socket

//function start game  and creating new round id and emiting it
const StartRound = async () => {
    let date = new Date();
    round_id = "sb" + date.getDate().toString() + (date.getMonth() + 1).toString() + date.getFullYear().toString() + "-" + date.getHours().toString() + date.getMinutes().toString() + date.getSeconds().toString();




    io.emit("RoundId", round_id);

    await GameData.updateOne({ gameID: "sicbo" },
        {
            $set: {
                currentRoundID: round_id
            }
        }).then(() => {
            console.log("new roundid-------------     " + round_id);
        });

    io.emit("Round_Status", "ROUND_START");

    interval = setInterval(() => {
        io.emit("Counter", counter--);
        if (counter === 0) {

            clearInterval(interval);
            io.emit("Round_Status", "NO_MORE_BETS");
            counter = 5;
            let res = GetResult();
            io.emit("Result", res);

            io.emit("Previous_Results", res);
            // Storing result in DB
            GameData.updateOne(
                {
                    $push: {
                        previousResults: {
                            "dice1": res[0],
                            "dice2": res[1],
                            "dice3": res[2],
                        }
                    }
                },
                function (error, success) {
                    if (error) {
                        console.log("error");
                    } else {
                        console.log("preResult updated");
                    }
                });

            GameData.updateOne({},
                {
                    $unset: {
                        "previousResults.0": 1
                    }
                });
            GameData.updateOne({},
                {
                    $pull: {
                        "previousResults": null
                    }
                });

            let nextRound = setInterval(() => {
                io.emit("Counter", counter--);
                if (counter === 0) {
                    clearInterval(nextRound);
                    io.emit("Round_Status", "ROUND_END");
                    counter = 15;
                    StartRound();
                }

            }, 1000);

        }

    }, 1000);
}

function GetResult() {
    let result = [];

    for (let index = 0; index < 3; index++) {

        result.push(GetRandomInteger(1, 6));

    }

    return result;

}



//Generate a random number between range
function GetRandomInteger(min, max,) {
    return (Math.floor(Math.random() * (max - min + 1)) + min);
}


server.listen(port, () => {
    console.log("listening to port : ", port);
});




