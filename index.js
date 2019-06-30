const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const express = require('express');
var bodyParser = require('body-parser');
const cors = require('cors');
const parseString = require('xml2js').parseString;

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(bodyParser.text());

function firstVideo(text){
    var entry;
    parseString(text, (err, result) => {
        if(err){
            console.log("xml parsing error");
            console.log(text);
        }
        entry = result['feed']['entry'][0];
    })
    
    var videoId = entry['yt:videoId'][0];
    var title = entry['title'][0];
    var uploaded = entry['published'][0];

    return {
        videoId: videoId,
        title: title,
        uploaded: uploaded
    }
}

function checkTitleConditionGroups(title, conditionGroups){
    if(conditionGroups===undefined){
        return false;
    }
    for(let conditionGroup of conditionGroups){
        var conditions = conditionGroup.conditions;
        var i = 0;
        for(let condition of conditions){
            if(title.includes(condition)){
                i += 1;
            }else{
                break
            }
        }
        if(i === conditions.length){
            return true;
        }
    }
    return false;
}

app.post('/:channelId', (req, res) => {
    var channelId = req.params.channelId;
    var videoData = firstVideo(req.body);
    var videoTitle = videoData.title;

    var db = admin.firestore();
    var ref = db.collection("programs");

    return ref.where('channelId', '==', channelId).get().then((snapshot) => {
        snapshot.forEach((doc) => {
            programData = doc.data();
            if(checkTitleConditionGroups(videoTitle, programData.conditionGroups)){
                doc.ref.collection('videos').add(videoData);
            }
        })
        return res.send(videoData);
    })
})

// for pubsubhubbub challenge
app.get('/:channelId', (req, res) => {
    return res.send(req.query['hub.challenge'])
})

exports.addChannelVideo = functions.https.onRequest(app);
