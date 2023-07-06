const mongoose = require('mongoose');

const gameDataSchema = new mongoose.Schema({
    gameID: {
        type:String,
        require:true,
    },
    
    currentRoundID: {
        type:String,
        require:true,
    },
    previousResults: [
        {
            dice1: Number,
            dice2: Number,
            dice3: Number,
        }
    ]
});

gameDataSchema.set('timestamps', true);

const GameData = mongoose.model('gameData', gameDataSchema);
module.exports = GameData;