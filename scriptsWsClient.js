const userName = "Client-"+Math.floor(Math.random() * 100000)
const password = "x";
document.querySelector('#user-name').innerHTML = userName;

const ws = new WebSocket('ws://192.168.2.4:8282');

const remoteVideoEl = document.querySelector('#show-video');

let localStream; //a var to hold the local video stream
let remoteStream; //a var to hold the remote video stream
let peerConnection; //the peerConnection that the two clients use to talk
let didIOffer = false;


let peerConfiguration = {
    iceServers:[
        {
            urls:[
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302'
            ]
        }
    ]
}

//send password and user name
ws.onopen = function() {
    ws.send(JSON.stringify({
    username: userName,
    password: password
    }));
};

const answerOffer = async(offerObj)=>{
    console.log('start answerOffer')
    await createPeerConnection(offerObj);
    const answer = await peerConnection.createAnswer({}); //just to make the docs happy
    await peerConnection.setLocalDescription(answer); //this is CLIENT2, and CLIENT2 uses the answer as the localDesc
    console.log(offerObj)
    console.log(answer)

    offerObj.answer = answer 
    content = JSON.stringify({type:'newAnswer', data: {userName,offerObj} })
    await ws.send(content)


    console.log('peerConnection ', peerConnection)
    
}

const updateICECandiate = async(offerIceCandidates) =>{
    console.log('updateICECandiate',offerIceCandidates )
    await offerIceCandidates.forEach(c=>{
        peerConnection.addIceCandidate(c);
        console.log("======Added Ice Candidate======")

    })
}

const addAnswer = async(offerObj)=>{
    //addAnswer is called in socketListeners when an answerResponse is emitted.
    //at this point, the offer and answer have been exchanged!
    //now CLIENT1 needs to set the remote
    console.log('offerObj.answer', offerObj.answer);
    console.log(peerConnection.signalingState);
    try {
        await peerConnection.setRemoteDescription(offerObj.answer);
        console.log('setRemoteDescription success');
        console.log(peerConnection.signalingState);        
    } catch (error) {
        console.error('setRemoteDescription error:', error);
    }
}

const createPeerConnection = (offerObj)=>{
    return new Promise(async(resolve, reject)=>{
        //RTCPeerConnection is the thing that creates the connection
        //we can pass a config object, and that config object can contain stun servers
        //which will fetch us ICE candidates
        peerConnection = await new RTCPeerConnection(peerConfiguration)
        remoteStream = new MediaStream()
        remoteVideoEl.srcObject = remoteStream;

        peerConnection.addEventListener("signalingstatechange", (event) => {
            console.log('signalingstatechange', event)
            console.log('peerConnection.signalingState',peerConnection.signalingState)
        });

        peerConnection.addEventListener('icecandidate',e=>{
            console.log('........Ice candidate found!......')
            if(e.candidate){
                console.log("this line is running-> after ice candiate found")
                content = JSON.stringify({type:'sendIceCandidateToSignalingServer', data: {
                    iceCandidate: e.candidate,
                    iceUserName: userName,
                    didIOffer,
                } })
                ws.send(content)    
            }
        })
        
        peerConnection.addEventListener('track',e=>{
            console.log('Received tracks', e)
            e.streams[0].getTracks().forEach(track=>{
                remoteStream.addTrack(track,remoteStream);
                console.log("finish add track into remote Stream")
            })
        })

        if(offerObj){
            //this won't be set when called from call();
            //will be set when we call from answerOffer()
            console.log(peerConnection.signalingState) //should be stable because no setDesc has been run yet
            //RTCSdpType = "answer" | "offer" | "pranswer" | "rollback";
            try{
                await peerConnection.setRemoteDescription(offerObj.offer)
            }
            catch(err){
                console.log("An error happen when call setRemoteDescription", err)
            }
            console.log('peerConnection.signalingState ',peerConnection.signalingState) //should be have-remote-offer, because client2 has setRemoteDesc on the offer
        }
        resolve();
    })
}

const addNewIceCandidate = (iceCandidate)=>{
    console.log('iceCandidate',iceCandidate)
    peerConnection.addIceCandidate(iceCandidate)
    console.log("======Added Ice Candidate======")
}

