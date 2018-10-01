var config = {};
config.IOT_BROKER_ENDPOINT  = "a7uppwtvrqy5l.iot.us-east-1.amazonaws.com";
config.IOT_BROKER_REGION    = "us-east-1";
config.IOT_THING_NAME       = "MediaU";

var AWS = require('aws-sdk');
AWS.config.region = config.IOT_BROKER_REGION;
var iotData = new AWS.IotData({endpoint: config.IOT_BROKER_ENDPOINT});

module.exports.onIntent_US = function(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

	//Delete thing shadow for forcing to update the same status
	iotData.deleteThingShadow({"thingName": config.IOT_THING_NAME}, function(err, data) {
		if (err) console.log(err, err.stack); // an error occurred
		else     console.log(data);           // successful response
	});

    // Dispatch to your skill's intent handlers
    switch (intentName) {
    case "IntentPreset":        setPresetInSession(intent, session, callback);  break;
	case "IntentInternetRadioPreset":setInternetRadioPresetInSession(intent, session, callback);  break;
	case "IntentDabPreset":		setDabPresetInSession(intent, session, callback);  break;
	case "IntentFmPreset":		setFmPresetInSession(intent, session, callback);  break;
    case "IntentVolume":        setVolumeInSession(intent, session, callback);  break;
    case "IntentMute":          setMuteInSession(intent, session, callback);    break;
    case "IntentStandby":       setStandbyInSession(intent, session, callback);	break;
    case "IntentWakeup":		setWakeupInSession(intent, session, callback);	break;
    //case "AMAZON.PauseIntent":  setPauseInSession(intent, session, callback);   break;
    case "AMAZON.StopIntent":   setStopInSession(intent, session, callback);    break;
    case "AMAZON.HelpIntent":   getHelpResponse(callback);                   	break;
    case "AMAZON.CancelIntent": handleSessionEndRequest(callback);              break;
    default:
        throw "Invalid intent";
    }
}

module.exports.onLaunch_US = function(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome." + " Please tell me next action by saying, play preset 1.";

    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Please tell me next action by saying, play preset 1.";
    var shouldEndSession = false;

    callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getHelpResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Help";
    var speechOutput = "With this skill, you can control the radio device with skill inside.\n"
						+ "Like changing preset channel, volume control, or basic playback control.\n"
						+ "For example, you can say:\n"
						+ "\"play preset 1\",\n"
						+ "\"turn the volume up\",\n"
						+ "or \"stop\", and so on.\n"
						+ "You can also get all commands from skill description.\n"
						+ "Now, give it a try.";
    var repromptText = speechOutput;
    var shouldEndSession = false;

    callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    var cardTitle = "Session Ended";
    var speechOutput = "Thank you for using the skill. Have a nice day!";
    // Setting this to true ends the session and exits the skill.
    var shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

/**
 * [audio] Set the preset number in the session and prepares the speech to reply to the user.
 */
function setPresetInSession(intent, session, callback) {
    var cardTitle = "Select preset";
    var presetNumRequest = intent.slots.SlotPreset;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    if (presetNumRequest) {
        var presetNum = presetNumRequest.value;
        var payloadObj;
        var paramsUpdate;

        if ("1" === presetNum || "2" === presetNum || "3" === presetNum || "4" === presetNum || "5" === presetNum) {
            payloadObj = {"state": {"desired": {"channel":"preset " + presetNum}}};
            paramsUpdate = {
                "thingName" : config.IOT_THING_NAME,
                "payload" : JSON.stringify(payloadObj)
            };
        }

        //Update Device Shadow
        iotData.updateThingShadow(paramsUpdate, function(err, data) {
            if (err) {
                console.log(err, err.stack);

                speechOutput = "Please try again";
                repromptText = "Please try again";
                callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            }
            else {
                console.log(data);

                sessionAttributes = createPresetNumAttributes(presetNum);
                speechOutput = "OK, play preset " + presetNum;
                repromptText = "OK, play preset " + presetNum;
                callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            }
        });
    } else {
        speechOutput = "Please try again";
        repromptText = "Please try again";
        callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function setInternetRadioPresetInSession(intent, session, callback) {
	_setPresetByRadioType(intent, session, callback, "internet radio");
}

function setDabPresetInSession(intent, session, callback) {
	_setPresetByRadioType(intent, session, callback, "D.A.B.");
}

function setFmPresetInSession(intent, session, callback) {
	_setPresetByRadioType(intent, session, callback, "FM");
}

function _setPresetByRadioType(intent, session, callback, radioType) {
    var cardTitle = "Select preset";
    var presetNumRequest = intent.slots.SlotPreset;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    if (presetNumRequest) {
        var presetNum = presetNumRequest.value;
        var payloadObj;
        var paramsUpdate;

        if ("1" === presetNum || "2" === presetNum || "3" === presetNum || "4" === presetNum || "5" === presetNum) {
			payloadObj = {"state": {"desired": {"channel":radioType + " preset " + presetNum}}};
            paramsUpdate = {
                "thingName" : config.IOT_THING_NAME,
                "payload" : JSON.stringify(payloadObj)
            };
        }

        //Update Device Shadow
        iotData.updateThingShadow(paramsUpdate, function(err, data) {
            if (err) {
                console.log(err, err.stack);

                speechOutput = "Please try again";
                repromptText = "Please try again";
                callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            }
            else {
                console.log(data);

                sessionAttributes = createPresetNumAttributes(presetNum);
                speechOutput = "OK, play " + radioType + " preset " + presetNum;
                repromptText = "OK, play " + radioType + " preset " + presetNum;
                callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            }
        });
    } else {
        speechOutput = "Please try again";
        repromptText = "Please try again";
        callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function createPresetNumAttributes(presetNum) {
    return {
        presetNum: presetNum
    };
}

/**
 * [audio] Set volume in the session and prepares the speech to reply to the user.
 */
function setVolumeInSession(intent, session, callback) {
    var cardTitle = "Set volume";
    var volumeActRequest = intent.slots.SlotVolume;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    if (volumeActRequest) {
        var volumeAct = volumeActRequest.value;
        var payloadObj;
        var paramsUpdate;

        if ("up" === volumeAct || "down" === volumeAct) {
            payloadObj = {"state": {"desired": {"volume":"volume " + volumeAct}}};
            paramsUpdate = {
                "thingName" : config.IOT_THING_NAME,
                "payload" : JSON.stringify(payloadObj)
            };
        }

        //Update Device Shadow
        iotData.updateThingShadow(paramsUpdate, function(err, data) {
            if (err) {
                console.log(err, err.stack);

                speechOutput = "Please try again";
                repromptText = "Please try again";
                callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            }
            else {
                console.log(data);

                sessionAttributes = createVolumeActAttributes(volumeAct);
                speechOutput = "OK, volume " + volumeAct;
                repromptText = "OK, volume " + volumeAct;
                callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            }
        });
    } else {
        speechOutput = "Please try again";
        repromptText = "Please try again";
        callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function createVolumeActAttributes(volumeAct) {
    return {
        volumeAct: volumeAct
    };
}

/**
 * [audio] Set mute/unmute in the session and prepares the speech to reply to the user.
 */
function setMuteInSession(intent, session, callback) {
    var cardTitle = "Set mute";
    var muteActRequest = intent.slots.SlotMute;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    if (muteActRequest) {
        var muteAct = muteActRequest.value;
        var payloadObj;
        var paramsUpdate;

        if ("mute" === muteAct || "unmute" === muteAct) {
            payloadObj = {"state": {"desired": {"volume":muteAct}}};
            paramsUpdate = {
                "thingName" : config.IOT_THING_NAME,
                "payload" : JSON.stringify(payloadObj)
            };
        }

        //Update Device Shadow
        iotData.updateThingShadow(paramsUpdate, function(err, data) {
            if (err) {
                console.log(err, err.stack);

                speechOutput = "Please try again";
                repromptText = "Please try again";
                callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            }
            else {
                console.log(data);

                sessionAttributes = createMuteActAttributes(muteAct);
                speechOutput = "OK, " + muteAct + " the radio";
                repromptText = "OK, " + muteAct + " the radio";
                callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            }
        });
    } else {
        speechOutput = "Please try again";
        repromptText = "Please try again";
		cardTitle = speechOutput;
        callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function createMuteActAttributes(muteAct) {
    return {
        muteAct: muteAct
    };
}

/**
 * [audio] Pause the music in the session and prepares the speech to reply to the user.
 */
function setPauseInSession(intent, session, callback) {
    var cardTitle = "Pause";
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var paramsUpdate = {
        "thingName" : config.IOT_THING_NAME,
        "payload" : '{"state": {"desired": {"playback":"pause"}}}'
    };

    //Update Device Shadow
    iotData.updateThingShadow(paramsUpdate, function(err, data) {
        if (err) {
            console.log(err, err.stack);

			speechOutput = "Please try again";
			repromptText = "Please try again";
            callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        }
        else {
            console.log(data);

            speechOutput = "OK, pause";
            repromptText = "OK, pause";
            callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        }
    });
}

/**
 * [audio] Stop in the session and prepares the speech to reply to the user.
 */
function setStopInSession(intent, session, callback) {
    var cardTitle = "Stop";
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var paramsUpdate = {
        "thingName" : config.IOT_THING_NAME,
        "payload" : '{"state": {"desired": {"playback":"stop"}}}'
    };

    //Update Device Shadow
    iotData.updateThingShadow(paramsUpdate, function(err, data) {
        if (err) {
            console.log(err, err.stack);

			speechOutput = "Please try again";
			repromptText = "Please try again";
            callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        }
        else {
            console.log(data);

            speechOutput = "OK, stop";
            repromptText = "OK, stop";
            callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        }
    });
}

/**
 * [audio] Standby in the session and prepares the speech to reply to the user.
 */
function setStandbyInSession(intent, session, callback) {
    var cardTitle = "Standby";
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var paramsUpdate = {
        "thingName" : config.IOT_THING_NAME,
        "payload" : '{"state": {"desired": {"standby":"standby"}}}'
    };

    //Update Device Shadow
    iotData.updateThingShadow(paramsUpdate, function(err, data) {
        if (err) {
            console.log(err, err.stack);

			speechOutput = "Please try again";
			repromptText = "Please try again";
            callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        }
        else {
            console.log(data);

            speechOutput = "OK";
            repromptText = "OK";
            callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        }
    });
}

/**
 * [audio] Wake up (cancel standby) in the session and prepares the speech to reply to the user.
 */
function setWakeupInSession(intent, session, callback) {
    var cardTitle = "Wake up";
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var paramsUpdate = {
        "thingName" : config.IOT_THING_NAME,
        "payload" : '{"state": {"desired": {"standby":"wake up"}}}'
    };

    //Update Device Shadow
    iotData.updateThingShadow(paramsUpdate, function(err, data) {
        if (err) {
            console.log(err, err.stack);

			speechOutput = "Please try again";
			repromptText = "Please try again";
            callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        }
        else {
            console.log(data);

            speechOutput = "OK";
            repromptText = "OK";
            callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        }
    });
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}
