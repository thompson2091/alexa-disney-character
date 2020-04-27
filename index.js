// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

/* eslint-disable  func-names */
/* eslint-disable  no-console */
/* eslint-disable  no-restricted-syntax */
const Alexa = require('ask-sdk');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const languageStrings = {
  'en': require('./data/language.js')
};

const all_items = require('./data/items.js');

// Launch
const LaunchRequestHandler = {
    
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
       	// init needed session attributes
        sessionAttributes.game_state        = 'configure';
        sessionAttributes.prev 				= [];
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        
        // welcome message
        var prompt      = "<audio src='https://whos-that-disney-character.s3.us-east-2.amazonaws.com/audio/edited/disneytime-trim.mp3'/> <break time='0.5s'/> Welcome to the Unofficial Disney Guessing Game! <break time='300ms'/> Please say Start Game. <break time='200ms'/> You can say stop to quit at anytime.";
        var reprompt    = "Please say Start Game to get started.";
        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/welcome.png",
            background: "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/background-stars.png",
        };

        return speak(handlerInput,prompt,reprompt,display);
    }
};

// Start Game
const StartIntent   = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StartIntent';
    },
    handle(handlerInput) {

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        // update game state 
        sessionAttributes.game_state        = 'playing';
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        // grab random item (in this case, disney character)
        const item      = grabRandomItem(handlerInput);

        var prompt      = item.desc + " <audio src='https://whos-that-disney-character.s3.us-east-2.amazonaws.com/audio/edited/" + item.id + ".mp3'/> <break time='300ms'/> Who is that Disney character?";
        var reprompt    = "You can say repeat, <break time='300ms'/> skip, <break time='300ms'/> or say stop to quit.";
        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/silhouette/"+item.id+".png",
            background: "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/background-clouds.png"
        };

        // speak
        return speak(handlerInput,prompt,reprompt,display);

    }
};


// DisneyIntent
const DisneyIntent  = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'DisneyIntent');
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        var prompt              = "";
        var reprompt            = "You can say repeat, <break time='300ms'/> skip, <break time='300ms'/> or say stop to quit.";
        var correct             = false;

        // make sure we have a playing game_state 
        sessionAttributes.game_state        = 'playing';
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        // if user answered a question - determine if right or wrong
        if (handlerInput.requestEnvelope.request.intent.slots.disney !== 'undefined'){
            // determine if answer is correct
            const item_slot = handlerInput.requestEnvelope.request.intent.slots.disney;
            const item_val  = item_slot.resolutions.resolutionsPerAuthority[0].values[0].value;
            const item_id   = item_val.id;
            const item_name = item_val.name;

            correct         = (item_id === sessionAttributes.item.id)? "<audio src='https://whos-that-disney-character.s3.us-east-2.amazonaws.com/audio/edited/wand.mp3'/> " + item_slot.value + " is correct! ": "<audio src='https://whos-that-disney-character.s3.us-east-2.amazonaws.com/audio/edited/buzzer.mp3'/> I'm sorry, " + item_slot.value + " is incorrect! <break time='300ms'/> The correct answer is " + sessionAttributes.item.name;

            prompt          = correct + " <break time='300ms'/> ";

        } else {
            
            // user didn't answer - they may have just said I don't know
            prompt          = "The correct answer is " + sessionAttributes.item.name + " <break time='300ms'/> ";

        }

        prompt  += "<break time='300ms'/> Would you like to guess another character?";

        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/actual/"+sessionAttributes.item.id+".png",
            background: "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/background-clouds.png"
        };

        return speak(handlerInput,prompt,reprompt,display);
    }
};

// YesNoIntent
const YesNoIntent   = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'YesNoIntent'
            || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' 
            || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent');
    },
    handle(handlerInput) {

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const yesno             = handlerInput.requestEnvelope.request.intent.slots.yesno.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        var prompt              = "";
        var reprompt            = "";
        var item                = {};
        var display             = {};

        if (yesno === 'no'){

            // grab current item
            item    = grabCurrentItem(handlerInput);

            // set speech
            prompt      = "Please say stop to quit playing or say next to move on to the next Disney character.";
            reprompt    = prompt;

            display     = {
                title:      "Who's That Disney Character?",
                image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/actual/"+item.id+".png",
                background: "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/background-clouds.png"
            };

        } else {

            // grab next item
            item            = grabRandomItem(handlerInput);   

            // add to prompt
            prompt              = item.desc + " <audio src='https://whos-that-disney-character.s3.us-east-2.amazonaws.com/audio/edited/" + item.id + ".mp3'/> <break time='300ms'/> Who is that Disney character?";
            reprompt            = prompt;

            display     = {
                title:      "Who's That Disney Character?",
                image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/silhouette/"+item.id+".png",
                background: "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/background-clouds.png"
            };

        }


        return speak(handlerInput,prompt,reprompt,display);

    }
};


// RepeatIntent
const RepeatIntent  = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RepeatIntent';
    },
    handle(handlerInput) {

        // grab current item (in this case, disney character)
        const item      = grabCurrentItem(handlerInput);

        var prompt      = item.desc + " <audio src='https://whos-that-disney-character.s3.us-east-2.amazonaws.com/audio/edited/" + item.id + ".mp3'/> <break time='300ms'/> Who is that Disney character?";
        var reprompt    = "You can say repeat, <break time='300ms'/> skip, <break time='300ms'/> or say stop to quit.";
        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/silhouette/"+item.id+".png",
            background: "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/background-clouds.png"
        };

        // speak
        return speak(handlerInput,prompt,reprompt,display);
    }
}; 

/*
// HintIntent
const HintIntent    = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'HintIntent');
    },
    handle(handlerInput) {
        // grab current item (in this case, disney character)
        const item      = grabCurrentItem(handlerInput);

        // detemrine which movies this character is in
        var count       = item.movies.length;
        var movies      = "";
        for(var i = 0;i<item.movies.length;i++){
            if (i !== 0){
                movies += " and ";
            }
            movies += item.movies[i];
        }

        var speech      = (count === 1)? 'movie':'movies';

        var prompt      = "This character was in " + count + " " + speech + " <break time='300ms'/> " + movies + " <break time='300ms'/> Who is that Disney character?";
        var reprompt    = "You can say repeat <break time='300ms'/> or ask for a hint.";
        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/silhouette/"+item.id+".png",
            background: "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/background-clouds.png"
        };

        // speak
        return speak(handlerInput,prompt,reprompt,display);
    }  
};
*/

// DunnoIntent
const DunnoIntent   = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'DunnoIntent';
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        var prompt              = "";
        var reprompt            = "You can say repeat, <break time='300ms'/> skip, <break time='300ms'/> or say stop to quit.";
   
        // user didn't answer - they may have just said I don't know
        prompt  += "The correct answer is " + sessionAttributes.item.name + " <break time='300ms'/> ";
        prompt  += "<break time='300ms'/> Would you like to guess another character?";

        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/actual/"+sessionAttributes.item.id+".png",
            background: "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/background-clouds.png"
        };

        return speak(handlerInput,prompt,reprompt,display);
    }
};

// SkipIntent
const SkipIntent    = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'SkipIntent'
            || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NextIntent');
    },
    handle(handlerInput) {
        // grab next item
        var item            = grabRandomItem(handlerInput);
        var prompt          = "";
        var reprompt        = "";

        // add to prompt
        prompt              += item.desc + " <audio src='https://whos-that-disney-character.s3.us-east-2.amazonaws.com/audio/edited/" + item.id + ".mp3'/> <break time='300ms'/> Who is that Disney character?";
        reprompt            = prompt;

        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/silhouette/"+item.id+".png",
            background: "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/background-clouds.png"
        };

        return speak(handlerInput,prompt,reprompt,display);
    }
};





const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        var speakOutput         = "";
        // if game state == configure, then we need to repeat welcome message - per Amazon 
        if (sessionAttributes.game_state === 'configure'){
            speakOutput = "Welcome to the Unofficial Disney Guessing Game!  You can say repeat, to repeat the question <break time='300ms'/> skip to go to the next question, <break time='300ms'/> or say stop to quit at anytime. <break time='300ms'/> To start the game, say start game.";
        } else {
            speakOutput = "You can say repeat, <break time='300ms'/> skip, <break time='300ms'/> or say stop to quit.";
        }
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Thank you for playing!  If you enjoyed our skill, please rate us in the skill store.';
        return handlerInput.responseBuilder
            .withShouldEndSession(true)
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        var prompt              = "";
        var reprompt            = "";
   
        // user didn't answer - they may have just said I don't know
        prompt      += "<audio src='https://whos-that-disney-character.s3.us-east-2.amazonaws.com/audio/edited/buzzer.mp3'/> That is incorrect.  The correct answer is " + sessionAttributes.item.name + " <break time='300ms'/> ";
        prompt      += "<break time='300ms'/> Would you like to guess another character?";
        reprompt    = prompt;

        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/actual/"+sessionAttributes.item.id+".png",
            background: "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/background-clouds.png"
        };

        return speak(handlerInput,prompt,reprompt,display);

        /*
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = "Sorry, I don't recognize that Character. Please try again. <break time='300ms'/> You can say skip <break time='300ms'/>, repeat <break time='300ms'/>, or ask for a hint.";
        //const speakOutput = 'intent reflector';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
        */
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        var prompt              = "";
        var reprompt            = "";
   
        // user didn't answer - they may have just said I don't know
        prompt      += "<audio src='https://whos-that-disney-character.s3.us-east-2.amazonaws.com/audio/edited/buzzer.mp3'/> That is incorrect.  The correct answer is " + sessionAttributes.item.name + " <break time='300ms'/> ";
        prompt      += "<break time='300ms'/> Would you like to guess another character?";
        reprompt    = prompt;

        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/actual/"+sessionAttributes.item.id+".png",
            background: "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/background-clouds.png"
        };

        return speak(handlerInput,prompt,reprompt,display);

        /*
        console.log(`~~~~ Error handled: ${error.stack}`);
        //const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;
        
        const speakOutput = "Sorry, I don't recognize that Disney Character. Please try again. <break time='300ms'/> You can say skip <break time='300ms'/>, repeat <break time='300ms'/>, or ask for a hint.";
        //const speakOutput = 'error handler';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
        */
    }
};

const supportsDisplay = function(handlerInput) {
  var hasDisplay =
    handlerInput.requestEnvelope.context &&
    handlerInput.requestEnvelope.context.System &&
    handlerInput.requestEnvelope.context.System.device &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display

  //console.log("Supported Interfaces are" + JSON.stringify(handlerInput.requestEnvelope.context.System.device.supportedInterfaces));
  return hasDisplay;
}

const grabRandomItem        = function(handlerInput){

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var prev_items  = sessionAttributes.prev;
    var pool        = all_items;

    // remove used items
    if(prev_items && prev_items.length && prev_items.length < pool.length){
        for(var pp in prev_items){
            for (var i=0; i < pool.length; i++) {
                if (pool[i].id === prev_items[pp]) {
                    pool.splice(i,1);
                }
            }
        }
    } else {
        // reset prev array since we've used all characters
        sessionAttributes.prev  = [];
    }

    var item    = pool[Math.floor(Math.random() * pool.length)];

    // set new item to session
    sessionAttributes.item  = item;
    sessionAttributes.prev.push(item.id);   // add this item to our prev array
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return item;
}
const grabCurrentItem       = function(handlerInput){
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const item              = sessionAttributes.item;
    return item;
}

const speak                 = function(handlerInput,prompt,reprompt,display){
    if (supportsDisplay(handlerInput)){
        return handlerInput.responseBuilder.addRenderTemplateDirective({
            "type": "BodyTemplate7",
            "token": "SampleTemplate_3476",
            "backButton": "hidden",
            "title": display.title,
                "backgroundImage": {
                "contentDescription": "Blue Background",
                "sources": [
                    {
                        "url": display.background
                        //"url": "https://mttl-tech.s3.amazonaws.com/whos-that-pokemon/images/bg.png"
                    }
                ]
            },
            "image": {
                "contentDescription": display.title,
                "sources": [
                    {
                        "url": display.image
                    }
                ]
            }
        })
            .speak(prompt)
            .reprompt(reprompt)
            .getResponse();
    } else {
        return handlerInput.responseBuilder
            .speak(prompt)
            .reprompt(reprompt)
            .getResponse();
    }
}

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        StartIntent,
        DisneyIntent,
        YesNoIntent,
        RepeatIntent,
        //HintIntent,
        DunnoIntent,
        SkipIntent,
        //HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .lambda();

